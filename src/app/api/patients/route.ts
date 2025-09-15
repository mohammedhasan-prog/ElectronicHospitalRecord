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
    
    // Parse request body
    let body: any = {};
    try {
      const raw = await request.text();
      if (raw && raw.trim().length > 0) {
        body = JSON.parse(raw);
      }
    } catch (e: any) {
      return NextResponse.json({ 
        ok: false, 
        message: 'Invalid JSON body', 
        error: e?.message || String(e) 
      }, { status: 400 });
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

    // Validation for required fields per Oracle Health specification
    const validationIssues: string[] = [];

    // 1. Validate identifier (required with assigner.reference to Organization)
    if (!Array.isArray(patientResource.identifier) || patientResource.identifier.length === 0) {
      patientResource.identifier = [{}];
    }

    const firstIdentifier = patientResource.identifier[0];
    
    // Ensure assigner.reference is set to a valid Organization
    const ASSIGNER_ORG_ID = process.env.ASSIGNER_ORG_ID || '675844'; // Default fallback
    if (!firstIdentifier.assigner || !firstIdentifier.assigner.reference) {
      if (!firstIdentifier.assigner) {
        firstIdentifier.assigner = {};
      }
      firstIdentifier.assigner.reference = `Organization/${ASSIGNER_ORG_ID}`;
    } else {
      // Validate existing reference format
      const ref = firstIdentifier.assigner.reference;
      if (!ref.startsWith('Organization/')) {
        firstIdentifier.assigner.reference = `Organization/${ref}`;
      }
    }

    // 2. Validate name (required)
    if (!Array.isArray(patientResource.name) || patientResource.name.length === 0) {
      validationIssues.push('name is required and must contain at least one name entry.');
    } else {
      const primaryName = patientResource.name[0];
      if (!primaryName.family && (!primaryName.given || primaryName.given.length === 0)) {
        validationIssues.push('name must contain either family name or given name.');
      }
      
      // Ensure name has proper use field
      if (!primaryName.use) {
        primaryName.use = 'official';
      }
    }

    // 3. Validate gender (convert to lowercase if provided)
    if (patientResource.gender) {
      const validGenders = ['male', 'female', 'other', 'unknown'];
      if (!validGenders.includes(patientResource.gender.toLowerCase())) {
        validationIssues.push(`Invalid gender "${patientResource.gender}". Valid values: male, female, other, unknown`);
      } else {
        patientResource.gender = patientResource.gender.toLowerCase();
      }
    }

    // 4. Validate birthDate format (YYYY-MM-DD)
    if (patientResource.birthDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(patientResource.birthDate)) {
        validationIssues.push('birthDate must be in YYYY-MM-DD format.');
      } else {
        const birthDate = new Date(patientResource.birthDate);
        const today = new Date();
        if (birthDate > today) {
          validationIssues.push('birthDate cannot be in the future.');
        }
      }
    }

    // 5. Validate telecom if provided
    if (Array.isArray(patientResource.telecom)) {
      for (let i = 0; i < patientResource.telecom.length; i++) {
        const telecom = patientResource.telecom[i];
        
        // Ensure system is valid
        const validSystems = ['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'];
        if (!validSystems.includes(telecom.system)) {
          validationIssues.push(`telecom[${i}].system must be one of: ${validSystems.join(', ')}`);
        }
        
        // Validate phone numbers
        if (telecom.system === 'phone' && telecom.value) {
          const phoneDigits = telecom.value.replace(/\D/g, '');
          if (phoneDigits.length < 10) {
            validationIssues.push(`telecom[${i}] phone number must have at least 10 digits.`);
          }
        }
        
        // Validate email format
        if (telecom.system === 'email' && telecom.value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(telecom.value)) {
            validationIssues.push(`telecom[${i}] email format is invalid.`);
          }
        }
        
        // Ensure use field is valid if provided
        if (telecom.use) {
          const validUses = ['home', 'work', 'temp', 'old', 'mobile'];
          if (!validUses.includes(telecom.use)) {
            validationIssues.push(`telecom[${i}].use must be one of: ${validUses.join(', ')}`);
          }
        }
      }
    }

    // 6. Validate address if provided
    if (Array.isArray(patientResource.address)) {
      for (let i = 0; i < patientResource.address.length; i++) {
        const address = patientResource.address[i];
        
        // Validate use field
        if (address.use) {
          const validUses = ['home', 'work', 'temp', 'old', 'billing'];
          if (!validUses.includes(address.use)) {
            validationIssues.push(`address[${i}].use must be one of: ${validUses.join(', ')}`);
          }
        }
        
        // Validate US state codes
        if (address.state && address.country && (address.country.toUpperCase() === 'US' || address.country.toLowerCase() === 'united states')) {
          const usStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];
          if (!usStates.includes(address.state.toUpperCase())) {
            validationIssues.push(`address[${i}].state "${address.state}" is not a valid US state code.`);
          }
        }
      }
    }

    // 7. Validate maritalStatus if provided
    if (patientResource.maritalStatus && patientResource.maritalStatus.coding) {
      const coding = Array.isArray(patientResource.maritalStatus.coding) 
        ? patientResource.maritalStatus.coding[0] 
        : patientResource.maritalStatus.coding;
        
      if (coding && coding.code) {
        const validCodes = ['A', 'D', 'I', 'L', 'M', 'P', 'S', 'T', 'U', 'W'];
        if (!validCodes.includes(coding.code)) {
          validationIssues.push(`maritalStatus.coding.code "${coding.code}" is invalid. Valid codes: ${validCodes.join(', ')}`);
        }
        
        // Ensure system is set
        if (!coding.system) {
          coding.system = 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus';
        }
        
        // Add display text if missing
        const displayMap: Record<string, string> = {
          'A': 'Annulled', 'D': 'Divorced', 'I': 'Interlocutory', 'L': 'Legally Separated',
          'M': 'Married', 'P': 'Polygamous', 'S': 'Never Married', 'T': 'Domestic Partner',
          'U': 'Unmarried', 'W': 'Widowed'
        };
        if (!coding.display && displayMap[coding.code]) {
          coding.display = displayMap[coding.code];
        }
      }
    }

    // 8. Validate extensions format if provided
    if (Array.isArray(patientResource.extension)) {
      for (let i = 0; i < patientResource.extension.length; i++) {
        const ext = patientResource.extension[i];
        if (!ext.url) {
          validationIssues.push(`extension[${i}] must have a url property.`);
        }
      }
    }

    if (validationIssues.length > 0) {
      return NextResponse.json({
        ok: false,
        message: 'Patient validation failed',
        details: validationIssues,
        code: 'VALIDATION_ERROR'
      }, { status: 400 });
    }

    // Clean up the patient resource - remove undefined fields
    const cleanPatient = JSON.parse(JSON.stringify(patientResource, (key, value) => {
      return value === undefined ? undefined : value;
    }));

    const url = `${FHIR_ROOT_HOST}/${TENANT_ID}/Patient`;
    console.log('FHIR API URL:', url);
    console.log('Clean patient payload:', JSON.stringify(cleanPatient, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
      },
      body: JSON.stringify(cleanPatient),
    });

    console.log('FHIR API Response Status:', response.status);
    console.log('FHIR API Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('FHIR API Error Response:', errorText);
      
      let errorDetails = errorText;
      let outcomeSummary: string | undefined;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson;
        
        if (errorJson?.resourceType === 'OperationOutcome' && Array.isArray(errorJson.issue)) {
          const issues = errorJson.issue.map((issue: any) => {
            const parts = [];
            if (issue.severity) parts.push(`[${issue.severity}]`);
            if (issue.code) parts.push(issue.code);
            if (issue.details?.text) parts.push(issue.details.text);
            if (issue.diagnostics) parts.push(issue.diagnostics);
            return parts.join(' ');
          });
          outcomeSummary = issues.join(' | ');
        }
      } catch (e) {
        console.log('Error response is not valid JSON');
      }
      
      return NextResponse.json({ 
        ok: false, 
        message: `FHIR API request failed: ${response.statusText}${outcomeSummary ? ` - ${outcomeSummary}` : ''}`,
        details: errorDetails,
        status: response.status,
        code: 'FHIR_ERROR'
      }, { status: response.status });
    }

    // Handle successful response
    let createdPatient: any = null;
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/fhir+json')) {
      try {
        createdPatient = await response.json();
      } catch (e) {
        // Empty body is acceptable for 201 responses
        console.log('Response body is empty or not JSON');
      }
    }

    // Extract patient ID from Location header or response body
    const locationHeader = response.headers.get('location');
    let patientId = locationHeader?.split('/').pop();
    
    if (!patientId && createdPatient?.id) {
      patientId = createdPatient.id;
    }

    console.log('Created patient ID:', patientId);
    console.log('=== PATIENT CREATION API SUCCESS ===');

    return NextResponse.json({ 
      ok: true, 
      patient: createdPatient,
      id: patientId,
      location: locationHeader,
      message: 'Patient created successfully'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('=== PATIENT CREATION API ERROR ===');
    console.error('Error details:', error);
    return NextResponse.json({ 
      ok: false, 
      message: error.message, 
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
