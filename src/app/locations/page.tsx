// src/app/locations/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MapPinIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface Location {
  id: string;
  name: string;
  status: string;
  physicalType: string;
  alias: string[];
  address: any;
  telecom: any[];
  managingOrganization: any;
  partOf: any;
  identifier: any[];
  mode: string;
  fullResource: any;
}

export default function LocationsPage() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState({
    name: '',
    address: '',
    addressCity: '',
    addressState: '',
    addressPostalCode: '',
    physicalType: '',
    organization: '',
    identifier: '',
    _id: ''
  });

  const physicalTypeOptions = [
    { value: '', label: 'Select Physical Type' },
    { value: 'http://terminology.hl7.org/CodeSystem/location-physical-type|si', label: 'Site' },
    { value: 'http://terminology.hl7.org/CodeSystem/location-physical-type|bu', label: 'Building' },
    { value: 'http://terminology.hl7.org/CodeSystem/location-physical-type|wi', label: 'Wing' },
    { value: 'http://terminology.hl7.org/CodeSystem/location-physical-type|wa', label: 'Ward' },
    { value: 'http://terminology.hl7.org/CodeSystem/location-physical-type|lvl', label: 'Level' },
    { value: 'http://terminology.hl7.org/CodeSystem/location-physical-type|co', label: 'Corridor' },
    { value: 'http://terminology.hl7.org/CodeSystem/location-physical-type|ro', label: 'Room' },
    { value: 'http://terminology.hl7.org/CodeSystem/location-physical-type|bd', label: 'Bed' },
    { value: 'http://terminology.hl7.org/CodeSystem/location-physical-type|ve', label: 'Vehicle' },
    { value: 'http://terminology.hl7.org/CodeSystem/location-physical-type|ho', label: 'House' },
    { value: 'http://terminology.hl7.org/CodeSystem/location-physical-type|ca', label: 'Cabinet' },
    { value: 'http://terminology.hl7.org/CodeSystem/location-physical-type|rd', label: 'Road' }
  ];
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Oracle Health FHIR requirements
    const hasId = searchParams._id.trim() !== '';
    const hasPhysicalType = searchParams.physicalType.trim() !== '';
    
    // Either _id or physicalType is required
    if (!hasId && !hasPhysicalType) {
      setError('Either Location ID or Physical Type is required for search');
      return;
    }

    // Validate name parameter dependencies
    if (searchParams.name.trim() && !hasPhysicalType && !searchParams.identifier.trim() && 
        !searchParams.address.trim() && !searchParams.addressState.trim() && 
        !searchParams.addressCity.trim() && !searchParams.addressPostalCode.trim()) {
      setError('When searching by name, you must also specify Physical Type, Identifier, Address, City, State, or Postal Code');
      return;
    }

    // Validate organization parameter dependencies  
    if (searchParams.organization.trim() && !hasPhysicalType && !searchParams.identifier.trim() && 
        !searchParams.address.trim() && !searchParams.addressState.trim() && 
        !searchParams.addressCity.trim() && !searchParams.addressPostalCode.trim()) {
      setError('When searching by organization, you must also specify Physical Type, Identifier, Address, City, State, or Postal Code');
      return;
    }

    // Validate address-city dependencies
    if (searchParams.addressCity.trim() && !searchParams.addressState.trim() && !searchParams.addressPostalCode.trim()) {
      setError('When searching by city, you must also specify State or Postal Code');
      return;
    }

    const params = new URLSearchParams();
    
    // Add non-empty search parameters
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value.trim()) {
        // Map UI field names to FHIR parameters
        const paramMap: { [key: string]: string } = {
          addressCity: 'address-city',
          addressState: 'address-state', 
          addressPostalCode: 'address-postalcode',
          physicalType: '-physicalType' // Oracle Health uses -physicalType
        };
        const fhirParam = paramMap[key] || key;
        params.append(fhirParam, value.trim());
      }
    });

    setIsLoading(true);
    setError(null);
    setLocations([]);
    setNextCursor(null);
    setSelectedLocation(null);

    try {
      const response = await fetch(`/api/locations?${params.toString()}`);
      const data = await response.json();

      if (data.ok) {
        setLocations(data.locations);
        setNextCursor(data.pagination.nextCursor);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowseAll = async () => {
    setIsLoading(true);
    setError(null);
    setLocations([]);
    setNextCursor(null);
    setSelectedLocation(null);

    try {
      // Use a common physical type for browse all (Site type)
      const response = await fetch('/api/locations?-physicalType=http://terminology.hl7.org/CodeSystem/location-physical-type|si&_count=20');
      const data = await response.json();

      if (data.ok) {
        setLocations(data.locations);
        setNextCursor(data.pagination.nextCursor);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      // Add current search parameters
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value.trim()) {
          const paramMap: { [key: string]: string } = {
            addressCity: 'address-city',
            addressState: 'address-state',
            addressPostalCode: 'address-postalcode',
            physicalType: '-physicalType'
          };
          const fhirParam = paramMap[key] || key;
          params.append(fhirParam, value.trim());
        }
      });
      
      params.append('cursor', nextCursor);

      const response = await fetch(`/api/locations?${params.toString()}`);
      const data = await response.json();

      if (data.ok) {
        setLocations(prev => [...prev, ...data.locations]);
        setNextCursor(data.pagination.nextCursor);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleViewDetails = (location: Location) => {
    setSelectedLocation(location);
  };

  const clearSearch = () => {
    setSearchParams({
      name: '',
      address: '',
      addressCity: '',
      addressState: '',
      addressPostalCode: '',
      physicalType: '',
      organization: '',
      identifier: '',
      _id: ''
    });
    setLocations([]);
    setError(null);
    setSelectedLocation(null);
  };

  const getPhoneNumbers = (telecom: any[]) => {
    return telecom.filter(t => t.system === 'phone' || t.system === 'sms').map(t => t.value).join(', ') || 'N/A';
  };

  const getEmails = (telecom: any[]) => {
    return telecom.filter(t => t.system === 'email').map(t => t.value).join(', ') || 'N/A';
  };

  const formatAddress = (address: any) => {
    if (!address) return 'N/A';
    const parts = [
      ...(address.line || []),
      address.city,
      address.state,
      address.postalCode,
      address.country
    ].filter(Boolean);
    return parts.join(', ') || address.text || 'N/A';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search and Results Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-md rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
                <MapPinIcon className="h-8 w-8 text-blue-600" />
              </div>
              
              {/* Search Form */}
              <form onSubmit={handleSearch} className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Location Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={searchParams.name}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Emergency Department"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="physicalType" className="block text-sm font-medium text-gray-700 mb-1">
                      Physical Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="physicalType"
                      value={searchParams.physicalType}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, physicalType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {physicalTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Required if not searching by ID</p>
                  </div>

                  <div>
                    <label htmlFor="_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Location ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="_id"
                      value={searchParams._id}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, _id: e.target.value }))}
                      placeholder="e.g., 21250409"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Required if not specifying Physical Type</p>
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      id="address"
                      value={searchParams.address}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="e.g., Main Street"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="addressCity" className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      id="addressCity"
                      value={searchParams.addressCity}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, addressCity: e.target.value }))}
                      placeholder="e.g., Kansas City"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="addressState" className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      id="addressState"
                      value={searchParams.addressState}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, addressState: e.target.value }))}
                      placeholder="e.g., MO"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                      Organization ID
                    </label>
                    <input
                      type="text"
                      id="organization"
                      value={searchParams.organization}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, organization: e.target.value }))}
                      placeholder="e.g., 667844"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                    )}
                    Search Locations
                  </button>

                  <button
                    type="button"
                    onClick={handleBrowseAll}
                    disabled={isLoading}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                    Browse All
                  </button>

                  <button
                    type="button"
                    onClick={clearSearch}
                    className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Clear
                  </button>
                </div>
              </form>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                </div>
              )}

              {/* Results */}
              {locations.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Found {locations.length} location{locations.length !== 1 ? 's' : ''}
                  </h2>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Address
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {locations.map((location) => (
                          <tr key={location.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{location.name}</div>
                              {location.alias.length > 0 && (
                                <div className="text-sm text-gray-500">
                                  Alias: {location.alias.join(', ')}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{location.physicalType}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(location.status)}`}>
                                {location.status}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-gray-900 max-w-xs truncate">
                                {formatAddress(location.address)}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleViewDetails(location)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {nextCursor && (
                    <div className="text-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isLoadingMore ? (
                          <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Load More Locations
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* No Results */}
              {!isLoading && locations.length === 0 && !error && (
                <div className="text-center py-8">
                  <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No locations found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try searching with different criteria or browse all locations.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Details Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-md rounded-lg p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Location Details</h2>
              
              {selectedLocation ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Name</h3>
                    <p className="mt-1 text-sm text-gray-900 font-medium">{selectedLocation.name}</p>
                  </div>
                  
                  {selectedLocation.alias.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Aliases</h3>
                      <div className="mt-1 space-y-1">
                        {selectedLocation.alias.map((alias, index) => (
                          <span key={index} className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded mr-1">
                            {alias}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedLocation.status)}`}>
                      {selectedLocation.status}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Physical Type</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedLocation.physicalType}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-1" />
                      Phone Numbers
                    </h3>
                    <p className="mt-1 text-sm text-gray-900">{getPhoneNumbers(selectedLocation.telecom)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <EnvelopeIcon className="h-4 w-4 mr-1" />
                      Email
                    </h3>
                    <p className="mt-1 text-sm text-gray-900">{getEmails(selectedLocation.telecom)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      Address
                    </h3>
                    <p className="mt-1 text-sm text-gray-900">{formatAddress(selectedLocation.address)}</p>
                  </div>
                  
                  {selectedLocation.managingOrganization && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Managing Organization</h3>
                      <p className="mt-1 text-sm text-gray-900">{selectedLocation.managingOrganization.display}</p>
                    </div>
                  )}
                  
                  {selectedLocation.partOf && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Part Of</h3>
                      <p className="mt-1 text-sm text-gray-900">{selectedLocation.partOf.reference}</p>
                    </div>
                  )}
                  
                  {selectedLocation.identifier.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Identifiers</h3>
                      <div className="mt-1 space-y-1">
                        {selectedLocation.identifier.map((id, index) => (
                          <div key={index} className="text-xs bg-gray-100 p-2 rounded">
                            <div className="font-medium">{id.type?.text || id.system}</div>
                            <div className="text-gray-600">{id.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm">Select a location to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}