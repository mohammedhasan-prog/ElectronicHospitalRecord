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
    const { id } = await params;
    const accessToken = await getAccessToken();
    const body = await request.json();
    const ifMatch = request.headers.get('if-match');

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

    const url = `${FHIR_ROOT_HOST}/${TENANT_ID}/Patient/${id}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
        'If-Match': ifMatch,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        ok: false, 
        message: `FHIR API request failed: ${response.statusText}`, 
        details: errorText 
      }, { status: response.status });
    }

    const updatedPatient = await response.json();

    return NextResponse.json({ 
      ok: true, 
      patient: updatedPatient,
      etag: response.headers.get('etag')
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}