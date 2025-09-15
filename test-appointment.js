#!/usr/bin/env node

// Test script to verify appointment creation API matches Python script behavior
const fetch = require('node-fetch').default || require('node-fetch');

const testPayload = {
  "resourceType": "Appointment",
  "status": "proposed",
  "serviceType": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "408443003",
          "display": "General medical practice"
        }
      ]
    }
  ],
  "reasonCode": [
    {
      "text": "I have a cramp"
    }
  ],
  "comment": "Appointment request comment from test script",
  "participant": [
    {
      "actor": {
        "reference": "Patient/12724066"
      },
      "status": "needs-action"
    },
    {
      "actor": {
        "reference": "Location/21304876",
        "display": "MX Clinic 1"
      },
      "status": "needs-action"
    }
  ],
  "requestedPeriod": [
    {
      "start": "2025-11-15T10:00:00-05:00",
      "end": "2025-11-15T11:00:00-05:00"
    }
  ]
};

async function testAppointmentCreation() {
  try {
    console.log('Testing appointment creation with payload:');
    console.log(JSON.stringify(testPayload, null, 2));
    
    const response = await fetch('http://localhost:3000/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log('\nResponse status:', response.status);
    
    const result = await response.text();
    console.log('Response body:', result);

    if (response.ok) {
      console.log('\n✅ SUCCESS: Appointment creation API is working!');
    } else {
      console.log('\n❌ FAILED: Appointment creation failed');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testAppointmentCreation();