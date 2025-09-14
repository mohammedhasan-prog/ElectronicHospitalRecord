// src/app/organizations/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BuildingOfficeIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  MapPinIcon,
  ArrowLeftIcon,
  ClockIcon,
  IdentificationIcon,
  TagIcon
} from '@heroicons/react/24/outline';

interface Organization {
  id: string;
  name: string;
  status: string;
  type: string;
  types: any[];
  identifier: any[];
  telecom: any[];
  address: any[];
  meta: any;
  fullResource: any;
}

interface OrganizationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganization();
  }, [resolvedParams.id]);

  const fetchOrganization = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${resolvedParams.id}`);
      const data = await response.json();

      if (data.ok) {
        setOrganization(data.organization);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPhoneNumbers = (telecom: any[]) => {
    return telecom.filter(t => t.system === 'phone' || t.system === 'sms');
  };

  const getEmails = (telecom: any[]) => {
    return telecom.filter(t => t.system === 'email');
  };

  const getFaxNumbers = (telecom: any[]) => {
    return telecom.filter(t => t.system === 'fax');
  };

  const formatAddress = (address: any) => {
    const parts = [];
    if (address.line) parts.push(...address.line);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postalCode) parts.push(address.postalCode);
    if (address.country) parts.push(address.country);
    return parts.join(', ');
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-800">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-800">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Organizations
            </button>
            <div className="text-center">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Organization</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <div className="mt-6">
                <button
                  onClick={fetchOrganization}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-800">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Organizations
            </button>
            <div className="text-center">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Organization Not Found</h3>
              <p className="mt-1 text-sm text-gray-500">The organization you're looking for doesn't exist.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Organizations
            </button>
            
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-12 w-12 text-blue-600 mr-4" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
                  <div className="flex items-center mt-2">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                      organization.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {organization.status}
                    </span>
                    <span className="ml-3 text-sm text-gray-500">ID: {organization.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Contact Information */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <PhoneIcon className="h-5 w-5 mr-2" />
                  Contact Information
                </h2>
                
                {/* Phone Numbers */}
                {getPhoneNumbers(organization.telecom).length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Phone Numbers</h3>
                    <div className="space-y-1">
                      {getPhoneNumbers(organization.telecom).map((phone, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span>{phone.value}</span>
                          {phone.use && <span className="ml-2 text-xs text-gray-500">({phone.use})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email Addresses */}
                {getEmails(organization.telecom).length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Email Addresses</h3>
                    <div className="space-y-1">
                      {getEmails(organization.telecom).map((email, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span>{email.value}</span>
                          {email.use && <span className="ml-2 text-xs text-gray-500">({email.use})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fax Numbers */}
                {getFaxNumbers(organization.telecom).length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Fax Numbers</h3>
                    <div className="space-y-1">
                      {getFaxNumbers(organization.telecom).map((fax, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <span className="h-4 w-4 text-gray-400 mr-2">📠</span>
                          <span>{fax.value}</span>
                          {fax.use && <span className="ml-2 text-xs text-gray-500">({fax.use})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {organization.telecom.length === 0 && (
                  <p className="text-sm text-gray-500">No contact information available</p>
                )}
              </div>

              {/* Addresses */}
              <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  Addresses
                </h2>
                
                {organization.address.length > 0 ? (
                  <div className="space-y-4">
                    {organization.address.map((addr, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <div className="flex items-center mb-1">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {addr.use && <span className="text-xs font-medium text-blue-600 uppercase">{addr.use}</span>}
                        </div>
                        <p className="text-sm text-gray-900">{formatAddress(addr)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No addresses available</p>
                )}
              </div>
            </div>

            {/* Middle Column - Organization Details */}
            <div className="space-y-6">
              {/* Organization Types */}
              <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <TagIcon className="h-5 w-5 mr-2" />
                  Organization Types
                </h2>
                
                {organization.types.length > 0 ? (
                  <div className="space-y-2">
                    {organization.types.map((type, index) => (
                      <div key={index} className="bg-blue-50 rounded-lg p-3">
                        <div className="font-medium text-sm text-blue-900">
                          {type.text || type.coding?.[0]?.display || 'Unknown Type'}
                        </div>
                        {type.coding && type.coding.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {type.coding.map((coding: any, cIndex: number) => (
                              <div key={cIndex} className="text-xs text-blue-700">
                                <span className="font-mono">{coding.code}</span>
                                {coding.system && <span className="ml-2 text-blue-600">({coding.system})</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No organization types available</p>
                )}
              </div>

              {/* Identifiers */}
              <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <IdentificationIcon className="h-5 w-5 mr-2" />
                  Identifiers
                </h2>
                
                {organization.identifier.length > 0 ? (
                  <div className="space-y-3">
                    {organization.identifier.map((id, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {id.type?.text || id.type?.coding?.[0]?.display || 'Identifier'}
                          </span>
                          {id.use && <span className="text-xs text-gray-500 uppercase">{id.use}</span>}
                        </div>
                        <div className="text-sm font-mono text-gray-700">{id.value}</div>
                        {id.system && <div className="text-xs text-gray-500 mt-1">{id.system}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No identifiers available</p>
                )}
              </div>
            </div>

            {/* Right Column - Metadata */}
            <div className="space-y-6">
              {/* Metadata */}
              <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Metadata
                </h2>
                
                <div className="space-y-3">
                  {organization.meta?.versionId && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Version:</span>
                      <span className="ml-2 text-sm text-gray-900">{organization.meta.versionId}</span>
                    </div>
                  )}
                  
                  {organization.meta?.lastUpdated && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Last Updated:</span>
                      <div className="text-sm text-gray-900 mt-1">{formatDate(organization.meta.lastUpdated)}</div>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">Resource Type:</span>
                    <span className="ml-2 text-sm text-gray-900">Organization</span>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">Resource ID:</span>
                    <span className="ml-2 text-sm font-mono text-gray-900">{organization.id}</span>
                  </div>
                </div>
              </div>

              {/* Raw Data (for debugging) */}
              <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Raw FHIR Data</h2>
                <details className="text-xs">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">View Raw JSON</summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded overflow-auto max-h-64">
                    {JSON.stringify(organization.fullResource, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}