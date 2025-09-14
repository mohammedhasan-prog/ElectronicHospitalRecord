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
    
    const body = await request.json();
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

    const createdPatient = await response.json();
    console.log('Created patient response:', JSON.stringify(createdPatient, null, 2));

    // Extract the new patient ID from the Location header or response
    const locationHeader = response.headers.get('location');
    console.log('Location header:', locationHeader);
    
    const patientId = locationHeader 
      ? locationHeader.split('/').pop() 
      : createdPatient.id;
    
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
