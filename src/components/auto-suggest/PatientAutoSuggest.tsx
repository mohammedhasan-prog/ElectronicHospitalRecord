'use client';

import { useState, useEffect, useRef } from 'react';
import { UserIcon } from '@heroicons/react/24/outline';

interface Patient {
  id: string;
  name: string;
  display: string;
  birthDate?: string;
  gender?: string;
  identifier?: Array<{
    value: string;
    type?: {
      text?: string;
    };
  }>;
}

interface PatientAutoSuggestProps {
  onSelect: (patient: Patient) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
  initialValue?: string;
  disabled?: boolean;
}

export default function PatientAutoSuggest({
  onSelect,
  placeholder = "Search patients by name or MRN...",
  className = "",
  label = "Patient",
  required = false,
  initialValue = "",
  disabled = false
}: PatientAutoSuggestProps) {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search patients function
  const searchPatients = async (query: string) => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const isIdLike = /^\d[\d-]*$/.test(q);
      let results: Patient[] = [];

      // First, if the input looks like an MRN/ID, try identifier search
      if (isIdLike) {
        const idRes = await fetch(`/api/patients?identifier=${encodeURIComponent(q)}&_count=10`);
        if (idRes.ok) {
          const idData = await idRes.json();
          if (idData?.ok && Array.isArray(idData.patients)) {
            results = idData.patients;
          }
        } else {
          // Ignore identifier errors silently in typeahead
          await idRes.text().catch(() => {});
        }
      }

      // If no results yet and user typed 3+ chars, try name search
      if (results.length === 0 && q.length >= 3) {
        const nameRes = await fetch(`/api/patients?name=${encodeURIComponent(q)}&_count=10`);
        if (nameRes.ok) {
          const nameData = await nameRes.json();
          if (nameData?.ok && Array.isArray(nameData.patients)) {
            results = nameData.patients;
          }
        } else {
          // Most likely a 400 due to too-short token or bad format
          await nameRes.text().catch(() => {});
        }
      }

      setSearchResults(results);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching patients:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPatients(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.name);
    setShowDropdown(false);
    onSelect(patient);
  };

  const clearSelection = () => {
    setSelectedPatient(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const formatIdentifier = (patient: Patient) => {
    if (patient.identifier && patient.identifier.length > 0) {
      const primaryId = patient.identifier[0];
      return primaryId.value || '';
    }
    return '';
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <UserIcon className="inline h-4 w-4 mr-1" />
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {selectedPatient ? (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-green-900">{selectedPatient.name}</div>
              <div className="text-sm text-green-700">
                {selectedPatient.gender && (
                  <span className="capitalize">{selectedPatient.gender}</span>
                )}
                {selectedPatient.birthDate && (
                  <span className="ml-2">Born: {selectedPatient.birthDate}</span>
                )}
              </div>
              {formatIdentifier(selectedPatient) && (
                <div className="text-sm text-green-600">
                  ID: {formatIdentifier(selectedPatient)}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="text-red-600 hover:text-red-800"
              disabled={disabled}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            autoComplete="off"
            disabled={disabled}
          />
          
          {/* Search Results Dropdown */}
          {showDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {isSearching ? (
                <div className="px-3 py-2 text-gray-500">Searching patients...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => selectPatient(patient)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-sm text-gray-600">
                      {patient.gender && (
                        <span className="capitalize">{patient.gender}</span>
                      )}
                      {patient.birthDate && (
                        <span className="ml-2">Born: {patient.birthDate}</span>
                      )}
                      {formatIdentifier(patient) && (
                        <span className="ml-2">ID: {formatIdentifier(patient)}</span>
                      )}
                    </div>
                  </button>
                ))
              ) : searchQuery.trim().length >= 3 ? (
                <div className="px-3 py-2 text-gray-500">No patients found</div>
              ) : (
                <div className="px-3 py-2 text-gray-500">
                  Type at least 3 characters to search by name, or enter MRN/ID
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}