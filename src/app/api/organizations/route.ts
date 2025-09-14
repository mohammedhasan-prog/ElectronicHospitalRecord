// src/app/api/organizations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    const { searchParams } = new URL(request.url);
    
    // Extract all possible search parameters
    const id = searchParams.get('_id');
    const name = searchParams.get('name');
    const address = searchParams.get('address');
    const identifier = searchParams.get('identifier');
    const type = searchParams.get('type');
    const count = searchParams.get('_count');
    const cursor = searchParams.get('cursor');
    const searchType = searchParams.get('searchType'); // 'caregiver' or 'standard'

    const { TENANT_ID, FHIR_ROOT_HOST = 'https://fhir-ehr-code.cerner.com/r4' } = process.env;

    if (!TENANT_ID) {
      console.error('GET /api/organizations - Missing TENANT_ID');
      return NextResponse.json({ 
        ok: false, 
        message: 'Tenant ID is not configured.' 
      }, { status: 500 });
    }

    let url: string;
    if (cursor) {
      // Use the cursor (next page URL) directly
      url = cursor;
      console.log('GET /api/organizations - Using cursor:', url);
    } else {
      // Determine which search to perform
      const isCaregiver = searchType === 'caregiver' || (id && !name && !address && !identifier && !type);
      
      if (isCaregiver && id) {
        // Caregiver organization search using $get-cg-for-mrcu
        const numericId = id.trim();
        if (!/^\d+$/.test(numericId)) {
          console.error('GET /api/organizations - Invalid ID format for caregiver search:', id);
          return NextResponse.json({ 
            ok: false, 
            message: 'Organization ID must be numeric for caregiver search (e.g., 3304067)',
            details: `The provided ID "${id}" is not valid. Oracle Health FHIR requires numeric organization IDs for the $get-cg-for-mrcu operation.`
          }, { status: 400 });
        }

        const baseUrl = new URL(`${FHIR_ROOT_HOST}/${TENANT_ID}/Organization/$get-cg-for-mrcu`);
        baseUrl.searchParams.append('_id', numericId);
        url = baseUrl.toString();
        console.log('GET /api/organizations - Built $get-cg-for-mrcu URL:', url);
      } else {
        // Standard organization search
        const baseUrl = new URL(`${FHIR_ROOT_HOST}/${TENANT_ID}/Organization`);
        
        // Add search parameters
        if (id) baseUrl.searchParams.append('_id', id);
        if (name) baseUrl.searchParams.append('name', name);
        if (address) baseUrl.searchParams.append('address', address);
        if (identifier) baseUrl.searchParams.append('identifier', identifier);
        if (type) baseUrl.searchParams.append('type', type);
        if (count) baseUrl.searchParams.append('_count', count);
        else baseUrl.searchParams.append('_count', '10'); // Default count
        
        url = baseUrl.toString();
        console.log('GET /api/organizations - Built standard Organization search URL:', url);
      }
    }

    console.log('GET /api/organizations - Making FHIR request to:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GET /api/organizations - FHIR API request failed:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        errorText: errorText
      });
      return NextResponse.json({ 
        ok: false, 
        message: `FHIR API request failed: ${response.statusText}`, 
        details: errorText,
        url: url
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('GET /api/organizations - FHIR response received:', {
      resourceType: data.resourceType,
      total: data.total,
      entryCount: data.entry?.length || 0
    });
    
    // Check for next page link
    const nextLink = data.link?.find((link: any) => link.relation === 'next');
    const nextCursor = nextLink?.url || null;
    
    // Normalize the response for the frontend
    const organizations = (data.entry || []).map((entry: any) => {
      const org = entry.resource;
      return {
        id: org.id,
        name: org.name,
        status: org.active ? 'Active' : 'Inactive',
        type: org.type?.[0]?.text || org.type?.[0]?.coding?.[0]?.display || 'Unknown',
        types: org.type || [],
        identifier: org.identifier || [],
        telecom: org.telecom || [],
        address: org.address || [],
        meta: org.meta,
        fullResource: org // Include full resource for details view
      };
    });

    const result = {
      ok: true,
      organizations,
      pagination: {
        total: data.total,
        nextCursor,
        hasNext: !!nextCursor
      },
      bundle: data // Include full bundle for debugging
    };

    console.log('GET /api/organizations - Sending response:', {
      organizationCount: organizations.length,
      hasNext: !!nextCursor,
      total: data.total
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('GET /api/organizations - Unexpected error:', error);
    return NextResponse.json({ 
      ok: false, 
      message: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
