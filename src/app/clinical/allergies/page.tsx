'use client';

import { useEffect, useState } from 'react';
import PatientAutoSuggest from '@/components/auto-suggest/PatientAutoSuggest';
import Link from 'next/link';

interface AllergyItem {
  id: string;
  type?: string;
  category: string[];
  criticality?: string | null;
  clinicalStatus?: string | null;
  clinicalStatusDisplay?: string | null;
  verificationStatus?: string | null;
  verificationStatusDisplay?: string | null;
  substanceText?: string | null;
  substanceCode?: string | null;
  patientRef?: string | null;
  patientDisplay?: string | null;
  onsetDateTime?: string | null;
  recordedDate?: string | null;
  reactionsCount: number;
  manifestations: string[];
}

export default function AllergiesPage() {
  const [patientId, setPatientId] = useState<string>('');
  const [clinicalStatus, setClinicalStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [items, setItems] = useState<AllergyItem[]>([]);
  const [pagination, setPagination] = useState<{ nextPageUrl?: string | null; prevPageUrl?: string | null } | null>(null);
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const [lastFhirUrl, setLastFhirUrl] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Array<{ severity?: string; code?: string; diagnostics?: string; details?: string }>>([]);

  const fetchAllergies = async (pageUrl?: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (pageUrl) {
        params.set('pageUrl', encodeURIComponent(pageUrl));
      } else {
        if (!patientId) {
          setItems([]);
          setPagination(null);
          setLoading(false);
          return;
        }
        params.set('patient', patientId);
        if (clinicalStatus) params.set('clinical-status', clinicalStatus);
        params.set('_count', '20');
      }

  const res = await fetch(`/api/allergies?${params.toString()}`);
  setLastStatus(res.status);
      const started = performance.now();
      const data = await res.json();
      const ended = performance.now();
      if (!res.ok || !data.ok) {
        throw new Error(data?.message || 'Failed to fetch allergies');
      }
      setItems(data.items || []);
      setPagination({ nextPageUrl: data.pagination?.nextPageUrl, prevPageUrl: data.pagination?.prevPageUrl });
      setLastFhirUrl(data.fhir?.selfUrl || null);
      setWarnings(data.outcomeWarnings || []);
    } catch (e: any) {
      setError(e.message || 'Error fetching allergies');
      setItems([]);
      setPagination(null);
      setLastFhirUrl(null);
      setWarnings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-search when patient is chosen
    if (patientId) fetchAllergies();
  }, [patientId, clinicalStatus]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white shadow-md rounded-lg">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Allergies</h1>
                {lastStatus !== null && (
                  <span className={`text-xs px-2 py-1 rounded-full border ${lastStatus === 200 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                    {lastStatus} {lastStatus === 200 ? 'OK' : ''}
                  </span>
                )}
                {items?.length > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full border bg-gray-50 text-gray-700 border-gray-200">
                    {items.length} result{items.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-2">Search Allergy/Intolerance records by patient and clinical status.</p>
            </div>
            <Link href="/clinical/allergies/create" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
              + New Allergy
            </Link>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <PatientAutoSuggest
                  label="Patient"
                  placeholder="Search patient by name or MRN..."
                  onSelect={(p: any) => setPatientId(p.id)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Clinical Status</label>
                <select
                  value={clinicalStatus}
                  onChange={(e) => setClinicalStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Any</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => fetchAllergies()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700" disabled={!patientId || loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
              <button onClick={() => { setClinicalStatus(''); setItems([]); setPagination(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                Clear
              </button>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">{error}</div>}

            {/* Request Log & Warnings */}
            {(lastFhirUrl || (warnings && warnings.length)) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 space-y-2">
                {lastFhirUrl && (
                  <div className="text-xs text-yellow-800 break-all">
                    <span className="font-medium">FHIR Self URL:</span> {lastFhirUrl}
                  </div>
                )}
                {warnings && warnings.length > 0 && (
                  <div className="text-xs text-yellow-800">
                    <div className="font-medium mb-1">OperationOutcome warnings:</div>
                    <ul className="list-disc ml-5 space-y-1">
                      {warnings.map((w, i) => (
                        <li key={i}>{w.details || w.diagnostics || `${w.code || ''} (${w.severity || 'info'})`}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            <div className="bg-gray-50 border border-gray-200 rounded-md">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Substance</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type/Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criticality</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onset</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reactions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-gray-500" colSpan={6}>{patientId ? 'No allergies found' : 'Select a patient to search'}</td>
                      </tr>
                    ) : (
                      items.map((it) => (
                        <tr key={it.id}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{it.substanceText || it.substanceCode || '-'}</div>
                            <div className="text-xs text-gray-500">{it.patientDisplay || it.patientRef}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{it.clinicalStatusDisplay || it.clinicalStatus || '-'}</div>
                            <div className="text-xs text-gray-500">{it.verificationStatusDisplay || it.verificationStatus || ''}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">{it.type || '-'}</div>
                            <div className="text-xs text-gray-500">{(it.category || []).join(', ')}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{it.criticality || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{it.onsetDateTime ? new Date(it.onsetDateTime).toLocaleString() : '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{it.manifestations?.length ? it.manifestations.join(', ') : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <button
                  className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50"
                  onClick={() => pagination?.prevPageUrl && fetchAllergies(pagination.prevPageUrl || undefined)}
                  disabled={!pagination?.prevPageUrl || loading}
                >
                  Previous
                </button>
                <button
                  className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50"
                  onClick={() => pagination?.nextPageUrl && fetchAllergies(pagination.nextPageUrl || undefined)}
                  disabled={!pagination?.nextPageUrl || loading}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
