'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, UserIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import OrganizationAutoSuggest from '@/components/auto-suggest/OrganizationAutoSuggest';

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

export default function NewPatientPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    given: '',
    family: '',
    gender: 'unknown',
    birthDate: '',
    phone: '',
    email: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    maritalStatus: 'unknown',
    active: true,
    assignerOrg: ''
  });

  const handleOrganizationSelect = (organization: Organization) => {
    setSelectedOrganization(organization);
    setFormData(prev => ({ ...prev, assignerOrg: `Organization/${organization.id}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      // Build FHIR Patient resource
      const newPatient = {
        resourceType: 'Patient',
        // identifier.assigner.reference is required by Oracle Health
        identifier: [{ assigner: {} as any }],
        active: formData.active,
        name: [{
          use: 'official',
          family: formData.family,
          given: formData.given.split(' ').filter(Boolean)
        }],
        gender: formData.gender !== 'unknown' ? formData.gender : undefined,
        birthDate: formData.birthDate,
        telecom: [
          ...(formData.phone ? [{ system: 'phone', value: formData.phone, use: 'home' }] : []),
          ...(formData.email ? [{ system: 'email', value: formData.email, use: 'home' }] : [])
        ],
        address: [{
          use: 'home',
          type: 'physical',
          line: formData.addressLine ? [formData.addressLine] : [],
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country
        }],
        maritalStatus: formData.maritalStatus !== 'unknown' ? {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
            code: formData.maritalStatus
          }]
        } : undefined
      };

      // Client hint: If user provided an assignerOrg, set reference (server will also ensure via env)
      if (formData.assignerOrg && typeof formData.assignerOrg === 'string') {
        const trimmed = formData.assignerOrg.trim();
        if (trimmed) {
          (newPatient.identifier![0] as any).assigner.reference = trimmed.startsWith('Organization/') ? trimmed : `Organization/${trimmed}`;
        }
      }

      console.log('Submitting patient:', JSON.stringify(newPatient, null, 2));

      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patient: newPatient })
      });

      const result = await response.json();
      console.log('API Response:', result);

      if (result.ok) {
        // Redirect to the new patient's detail page
        router.push(`/patients/${result.id}`);
      } else {
        // Show detailed error information
        let errorMessage = result.message || 'Unknown error occurred';
        
        if (result.details) {
          try {
            if (typeof result.details === 'string') {
              const detailsJson = JSON.parse(result.details);
              if (detailsJson.issue && Array.isArray(detailsJson.issue)) {
                const issues = detailsJson.issue.map((issue: any) => 
                  `${issue.severity}: ${issue.diagnostics || issue.details?.text || 'Unknown issue'}`
                ).join('\n');
                errorMessage += '\n\nDetails:\n' + issues;
              }
            } else if (typeof result.details === 'object') {
              if (result.details.issue && Array.isArray(result.details.issue)) {
                const issues = result.details.issue.map((issue: any) => 
                  `${issue.severity}: ${issue.diagnostics || issue.details?.text || 'Unknown issue'}`
                ).join('\n');
                errorMessage += '\n\nDetails:\n' + issues;
              }
            }
          } catch (e) {
            errorMessage += '\n\nRaw details: ' + JSON.stringify(result.details, null, 2);
          }
        }
        
        if (result.payload) {
          errorMessage += '\n\nPayload sent: ' + JSON.stringify(result.payload, null, 2);
        }
        
        setError(errorMessage);
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(`Network error: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Patient</h1>
              <p className="mt-2 text-gray-600">Enter patient demographics and contact information</p>
            </div>
            <Link 
              href="/patients" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Patients
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Error Creating Patient</h3>
                <div className="mt-2 text-sm text-red-700">
                  <pre className="whitespace-pre-wrap text-xs bg-red-100 p-2 rounded border overflow-x-auto">
                    {error}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            </div>

            <div>
              <label htmlFor="given" className="block text-sm font-medium text-gray-700 mb-2">
                First Name(s) *
              </label>
              <input
                type="text"
                id="given"
                required
                value={formData.given}
                onChange={(e) => handleInputChange('given', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., John"
              />
            </div>

            <div>
              <label htmlFor="family" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                id="family"
                required
                value={formData.family}
                onChange={(e) => handleInputChange('family', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., Doe"
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                Birth Date *
              </label>
              <input
                type="date"
                id="birthDate"
                required
                value={formData.birthDate}
                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="maritalStatus" className="block text-sm font-medium text-gray-700 mb-2">
                Marital Status
              </label>
              <select
                id="maritalStatus"
                value={formData.maritalStatus}
                onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="unknown">Unknown</option>
                <option value="A">Annulled</option>
                <option value="D">Divorced</option>
                <option value="I">Interlocutory</option>
                <option value="L">Legally Separated</option>
                <option value="M">Married</option>
                <option value="P">Polygamous</option>
                <option value="S">Never Married</option>
                <option value="T">Domestic partner</option>
                <option value="U">Unmarried</option>
                <option value="W">Widowed</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => handleInputChange('active', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                Active Patient
              </label>
            </div>

            {/* Contact Information */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., (555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., patient@example.com"
              />
            </div>

            {/* Address Information */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="addressLine" className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                id="addressLine"
                value={formData.addressLine}
                onChange={(e) => handleInputChange('addressLine', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., 123 Main Street"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., Kansas City"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                State/Province
              </label>
              <input
                type="text"
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., MO"
              />
            </div>

            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., 64111"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input
                type="text"
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="e.g., United States"
              />
            </div>
            {/* Identifier Assigner */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Identifier Assigner (Organization)</h3>
              <p className="text-sm text-gray-600 mb-3">Oracle Health requires identifier.assigner.reference to point to an Organization.</p>
              
              <OrganizationAutoSuggest
                onSelect={handleOrganizationSelect}
                placeholder="Search organizations by name..."
                label="Organization"
                required
              />

              {/* Manual input fallback */}
              <div className="mt-2">
                <label htmlFor="assignerOrgManual" className="block text-sm font-medium text-gray-500 mb-1">
                  Or enter Organization ID manually:
                </label>
                <input
                  type="text"
                  id="assignerOrgManual"
                  value={formData.assignerOrg}
                  onChange={(e) => {
                    handleInputChange('assignerOrg', e.target.value);
                    if (e.target.value.trim()) {
                      setSelectedOrganization(null);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 placeholder-gray-500"
                  placeholder="Organization/675844 or 675844"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-8 flex justify-end space-x-4">
            <Link
              href="/patients"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Patient'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}