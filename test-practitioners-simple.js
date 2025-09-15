const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testPractitionerSearch() {
  console.log('Testing Practitioner Search API...\n');

  // Test 1: Default search (active practitioners)
  console.log('1. Testing default search (active practitioners)...');
  try {
    const response = await fetch(`${BASE_URL}/api/practitioners`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Default search successful');
      console.log(`   Found ${data.entry?.length || 0} practitioners`);
      if (data.entry?.length > 0) {
        const firstPractitioner = data.entry[0].resource;
        console.log(`   First practitioner: ${firstPractitioner.name?.[0]?.text || 'Unknown name'}`);
      }
    } else {
      console.log('❌ Default search failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error}`);
      console.log(`   Details: ${data.details}`);
    }
  } catch (error) {
    console.log('❌ Default search error:', error.message);
  }

  console.log('\n');

  // Test 2: Search by name
  console.log('2. Testing search by name...');
  try {
    const response = await fetch(`${BASE_URL}/api/practitioners?name=smith`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Name search successful');
      console.log(`   Found ${data.entry?.length || 0} practitioners with name containing "smith"`);
    } else {
      console.log('❌ Name search failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error}`);
      console.log(`   Details: ${data.details}`);
    }
  } catch (error) {
    console.log('❌ Name search error:', error.message);
  }

  console.log('\n');

  // Test 3: Search by family name
  console.log('3. Testing search by family name...');
  try {
    const response = await fetch(`${BASE_URL}/api/practitioners?family=johnson`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Family name search successful');
      console.log(`   Found ${data.entry?.length || 0} practitioners with family name containing "johnson"`);
    } else {
      console.log('❌ Family name search failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error}`);
      console.log(`   Details: ${data.details}`);
    }
  } catch (error) {
    console.log('❌ Family name search error:', error.message);
  }

  console.log('\n');

  // Test 4: Search by given name
  console.log('4. Testing search by given name...');
  try {
    const response = await fetch(`${BASE_URL}/api/practitioners?given=john`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Given name search successful');
      console.log(`   Found ${data.entry?.length || 0} practitioners with given name containing "john"`);
    } else {
      console.log('❌ Given name search failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error}`);
      console.log(`   Details: ${data.details}`);
    }
  } catch (error) {
    console.log('❌ Given name search error:', error.message);
  }
}

// Run the test
testPractitionerSearch()
  .then(() => {
    console.log('\nTesting completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });