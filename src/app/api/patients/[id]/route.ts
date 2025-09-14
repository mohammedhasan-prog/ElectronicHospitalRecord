// src/app/api/patients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const accessToken = await getAccessToken();

    const { TENANT_ID, FHIR_ROOT_HOST = 'https://fhir-ehr-code.cerner.com/r4' } = process.env;

    if (!TENANT_ID) {
      return NextResponse.json({ ok: false, message: 'Tenant ID is not configured.' }, { status: 500 });
    }

    const url = `${FHIR_ROOT_HOST}/${TENANT_ID}/Patient/${id}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        ok: false, 
        message: `FHIR API request failed: ${response.statusText}`, 
        details: errorText 
      }, { status: response.status });
    }

    const patient = await response.json();
    
    // Normalize patient data for frontend
    const normalizedPatient = {
      id: patient.id,
      name: patient.name?.[0]?.text || 'N/A',
      given: patient.name?.[0]?.given || [],
      family: patient.name?.[0]?.family || '',
      gender: patient.gender || 'N/A',
      birthDate: patient.birthDate || 'N/A',
      telecom: patient.telecom || [],
      address: patient.address || [],
      maritalStatus: patient.maritalStatus?.text || 'N/A',
      active: patient.active ?? true,
      meta: patient.meta,
    };

    return NextResponse.json({ 
      ok: true, 
      patient: normalizedPatient,
      etag: response.headers.get('etag') // For If-Match header in updates
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    console.log('=== PATIENT UPDATE API START ===');
    const { id } = await params;
    console.log('Patient ID:', id);
    
    const accessToken = await getAccessToken();
    console.log('Access token obtained:', accessToken.substring(0, 20) + '...');
    
    const body = await request.json();
    console.log('Raw request body:', JSON.stringify(body, null, 2));
    
    const ifMatch = request.headers.get('if-match');
    console.log('If-Match header:', ifMatch);

    const { TENANT_ID, FHIR_ROOT_HOST = 'https://fhir-ehr-code.cerner.com/r4' } = process.env;

    if (!TENANT_ID) {
      return NextResponse.json({ ok: false, message: 'Tenant ID is not configured.' }, { status: 500 });
    }

    if (!ifMatch) {
      return NextResponse.json({ 
        ok: false, 
        message: 'If-Match header is required for patient updates.' 
      }, { status: 400 });
    }

    // Extract the patient resource from the request body
    // The frontend sends { patient: { ...patientResource } }
    const patientResource = body.patient || body;
    console.log('Extracted patient resource:', JSON.stringify(patientResource, null, 2));

    const url = `${FHIR_ROOT_HOST}/${TENANT_ID}/Patient/${id}`;
    console.log('FHIR API URL:', url);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
        'If-Match': ifMatch,
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

    const updatedPatient = await response.json();
    console.log('Updated patient response:', JSON.stringify(updatedPatient, null, 2));
    console.log('=== PATIENT UPDATE API SUCCESS ===');

    return NextResponse.json({ 
      ok: true, 
      patient: updatedPatient,
      etag: response.headers.get('etag')
    });
  } catch (error: any) {
    console.error('=== PATIENT UPDATE API ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ ok: false, message: error.message, error: error.toString() }, { status: 500 });
  }
}