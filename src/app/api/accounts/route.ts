import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

// GET /api/accounts
// Proxies to FHIR /Account supporting Oracle Health constraints and common filters.
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get('cursor');
    const countParam = searchParams.get('_count');
    const _count = countParam && /^\d+$/.test(countParam) ? countParam : '10';

    const id = searchParams.get('_id'); // may be array in FHIR, we accept first or CSV
    const identifier = searchParams.get('identifier');
    const patient = searchParams.get('patient');
    const enc = searchParams.get('-encounter');
    const guarantor = searchParams.get('-guarantor');
    const type = searchParams.get('type');

    const { TENANT_ID, FHIR_ROOT_HOST = 'https://fhir-ehr-code.cerner.com/r4' } = process.env;
    if (!TENANT_ID) {
      return NextResponse.json({ ok: false, message: 'Tenant ID is not configured.' }, { status: 500 });
    }

    let url: string;
    if (cursor) {
      url = cursor;
    } else {
      const baseUrl = new URL(`${FHIR_ROOT_HOST}/${TENANT_ID}/Account`);
      // Validate combinations per Oracle Health spec
      if (enc) {
        if (type !== 'guarantor-balance') {
          return NextResponse.json({
            ok: false,
            message: 'When using -encounter, type must equal guarantor-balance.',
            hint: 'Add type=guarantor-balance to your request.'
          }, { status: 400 });
        }
        baseUrl.searchParams.append('-encounter', enc);
      }
      if (guarantor) {
        if (type !== 'financial-account') {
          return NextResponse.json({
            ok: false,
            message: 'When using -guarantor, type must equal financial-account.',
            hint: 'Add type=financial-account to your request.'
          }, { status: 400 });
        }
        baseUrl.searchParams.append('-guarantor', guarantor);
      }
      if (patient || identifier) {
        if (type !== 'statement') {
          return NextResponse.json({
            ok: false,
            message: 'When using patient and/or identifier, type must equal statement.',
            hint: 'Add type=statement to your request.'
          }, { status: 400 });
        }
      }

      if (id) baseUrl.searchParams.append('_id', id);
      if (identifier) baseUrl.searchParams.append('identifier', identifier!);
      if (patient) baseUrl.searchParams.append('patient', patient!);
      if (type) baseUrl.searchParams.append('type', type!);

      baseUrl.searchParams.append('_count', _count);
      url = baseUrl.toString();
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });

    const fhirUrlUsed = url;
    const text = await response.text();
    if (!response.ok) {
      let parsed: any = undefined;
      try { parsed = JSON.parse(text); } catch {}
      return NextResponse.json({ ok: false, message: `FHIR API request failed: ${response.statusText}`, details: parsed || text, fhirUrlUsed }, { status: response.status });
    }

    let data: any = {};
    try { data = JSON.parse(text); } catch {}

    // Extract pagination
    const nextCursor = data.link?.find((l: any) => l.relation === 'next')?.url || null;
    const selfLink = data.link?.find((l: any) => l.relation === 'self')?.url || fhirUrlUsed;

    // Normalize entries to an accounts[] list
    const accounts = Array.isArray(data.entry) ? data.entry
      .filter((e: any) => e?.resource?.resourceType === 'Account')
      .map((e: any) => {
        const r = e.resource;
        const balanceExt = (r.extension || []).find((x: any) => x.url?.includes('StructureDefinition/account-balance'));
        const stateExt = (r.extension || []).find((x: any) => x.url?.includes('StructureDefinition/account-state'));
        const relatedPartsExt = (r.extension || []).find((x: any) => x.url?.includes('StructureDefinition/account-related-parts'));
        return {
          id: r.id,
          status: r.status,
          type: r.type?.text || r.type?.coding?.[0]?.display || undefined,
          subjectId: Array.isArray(r.subject) ? r.subject[0]?.reference : r.subject?.reference,
          ownerRef: r.owner?.reference,
          guarantorRefs: Array.isArray(r.guarantor) ? r.guarantor.map((g: any) => g?.party?.reference).filter(Boolean) : [],
          identifier: Array.isArray(r.identifier) ? r.identifier.map((i: any) => ({ system: i.system, value: i.value })) : [],
          servicePeriod: r.servicePeriod,
          balanceMoney: balanceExt?.valueMoney || null,
          stateText: stateExt?.valueCodeableConcept?.text,
          relatedPartsRef: relatedPartsExt?.valueReference?.reference,
        };
      }) : [];

    // OperationOutcome warnings in bundle
    const outcomeWarnings: string[] = [];
    if (Array.isArray(data.entry)) {
      for (const e of data.entry) {
        if (e?.resource?.resourceType === 'OperationOutcome' && Array.isArray(e.resource.issue)) {
          for (const iss of e.resource.issue) {
            const parts: string[] = [];
            if (iss?.severity) parts.push(`[${String(iss.severity)}]`);
            if (iss?.code) parts.push(String(iss.code));
            if (iss?.details?.text) parts.push(String(iss.details.text));
            if (iss?.diagnostics) parts.push(String(iss.diagnostics));
            if (parts.length) outcomeWarnings.push(parts.join(' '));
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      accounts,
      total: data.total ?? null,
      nextCursor,
      diagnostics: { fhirUrlUsed: selfLink, outcomeWarnings },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
