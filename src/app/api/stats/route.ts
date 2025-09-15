import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

// Helper to call FHIR to compute total counts with robust fallbacks
async function fetchCount(resource: string, baseUrl: string, tenantId: string, accessToken: string): Promise<number | null> {
  // Resource-specific extras (Oracle Health quirks)
  const extras = new URLSearchParams();
  if (resource === 'Practitioner') {
    // Oracle Health requires one of the required params; default to active=true
    extras.set('active', 'true');
  }

  // Strategy 1: _summary=count
  const summaryUrl = `${baseUrl}/${tenantId}/${resource}?${extras.toString()}${extras.toString() ? '&' : ''}_summary=count`;
  try {
    let res = await fetch(summaryUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
      },
    });
    if (res.ok) {
      const json = await res.json();
      if (typeof json.total === 'number') return json.total;
    } else {
      const t = await res.text();
      console.warn(`Count (_summary) failed for ${resource}: ${res.status} ${res.statusText} ${t}`);
    }

    // Strategy 2: _count=1 with _elements to minimize payload; read Bundle.total
    const elementsUrl = `${baseUrl}/${tenantId}/${resource}?${extras.toString()}${extras.toString() ? '&' : ''}_count=1&_elements=_id`;
    res = await fetch(elementsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json',
      },
    });
    if (res.ok) {
      const json = await res.json();
      if (typeof json.total === 'number') return json.total;
    } else {
      const t2 = await res.text();
      console.warn(`Count (_count=1) failed for ${resource}: ${res.status} ${res.statusText} ${t2}`);
    }
  } catch (e) {
    console.warn(`Count fetch exception for ${resource}:`, e);
  }
  return null;
}

export async function GET() {
  try {
    const accessToken = await getAccessToken();
    const { TENANT_ID, FHIR_ROOT_HOST = 'https://fhir-ehr-code.cerner.com/r4' } = process.env as Record<string, string>;
    if (!TENANT_ID) {
      return NextResponse.json({ ok: false, message: 'Tenant ID is not configured.' }, { status: 500 });
    }

    console.log('Fetching stats for tenant:', TENANT_ID);
    
    const [patients, practitioners, organizations, appointments] = await Promise.all([
      fetchCount('Patient', FHIR_ROOT_HOST, TENANT_ID, accessToken),
      fetchCount('Practitioner', FHIR_ROOT_HOST, TENANT_ID, accessToken),
      fetchCount('Organization', FHIR_ROOT_HOST, TENANT_ID, accessToken),
      fetchCount('Appointment', FHIR_ROOT_HOST, TENANT_ID, accessToken),
    ]);

    console.log('Stats results:', { patients, practitioners, organizations, appointments });

    return NextResponse.json({
      ok: true,
      data: {
        patients: patients ?? 0,
        practitioners: practitioners ?? 0,
        organizations: organizations ?? 0,
        appointments: appointments ?? 0,
      },
      debug: {
        patientsRaw: patients,
        practitionersRaw: practitioners,
        organizationsRaw: organizations,
        appointmentsRaw: appointments,
      }
    });
  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
