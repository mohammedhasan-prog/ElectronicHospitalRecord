#!/usr/bin/env node

// Test script to verify practitioners API functionality
const fetch = require('node-fetch').default || require('node-fetch');

async function testPractitionerAPI() {
  const testCases = [
    {
      name: 'Get all active practitioners',
      url: 'http://localhost:3000/api/practitioners?active=true&_count=5'
    },
    {
      name: 'Search by name',
      url: 'http://localhost:3000/api/practitioners?name=Smith&_count=5'
    },
    {
      name: 'Search by family name',
      url: 'http://localhost:3000/api/practitioners?family=Johnson&_count=5'
    },
    {
      name: 'Search by given name',
      url: 'http://localhost:3000/api/practitioners?given=John&_count=5'
    },
    {
      name: 'Search by identifier',
      url: 'http://localhost:3000/api/practitioners?identifier=123456&_count=5'
    },
    {
      name: 'Default search (active practitioners)',
      url: 'http://localhost:3000/api/practitioners'
    }
  ];

  console.log('🧪 Testing Practitioners API functionality...\n');

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log(`🔗 URL: ${testCase.url}`);
    
    try {
      const response = await fetch(testCase.url);
      const result = await response.text();
      
      console.log(`📊 Status: ${response.status}`);
      
      if (response.ok) {
        const data = JSON.parse(result);
        const count = data.entry?.length || 0;
        console.log(`✅ SUCCESS: Found ${count} practitioners`);
        
        if (count > 0) {
          const firstPractitioner = data.entry[0].resource;
          const name = firstPractitioner.name?.[0];
          const practitionerName = name?.text || 
            `${name?.given?.join(' ') || ''} ${name?.family || ''}`.trim() ||
            'Unknown Practitioner';
          console.log(`👤 Sample: ${practitionerName} (ID: ${firstPractitioner.id})`);
        }
      } else {
        console.log(`❌ FAILED: ${result}`);
      }
    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`);
    }
    
    console.log('─'.repeat(60));
  }

  console.log('\n🏁 Practitioners API testing complete!');
}

testPractitionerAPI();