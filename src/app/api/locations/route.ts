// src/app/api/locations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  console.log('🏥 Location Search API called');
  
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.error('❌ Failed to get access token');
      return NextResponse.json(
        { ok: false, message: 'Failed to authenticate with EHR system' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    console.log('📋 Search params:', Object.fromEntries(searchParams.entries()));

    // Build FHIR query parameters
    const fhirParams = new URLSearchParams();
    
    // Supported Location search parameters
    const supportedParams = [
      '_id',
      '_count',
      '-physicalType', // Note: Oracle Health uses -physicalType (with hyphen)
      'address',
      'address-city', 
      'address-postalcode',
      'address-state',
      'identifier',
      'name',
      'organization'
    ];

    // Add search parameters
    supportedParams.forEach(param => {
      const value = searchParams.get(param);
      if (value) {
        fhirParams.append(param, value);
      }
    });

    // Validate required parameter combinations per Oracle Health requirements
    const hasId = fhirParams.has('_id');
    const hasPhysicalType = fhirParams.has('-physicalType');
    const hasName = fhirParams.has('name');
    const hasOrganization = fhirParams.has('organization');
    const hasAddressCity = fhirParams.has('address-city');
    const hasAddressState = fhirParams.has('address-state');
    const hasAddressPostal = fhirParams.has('address-postalcode');
    const hasAddress = fhirParams.has('address');
    const hasIdentifier = fhirParams.has('identifier');

    // Either _id or -physicalType is required. If missing but name/organization present, default to bu (building) to support UI typeahead.
    if (!hasId && !hasPhysicalType) {
      if (hasName || hasOrganization || hasAddress || hasAddressCity || hasAddressState || hasAddressPostal || hasIdentifier) {
        console.warn('⚠️ Missing -physicalType; defaulting to bu for search');
        fhirParams.append('-physicalType', 'bu');
      } else {
        console.error('❌ Either _id or -physicalType parameter is required');
        return NextResponse.json(
          { 
            ok: false, 
            message: 'Either _id or -physicalType parameter is required for Location search'
          },
          { status: 400 }
        );
      }
    }

    // Validate name parameter dependencies
    if (hasName && !fhirParams.has('-physicalType') && !hasIdentifier && !hasAddress && !hasAddressState && !hasAddressCity && !hasAddressPostal) {
      console.error('❌ Name parameter requires additional search criteria');
      return NextResponse.json(
        { 
          ok: false, 
          message: 'When searching by name, you must also include one of: -physicalType, identifier, address, address-state, address-city, or address-postalcode'
        },
        { status: 400 }
      );
    }

    // Validate organization parameter dependencies
    if (hasOrganization && !fhirParams.has('-physicalType') && !hasIdentifier && !hasAddress && !hasAddressState && !hasAddressCity && !hasAddressPostal) {
      console.error('❌ Organization parameter requires additional search criteria');
      return NextResponse.json(
        { 
          ok: false, 
          message: 'When searching by organization, you must also include one of: -physicalType, identifier, address, address-state, address-city, or address-postalcode'
        },
        { status: 400 }
      );
    }

    // Validate address-city dependencies
    if (hasAddressCity && !hasAddressState && !hasAddressPostal) {
      console.error('❌ Address-city requires address-state or address-postalcode');
      return NextResponse.json(
        { 
          ok: false, 
          message: 'When searching by address-city, you must also include address-state or address-postalcode'
        },
        { status: 400 }
      );
    }

    // Set default count if not specified
    if (!fhirParams.has('_count')) {
      fhirParams.append('_count', '20');
    }

    // Handle pagination
    const cursor = searchParams.get('cursor');
    if (cursor) {
      fhirParams.append('_getpagesoffset', cursor);
    }

    const fhirUrl = `${process.env.FHIR_ROOT_HOST}/${process.env.TENANT_ID}/Location?${fhirParams.toString()}`;
    console.log('🔗 FHIR URL:', fhirUrl);

    const response = await fetch(fhirUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json+fhir',
        'Content-Type': 'application/json+fhir'
      }
    });

    console.log('📡 FHIR Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ FHIR API error:', errorText);
      return NextResponse.json(
        { 
          ok: false, 
          message: `FHIR API error: ${response.status}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const fhirData = await response.json();
    console.log('📊 FHIR Response bundle type:', fhirData.resourceType);
    console.log('📊 Location entries found:', fhirData.entry?.length || 0);

    if (fhirData.resourceType !== 'Bundle') {
      console.error('❌ Expected Bundle, got:', fhirData.resourceType);
      return NextResponse.json(
        { ok: false, message: 'Invalid response format from FHIR server' },
        { status: 500 }
      );
    }

    // Process locations
    const locations = (fhirData.entry || []).map((entry: any) => {
      const location = entry.resource;
      
      return {
        id: location.id,
        name: location.name || 'Unnamed Location',
        status: location.status || 'unknown',
        physicalType: location.physicalType?.text || location.physicalType?.coding?.[0]?.display || 'Unknown',
        alias: location.alias || [],
        address: location.address || {},
        telecom: location.telecom || [],
        managingOrganization: location.managingOrganization || null,
        partOf: location.partOf || null,
        identifier: location.identifier || [],
        mode: location.mode || 'instance',
        fullResource: location
      };
    });

    // Handle pagination
    const nextLink = fhirData.link?.find((link: any) => link.relation === 'next');
    let nextCursor = null;
    if (nextLink) {
      const nextUrl = new URL(nextLink.url);
      nextCursor = nextUrl.searchParams.get('_getpagesoffset');
    }

    const result = {
      ok: true,
      locations,
      pagination: {
        total: fhirData.total || locations.length,
        hasNext: !!nextCursor,
        nextCursor
      }
    };

    console.log('✅ Successfully processed', locations.length, 'locations');
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Location search error:', error);
    return NextResponse.json(
      { 
        ok: false, 
        message: 'Internal server error during location search',
        details: error.message
      },
      { status: 500 }
    );
  }
}