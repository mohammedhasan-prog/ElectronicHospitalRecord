'use client';

import { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  MagnifyingGlassIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  MapPinIcon,
  AcademicCapIcon,
  IdentificationIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface Practitioner {
  id: string;
  name: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  active: boolean;
  gender?: string;
  phone?: string;
  email?: string;
  address?: {
    text?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  identifiers?: Array<{
    type?: string;
    value: string;
    system?: string;
  }>;
  qualifications?: Array<{
    code: string;
    display?: string;
  }>;
}

interface SearchFilters {
  name: string;
  family: string;
  given: string;
  identifier: string;
  active: boolean | null;
}

export default function PractitionersPage() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [nextLink, setNextLink] = useState<string | null>(null);
  const [prevLink, setPrevLink] = useState<string | null>(null);

  const [filters, setFilters] = useState<SearchFilters>({
    name: '',
    family: '',
    given: '',
    identifier: '',
    active: null
  });

  const [searchParams, setSearchParams] = useState({
    _count: 20
  });

  useEffect(() => {
    searchPractitioners();
  }, []);

  const validateFilters = (currentFilters: SearchFilters): string | null => {
    // Oracle Health FHIR validation rules
    
    // If given name is provided, family name is required
    if (currentFilters.given.trim() && !currentFilters.family.trim()) {
      return 'Family name is required when searching by given name (Oracle Health FHIR requirement)';
    }

    // Name must be at least 2 characters
    if (currentFilters.name.trim() && currentFilters.name.trim().length < 2) {
      return 'Name must be at least 2 characters long';
    }

    // At least one search parameter is required
    const hasSearchParam = currentFilters.name.trim() || 
                          currentFilters.family.trim() || 
                          currentFilters.identifier.trim() || 
                          currentFilters.active !== null;
    
    if (!hasSearchParam) {
      return null; // Will default to active practitioners
    }

    return null;
  };

  const searchPractitioners = async (customFilters?: Partial<SearchFilters>) => {
    setLoading(true);
    setError('');
    
    try {
      const currentFilters = { ...filters, ...customFilters };
      
      // Validate filters before making request
      const validationError = validateFilters(currentFilters);
      if (validationError) {
        setError(validationError);
        setLoading(false);
        return;
      }

      const queryParams = new URLSearchParams();

      // Add search parameters
      if (currentFilters.name.trim()) {
        queryParams.append('name', currentFilters.name.trim());
      }
      if (currentFilters.family.trim()) {
        queryParams.append('family', currentFilters.family.trim());
      }
      if (currentFilters.given.trim()) {
        queryParams.append('given', currentFilters.given.trim());
      }
      if (currentFilters.identifier.trim()) {
        queryParams.append('identifier', currentFilters.identifier.trim());
      }
      if (currentFilters.active !== null) {
        queryParams.append('active', currentFilters.active.toString());
      }

      queryParams.append('_count', searchParams._count.toString());

  const response = await fetch(`/api/practitioners?${queryParams.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to search practitioners');
      }

      const practitionerList: Practitioner[] = data.entry?.map((entry: any) => {
        const resource = entry.resource;
        const name = resource.name?.[0];
        
        return {
          id: resource.id,
          name: name?.text || 
                `${name?.prefix?.join(' ') || ''} ${name?.given?.join(' ') || ''} ${name?.family || ''}`.trim() ||
                'Unknown Practitioner',
          family: name?.family,
          given: name?.given,
          prefix: name?.prefix,
          suffix: name?.suffix,
          active: resource.active || false,
          gender: resource.gender,
          phone: resource.telecom?.find((t: any) => t.system === 'phone')?.value,
          email: resource.telecom?.find((t: any) => t.system === 'email')?.value,
          address: resource.address?.[0] ? {
            text: resource.address[0].text,
            line: resource.address[0].line,
            city: resource.address[0].city,
            state: resource.address[0].state,
            postalCode: resource.address[0].postalCode,
            country: resource.address[0].country
          } : undefined,
          identifiers: resource.identifier?.map((id: any) => ({
            type: id.type?.text || id.type?.coding?.[0]?.display,
            value: id.value,
            system: id.system
          })),
          qualifications: resource.qualification?.map((qual: any) => ({
            code: qual.code?.text || qual.code?.coding?.[0]?.code,
            display: qual.code?.coding?.[0]?.display
          }))
        };
      }) || [];

  setPractitioners(practitionerList);
  setTotalCount(data.total || practitionerList.length);
  // Extract pagination links if present
  const links: Array<{ relation: string; url: string }> = data.link || [];
  setNextLink(links.find(l => l.relation === 'next')?.url || null);
  setPrevLink(links.find(l => l.relation === 'previous')?.url || null);
      
    } catch (error) {
      console.error('Error searching practitioners:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const goToPage = async (pageUrl: string | null) => {
    if (!pageUrl) return;
    setLoading(true);
    setError('');
    try {
      const url = new URL(pageUrl);
      const resp = await fetch(`/api/practitioners?pageUrl=${encodeURIComponent(url.toString())}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || data.details || 'Failed to paginate');
      const practitionerList: Practitioner[] = data.entry?.map((entry: any) => {
        const resource = entry.resource; const name = resource.name?.[0];
        return {
          id: resource.id,
          name: name?.text || `${name?.prefix?.join(' ') || ''} ${name?.given?.join(' ') || ''} ${name?.family || ''}`.trim() || 'Unknown Practitioner',
          family: name?.family,
          given: name?.given,
          prefix: name?.prefix,
          suffix: name?.suffix,
          active: resource.active || false,
          gender: resource.gender,
          phone: resource.telecom?.find((t: any) => t.system === 'phone')?.value,
          email: resource.telecom?.find((t: any) => t.system === 'email')?.value,
          address: resource.address?.[0] ? {
            text: resource.address[0].text,
            line: resource.address[0].line,
            city: resource.address[0].city,
            state: resource.address[0].state,
            postalCode: resource.address[0].postalCode,
            country: resource.address[0].country
          } : undefined,
          identifiers: resource.identifier?.map((id: any) => ({
            type: id.type?.text || id.type?.coding?.[0]?.display,
            value: id.value,
            system: id.system
          })),
          qualifications: resource.qualification?.map((qual: any) => ({
            code: qual.code?.text || qual.code?.coding?.[0]?.code,
            display: qual.code?.coding?.[0]?.display
          }))
        };
      }) || [];
      setPractitioners(practitionerList);
      setTotalCount(data.total || practitionerList.length);
      const links: Array<{ relation: string; url: string }> = data.link || [];
      setNextLink(links.find(l => l.relation === 'next')?.url || null);
      setPrevLink(links.find(l => l.relation === 'previous')?.url || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to paginate');
    } finally { setLoading(false); }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchPractitioners();
  };

  const clearFilters = () => {
    const clearedFilters = {
      name: '',
      family: '',
      given: '',
      identifier: '',
      active: null
    };
    setFilters(clearedFilters);
    searchPractitioners(clearedFilters);
    setSelectedPractitioner(null);
  };

  const formatAddress = (address?: Practitioner['address']) => {
    if (!address) return 'No address available';
    
    if (address.text) return address.text;
    
    const parts = [
      ...(address.line || []),
      address.city,
      address.state,
      address.postalCode,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ') || 'No address available';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Practitioners</h1>
        <p className="text-gray-600">
          Search and manage healthcare practitioners in the system.
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Oracle Health FHIR Requirements Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
            <p className="font-medium mb-2">Search Requirements:</p>
            <ul className="space-y-1 text-xs">
              <li>• At least one search parameter is required (defaults to active practitioners if none provided)</li>
              <li>• Given name requires family name to be provided</li>
              <li>• Name searches must be at least 2 characters long</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name (min 2 characters)
              </label>
              <input
                type="text"
                id="name"
                value={filters.name}
                onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Search by full name..."
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 ${filters.name && filters.name.trim().length > 0 && filters.name.trim().length < 2 ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                minLength={2}
              />
              {filters.name && filters.name.trim().length > 0 && filters.name.trim().length < 2 && (
                <p className="mt-1 text-xs text-red-600">Enter at least 2 characters</p>
              )}
            </div>

            <div>
              <label htmlFor="family" className="block text-sm font-medium text-gray-700 mb-2">
                Family Name
              </label>
              <input
                type="text"
                id="family"
                value={filters.family}
                onChange={(e) => setFilters(prev => ({ ...prev, family: e.target.value }))}
                placeholder="Search by last name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="given" className="block text-sm font-medium text-gray-700 mb-2">
                Given Name (requires family name)
              </label>
              <input
                type="text"
                id="given"
                value={filters.given}
                onChange={(e) => setFilters(prev => ({ ...prev, given: e.target.value }))}
                placeholder="Search by first name..."
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  filters.given && !filters.family ? 'border-yellow-400 bg-yellow-50' : ''
                }`}
              />
              {filters.given && !filters.family && (
                <p className="text-xs text-yellow-600 mt-1">Family name required when searching by given name</p>
              )}
            </div>

            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                Identifier
              </label>
              <input
                type="text"
                id="identifier"
                value={filters.identifier}
                onChange={(e) => setFilters(prev => ({ ...prev, identifier: e.target.value }))}
                placeholder="NPI, DEA, etc..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="active" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="active"
                value={filters.active === null ? '' : filters.active.toString()}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  active: e.target.value === '' ? null : e.target.value === 'true' 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </button>
            
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Filters
            </button>
            {!loading && totalCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                Results: {totalCount}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Practitioners List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Practitioners ({totalCount})</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(prevLink)}
                  disabled={!prevLink || loading}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 disabled:opacity-40 hover:bg-gray-50"
                >Prev</button>
                <button
                  type="button"
                  onClick={() => goToPage(nextLink)}
                  disabled={!nextLink || loading}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 disabled:opacity-40 hover:bg-gray-50"
                >Next</button>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {loading ? (
                <div className="px-6 py-4 space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-5 bg-gray-200 rounded w-1/3" />
                      <div className="mt-2 h-4 bg-gray-100 rounded w-1/2" />
                      <div className="mt-2 h-3 bg-gray-100 rounded w-1/4" />
                    </div>
                  ))}
                </div>
              ) : practitioners.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2">No practitioners found</p>
                  <p className="text-sm">Try adjusting your search criteria</p>
                </div>
              ) : (
                practitioners.map((practitioner) => (
                  <div
                    key={practitioner.id}
                    onClick={() => setSelectedPractitioner(practitioner)}
                    className={`px-6 py-4 hover:bg-gray-50 cursor-pointer ${
                      selectedPractitioner?.id === practitioner.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900">
                            {practitioner.name}
                          </h3>
                          <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${practitioner.active ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'}`}>
                            {practitioner.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        {practitioner.qualifications && practitioner.qualifications.length > 0 && (
                          <p className="mt-0.5 text-sm text-gray-600">
                            {practitioner.qualifications.map(q => q.display || q.code).join(', ')}
                          </p>
                        )}
                        
                        <div className="mt-1 text-sm text-gray-500">
                          {practitioner.email && (
                            <span className="mr-4">{practitioner.email}</span>
                          )}
                          {practitioner.phone && (
                            <span>{practitioner.phone}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Practitioner Details Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Practitioner Details</h2>
            </div>
            
            {selectedPractitioner ? (
              <div className="px-6 py-4 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedPractitioner.name}
                  </h3>
                  <div className="flex items-center mt-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${selectedPractitioner.active ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'}`}>
                      {selectedPractitioner.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {selectedPractitioner.gender && (
                    <p className="text-sm text-gray-600 mt-1">
                      Gender: {selectedPractitioner.gender}
                    </p>
                  )}
                </div>

                {/* Contact Information */}
                {(selectedPractitioner.phone || selectedPractitioner.email) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Contact</h4>
                    <div className="space-y-2">
                      {selectedPractitioner.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <PhoneIcon className="h-4 w-4 mr-2" />
                          {selectedPractitioner.phone}
                        </div>
                      )}
                      {selectedPractitioner.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <EnvelopeIcon className="h-4 w-4 mr-2" />
                          {selectedPractitioner.email}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Address */}
                {selectedPractitioner.address && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Address</h4>
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{formatAddress(selectedPractitioner.address)}</span>
                    </div>
                  </div>
                )}

                {/* Identifiers */}
                {selectedPractitioner.identifiers && selectedPractitioner.identifiers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Identifiers</h4>
                    <div className="space-y-1">
                      {selectedPractitioner.identifiers.map((identifier, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <IdentificationIcon className="h-4 w-4 mr-2" />
                          <span className="font-medium mr-2">
                            {identifier.type || 'ID'}:
                          </span>
                          <span>{identifier.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Qualifications */}
                {selectedPractitioner.qualifications && selectedPractitioner.qualifications.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Qualifications</h4>
                    <div className="space-y-1">
                      {selectedPractitioner.qualifications.map((qualification, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <AcademicCapIcon className="h-4 w-4 mr-2" />
                          <span>{qualification.display || qualification.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">Select a practitioner to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}