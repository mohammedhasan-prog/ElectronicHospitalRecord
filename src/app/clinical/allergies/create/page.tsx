'use client';

import { useState } from 'react';
import PatientAutoSuggest from '@/components/auto-suggest/PatientAutoSuggest';

type Coding = { system?: string; code?: string; display?: string };

interface SelectedPatient {
  id: string;
  name: string;
  display: string;
}

interface NoteItem {
  text: string;
  authorReference?: string;
}

interface ManifestationItem {
  system?: string;
  code?: string;
  text?: string;
}

interface ReactionItem {
  manifestations: ManifestationItem[];
  severity?: 'mild' | 'moderate' | 'severe';
}

const clinicalStatusOptions: Coding[] = [
  { system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active', display: 'Active' },
  { system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'inactive', display: 'Inactive' },
  { system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'resolved', display: 'Resolved' }
];

const verificationStatusOptions: Coding[] = [
  { system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed', display: 'Confirmed' },
  { system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'unconfirmed', display: 'Unconfirmed' },
  { system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'refuted', display: 'Refuted' },
  { system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'entered-in-error', display: 'Entered in Error' }
];

const categories = ['medication', 'food', 'environment', 'biologic'] as const;

export default function CreateAllergyPage() {
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [clinicalStatus, setClinicalStatus] = useState<Coding | null>(clinicalStatusOptions[0]);
  const [verificationStatus, setVerificationStatus] = useState<Coding | null>(verificationStatusOptions[0]);
  const [type, setType] = useState<'allergy' | 'intolerance'>('allergy');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['medication']);
  const [criticality, setCriticality] = useState<'low' | 'high' | 'unable-to-assess' | ''>('');

  const [codeSystem, setCodeSystem] = useState<string>('http://www.nlm.nih.gov/research/umls/rxnorm');
  const [codeCode, setCodeCode] = useState<string>('');
  const [codeText, setCodeText] = useState<string>('');

  const [encounterRef, setEncounterRef] = useState<string>('');
  const [onsetDateTime, setOnsetDateTime] = useState<string>(''); // HTML datetime-local value
  const [asserterReference, setAsserterReference] = useState<string>('');

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [reactions, setReactions] = useState<ReactionItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const addNote = () => setNotes((prev) => [...prev, { text: '' }]);
  const removeNote = (idx: number) => setNotes((prev) => prev.filter((_, i) => i !== idx));
  const updateNote = (idx: number, field: keyof NoteItem, value: string) =>
    setNotes((prev) => prev.map((n, i) => (i === idx ? { ...n, [field]: value } : n)));

  const addReaction = () => setReactions((prev) => [...prev, { manifestations: [], severity: undefined }]);
  const removeReaction = (idx: number) => setReactions((prev) => prev.filter((_, i) => i !== idx));
  const setReactionSeverity = (idx: number, severity: ReactionItem['severity']) =>
    setReactions((prev) => prev.map((r, i) => (i === idx ? { ...r, severity } : r)));
  const addManifestation = (rIdx: number) =>
    setReactions((prev) => prev.map((r, i) => (i === rIdx ? { ...r, manifestations: [...r.manifestations, {}] } : r)));
  const updateManifestation = (rIdx: number, mIdx: number, field: keyof ManifestationItem, value: string) =>
    setReactions((prev) =>
      prev.map((r, i) =>
        i === rIdx
          ? { ...r, manifestations: r.manifestations.map((m, j) => (j === mIdx ? { ...m, [field]: value } : m)) }
          : r
      )
    );
  const removeManifestation = (rIdx: number, mIdx: number) =>
    setReactions((prev) =>
      prev.map((r, i) => (i === rIdx ? { ...r, manifestations: r.manifestations.filter((_, j) => j !== mIdx) } : r))
    );

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handlePatientSelect = (p: any) => {
    setSelectedPatient(p);
  };

  const validate = (): string | null => {
    if (!selectedPatient?.id) return 'Please select a patient';
    if (!clinicalStatus?.code) return 'Please choose a clinical status';
    if (!codeCode && !codeText.trim()) return 'Please set a code (coding.code) or a text label';
    return null;
  };

  const toISO = (local: string): string | undefined => {
    if (!local) return undefined;
    // Convert from yyyy-MM-ddTHH:mm to ISO string with Z
    const d = new Date(local);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    const resource: any = {
      resourceType: 'AllergyIntolerance',
      clinicalStatus: { coding: [{ system: clinicalStatus!.system, code: clinicalStatus!.code }] },
      verificationStatus: verificationStatus?.code
        ? { coding: [{ system: verificationStatus.system, code: verificationStatus.code }] }
        : undefined,
      type,
      category: selectedCategories.length ? selectedCategories : undefined,
      criticality: criticality || undefined,
      code: {
        coding: codeCode || codeSystem ? [{ system: codeSystem || undefined, code: codeCode || undefined }] : undefined,
        text: codeText || undefined
      },
      patient: { reference: `Patient/${selectedPatient!.id}` },
      encounter: encounterRef.trim() ? { reference: encounterRef.trim() } : undefined,
      onsetDateTime: toISO(onsetDateTime),
      asserter: asserterReference.trim() ? { reference: asserterReference.trim() } : undefined,
      note: notes.length
        ? notes
            .filter((n) => n.text.trim())
            .map((n) => ({ text: n.text.trim(), ...(n.authorReference?.trim() ? { authorReference: { reference: n.authorReference.trim() } } : {}) }))
        : undefined,
      reaction: reactions.length
        ? reactions
            .map((r) => ({
              manifestation: r.manifestations
                .filter((m) => m.text?.trim() || m.code?.trim())
                .map((m) => ({
                  coding: m.code?.trim() ? [{ system: m.system || 'http://snomed.info/sct', code: m.code.trim() }] : undefined,
                  text: m.text?.trim() || undefined
                })),
              severity: r.severity
            }))
            .filter((r) => r.manifestation && r.manifestation.length > 0)
        : undefined
    };

    setSubmitting(true);
    try {
      const res = await fetch('/api/allergies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(resource)
      });

      if (res.status === 201) {
        const location = res.headers.get('Location') || res.headers.get('location');
        const etag = res.headers.get('Etag') || res.headers.get('etag');
        setSuccess(`Allergy created successfully.${location ? ` Location: ${location}` : ''}`);
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data?.details?.issue?.[0]?.details?.text || data?.message || 'Failed to create allergy';
        setError(msg);
      }
    } catch (err: any) {
      setError(err.message || 'Network error creating allergy');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white shadow-md rounded-lg">
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Create Allergy / Intolerance</h1>
            <p className="text-gray-600 mt-2">Capture patient allergies with clinical/verification status, category, and reactions.</p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 text-red-800">{error}</div>
            )}
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 text-green-800">{success}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Patient */}
              <div>
                <PatientAutoSuggest onSelect={handlePatientSelect} label="Patient" required placeholder="Search patient by name or MRN..." />
                {selectedPatient && (
                  <div className="mt-2 text-sm text-gray-700">Selected: {selectedPatient.display}</div>
                )}
              </div>

              {/* Status & Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Clinical Status</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={clinicalStatus?.code || ''}
                    onChange={(e) => setClinicalStatus(clinicalStatusOptions.find((o) => o.code === e.target.value) || null)}
                  >
                    {clinicalStatusOptions.map((o) => (
                      <option key={o.code} value={o.code}>{o.display}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Verification Status</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={verificationStatus?.code || ''}
                    onChange={(e) => setVerificationStatus(verificationStatusOptions.find((o) => o.code === e.target.value) || null)}
                  >
                    {verificationStatusOptions.map((o) => (
                      <option key={o.code} value={o.code}>{o.display}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={type}
                    onChange={(e) => setType(e.target.value as 'allergy' | 'intolerance')}
                  >
                    <option value="allergy">Allergy</option>
                    <option value="intolerance">Intolerance</option>
                  </select>
                </div>
              </div>

              {/* Category & Criticality */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 rounded-full border ${selectedCategories.includes(cat) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-700'} `}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Criticality</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={criticality}
                    onChange={(e) => setCriticality(e.target.value as any)}
                  >
                    <option value="">Unknown</option>
                    <option value="low">Low</option>
                    <option value="high">High</option>
                    <option value="unable-to-assess">Unable to Assess</option>
                  </select>
                </div>
              </div>

              {/* Substance / Code */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Substance / Code</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">System</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      value={codeSystem}
                      onChange={(e) => setCodeSystem(e.target.value)}
                      placeholder="http://www.nlm.nih.gov/research/umls/rxnorm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      value={codeCode}
                      onChange={(e) => setCodeCode(e.target.value)}
                      placeholder="e.g., 723 (amoxicillin)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Text</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      value={codeText}
                      onChange={(e) => setCodeText(e.target.value)}
                      placeholder="e.g., amoxicillin"
                    />
                  </div>
                </div>
              </div>

              {/* Context */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Encounter (optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    value={encounterRef}
                    onChange={(e) => setEncounterRef(e.target.value)}
                    placeholder="Encounter/12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Onset (optional)</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={onsetDateTime}
                    onChange={(e) => setOnsetDateTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Asserter (optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    value={asserterReference}
                    onChange={(e) => setAsserterReference(e.target.value)}
                    placeholder="#638995 or Practitioner/123"
                  />
                </div>
              </div>

              {/* Reactions */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Reactions (optional)</h3>
                  <button type="button" onClick={addReaction} className="text-blue-600 hover:text-blue-800">+ Add reaction</button>
                </div>
                {reactions.length === 0 && <p className="text-sm text-gray-600">No reactions added.</p>}
                <div className="space-y-4">
                  {reactions.map((r, rIdx) => (
                    <div key={rIdx} className="border border-gray-200 rounded-md p-3 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 items-center">
                          <label className="text-sm text-gray-700">Severity:</label>
                          <select
                            className="px-2 py-1 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={r.severity || ''}
                            onChange={(e) => setReactionSeverity(rIdx, (e.target.value || undefined) as any)}
                          >
                            <option value="">Unknown</option>
                            <option value="mild">Mild</option>
                            <option value="moderate">Moderate</option>
                            <option value="severe">Severe</option>
                          </select>
                        </div>
                        <button type="button" onClick={() => removeReaction(rIdx)} className="text-red-600 hover:text-red-800">Remove</button>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-gray-700">Manifestations</div>
                          <button type="button" onClick={() => addManifestation(rIdx)} className="text-blue-600 hover:text-blue-800">+ Add manifestation</button>
                        </div>
                        {r.manifestations.length === 0 && <p className="text-sm text-gray-600">No manifestations added.</p>}
                        <div className="space-y-2">
                          {r.manifestations.map((m, mIdx) => (
                            <div key={mIdx} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={m.system || ''}
                                onChange={(e) => updateManifestation(rIdx, mIdx, 'system', e.target.value)}
                                placeholder="http://snomed.info/sct"
                                className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="text"
                                value={m.code || ''}
                                onChange={(e) => updateManifestation(rIdx, mIdx, 'code', e.target.value)}
                                placeholder="SCT code"
                                className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={m.text || ''}
                                  onChange={(e) => updateManifestation(rIdx, mIdx, 'text', e.target.value)}
                                  placeholder="Description (e.g., Papular eruption)"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button type="button" onClick={() => removeManifestation(rIdx, mIdx)} className="text-red-600 hover:text-red-800">X</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Notes (optional)</h3>
                  <button type="button" onClick={addNote} className="text-blue-600 hover:text-blue-800">+ Add note</button>
                </div>
                {notes.length === 0 && <p className="text-sm text-gray-600">No notes added.</p>}
                <div className="space-y-3">
                  {notes.map((n, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-start">
                      <div className="md:col-span-5">
                        <input
                          type="text"
                          value={n.text}
                          onChange={(e) => updateNote(idx, 'text', e.target.value)}
                          placeholder="Note text..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="md:col-span-1 flex gap-2">
                        <input
                          type="text"
                          value={n.authorReference || ''}
                          onChange={(e) => updateNote(idx, 'authorReference', e.target.value)}
                          placeholder="Practitioner/123"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button type="button" onClick={() => removeNote(idx)} className="text-red-600 hover:text-red-800">X</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Allergy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
