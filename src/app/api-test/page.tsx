'use client';

import { useState } from 'react';

export default function ApiTestPage() {
  const [results, setResults] = useState<any[]>([]);

  const testEndpoint = async (path: string, method: string = 'GET', body?: any) => {
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(path, options);
      const data = await response.text();
      
      setResults(prev => [...prev, {
        path,
        method,
        status: response.status,
        statusText: response.statusText,
        data: data.substring(0, 500) + (data.length > 500 ? '...' : '')
      }]);
    } catch (error) {
      setResults(prev => [...prev, {
        path,
        method,
        status: 'ERROR',
        statusText: error instanceof Error ? error.message : 'Unknown error',
        data: null
      }]);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Route Tester</h1>
      
      <div className="space-y-2 mb-6">
        <button 
          onClick={() => testEndpoint('/api/test')}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          Test /api/test
        </button>
        
        <button 
          onClick={() => testEndpoint('/api/patients-simple')}
          className="bg-green-500 text-white px-4 py-2 rounded mr-2"
        >
          Test /api/patients-simple GET
        </button>
        
        <button 
          onClick={() => testEndpoint('/api/patients-simple', 'POST', {
            resourceType: 'Patient',
            name: [{ family: 'Test', given: ['Patient'] }]
          })}
          className="bg-green-600 text-white px-4 py-2 rounded mr-2"
        >
          Test /api/patients-simple POST
        </button>
        
        <button 
          onClick={() => testEndpoint('/api/patients')}
          className="bg-orange-500 text-white px-4 py-2 rounded mr-2"
        >
          Test /api/patients GET
        </button>
        
        <button 
          onClick={() => setResults([])}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Clear Results
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div key={index} className="border p-4 rounded">
            <div className="font-bold">
              {result.method} {result.path}
            </div>
            <div className={`text-sm ${result.status === 200 || result.status === 201 ? 'text-green-600' : 'text-red-600'}`}>
              Status: {result.status} {result.statusText}
            </div>
            {result.data && (
              <pre className="text-xs bg-gray-100 p-2 mt-2 overflow-auto">
                {result.data}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}