// src/app/patients/page.tsx
'use client';

import { useState } from 'react';

interface Patient {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
}

export default function PatientSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setPatients([]);

    try {
      const response = await fetch(`/api/patients?name=${searchTerm}`);
      const data = await response.json();

      if (data.ok) {
        setPatients(data.patients);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Patient Search</h1>
          <form onSubmit={handleSearch} className="flex items-center mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter patient name (e.g., Smith)"
              className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 block w-full p-3 rounded-l-md shadow-sm"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-r-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {error && <p className="text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birth Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">Loading...</td>
                  </tr>
                ) : patients.length > 0 ? (
                  patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.id}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">{patient.name}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500 capitalize">{patient.gender}</td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">{patient.birthDate}</td>
                    </tr>
                  ))
                ) : (
                  !isLoading && <tr><td colSpan={4} className="text-center py-4">No patients found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
