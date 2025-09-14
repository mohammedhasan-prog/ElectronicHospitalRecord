// src/app/api/patients/[id]/medications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accessToken = await getAccessToken();
    const { TENANT_ID, FHIR_ROOT_HOST = 'https://fhir-ehr-code.cerner.com/r4' } = process.env;

    if (!TENANT_ID) {
      return NextResponse.json({ ok: false, message: 'Tenant ID is not configured.' }, { status: 500 });
    }

    // Get both MedicationRequest (prescriptions) and MedicationStatement (medication history)
    const requests = await Promise.allSettled([
      fetch(`${FHIR_ROOT_HOST}/${TENANT_ID}/MedicationRequest?patient=${params.id}&_count=50`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/fhir+json',
        },
      }),
      fetch(`${FHIR_ROOT_HOST}/${TENANT_ID}/MedicationStatement?patient=${params.id}&_count=50`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/fhir+json',
        },
      })
    ]);

    const medications: any[] = [];

    // Process MedicationRequests
    if (requests[0].status === 'fulfilled' && requests[0].value.ok) {
      const requestData = await requests[0].value.json();
      const medicationRequests = requestData.entry?.map((entry: any) => {
        const resource = entry.resource;
        return {
          id: resource.id,
          type: 'prescription',
          medication: resource.medicationCodeableConcept?.text || 
                     resource.medicationCodeableConcept?.coding?.[0]?.display || 
                     'Unknown Medication',
          status: resource.status,
          intent: resource.intent,
          authoredOn: resource.authoredOn,
          dosage: resource.dosageInstruction?.[0]?.text || 'No dosage specified',
          requester: resource.requester?.display || 'Unknown Provider'
        };
      }) || [];
      medications.push(...medicationRequests);
    }

    // Process MedicationStatements
    if (requests[1].status === 'fulfilled' && requests[1].value.ok) {
      const statementData = await requests[1].value.json();
      const medicationStatements = statementData.entry?.map((entry: any) => {
        const resource = entry.resource;
        return {
          id: resource.id,
          type: 'statement',
          medication: resource.medicationCodeableConcept?.text || 
                     resource.medicationCodeableConcept?.coding?.[0]?.display || 
                     'Unknown Medication',
          status: resource.status,
          effectiveDateTime: resource.effectiveDateTime,
          effectivePeriod: resource.effectivePeriod,
          dosage: resource.dosage?.[0]?.text || 'No dosage specified',
          informationSource: resource.informationSource?.display || 'Patient Reported'
        };
      }) || [];
      medications.push(...medicationStatements);
    }

    return NextResponse.json({ 
      ok: true, 
      medications,
      total: medications.length
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}