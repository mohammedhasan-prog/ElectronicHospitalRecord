// src/app/api/patients-simple/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { storePatient } from '@/lib/simple-storage';

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    ok: true, 
    message: 'Patients API is working - GET',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== SIMPLE PATIENT CREATION TEST ===');
    
    const body = await request.json();
    console.log('Received body:', body);
    
    // Basic validation
    if (!body.resourceType) {
      return NextResponse.json({
        ok: false,
        message: 'resourceType is required'
      }, { status: 400 });
    }
    
    if (body.resourceType !== 'Patient') {
      return NextResponse.json({
        ok: false,
        message: 'resourceType must be Patient'
      }, { status: 400 });
    }
    
    // Generate a unique ID
    const patientId = 'patient-' + Date.now();
    
    // Create the patient with proper structure
    const mockPatient = {
      ...body,
      id: patientId,
      meta: {
        versionId: '1',
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Store for retrieval
    storePatient(patientId, mockPatient);
    
    console.log('Created patient:', mockPatient);
    
    return NextResponse.json({ 
      ok: true, 
      patient: mockPatient,
      id: mockPatient.id,
      message: 'Patient created successfully (mock)'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error in simple patient creation:', error);
    return NextResponse.json({ 
      ok: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}