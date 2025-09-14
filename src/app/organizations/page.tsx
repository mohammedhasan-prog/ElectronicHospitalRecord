// src/app/organizations/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface Organization {
  id: string;
  name: string;
  status: string;
  type: string;
  types: any[];
  identifier: any[];
  telecom: any[];
  address: any[];
  fullResource: any;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<'caregiver' | 'standard'>('standard');
  const [organizationId, setOrganizationId] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchAddress, setSearchAddress] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let searchUrl = '/api/organizations?';
    const params = new URLSearchParams();
    
    if (searchMode === 'caregiver') {
      const trimmedId = organizationId.trim();
      
      if (!trimmedId) {
        setError('Please enter an Organization ID for caregiver search');
        return;
      }

      // Validate that the ID is numeric for caregiver search
      if (!/^\d+$/.test(trimmedId)) {
        setError('Organization ID must be numeric for caregiver search (e.g., 3304067). Letters and special characters are not allowed.');
        return;
      }
      
      params.append('_id', trimmedId);
      params.append('searchType', 'caregiver');
    } else {
      // Standard search - at least one parameter is required
      if (!organizationId.trim() && !searchName.trim() && !searchAddress.trim()) {
        setError('Please enter at least one search criterion (ID, name, or address)');
        return;
      }
      
      if (organizationId.trim()) params.append('_id', organizationId.trim());
      if (searchName.trim()) params.append('name', searchName.trim());
      if (searchAddress.trim()) params.append('address', searchAddress.trim());
      params.append('searchType', 'standard');
    }

    setIsLoading(true);
    setError(null);
    setOrganizations([]);
    setNextCursor(null);
    setSelectedOrg(null);

    try {
      const response = await fetch(`/api/organizations?${params.toString()}`);
      const data = await response.json();

      if (data.ok) {
        setOrganizations(data.organizations);
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
    setOrganizations([]);
    setNextCursor(null);
    setSelectedOrg(null);

    try {
      const response = await fetch('/api/organizations?searchType=standard&_count=20');
      const data = await response.json();

      if (data.ok) {
        setOrganizations(data.organizations);
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
    if (!nextCursor) return;
    
    setIsLoadingMore(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations?cursor=${encodeURIComponent(nextCursor)}`);
      const data = await response.json();

      if (data.ok) {
        setOrganizations(prev => [...prev, ...data.organizations]);
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

  const handleViewDetails = (org: Organization) => {
    setSelectedOrg(org);
  };

  const getPhoneNumbers = (telecom: any[]) => {
    return telecom.filter(t => t.system === 'phone' || t.system === 'sms').map(t => t.value).join(', ') || 'N/A';
  };

  const getEmails = (telecom: any[]) => {
    return telecom.filter(t => t.system === 'email').map(t => t.value).join(', ') || 'N/A';
  };

  const getMainAddress = (addresses: any[]) => {
    const workAddress = addresses.find(a => a.use === 'work') || addresses[0];
    if (!workAddress) return 'N/A';
    return `${workAddress.line?.join(', ') || ''} ${workAddress.city || ''}, ${workAddress.state || ''} ${workAddress.postalCode || ''}`.trim();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search and Results Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-md rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
              </div>
              
              {/* Search Mode Toggle */}
              <div className="mb-4">
                <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => setSearchMode('standard')}
                    className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors ${
                      searchMode === 'standard'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Standard Search
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode('caregiver')}
                    className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors ${
                      searchMode === 'caregiver'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Caregiver Search
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSearch} className="mb-6">
                {searchMode === 'caregiver' ? (
                  /* Caregiver Search Form */
                  <div className="mb-3">
                    <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700 mb-2">
                      Organization ID (Required)
                    </label>
                    <div className="flex items-center">
                      <input
                        id="organizationId"
                        type="text"
                        value={organizationId}
                        onChange={(e) => setOrganizationId(e.target.value)}
                        placeholder="3304067"
                        pattern="[0-9]+"
                        title="Organization ID must be numeric"
                        className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 block w-full p-3 rounded-l-md shadow-sm"
                      />
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-r-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                      >
                        {isLoading ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <p>• Enter a numeric Organization ID to retrieve caregiver organizations</p>
                      <p>• Uses the Oracle Health FHIR $get-cg-for-mrcu operation</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="text-xs text-gray-500">Quick examples:</span>
                        <button
                          type="button"
                          onClick={() => setOrganizationId('3304067')}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          3304067
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrganizationId('675844')}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          675844
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrganizationId('589783')}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          589783
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Search Form */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="stdOrganizationId" className="block text-sm font-medium text-gray-700 mb-1">
                          Organization ID
                        </label>
                        <input
                          id="stdOrganizationId"
                          type="text"
                          value={organizationId}
                          onChange={(e) => setOrganizationId(e.target.value)}
                          placeholder="675844"
                          className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 block w-full p-2 rounded-md shadow-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="searchName" className="block text-sm font-medium text-gray-700 mb-1">
                          Organization Name
                        </label>
                        <input
                          id="searchName"
                          type="text"
                          value={searchName}
                          onChange={(e) => setSearchName(e.target.value)}
                          placeholder="Model Hospital"
                          className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 block w-full p-2 rounded-md shadow-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="searchAddress" className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          id="searchAddress"
                          type="text"
                          value={searchAddress}
                          onChange={(e) => setSearchAddress(e.target.value)}
                          placeholder="Kansas City"
                          className="border-gray-300 focus:ring-blue-500 focus:border-blue-500 block w-full p-2 rounded-md shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                      >
                        {isLoading ? 'Searching...' : 'Search Organizations'}
                      </button>
                      <button
                        type="button"
                        onClick={handleBrowseAll}
                        disabled={isLoading}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                      >
                        Browse All
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <p>• Enter at least one search criterion (ID, name, or address)</p>
                      <p>• Uses the standard Oracle Health FHIR Organization search</p>
                      <p>• Supports partial matching for name and address fields</p>
                    </div>
                  </div>
                )}
              </form>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Organization ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            <div className="flex justify-center items-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                              <span className="ml-2">Loading organizations...</span>
                            </div>
                          </td>
                        </tr>
                      ) : organizations.length > 0 ? (
                        organizations.map((org, index) => (
                          <tr key={org.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <span className="text-blue-600 font-mono">{org.id}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={org.name}>
                                {org.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                org.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {org.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="max-w-xs truncate" title={org.type}>
                                {org.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleViewDetails(org)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        !isLoading && (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                              <div className="flex flex-col items-center">
                                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations found</h3>
                                <p className="mt-1 text-sm text-gray-500">Enter an Organization ID to search.</p>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {organizations.length > 0 && nextCursor && (
                  <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button 
                          onClick={handleLoadMore}
                          disabled={isLoadingMore}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          {isLoadingMore ? 'Loading...' : 'Load More'}
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{organizations.length}</span> results
                            {nextCursor && <span> (more available)</span>}
                          </p>
                        </div>
                        <div>
                          <button
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoadingMore ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                                Loading...
                              </>
                            ) : (
                              'Load More'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-md rounded-lg p-6 sticky top-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Organization Details</h2>
              
              {selectedOrg ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Name</h3>
                    <p className="mt-1 text-sm text-gray-900">{selectedOrg.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">ID</h3>
                    <p className="mt-1 text-sm font-mono text-gray-900">{selectedOrg.id}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedOrg.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedOrg.status}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Organization Types</h3>
                    <div className="mt-1 space-y-1">
                      {selectedOrg.types.map((type, index) => (
                        <span key={index} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded mr-1 mb-1">
                          {type.text || type.coding?.[0]?.display || 'Unknown'}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-1" />
                      Phone Numbers
                    </h3>
                    <p className="mt-1 text-sm text-gray-900">{getPhoneNumbers(selectedOrg.telecom)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <EnvelopeIcon className="h-4 w-4 mr-1" />
                      Email
                    </h3>
                    <p className="mt-1 text-sm text-gray-900">{getEmails(selectedOrg.telecom)}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      Address
                    </h3>
                    <p className="mt-1 text-sm text-gray-900">{getMainAddress(selectedOrg.address)}</p>
                  </div>
                  
                  {selectedOrg.identifier.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Identifiers</h3>
                      <div className="mt-1 space-y-1">
                        {selectedOrg.identifier.map((id, index) => (
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
                  <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm">Select an organization to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}