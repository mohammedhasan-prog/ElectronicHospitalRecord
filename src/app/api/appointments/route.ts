import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '../../../lib/auth';

const FHIR_BASE_URL = process.env.FHIR_ROOT_HOST;
const TENANT_ID = process.env.TENANT_ID;

// Oracle Health FHIR Appointment interface - based on working Python script
interface AppointmentCreate {
  resourceType: 'Appointment';
  status: 'proposed' | 'booked';
  serviceType?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  reasonCode?: Array<{
    text: string;
  }>;
  comment?: string;
  participant: Array<{
    actor: {
      reference: string;
      display?: string;
    };
    status: 'accepted' | 'needs-action';
  }>;
  requestedPeriod?: Array<{
    start: string;
    end: string;
  }>;
  slot?: Array<{
    reference: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    console.log('Appointment search params:', Object.fromEntries(searchParams.entries()));

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
    
    // Add all search parameters to the FHIR query
    for (const [key, value] of searchParams.entries()) {
      if (value) {
        queryParams.append(key, value);
      }
    }

    // Set default count if not specified
    if (!queryParams.has('_count')) {
      queryParams.append('_count', '20');
    }

    const url = `${FHIR_BASE_URL}/${TENANT_ID}/Appointment?${queryParams.toString()}`;
    console.log('FHIR request URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
      },
    });

    console.log('FHIR response status:', response.status);
    console.log('FHIR response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FHIR error response:', errorText);
      
      return NextResponse.json(
        { 
          error: 'Failed to search appointments',
          details: errorText,
          status: response.status,
          url: url
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('FHIR response data:', JSON.stringify(data, null, 2));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in appointment search:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during appointment search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Appointment creation request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.resourceType || body.resourceType !== 'Appointment') {
      return NextResponse.json(
        { error: 'resourceType must be "Appointment"' },
        { status: 400 }
      );
    }

    if (!body.status || !['proposed', 'booked'].includes(body.status)) {
      return NextResponse.json(
        { error: 'status must be either "proposed" or "booked"' },
        { status: 400 }
      );
    }

    if (!body.participant || !Array.isArray(body.participant) || body.participant.length === 0) {
      return NextResponse.json(
        { error: 'participant is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate status-specific requirements based on working Python script
    if (body.status === 'proposed') {
      // For proposed appointments, we need participant and requestedPeriod
      if (!body.participant || !Array.isArray(body.participant) || body.participant.length === 0) {
        return NextResponse.json(
          { error: 'participant is required for proposed appointments' },
          { status: 400 }
        );
      }

      if (!body.requestedPeriod || !Array.isArray(body.requestedPeriod) || body.requestedPeriod.length === 0) {
        return NextResponse.json(
          { error: 'requestedPeriod is required for proposed appointments' },
          { status: 400 }
        );
      }

      // Validate that we have at least one patient
      const hasPatient = body.participant.some((p: any) => 
        p.actor?.reference?.startsWith('Patient/')
      );

      if (!hasPatient) {
        return NextResponse.json(
          { error: 'proposed appointments must have at least one patient participant' },
          { status: 400 }
        );
      }
    } else if (body.status === 'booked') {
      // For booked appointments, we need slot and participant
      if (!body.slot || !Array.isArray(body.slot) || body.slot.length === 0) {
        return NextResponse.json(
          { error: 'slot is required for booked appointments' },
          { status: 400 }
        );
      }

      if (!body.participant || !Array.isArray(body.participant) || body.participant.length === 0) {
        return NextResponse.json(
          { error: 'participant is required for booked appointments' },
          { status: 400 }
        );
      }

      // Validate that we have at least one patient
      const hasPatient = body.participant.some((p: any) => 
        p.actor?.reference?.startsWith('Patient/')
      );

      if (!hasPatient) {
        return NextResponse.json(
          { error: 'booked appointments must have at least one patient participant' },
          { status: 400 }
        );
      }
    }

    // Basic validation for all participants
    for (const participant of body.participant) {
      if (!participant.actor?.reference) {
        return NextResponse.json(
          { error: 'All participants must have an actor reference' },
          { status: 400 }
        );
      }

      if (!['accepted', 'needs-action'].includes(participant.status)) {
        return NextResponse.json(
          { error: 'Participant status must be either "accepted" or "needs-action"' },
          { status: 400 }
        );
      }
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.error('Failed to get access token');
      return NextResponse.json(
        { error: 'Failed to authenticate with FHIR server' },
        { status: 401 }
      );
    }

    const url = `${FHIR_BASE_URL}/${TENANT_ID}/Appointment`;
    console.log('FHIR create URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
      },
      body: JSON.stringify(body),
    });

    console.log('FHIR response status:', response.status);
    console.log('FHIR response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FHIR error response:', errorText);
      
      return NextResponse.json(
        { 
          error: 'Failed to create appointment',
          details: errorText,
          status: response.status,
          url: url,
          requestBody: body
        },
        { status: response.status }
      );
    }

    // For successful creation, return the location header and other relevant info
    const location = response.headers.get('Location');
    const etag = response.headers.get('ETag');
    const lastModified = response.headers.get('Last-Modified');

    console.log('Appointment created successfully:', {
      location,
      etag,
      lastModified,
      status: response.status
    });

    return NextResponse.json(
      {
        success: true,
        location,
        etag,
        lastModified,
        message: 'Appointment created successfully'
      },
      { 
        status: response.status,
        headers: {
          'Location': location || '',
          'ETag': etag || '',
          'Last-Modified': lastModified || ''
        }
      }
    );
  } catch (error) {
    console.error('Error in appointment creation:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during appointment creation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}