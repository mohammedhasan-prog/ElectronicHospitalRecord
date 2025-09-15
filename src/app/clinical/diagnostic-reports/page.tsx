"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PatientAutoSuggest from '@/components/PatientAutoSuggest';
import { useSearchParams } from 'next/navigation';
type Report = {
  id: string;
  status?: string;
  categoryText?: string;
  codeText?: string;
  patientId?: string;
  subjectRef?: string;
  encounterRef?: string;
  effective?: any;
  issued?: string;
  performerRefs?: string[];
  resultsInterpreterRefs?: string[];
  resultRefs?: { reference?: string; display?: string }[];
  presentedForm?: { contentType?: string; url?: string; title?: string; creation?: string }[];
};

export default function DiagnosticReportsPage() {
  const [patientId, setPatientId] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [encounter, setEncounter] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [count, setCount] = useState<number>(10);
  const [cursor, setCursor] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<{ fhirUrlUsed?: string; outcomeWarnings?: string[] } | null>(null);

  const categoryOptions = [
    { value: '', label: 'Any' },
    { value: 'http://terminology.hl7.org/CodeSystem/v2-0074|RAD', label: 'Radiology (RAD)' },
    { value: 'http://terminology.hl7.org/CodeSystem/v2-0074|LAB', label: 'Laboratory (LAB)' },
    { value: 'http://terminology.hl7.org/CodeSystem/v2-0074|MB', label: 'Microbiology (MB)' },
  ];

  const canSearch = useMemo(() => {
    return Boolean(patientId); // patient required unless _id route is used (UI focuses on patient search)
  }, [patientId]);

  const fetchReports = async (useCursor?: string | null) => {
    if (!canSearch) return;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (useCursor) {
      params.set('cursor', useCursor);
    } else {
      params.set('patient', patientId);
      if (category) params.set('category', category);
      if (code) params.set('code', code);
      if (date) params.set('date', date);
      if (encounter) params.set('encounter', encounter);
      params.set('_count', String(count));
    }

    try {
      const res = await fetch(`/api/diagnostic-reports?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || 'Failed to fetch reports');
      }
      setReports(Array.isArray(data.reports) ? data.reports : []);
      setNextCursor(data.nextCursor || null);
      setDiagnostics(data.diagnostics || null);
    } catch (e: any) {
      setError(e?.message || String(e));
      setReports([]);
      setNextCursor(null);
      setDiagnostics(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCursor(null);
  }, [patientId, category, code, date, encounter, count]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Diagnostic Reports</h1>

      <div className="bg-white p-4 rounded-md border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PatientAutoSuggest
            label="Patient"
            required
            onSelect={(p) => setPatientId(p.id)}
            placeholder="Type MRN or 3+ letters to find patient"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Code (optional)</label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
              placeholder="system|code or code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Encounter (optional)</label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
              placeholder="Encounter/123 or 123"
              value={encounter}
              onChange={(e) => setEncounter(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date (optional)</label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
              placeholder="ge2024-01-01,le2025-01-01"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Count</label>
            <input
              type="number"
              min={1}
              max={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            onClick={() => fetchReports(null)}
            disabled={!canSearch || isLoading}
          >
            {isLoading ? 'Searching…' : 'Search'}
          </button>
          {nextCursor && (
            <button
              className="px-4 py-2 bg-gray-700 text-white rounded-md"
              onClick={() => fetchReports(nextCursor)}
              disabled={isLoading}
            >Load Next Page</button>
          )}
          {error && <div className="text-red-600">{error}</div>}
        </div>
      </div>

      <div className="bg-white p-4 rounded-md border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Results</h2>
          <div className="text-sm text-gray-600">{reports.length} rows</div>
        </div>

        {reports.length === 0 ? (
          <div className="text-gray-500">No results</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3">Patient</th>
                  <th className="py-2 pr-3">Effective</th>
                  <th className="py-2 pr-3">Issued</th>
                  <th className="py-2 pr-3">Presented</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-mono">{r.id}</td>
                    <td className="py-2 pr-3">{r.status}</td>
                    <td className="py-2 pr-3">{r.categoryText}</td>
                    <td className="py-2 pr-3">{r.codeText}</td>
                    <td className="py-2 pr-3">{r.patientId}</td>
                    <td className="py-2 pr-3">{typeof r.effective === 'string' ? r.effective : (r.effective?.start || r.effective?.end || '')}</td>
                    <td className="py-2 pr-3">{r.issued}</td>
                    <td className="py-2 pr-3">
                      {r.presentedForm && r.presentedForm.length > 0 ? (
                        <a className="text-blue-600 hover:underline" href={r.presentedForm[0].url} target="_blank">{r.presentedForm[0].title || r.presentedForm[0].contentType}</a>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {diagnostics && (
        <div className="bg-gray-50 border rounded-md p-4">
          <div className="text-sm text-gray-700"><span className="font-semibold">FHIR URL:</span> {diagnostics.fhirUrlUsed}</div>
          {diagnostics.outcomeWarnings && diagnostics.outcomeWarnings.length > 0 && (
            <ul className="mt-2 list-disc list-inside text-yellow-700">
              {diagnostics.outcomeWarnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
