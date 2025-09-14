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
