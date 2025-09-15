// Test script to check API endpoint
const fetch = require('node-fetch');

async function testPatientAPI() {
  try {
    // Test GET request first
    console.log('Testing GET /api/patients...');
    const getResponse = await fetch('http://localhost:3000/api/patients');
    console.log('GET Status:', getResponse.status);
    console.log('GET Headers:', Object.fromEntries(getResponse.headers.entries()));
    
    if (!getResponse.ok) {
      const getError = await getResponse.text();
      console.log('GET Error:', getError);
    }

    // Test POST request
    console.log('\nTesting POST /api/patients...');
    const testPatient = {
      resourceType: 'Patient',
      name: [{
        use: 'official',
        family: 'Test',
        given: ['Patient']
      }],
      gender: 'male',
      birthDate: '1990-01-01'
    };

    const postResponse = await fetch('http://localhost:3000/api/patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
      },
      body: JSON.stringify(testPatient)
    });

    console.log('POST Status:', postResponse.status);
    console.log('POST Headers:', Object.fromEntries(postResponse.headers.entries()));
    
    const postResult = await postResponse.text();
    console.log('POST Response:', postResult);

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testPatientAPI();