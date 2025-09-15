// src/app/api/patients-simple/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPatient } from '@/lib/simple-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== SIMPLE PATIENT DETAIL API ===');
    console.log('Patient ID:', params.id);
    
    // Try to get the patient from storage first
    let mockPatient = getPatient(params.id);
    
    if (!mockPatient) {
      // If not found in storage, create a default mock patient
      mockPatient = {
        id: params.id,
        resourceType: 'Patient',
        name: [{
          use: 'official',
          family: 'MockPatient',
          given: ['Test']
        }],
        gender: 'unknown',
        birthDate: '1990-01-01',
        active: true,
        telecom: [],
        address: [],
        maritalStatus: 'unknown',
        meta: {
          versionId: '1',
          lastUpdated: new Date().toISOString()
        }
      };
    }
    
    // Convert to the format expected by the UI
    const formattedPatient = {
      id: mockPatient.id,
      name: mockPatient.name?.[0]?.family || mockPatient.name?.[0]?.given?.[0] || 'Unknown',
      given: mockPatient.name?.[0]?.given || [],
      family: mockPatient.name?.[0]?.family || '',
      gender: mockPatient.gender || 'unknown',
      birthDate: mockPatient.birthDate || '',
      telecom: mockPatient.telecom || [],
      address: mockPatient.address || [],
      maritalStatus: mockPatient.maritalStatus?.coding?.[0]?.code || 'unknown',
      active: mockPatient.active !== false,
      meta: mockPatient.meta || {}
    };
    
    return NextResponse.json({ 
      ok: true, 
      patient: formattedPatient,
      message: 'Patient retrieved successfully (mock)'
    });
    
  } catch (error) {
    console.error('Error in simple patient detail:', error);
    return NextResponse.json({ 
      ok: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}