// src/app/api/appointments-simple/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== SIMPLE APPOINTMENTS API ===');
    
    // Mock appointments data
    const mockAppointments = {
      resourceType: 'Bundle',
      id: 'mock-appointments-bundle',
      type: 'searchset',
      total: 3,
      entry: [
        {
          resource: {
            resourceType: 'Appointment',
            id: 'appt-1',
            status: 'booked',
            serviceType: [{
              coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/service-type',
                code: '124',
                display: 'General Practice'
              }]
            }],
            description: 'Routine checkup appointment',
            start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // Tomorrow + 30 min
            participant: [
              {
                actor: {
                  reference: 'Patient/patient-12345',
                  display: 'John Doe'
                },
                status: 'accepted'
              },
              {
                actor: {
                  reference: 'Practitioner/prac-123',
                  display: 'Dr. Smith'
                },
                status: 'accepted'
              }
            ],
            meta: {
              lastUpdated: new Date().toISOString()
            }
          }
        },
        {
          resource: {
            resourceType: 'Appointment',
            id: 'appt-2',
            status: 'proposed',
            serviceType: [{
              coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/service-type',
                code: '165',
                display: 'Emergency'
              }]
            }],
            description: 'Emergency consultation',
            start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
            end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(), // Day after tomorrow + 45 min
            participant: [
              {
                actor: {
                  reference: 'Patient/patient-67890',
                  display: 'Jane Smith'
                },
                status: 'needs-action'
              },
              {
                actor: {
                  reference: 'Practitioner/prac-456',
                  display: 'Dr. Johnson'
                },
                status: 'accepted'
              }
            ],
            meta: {
              lastUpdated: new Date().toISOString()
            }
          }
        },
        {
          resource: {
            resourceType: 'Appointment',
            id: 'appt-3',
            status: 'booked',
            serviceType: [{
              coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/service-type',
                code: '394',
                display: 'Cardiology'
              }]
            }],
            description: 'Cardiology follow-up',
            start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
            end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Next week + 1 hour
            participant: [
              {
                actor: {
                  reference: 'Patient/patient-11111',
                  display: 'Bob Wilson'
                },
                status: 'accepted'
              },
              {
                actor: {
                  reference: 'Practitioner/prac-789',
                  display: 'Dr. Brown'
                },
                status: 'accepted'
              }
            ],
            meta: {
              lastUpdated: new Date().toISOString()
            }
          }
        }
      ]
    };

    return NextResponse.json(mockAppointments);
    
  } catch (error) {
    console.error('Error in simple appointments API:', error);
    return NextResponse.json({ 
      ok: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}