import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '../../../lib/auth';

const FHIR_BASE_URL = process.env.FHIR_ROOT_HOST;
const TENANT_ID = process.env.TENANT_ID;

// Oracle Health FHIR Appointment interface
interface AppointmentCreate {
  resourceType: 'Appointment';
  status: 'proposed' | 'booked';
  serviceCategory?: {
    text?: string;
    coding?: Array<{
      system?: string;
      code?: string;
    }>;
  };
  serviceType?: Array<{
    text?: string;
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
      userSelected?: boolean;
    }>;
  }>;
  reasonCode?: Array<{
    text: string;
    coding?: Array<{
      system?: string;
      code?: string;
    }>;
  }>;
  slot?: Array<{
    reference: string;
  }>;
  participant: Array<{
    actor: {
      reference: string;
      display?: string;
    };
    status: 'accepted' | 'needs-action';
  }>;
  comment?: string;
  requestedPeriod?: Array<{
    start: string;
    end: string;
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

    // Validate status-specific requirements
    if (body.status === 'proposed') {
      // For proposed appointments
      if (!body.serviceType || !Array.isArray(body.serviceType) || body.serviceType.length !== 1) {
        return NextResponse.json(
          { error: 'serviceType is required for proposed appointments and must contain exactly one item' },
          { status: 400 }
        );
      }

      if (!body.requestedPeriod || !Array.isArray(body.requestedPeriod) || body.requestedPeriod.length !== 1) {
        return NextResponse.json(
          { error: 'requestedPeriod is required for proposed appointments and must contain exactly one period' },
          { status: 400 }
        );
      }

      const period = body.requestedPeriod[0];
      if (!period.start || !period.end) {
        return NextResponse.json(
          { error: 'requestedPeriod must have both start and end times' },
          { status: 400 }
        );
      }

      // Validate participants for proposed appointments
      const hasPatient = body.participant.some((p: any) => 
        p.actor?.reference?.startsWith('Patient/') && p.status === 'needs-action'
      );
      const hasLocation = body.participant.some((p: any) => 
        p.actor?.reference?.startsWith('Location/') && p.status === 'needs-action'
      );

      if (!hasPatient) {
        return NextResponse.json(
          { error: 'proposed appointments must have at least one patient participant with status "needs-action"' },
          { status: 400 }
        );
      }

      if (!hasLocation) {
        return NextResponse.json(
          { error: 'proposed appointments must have at least one location participant with status "needs-action"' },
          { status: 400 }
        );
      }
    } else if (body.status === 'booked') {
      // For booked appointments
      if (!body.slot || !Array.isArray(body.slot) || body.slot.length !== 1) {
        return NextResponse.json(
          { error: 'slot is required for booked appointments and must contain exactly one slot reference' },
          { status: 400 }
        );
      }

      if (!body.slot[0].reference) {
        return NextResponse.json(
          { error: 'slot reference is required' },
          { status: 400 }
        );
      }

      // Validate participants for booked appointments
      if (body.participant.length !== 1) {
        return NextResponse.json(
          { error: 'booked appointments must have exactly one patient participant' },
          { status: 400 }
        );
      }

      const participant = body.participant[0];
      if (!participant.actor?.reference?.startsWith('Patient/')) {
        return NextResponse.json(
          { error: 'booked appointments must have a patient participant' },
          { status: 400 }
        );
      }

      if (participant.status !== 'accepted') {
        return NextResponse.json(
          { error: 'booked appointment participant status must be "accepted"' },
          { status: 400 }
        );
      }

      if (participant.type) {
        return NextResponse.json(
          { error: 'participant.type must not be set' },
          { status: 400 }
        );
      }
    }

    // Validate reasonCode if provided
    if (body.reasonCode) {
      if (!Array.isArray(body.reasonCode) || body.reasonCode.length !== 1) {
        return NextResponse.json(
          { error: 'reasonCode must contain exactly one CodeableConcept' },
          { status: 400 }
        );
      }
    }

    // Validate all participants
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