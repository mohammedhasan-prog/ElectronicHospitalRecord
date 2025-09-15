// src/app/api/patients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    const { searchParams } = new URL(request.url);

    const name = searchParams.get('name')?.trim() || '';
    const identifier = searchParams.get('identifier')?.trim() || '';
    const cursor = searchParams.get('cursor'); // For pagination
    const countParam = searchParams.get('_count');
    const _count = countParam && /^\d+$/.test(countParam) ? countParam : '10';

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

      // Identifier search takes precedence when provided
      if (identifier.length > 0) {
        baseUrl.searchParams.append('identifier', identifier);
      } else if (name.length > 0) {
        // Support "family, given" or plain name search
        const hasComma = name.includes(',');
        if (hasComma) {
          const [familyRaw, givenRaw] = name.split(',');
          const family = (familyRaw || '').trim();
          const given = (givenRaw || '').trim();

          // Enforce 3+ chars per Oracle Health guidance to avoid 400/422
          if ((family && family.length < 3) || (given && given.length < 3)) {
            return NextResponse.json({
              ok: false,
              message: 'When using "Last, First" name format, each part must be at least 3 characters.',
              hint: 'Try entering at least 3 letters for both family and given names or use an identifier (MRN).',
            }, { status: 400 });
          }

          if (family) baseUrl.searchParams.append('family', family);
          if (given) baseUrl.searchParams.append('given', given);

          // If one part missing, also include a general name contains for the provided token
          if (!family && given) baseUrl.searchParams.append('name', given);
          if (!given && family) baseUrl.searchParams.append('name', family);
        } else {
          if (name.length < 3) {
            return NextResponse.json({
              ok: false,
              message: 'Name search requires at least 3 characters to avoid FHIR 400/422 errors.',
              hint: 'Type 3+ letters or search by identifier (MRN).',
            }, { status: 400 });
          }
          baseUrl.searchParams.append('name', name);
        }
      }

      baseUrl.searchParams.append('_count', _count);
      url = baseUrl.toString();
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
      },
    });

    const fhirUrlUsed = url; // For diagnostics

    if (!response.ok) {
      const errorText = await response.text();
      let outcome: any = undefined;
      try {
        outcome = JSON.parse(errorText);
      } catch {}
      return NextResponse.json({ ok: false, message: `FHIR API request failed: ${response.statusText}`, details: outcome || errorText, fhirUrlUsed }, { status: response.status });
    }

    const data = await response.json();

    // Extract OperationOutcome warnings (non-fatal) if present in a bundle
    const outcomeWarnings: string[] = [];
    if (Array.isArray(data.entry)) {
      for (const e of data.entry) {
        if (e?.resource?.resourceType === 'OperationOutcome' && Array.isArray(e.resource.issue)) {
          for (const iss of e.resource.issue) {
            const parts: string[] = [];
            if (iss?.severity) parts.push(`[${String(iss.severity)}]`);
            if (iss?.code) parts.push(String(iss.code));
            if (iss?.details?.text) parts.push(String(iss.details.text));
            if (iss?.diagnostics) parts.push(String(iss.diagnostics));
            if (parts.length) outcomeWarnings.push(parts.join(' '));
          }
        }
      }
    }

    // Check for next page link
    const nextLink = data.link?.find((link: any) => link.relation === 'next');
    const nextCursor = nextLink?.url || null;

    // Normalize the response for the frontend
    const patients = data.entry?.filter((entry: any) => entry.resource?.resourceType === 'Patient').map((entry: any) => {
      const resource = entry.resource;
      const nm = Array.isArray(resource.name) ? resource.name[0] : undefined;
      const displayName = nm?.text || [
        ...(Array.isArray(nm?.given) ? nm.given : nm?.given ? [nm.given] : []),
        nm?.family,
      ].filter(Boolean).join(' ') || 'N/A';
      const identifiers = Array.isArray(resource.identifier) ? resource.identifier : [];
      const normIdentifiers = identifiers
        .filter((id: any) => id && (id.value || id.system))
        .map((id: any) => ({ value: id.value, type: id.type }));
      return {
        id: resource.id,
        name: displayName,
        gender: resource.gender || 'N/A',
        birthDate: resource.birthDate || 'N/A',
        identifier: normIdentifiers,
      };
    }) || [];

    // Provide the self link for request logging
    const selfLink = data.link?.find((l: any) => l.relation === 'self')?.url || fhirUrlUsed;

    return NextResponse.json({
      ok: true,
      patients,
      nextCursor,
      total: data.total || null,
      diagnostics: { fhirUrlUsed: selfLink, outcomeWarnings },
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

    // Determine if we need assigner.reference. Prefer identifier.system/value when provided.
    const idArray = Array.isArray(patientResource.identifier) ? patientResource.identifier : [];
    const id0 = idArray[0] || {};
    const hasSystem = typeof id0.system === 'string' && id0.system.trim().length > 0;
    const hasValue = typeof id0.value === 'string' && id0.value.trim().length > 0;

    if (!hasSystem && !hasValue) {
      try {
        await ensureAssignerReference();
      } catch (cfgErr: any) {
        return NextResponse.json({
          ok: false,
          message: 'Configuration required to create Patient',
          details: cfgErr.message,
          hint: 'Provide identifier.system and identifier.value (preferred) or set ASSIGNER_ORG_ID in .env.local to your Organization ID (numbers only or Organization/{id}).',
        }, { status: 400 });
      }
    }

    // Optionally validate that the assigner Organization exists in this tenant
    try {
      const VERIFY_ASSIGNER_ORG = String(process.env.VERIFY_ASSIGNER_ORG || '').toLowerCase() === 'true';
      if (VERIFY_ASSIGNER_ORG) {
        const identifiers = Array.isArray(patientResource.identifier) ? patientResource.identifier : [];
        const first = identifiers[0] ?? {};
        const assignerRef = first?.assigner?.reference as string | undefined;
        if (assignerRef && assignerRef.startsWith('Organization/')) {
          const orgId = assignerRef.split('/')[1];
          const verifyUrl = `${FHIR_ROOT_HOST}/${TENANT_ID}/Organization/${orgId}`;
          const verifyResp = await fetch(verifyUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/fhir+json',
            }
          });
          if (!verifyResp.ok) {
            return NextResponse.json({
              ok: false,
              message: `Assigner organization not found or inaccessible: ${assignerRef}`,
              details: await verifyResp.text(),
              hint: 'Open Organizations in the app to copy a valid Organization ID, or set ASSIGNER_ORG_ID in .env.local to a valid numeric ID.',
            }, { status: 400 });
          }
        }
      }
    } catch (e: any) {
      // Non-fatal: continue if verification cannot run
    }

    // Validate required Patient fields commonly enforced by Oracle Health
    const validationIssues: string[] = [];
    
    // Check if we need to enforce identifier.value (tenant-specific requirement)
    const REQUIRE_IDENTIFIER_VALUE = String(process.env.REQUIRE_IDENTIFIER_VALUE || 'true').toLowerCase() === 'true';
    const identifiers = Array.isArray(patientResource.identifier) ? patientResource.identifier : [];
    const firstIdentifier = identifiers[0] ?? {};
    const hasIdentifierValue = typeof firstIdentifier.value === 'string' && firstIdentifier.value.trim().length > 0;
    
    if (REQUIRE_IDENTIFIER_VALUE && !hasIdentifierValue) {
      // Try auto-generation first before failing
      const AUTO_GENERATE_IDENTIFIER = String(process.env.AUTO_GENERATE_IDENTIFIER || 'false').toLowerCase() === 'true';
      if (!AUTO_GENERATE_IDENTIFIER) {
        validationIssues.push('identifier[0].value is required by your Oracle Health tenant. Set AUTO_GENERATE_IDENTIFIER=true to auto-generate, or add an MRN manually.');
      }
    }
    // Name: ensure at least one of given/family is present
    const firstName = Array.isArray(patientResource.name) ? patientResource.name[0] : undefined;
    const hasGiven = firstName && (
      (Array.isArray(firstName.given) && firstName.given.some((g: any) => String(g || '').trim().length > 0)) ||
      (typeof firstName.given === 'string' && firstName.given.trim().length > 0)
    );
    const hasFamily = firstName && typeof firstName.family === 'string' && firstName.family.trim().length > 0;
    if (!hasGiven && !hasFamily) {
      validationIssues.push('At least one name with family or given is required.');
    }
    // birthDate should not be in the future and must be YYYY-MM-DD if provided
    if (patientResource.birthDate) {
      const d = new Date(patientResource.birthDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(d.getTime())) {
        validationIssues.push('birthDate must be a valid date in format YYYY-MM-DD.');
      } else {
        if (d > today) {
          validationIssues.push('birthDate cannot be in the future.');
        }
      }
    }

    // Additional Oracle Health-specific validations
    // Validate address if provided
    if (Array.isArray(patientResource.address) && patientResource.address.length > 0) {
      const addr = patientResource.address[0];
      if (addr.state && typeof addr.state === 'string') {
        const state = addr.state.trim();
        // Validate US state codes (Oracle often expects proper codes)
        const usStateCodes = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];
        if (addr.country === 'United States' || addr.country === 'US') {
          if (!usStateCodes.includes(state.toUpperCase())) {
            validationIssues.push(`Invalid US state code "${state}". Use standard 2-letter codes (e.g., MO, CA, NY).`);
          }
        }
      }
      if (addr.country && typeof addr.country === 'string') {
        const country = addr.country.trim();
        // Suggest ISO codes for common countries
        const countryMappings: Record<string, string> = {
          'india': 'IN',
          'united states': 'US',
          'united states of america': 'US',
          'usa': 'US',
          'canada': 'CA',
          'united kingdom': 'GB',
          'uk': 'GB'
        };
        const lowerCountry = country.toLowerCase();
        if (countryMappings[lowerCountry]) {
          // Auto-correct common country names to ISO codes
          addr.country = countryMappings[lowerCountry];
        }
      }
    }

    // Validate maritalStatus coding
    if (patientResource.maritalStatus && patientResource.maritalStatus.coding) {
      const coding = Array.isArray(patientResource.maritalStatus.coding) ? patientResource.maritalStatus.coding[0] : patientResource.maritalStatus.coding;
      if (coding && coding.code) {
        const validMaritalCodes = ['A', 'D', 'I', 'L', 'M', 'P', 'S', 'T', 'U', 'W'];
        if (!validMaritalCodes.includes(coding.code)) {
          validationIssues.push(`Invalid marital status code "${coding.code}". Valid codes: A(Annulled), D(Divorced), I(Interlocutory), L(Legally Separated), M(Married), P(Polygamous), S(Never Married), T(Domestic Partner), U(Unmarried), W(Widowed).`);
        }
        // Add display text for Oracle compatibility
        if (!coding.display) {
          const displayMap: Record<string, string> = {
            'A': 'Annulled', 'D': 'Divorced', 'I': 'Interlocutory', 'L': 'Legally Separated',
            'M': 'Married', 'P': 'Polygamous', 'S': 'Never Married', 'T': 'Domestic Partner',
            'U': 'Unmarried', 'W': 'Widowed'
          };
          coding.display = displayMap[coding.code];
        }
      }
    }

    // Validate telecom values
    if (Array.isArray(patientResource.telecom)) {
      for (const tel of patientResource.telecom) {
        if (tel.system === 'phone' && tel.value) {
          // Basic phone validation - Oracle often rejects malformed phones
          const phone = String(tel.value).replace(/\D/g, '');
          if (phone.length < 10 || phone.length > 15) {
            validationIssues.push(`Phone number "${tel.value}" should be 10-15 digits. Include area code.`);
          }
        }
        if (tel.system === 'email' && tel.value) {
          // Basic email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(tel.value))) {
            validationIssues.push(`Email "${tel.value}" is not in valid format.`);
          }
        }
      }
    }

    if (validationIssues.length > 0) {
      const summary = validationIssues.join(' ');
      return NextResponse.json({
        ok: false,
        message: `Patient validation failed before sending to FHIR. ${summary}`,
        details: validationIssues,
        hint: 'Add AUTO_GENERATE_IDENTIFIER=true to .env.local to auto-generate MRNs, or manually add identifier.value. Also verify: proper state codes, 10+ digit phones, valid birthDate.',
      }, { status: 400 });
    }

    // Optionally auto-generate an identifier value when missing (for sandbox/demo)
    // Configure via env: AUTO_GENERATE_IDENTIFIER=true, IDENTIFIER_SYSTEM, IDENTIFIER_PREFIX
    try {
      const AUTO_GENERATE_IDENTIFIER = String(process.env.AUTO_GENERATE_IDENTIFIER || 'false').toLowerCase() === 'true';
      if (AUTO_GENERATE_IDENTIFIER) {
        const identifiers = Array.isArray(patientResource.identifier) ? patientResource.identifier : [];
        if (identifiers.length === 0) {
          patientResource.identifier = [{}];
        }
        const firstIdentifier = patientResource.identifier[0];
        if (!firstIdentifier.value || String(firstIdentifier.value).trim().length === 0) {
          const prefix = process.env.IDENTIFIER_PREFIX || 'MRN';
          const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
          const random = Math.floor(Math.random() * 900) + 100; // 3-digit random
          firstIdentifier.value = `${prefix}${timestamp}${random}`;
          console.log('Auto-generated identifier.value:', firstIdentifier.value);
        }
        if (!firstIdentifier.system || String(firstIdentifier.system).trim().length === 0) {
          firstIdentifier.system = process.env.IDENTIFIER_SYSTEM || 'urn:oid:1.2.3.4.5.6.7.8.9';
          console.log('Auto-generated identifier.system:', firstIdentifier.system);
        }
        patientResource.identifier[0] = firstIdentifier;
      }
    } catch (e) {
      console.error('Error in auto-generation:', e);
      // Non-fatal; continue without auto-generation
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
      let outcomeSummary: string | undefined;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson;
        console.log('Parsed error JSON:', JSON.stringify(errorJson, null, 2));
        if (errorJson?.resourceType === 'OperationOutcome' && Array.isArray(errorJson.issue)) {
          const parts: string[] = [];
          for (const iss of errorJson.issue) {
            const segs: string[] = [];
            if (iss?.severity) segs.push(`[${String(iss.severity)}]`);
            if (iss?.code) segs.push(String(iss.code));
            if (iss?.details?.text) segs.push(String(iss.details.text));
            if (Array.isArray(iss?.details?.coding)) {
              for (const c of iss.details.coding) {
                if (c?.display) segs.push(String(c.display));
                else if (c?.code) segs.push(String(c.code));
              }
            }
            if (iss?.diagnostics) segs.push(String(iss.diagnostics));
            if (segs.length > 0) parts.push(segs.join(' '));
          }
          if (parts.length > 0) outcomeSummary = parts.join(' | ');
        }
      } catch (e) {
        console.log('Error response is not valid JSON');
      }
      
      const baseMessage = `FHIR API request failed: ${response.statusText}`;
      const message = outcomeSummary ? `${baseMessage} - ${outcomeSummary}` : baseMessage;
      // Provide a targeted hint for common identifier-related errors
      const hint = outcomeSummary && /identifier/i.test(outcomeSummary) && /value/i.test(outcomeSummary)
        ? 'Your tenant may require identifier.value (MRN). Provide one in the form or set AUTO_GENERATE_IDENTIFIER=true to synthesize a demo value.'
        : undefined;

      return NextResponse.json({ 
        ok: false, 
        message, 
        details: errorDetails,
        status: response.status,
        url: url,
        payload: patientResource,
        hint,
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
