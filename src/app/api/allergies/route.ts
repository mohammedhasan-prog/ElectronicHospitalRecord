// src/app/api/allergies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

// Allowed top-level fields based on Oracle Health docs summary for create
const ALLOWED_TOP_LEVEL: Record<string, true> = {
  resourceType: true,
  contained: true,
  clinicalStatus: true,
  verificationStatus: true,
  type: true,
  category: true,
  criticality: true,
  code: true,
  patient: true,
  encounter: true,
  // onset[x] variants (we'll accept common ones)
  onsetDateTime: true,
  onsetAge: true,
  onsetPeriod: true,
  onsetRange: true,
  onsetString: true,
  asserter: true,
  note: true,
  reaction: true
};

function pickAllowed(input: any) {
  const out: any = {};
  for (const key in input) {
    if (ALLOWED_TOP_LEVEL[key]) out[key] = input[key];
  }
  return out;
}

function validateRequired(resource: any): string | null {
  if (!resource || typeof resource !== 'object') return 'Invalid body';
  if (resource.resourceType !== 'AllergyIntolerance') return 'resourceType must be AllergyIntolerance';
  if (!resource.clinicalStatus || !Array.isArray(resource.clinicalStatus.coding)) return 'clinicalStatus.coding is required';
  if (!resource.code || !Array.isArray(resource.code.coding)) return 'code.coding is required';
  if (!resource.patient || typeof resource.patient.reference !== 'string') return 'patient.reference is required';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ ok: false, message: 'Failed to authenticate with EHR system' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('json')) {
      return NextResponse.json({ ok: false, message: 'Unsupported Media Type' }, { status: 415 });
    }

    const body = await request.json();

    // Sanitize to supported fields
    const resource = pickAllowed(body);

    // Ensure resourceType
    resource.resourceType = 'AllergyIntolerance';

    // Basic validation
    const err = validateRequired(resource);
    if (err) {
      return NextResponse.json({ ok: false, message: err }, { status: 400 });
    }

    // Forward to FHIR
    const fhirUrl = `${process.env.FHIR_ROOT_HOST}/${process.env.TENANT_ID}/AllergyIntolerance`;
    const fhirRes = await fetch(fhirUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json+fhir',
        'Content-Type': 'application/json+fhir'
      },
      body: JSON.stringify(resource)
    });

    // If created, pass-through Location/ETag headers like our other routes
    if (fhirRes.status === 201) {
      const location = fhirRes.headers.get('Location') || fhirRes.headers.get('location');
      const etag = fhirRes.headers.get('ETag') || fhirRes.headers.get('etag');
      const lastModified = fhirRes.headers.get('Last-Modified') || fhirRes.headers.get('last-modified');

      return new NextResponse(null, {
        status: 201,
        headers: {
          'Content-Type': 'text/html',
          ...(location ? { Location: location } : {}),
          ...(etag ? { Etag: etag } : {}),
          ...(lastModified ? { 'Last-Modified': lastModified } : {})
        }
      });
    }

    // Non-201: return OperationOutcome details if JSON, else text
    const respContentType = fhirRes.headers.get('content-type') || '';
    let details: any = await (respContentType.includes('json') ? fhirRes.json() : fhirRes.text());
    return NextResponse.json(
      { ok: false, message: `FHIR API error: ${fhirRes.status}`, details },
      { status: fhirRes.status }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: 'Internal server error', details: e.message }, { status: 500 });
  }
}

// GET /api/allergies - list AllergyIntolerance
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ ok: false, message: 'Failed to authenticate with EHR system' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fhirParams = new URLSearchParams();

    // Supported query params (pass-through)
    const passthrough = [
      '_id',
      'patient',
      'clinical-status',
      '_lastUpdated',
      '_revinclude',
      '_count'
    ];
    passthrough.forEach((p) => {
      const v = searchParams.get(p);
      if (v) fhirParams.set(p, v);
    });

    // Default count
    if (!fhirParams.has('_count')) fhirParams.set('_count', '20');

    // Pagination support: cursor via _getpagesoffset or direct pageUrl
    const cursor = searchParams.get('cursor');
    const pageUrl = searchParams.get('pageUrl');

    let fhirUrl: string;
    if (pageUrl) {
      // Trust provided next/prev URL (encoded)
      fhirUrl = decodeURIComponent(pageUrl);
    } else {
      // Require at least one constraint to avoid huge queries
      const hasConstraint = fhirParams.has('patient') || fhirParams.has('_id');
      if (!hasConstraint) {
        return NextResponse.json(
          { ok: false, message: 'Provide at least one search parameter: patient or _id' },
          { status: 400 }
        );
      }
      if (cursor) fhirParams.set('_getpagesoffset', cursor);
      fhirUrl = `${process.env.FHIR_ROOT_HOST}/${process.env.TENANT_ID}/AllergyIntolerance?${fhirParams.toString()}`;
    }

    const fhirRes = await fetch(fhirUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json+fhir'
      }
    });

    const contentType = fhirRes.headers.get('content-type') || '';
    const data = await (contentType.includes('json') ? fhirRes.json() : fhirRes.text());
    if (!fhirRes.ok) {
      return NextResponse.json(
        { ok: false, message: `FHIR API error: ${fhirRes.status}`, details: data },
        { status: fhirRes.status }
      );
    }

    if (data.resourceType !== 'Bundle') {
      return NextResponse.json(
        { ok: false, message: 'Invalid FHIR response (expected Bundle)' },
        { status: 500 }
      );
    }

    const entries = Array.isArray(data.entry) ? data.entry : [];
    // Collect OperationOutcome entries (warnings etc.)
    const outcomeWarnings = entries
      .filter((e: any) => e?.resource?.resourceType === 'OperationOutcome')
      .flatMap((e: any) => e.resource.issue || [])
      .map((issue: any) => ({
        severity: issue.severity,
        code: issue.code,
        diagnostics: issue.diagnostics,
        details: issue.details?.text
      }));
    const items = entries
      .filter((e: any) => e && e.resource && e.resource.resourceType === 'AllergyIntolerance')
      .map((e: any) => {
        const r = e.resource;
        const clinical = r.clinicalStatus?.coding?.[0] || {};
        const verification = r.verificationStatus?.coding?.[0] || {};
        const codeCoding = r.code?.coding?.[0] || {};
        const manifestations = (r.reaction || [])
          .flatMap((rx: any) => (rx.manifestation || []))
          .map((m: any) => m.text || m.coding?.[0]?.display)
          .filter(Boolean);
        return {
          id: r.id,
          type: r.type,
          category: r.category || [],
          criticality: r.criticality || null,
          clinicalStatus: clinical.code || null,
          clinicalStatusDisplay: clinical.display || null,
          verificationStatus: verification.code || null,
          verificationStatusDisplay: verification.display || null,
          substanceText: r.code?.text || codeCoding.display || null,
          substanceCode: codeCoding.code || null,
          patientRef: r.patient?.reference || null,
          patientDisplay: r.patient?.display || null,
          onsetDateTime: r.onsetDateTime || null,
          recordedDate: r.recordedDate || null,
          reactionsCount: (r.reaction || []).length,
          manifestations,
          fullResource: r
        };
      });

  const selfLink = data.link?.find((l: any) => l.relation === 'self');
  const nextLink = data.link?.find((l: any) => l.relation === 'next');
    const prevLink = data.link?.find((l: any) => l.relation === 'previous');
    const getCursor = (url: string | undefined) => {
      if (!url) return null;
      try {
        const u = new URL(url);
        return u.searchParams.get('_getpagesoffset');
      } catch {
        return null;
      }
    };

    return NextResponse.json({
      ok: true,
      total: data.total ?? items.length,
      items,
      outcomeWarnings,
      pagination: {
        hasNext: !!nextLink,
        hasPrev: !!prevLink,
        nextCursor: getCursor(nextLink?.url) || null,
        prevCursor: getCursor(prevLink?.url) || null,
        nextPageUrl: nextLink?.url || null,
        prevPageUrl: prevLink?.url || null
      },
      fhir: {
        selfUrl: selfLink?.url || null
      }
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: 'Internal server error', details: e.message }, { status: 500 });
  }
}
