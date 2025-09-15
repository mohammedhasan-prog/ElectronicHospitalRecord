'use client';

import { useState, useEffect, useRef } from 'react';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface Location {
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

interface LocationAutoSuggestProps {
  onSelect: (location: Location) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
  initialValue?: string;
  disabled?: boolean;
}

export default function LocationAutoSuggest({
  onSelect,
  placeholder = "Search locations by name...",
  className = "",
  label = "Location",
  required = false,
  initialValue = "",
  disabled = false
}: LocationAutoSuggestProps) {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search locations function
  const searchLocations = async (query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      // Oracle Health requires either _id or -physicalType. Default to buildings (bu) for name searches.
      const res = await fetch(`/api/locations?name=${encodeURIComponent(q)}&-physicalType=bu&_count=20`);
      
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && Array.isArray(data.locations)) {
          setSearchResults(data.locations);
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
      console.error('Error searching locations:', error);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchLocations(searchQuery);
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

  const selectLocation = (location: Location) => {
    setSelectedLocation(location);
    setSearchQuery(location.name);
    setShowDropdown(false);
    onSelect(location);
  };

  const clearSelection = () => {
    setSelectedLocation(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const formatAddress = (location: Location) => {
    if (!location.address) return '';
    
    const { line, city, state, postalCode } = location.address;
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

  const getLocationType = (location: Location) => {
    if (location.type?.coding && location.type.coding.length > 0) {
      return location.type.coding[0].display || '';
    }
    return '';
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <BuildingOfficeIcon className="inline h-4 w-4 mr-1" />
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {selectedLocation ? (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-blue-900">{selectedLocation.name}</div>
              {getLocationType(selectedLocation) && (
                <div className="text-sm text-blue-700">{getLocationType(selectedLocation)}</div>
              )}
              {formatAddress(selectedLocation) && (
                <div className="text-sm text-blue-600">{formatAddress(selectedLocation)}</div>
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
                <div className="px-3 py-2 text-gray-500">Searching locations...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => selectLocation(location)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{location.name}</div>
                    <div className="text-sm text-gray-600">
                      {getLocationType(location) && (
                        <span>{getLocationType(location)}</span>
                      )}
                      {formatAddress(location) && (
                        <div className="mt-1">{formatAddress(location)}</div>
                      )}
                    </div>
                  </button>
                ))
              ) : searchQuery.trim().length >= 2 ? (
                <div className="px-3 py-2 text-gray-500">No locations found</div>
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