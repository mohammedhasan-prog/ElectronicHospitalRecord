// src/app/api/patients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const cursor = searchParams.get('cursor'); // For pagination

    const { TENANT_ID, FHIR_ROOT_HOST = 'https://fhir-ehr-code.cerner.com/r4' } = process.env;

    if (!TENANT_ID) {
      return NextResponse.json({ ok: false, message: 'Tenant ID is not configured.' }, { status: 500 });
    }

    let url: string;
    if (cursor) {
      // Use the cursor (next page URL) directly
      url = cursor;
    } else {
      // Build initial search URL
      const baseUrl = new URL(`${FHIR_ROOT_HOST}/${TENANT_ID}/Patient`);
      if (name) {
        baseUrl.searchParams.append('name', name);
      }
      baseUrl.searchParams.append('_count', '10');
      url = baseUrl.toString();
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ ok: false, message: `FHIR API request failed: ${response.statusText}`, details: errorText }, { status: response.status });
    }

    const data = await response.json();
    
    // Check for next page link
    const nextLink = data.link?.find((link: any) => link.relation === 'next');
    const nextCursor = nextLink?.url || null;
    
    // Normalize the response for the frontend
    const patients = data.entry?.map((entry: any) => {
        const resource = entry.resource;
        return {
            id: resource.id,
            name: resource.name?.[0]?.text || 'N/A',
            gender: resource.gender || 'N/A',
            birthDate: resource.birthDate || 'N/A',
        };
    }) || [];

    return NextResponse.json({ 
      ok: true, 
      patients,
      nextCursor,
      total: data.total || null 
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== PATIENT CREATION API START ===');
    const accessToken = await getAccessToken();
    console.log('Access token obtained:', accessToken.substring(0, 20) + '...');
    
    // Robust body parsing: handle empty body gracefully
    let body: any = {};
    try {
      const raw = await request.text();
      if (raw && raw.trim().length > 0) {
        try {
          body = JSON.parse(raw);
        } catch (e: any) {
          return NextResponse.json({ ok: false, message: 'Invalid JSON body', error: e?.message || String(e) }, { status: 400 });
        }
      }
    } catch (e: any) {
      // If we cannot read body, proceed with empty object
      body = {};
    }
    console.log('Raw request body:', JSON.stringify(body, null, 2));

    const { TENANT_ID, FHIR_ROOT_HOST = 'https://fhir-ehr-code.cerner.com/r4' } = process.env;

    if (!TENANT_ID) {
      return NextResponse.json({ ok: false, message: 'Tenant ID is not configured.' }, { status: 500 });
    }

    // Extract the patient resource from the request body
    const patientResource = body.patient || body;
    console.log('Extracted patient resource:', JSON.stringify(patientResource, null, 2));

    // Ensure the resource type is set
    if (!patientResource.resourceType) {
      patientResource.resourceType = 'Patient';
    }

    // Oracle Health requirement: Patient.identifier is required and
    // identifier[0].assigner.reference must reference an Organization/{id}
    const ASSIGNER_ORG_ID = process.env.ASSIGNER_ORG_ID; // e.g., 675844 or Organization/675844

    const ensureAssignerReference = async () => {
      const normalizeOrgRef = (val: string) => (
        val?.startsWith('Organization/') ? val : `Organization/${val}`
      );

      // Determine whether we need to set assigner.reference
      const identifiers = Array.isArray(patientResource.identifier) ? patientResource.identifier : [];
      const first = identifiers[0] ?? {};
      const assigner = first.assigner ?? {};
      const hasRef = typeof assigner.reference === 'string' && assigner.reference.trim().length > 0;

      // Helper to set from env
      const setFromEnv = () => {
        if (!ASSIGNER_ORG_ID) {
          throw new Error('Missing ASSIGNER_ORG_ID. Please set ASSIGNER_ORG_ID in your environment to a valid Organization ID (e.g., 675844).');
        }
        const ref = normalizeOrgRef(ASSIGNER_ORG_ID);
        if (!/^Organization\/[0-9]+$/.test(ref)) {
          throw new Error(`ASSIGNER_ORG_ID must be numeric (e.g., 675844). Current value: ${ASSIGNER_ORG_ID}`);
        }
        if (!Array.isArray(patientResource.identifier) || patientResource.identifier.length === 0) {
          patientResource.identifier = [{ assigner: { reference: ref } }];
        } else {
          patientResource.identifier[0] = { ...first, assigner: { ...assigner, reference: ref } };
        }
      };

      // If missing, use env-configured Organization ID
      if (!hasRef) {
        setFromEnv();
      } else {
        // Validate provided assigner.reference is numeric Organization/<id>
        const provided = String(assigner.reference).trim();
        const normalized = normalizeOrgRef(provided);
        const idPart = normalized.split('/')[1] || '';
        const isNumeric = /^[0-9]+$/.test(idPart);
        if (!isNumeric) {
          // If env available, override with env; otherwise return error
          if (ASSIGNER_ORG_ID) {
            setFromEnv();
          } else {
            // Try to resolve provided value as an Organization name
            const searchUrl = `${FHIR_ROOT_HOST}/${TENANT_ID}/Organization?name=${encodeURIComponent(provided)}&_count=1`;
            const resp = await fetch(searchUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/fhir+json',
              },
            });
            if (resp.ok) {
              const bundle = await resp.json();
              const firstEntry = bundle.entry && bundle.entry[0];
              const orgId = firstEntry?.resource?.id;
              if (orgId && String(orgId).match(/^[0-9]+$/)) {
                const ref = `Organization/${orgId}`;
                if (!Array.isArray(patientResource.identifier) || patientResource.identifier.length === 0) {
                  patientResource.identifier = [{ assigner: { reference: ref } }];
                } else {
                  patientResource.identifier[0] = { ...first, assigner: { ...assigner, reference: ref } };
                }
              } else {
                throw new Error(`identifier.assigner.reference must be Organization/<numericId>. Could not resolve provided value by name: ${provided}`);
              }
            } else {
              const t = await resp.text();
              throw new Error(`identifier.assigner.reference must be Organization/<numericId>. Lookup failed for '${provided}'. Details: ${t}`);
            }
          }
        } else {
          // write back normalized reference to ensure correct prefix
          if (!Array.isArray(patientResource.identifier) || patientResource.identifier.length === 0) {
            patientResource.identifier = [{ assigner: { reference: normalized } }];
          } else {
            patientResource.identifier[0] = { ...first, assigner: { ...assigner, reference: normalized } };
          }
        }
      }
    };

    try {
      await ensureAssignerReference();
    } catch (cfgErr: any) {
      return NextResponse.json({
        ok: false,
        message: 'Configuration required to create Patient',
        details: cfgErr.message,
        hint: 'Set ASSIGNER_ORG_ID in .env.local to your Organization ID (numbers only or Organization/{id}). You can find an Organization ID via the Organizations page/search.',
      }, { status: 400 });
    }

    const url = `${FHIR_ROOT_HOST}/${TENANT_ID}/Patient`;
    console.log('FHIR API URL:', url);
    console.log('Patient payload to send:', JSON.stringify(patientResource, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
      },
      body: JSON.stringify(patientResource),
    });

    console.log('FHIR API Response Status:', response.status);
    console.log('FHIR API Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('FHIR API Error Response Body:', errorText);
      
      // Try to parse as JSON for better error details
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson;
        console.log('Parsed error JSON:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('Error response is not valid JSON');
      }
      
      return NextResponse.json({ 
        ok: false, 
        message: `FHIR API request failed: ${response.statusText}`, 
        details: errorDetails,
        status: response.status,
        url: url,
        payload: patientResource
      }, { status: response.status });
    }

    // Oracle Health may return 201 with empty body and Location header.
    // Only attempt to parse JSON if content-type indicates JSON.
    let createdPatient: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/fhir+json')) {
      try {
        createdPatient = await response.json();
      } catch (e) {
        // Empty body: ignore
        createdPatient = null;
      }
    }
    if (createdPatient) {
      console.log('Created patient response:', JSON.stringify(createdPatient, null, 2));
    } else {
      console.log('Created patient response: <empty body>');
    }

    // Extract the new patient ID from the Location header or response
    const locationHeader = response.headers.get('location');
    console.log('Location header:', locationHeader);
    
    let patientId = locationHeader 
      ? locationHeader.split('/').pop() 
      : undefined;
    if (!patientId && createdPatient && createdPatient.id) {
      patientId = createdPatient.id;
    }
    
    console.log('Extracted patient ID:', patientId);
    console.log('=== PATIENT CREATION API SUCCESS ===');

    return NextResponse.json({ 
      ok: true, 
      patient: createdPatient,
      id: patientId,
      location: locationHeader
    }, { status: 201 });
  } catch (error: any) {
    console.error('=== PATIENT CREATION API ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ ok: false, message: error.message, error: error.toString() }, { status: 500 });
  }
}
