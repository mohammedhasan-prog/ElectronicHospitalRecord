'use client';

import { useState, useEffect, useRef } from 'react';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';

interface Organization {
  id: string;
  name: string;
  display: string;
  address?: {
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  type?: {
    coding?: Array<{
      display?: string;
    }>;
  };
}

interface OrganizationAutoSuggestProps {
  onSelect: (organization: Organization) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
  initialValue?: string;
  disabled?: boolean;
}

export default function OrganizationAutoSuggest({
  onSelect,
  placeholder = "Search organizations by name...",
  className = "",
  label = "Organization",
  required = false,
  initialValue = "",
  disabled = false
}: OrganizationAutoSuggestProps) {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [searchResults, setSearchResults] = useState<Organization[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search organizations function
  const searchOrganizations = async (query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/organizations?name=${encodeURIComponent(q)}&_count=20`);
      
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && Array.isArray(data.organizations)) {
          setSearchResults(data.organizations);
          setShowDropdown(true);
        } else {
          setSearchResults([]);
          setShowDropdown(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error searching organizations:', error);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchOrganizations(searchQuery);
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

  const selectOrganization = (organization: Organization) => {
    setSelectedOrganization(organization);
    setSearchQuery(organization.name);
    setShowDropdown(false);
    onSelect(organization);
  };

  const clearSelection = () => {
    setSelectedOrganization(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const formatAddress = (organization: Organization) => {
    if (!organization.address) return '';
    
    const { line, city, state, postalCode } = organization.address;
    const parts = [];
    
    if (line && line.length > 0) {
      parts.push(line[0]);
    }
    if (city) {
      parts.push(city);
    }
    if (state) {
      parts.push(state);
    }
    if (postalCode) {
      parts.push(postalCode);
    }
    
    return parts.join(', ');
  };

  const getOrganizationType = (organization: Organization) => {
    if (organization.type?.coding && organization.type.coding.length > 0) {
      return organization.type.coding[0].display || '';
    }
    return '';
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <BuildingOffice2Icon className="inline h-4 w-4 mr-1" />
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {selectedOrganization ? (
        <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-purple-900">{selectedOrganization.name}</div>
              {getOrganizationType(selectedOrganization) && (
                <div className="text-sm text-purple-700">{getOrganizationType(selectedOrganization)}</div>
              )}
              {formatAddress(selectedOrganization) && (
                <div className="text-sm text-purple-600">{formatAddress(selectedOrganization)}</div>
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
                <div className="px-3 py-2 text-gray-500">Searching organizations...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((organization) => (
                  <button
                    key={organization.id}
                    type="button"
                    onClick={() => selectOrganization(organization)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{organization.name}</div>
                    <div className="text-sm text-gray-600">
                      {getOrganizationType(organization) && (
                        <span>{getOrganizationType(organization)}</span>
                      )}
                      {formatAddress(organization) && (
                        <div className="mt-1">{formatAddress(organization)}</div>
                      )}
                    </div>
                  </button>
                ))
              ) : searchQuery.trim().length >= 2 ? (
                <div className="px-3 py-2 text-gray-500">No organizations found</div>
              ) : (
                <div className="px-3 py-2 text-gray-500">
                  Type at least 2 characters to search
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}