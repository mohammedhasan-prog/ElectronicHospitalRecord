// src/app/api/organizations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accessToken = await getAccessToken();
    const organizationId = params.id;

    const { TENANT_ID, FHIR_ROOT_HOST = 'https://fhir-ehr-code.cerner.com/r4' } = process.env;

    if (!TENANT_ID) {
      console.error('GET /api/organizations/[id] - Missing TENANT_ID');
      return NextResponse.json({ 
        ok: false, 
        message: 'Tenant ID is not configured.' 
      }, { status: 500 });
    }

    if (!organizationId) {
      console.error('GET /api/organizations/[id] - Missing organization ID');
      return NextResponse.json({ 
        ok: false, 
        message: 'Organization ID is required.' 
      }, { status: 400 });
    }

    // Build the direct organization retrieval URL
    const url = `${FHIR_ROOT_HOST}/${TENANT_ID}/Organization/${organizationId}`;
    
    console.log('GET /api/organizations/[id] - Making FHIR request to:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GET /api/organizations/[id] - FHIR API request failed:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        errorText: errorText
      });

      // Handle specific error cases
      if (response.status === 404) {
        return NextResponse.json({ 
          ok: false, 
          message: `Organization with ID "${organizationId}" not found`,
          details: 'The specified organization ID does not exist or you do not have permission to access it.'
        }, { status: 404 });
      }

      return NextResponse.json({ 
        ok: false, 
        message: `FHIR API request failed: ${response.statusText}`, 
        details: errorText,
        url: url
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('GET /api/organizations/[id] - FHIR response received:', {
      resourceType: data.resourceType,
      id: data.id,
      name: data.name
    });
    
    // Normalize the organization data for the frontend
    const organization = {
      id: data.id,
      name: data.name,
      status: data.active ? 'Active' : 'Inactive',
      type: data.type?.[0]?.text || data.type?.[0]?.coding?.[0]?.display || 'Unknown',
      types: data.type || [],
      identifier: data.identifier || [],
      telecom: data.telecom || [],
      address: data.address || [],
      meta: data.meta,
      fullResource: data // Include full resource for complete details
    };

    const result = {
      ok: true,
      organization,
      fullResource: data // Include full FHIR resource for debugging
    };

    console.log('GET /api/organizations/[id] - Sending response for organization:', organization.name);

    return NextResponse.json(result);

  } catch (error) {
    console.error('GET /api/organizations/[id] - Unexpected error:', error);
    return NextResponse.json({ 
      ok: false, 
      message: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}