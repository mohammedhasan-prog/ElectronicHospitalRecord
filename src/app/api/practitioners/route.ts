import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '../../../lib/auth';

const FHIR_BASE_URL = process.env.FHIR_ROOT_HOST;
const TENANT_ID = process.env.TENANT_ID;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    console.log('Practitioner search params:', Object.fromEntries(searchParams.entries()));

    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.error('Failed to get access token');
      return NextResponse.json(
        { error: 'Failed to authenticate with FHIR server' },
        { status: 401 }
      );
    }

  // Build query parameters for FHIR search
  const queryParams = new URLSearchParams();

  // Optional: direct pagination link from previous response (FHIR Bundle.link.next)
  const pageUrl = searchParams.get('pageUrl');
    
    // Oracle Health specific parameter handling for Practitioner
    // Requirements from swagger.json:
    // - One of _id, identifier, family, name, or active is required
    // - Given name requires family parameter
    // - Name parameter has minimum length 2
    const name = searchParams.get('name');
    const family = searchParams.get('family');
    const given = searchParams.get('given');
    const identifier = searchParams.get('identifier');
    const active = searchParams.get('active');
    const _count = searchParams.get('_count') || '20';

    // Validate Oracle Health requirements before building query
    
    // Special validation: if given is provided without family, return error
    if (given && given.trim() && (!family || !family.trim())) {
      return NextResponse.json(
        { 
          error: 'Oracle Health FHIR requires family name when searching by given name',
          details: 'Please provide both family and given name for search'
        },
        { status: 400 }
      );
    }

    // Validate name minimum length
    if (name && name.trim() && name.trim().length < 2) {
      return NextResponse.json(
        { 
          error: 'Name parameter must be at least 2 characters long',
          details: 'Oracle Health FHIR requires minimum 2 characters for name search'
        },
        { status: 400 }
      );
    }

    // Add parameters that are supported by Oracle Health
    if (name && name.trim() && name.trim().length >= 2) {
      queryParams.append('name', name.trim());
    }
    
    if (family && family.trim()) {
      queryParams.append('family', family.trim());
      
      // Only add given if family is also provided (Oracle Health requirement)
      if (given && given.trim()) {
        queryParams.append('given', given.trim());
      }
    }
    
    if (identifier && identifier.trim()) {
      queryParams.append('identifier', identifier.trim());
    }
    
    if (active !== null && active !== undefined) {
      queryParams.append('active', active);
    }

    // Always include count
    queryParams.append('_count', _count);

    // Validate Oracle Health requirement: at least one of the required parameters
    const hasRequiredParam = (name && name.trim() && name.trim().length >= 2) || 
                            (family && family.trim()) || 
                            (identifier && identifier.trim()) || 
                            (active !== null && active !== undefined);
    
    if (!hasRequiredParam) {
      // Default search - get active practitioners
      queryParams.set('active', 'true');
    }

    // If pageUrl is provided, validate it's safe and use it; otherwise construct URL
    let fhirUrl: string;
    if (pageUrl) {
      try {
        const u = new URL(pageUrl);
        const allowedHost = new URL(FHIR_BASE_URL || '').host;
        // Only allow same host and path starting with /r4/{tenant}/Practitioner
        const expectedPrefix = `/${u.pathname.split('/')[1]}/${TENANT_ID}/Practitioner`;
        if (u.host === allowedHost && u.pathname.startsWith(expectedPrefix)) {
          fhirUrl = u.toString();
        } else {
          return NextResponse.json(
            { error: 'Invalid pagination URL', details: 'pageUrl is not allowed' },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid pagination URL', details: 'Malformed pageUrl' },
          { status: 400 }
        );
      }
    } else {
      fhirUrl = `${FHIR_BASE_URL}/${TENANT_ID}/Practitioner?${queryParams.toString()}`;
    }
    console.log('FHIR request URL:', fhirUrl);

    const response = await fetch(fhirUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
      },
    });

    console.log('FHIR response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FHIR error response:', errorText);
      
      return NextResponse.json(
        { 
          error: 'Failed to search practitioners',
          details: errorText,
          status: response.status,
          url: fhirUrl
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('FHIR response data entry count:', data.entry?.length || 0);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in practitioner search:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during practitioner search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}