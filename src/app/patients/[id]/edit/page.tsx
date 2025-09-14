'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Patient {
  id: string;
  name: string;
  given: string[];
  family: string;
  gender: string;
  birthDate: string;
  telecom: any[];
  address: any[];
  maritalStatus: string;
  active: boolean;
  meta: any;
}

export default function PatientEditPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  
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
    active: true
  });

  useEffect(() => {
    if (params.id) {
      fetchPatient(params.id as string);
    }
  }, [params.id]);

  const fetchPatient = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/patients/${id}`);
      const data = await response.json();

      if (data.ok) {
        setPatient(data.patient);
        setEtag(data.etag);
        populateForm(data.patient);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const populateForm = (patient: Patient) => {
    const phone = patient.telecom?.find(t => t.system === 'phone')?.value || '';
    const email = patient.telecom?.find(t => t.system === 'email')?.value || '';
    const address = patient.address?.[0] || {};

    setFormData({
      given: patient.given.join(' '),
      family: patient.family,
      gender: patient.gender || 'unknown',
      birthDate: patient.birthDate,
      phone,
      email,
      addressLine: address.line?.join(' ') || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || '',
      maritalStatus: patient.maritalStatus || 'unknown',
      active: patient.active
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      // Build FHIR Patient resource
      const updatedPatient = {
        resourceType: 'Patient',
        id: patient?.id,
        meta: patient?.meta,
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

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (etag) {
        headers['If-Match'] = etag;
      }

      console.log('Submitting patient update:', JSON.stringify(updatedPatient, null, 2));

      const response = await fetch(`/api/patients/${patient?.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ patient: updatedPatient })
      });

      const result = await response.json();
      console.log('API Response:', result);

      if (result.ok) {
        router.push(`/patients/${patient?.id}`);
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
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading patient...</span>
        </div>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Patient</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
          <Link 
            href="/patients" 
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            ← Back to Patients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href={`/patients/${patient?.id}`} 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2 inline-block"
          >
            ← Back to Patient Details
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit Patient
          </h1>
          <p className="text-sm text-gray-500">Patient ID: {patient?.id}</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Error Updating Patient</h3>
                <div className="mt-2 text-sm text-red-700">
                  <pre className="whitespace-pre-wrap text-xs bg-red-100 p-2 rounded border overflow-x-auto">
                    {error}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Personal Information</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Basic demographic information.
                </p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="given" className="block text-sm font-medium text-gray-700">
                      Given Names *
                    </label>
                    <input
                      type="text"
                      id="given"
                      required
                      value={formData.given}
                      onChange={(e) => handleInputChange('given', e.target.value)}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="First Middle"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="family" className="block text-sm font-medium text-gray-700">
                      Family Name *
                    </label>
                    <input
                      type="text"
                      id="family"
                      required
                      value={formData.family}
                      onChange={(e) => handleInputChange('family', e.target.value)}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Last Name"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                      Gender
                    </label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="unknown">Unknown</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                      Birth Date *
                    </label>
                    <input
                      type="date"
                      id="birthDate"
                      required
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="maritalStatus" className="block text-sm font-medium text-gray-700">
                      Marital Status
                    </label>
                    <select
                      id="maritalStatus"
                      value={formData.maritalStatus}
                      onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="unknown">Unknown</option>
                      <option value="S">Single</option>
                      <option value="M">Married</option>
                      <option value="D">Divorced</option>
                      <option value="W">Widowed</option>
                      <option value="A">Annulled</option>
                      <option value="I">Interlocutory</option>
                      <option value="L">Legally Separated</option>
                      <option value="P">Polygamous</option>
                      <option value="T">Domestic Partner</option>
                      <option value="U">Unmarried</option>
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <div className="flex items-center">
                      <input
                        id="active"
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => handleInputChange('active', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                        Active Patient
                      </label>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Indicates if the patient record is in active use
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Contact Information</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Phone, email, and address details.
                </p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="john.doe@example.com"
                    />
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="addressLine" className="block text-sm font-medium text-gray-700">
                      Street Address
                    </label>
                    <input
                      type="text"
                      id="addressLine"
                      value={formData.addressLine}
                      onChange={(e) => handleInputChange('addressLine', e.target.value)}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="123 Main Street, Apt 4B"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-6 lg:col-span-2">
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Kansas City"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                      State / Province
                    </label>
                    <input
                      type="text"
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="MO"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                      ZIP / Postal Code
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="64111"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <input
                      type="text"
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="United States"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <Link
              href={`/patients/${patient?.id}`}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}