// src/app/api/appointments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patient = searchParams.get('patient');
    const practitioner = searchParams.get('practitioner');
    const location = searchParams.get('location');
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const cursor = searchParams.get('cursor');
    const count = searchParams.get('_count') || '50';

    const accessToken = await getAccessToken();
    const { TENANT_ID, FHIR_ROOT_HOST = 'https://fhir-ehr-code.cerner.com/r4' } = process.env;

    if (!TENANT_ID) {
      return NextResponse.json({ ok: false, message: 'Tenant ID is not configured.' }, { status: 500 });
    }

    // Build query parameters for FHIR Appointment search
    const queryParams = new URLSearchParams();
    
    if (patient) queryParams.append('patient', patient);
    if (practitioner) queryParams.append('practitioner', practitioner);
    if (location) queryParams.append('location', location);
    if (date) queryParams.append('date', date);
    if (status) queryParams.append('status', status);
    if (cursor) queryParams.append('cursor', cursor);
    queryParams.append('_count', count);

    const url = `${FHIR_ROOT_HOST}/${TENANT_ID}/Appointment?${queryParams.toString()}`;

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

    const bundle = await response.json();
    
    // Normalize appointment data for frontend
    const appointments = bundle.entry?.map((entry: any) => {
      const appointment = entry.resource;
      
      // Extract patient information
      const patientParticipant = appointment.participant?.find((p: any) => 
        p.actor?.reference?.startsWith('Patient/')
      );
      
      // Extract practitioner information  
      const practitionerParticipant = appointment.participant?.find((p: any) => 
        p.actor?.reference?.startsWith('Practitioner/')
      );
      
      // Extract location information
      const locationParticipant = appointment.participant?.find((p: any) => 
        p.actor?.reference?.startsWith('Location/')
      );

      return {
        id: appointment.id,
        status: appointment.status,
        serviceType: appointment.serviceType?.[0]?.text || 'General',
        start: appointment.start,
        end: appointment.end,
        duration: appointment.minutesDuration,
        reasonCode: appointment.reasonCode?.[0]?.text || '',
        comment: appointment.comment || '',
        created: appointment.created,
        patient: {
          reference: patientParticipant?.actor?.reference,
          display: patientParticipant?.actor?.display || 'Unknown Patient',
          status: patientParticipant?.status
        },
        practitioner: {
          reference: practitionerParticipant?.actor?.reference,
          display: practitionerParticipant?.actor?.display || 'Unknown Provider',
          status: practitionerParticipant?.status
        },
        location: {
          reference: locationParticipant?.actor?.reference,
          display: locationParticipant?.actor?.display || 'Unknown Location',
          status: locationParticipant?.status
        },
        meta: appointment.meta
      };
    }) || [];

    // Extract next page cursor from Bundle links
    const nextLink = bundle.link?.find((link: any) => link.relation === 'next');
    const nextCursor = nextLink ? new URL(nextLink.url).searchParams.get('cursor') : null;

    return NextResponse.json({ 
      ok: true, 
      appointments,
      nextCursor,
      total: bundle.total
    });

  } catch (error: any) {
    console.error('Error searching appointments:', error);
    return NextResponse.json({ 
      ok: false, 
      message: 'Internal server error while searching appointments' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointment } = body;

    if (!appointment) {
      return NextResponse.json({ 
        ok: false, 
        message: 'Appointment data is required' 
      }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    const { TENANT_ID, FHIR_ROOT_HOST = 'https://fhir-ehr-code.cerner.com/r4' } = process.env;

    if (!TENANT_ID) {
      return NextResponse.json({ ok: false, message: 'Tenant ID is not configured.' }, { status: 500 });
    }

    const url = `${FHIR_ROOT_HOST}/${TENANT_ID}/Appointment`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
      },
      body: JSON.stringify(appointment)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        ok: false, 
        message: `FHIR API request failed: ${response.statusText}`, 
        details: errorText 
      }, { status: response.status });
    }

    const createdAppointment = await response.json();
    const location = response.headers.get('location');

    return NextResponse.json({ 
      ok: true, 
      appointment: createdAppointment,
      location 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ 
      ok: false, 
      message: 'Internal server error while creating appointment' 
    }, { status: 500 });
  }
}