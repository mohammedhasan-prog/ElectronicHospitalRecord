// src/app/api/locations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  console.log('🏥 Individual Location API called');
  
  try {
    const locationId = params.id;
    console.log('📋 Location ID:', locationId);

    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.error('❌ Failed to get access token');
      return NextResponse.json(
        { ok: false, message: 'Failed to authenticate with EHR system' },
        { status: 401 }
      );
    }

    const fhirUrl = `${process.env.FHIR_ROOT_HOST}/${process.env.TENANT_ID}/Location/${locationId}`;
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
          message: `Location not found or FHIR API error: ${response.status}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const location = await response.json();
    console.log('📊 Location resource type:', location.resourceType);

    if (location.resourceType !== 'Location') {
      console.error('❌ Expected Location, got:', location.resourceType);
      return NextResponse.json(
        { ok: false, message: 'Invalid response format from FHIR server' },
        { status: 500 }
      );
    }

    // Process location data
    const processedLocation = {
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
      description: location.description || null,
      position: location.position || null,
      hoursOfOperation: location.hoursOfOperation || [],
      availabilityExceptions: location.availabilityExceptions || null,
      endpoint: location.endpoint || [],
      meta: location.meta || {},
      fullResource: location
    };

    const result = {
      ok: true,
      location: processedLocation
    };

    console.log('✅ Successfully retrieved location:', processedLocation.name);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Location retrieval error:', error);
    return NextResponse.json(
      { 
        ok: false, 
        message: 'Internal server error during location retrieval',
        details: error.message
      },
      { status: 500 }
    );
  }
}