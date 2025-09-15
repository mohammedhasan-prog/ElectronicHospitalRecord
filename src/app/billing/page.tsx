'use client';

import { useState } from 'react';
import { 
  CreditCardIcon, 
  UserIcon, 
  CalendarIcon, 
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  CurrencyDollarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import PatientAutoSuggest from '@/components/auto-suggest/PatientAutoSuggest';
import LocationAutoSuggest from '@/components/auto-suggest/LocationAutoSuggest';

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

interface BillingFormData {
  patientId: string;
  locationId: string;
  serviceDate: string;
  amount: string;
  currency: string;
  description: string;
  category: string;
  status: string;
  notes: string;
}

const billingCategories = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'medication', label: 'Medication' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' }
];

const billingStatuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'cancelled', label: 'Cancelled' }
];

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'create'>('overview');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [formData, setFormData] = useState<BillingFormData>({
    patientId: '',
    locationId: '',
    serviceDate: '',
    amount: '',
    currency: 'USD',
    description: '',
    category: 'consultation',
    status: 'draft',
    notes: ''
  });

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patientId: patient.id }));
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setFormData(prev => ({ ...prev, locationId: location.id }));
  };

  const handleInputChange = (field: keyof BillingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      locationId: '',
      serviceDate: '',
      amount: '',
      currency: 'USD',
      description: '',
      category: 'consultation',
      status: 'draft',
      notes: ''
    });
    setSelectedPatient(null);
    setSelectedLocation(null);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.patientId) {
      setError('Please select a patient');
      return;
    }

    if (!formData.locationId) {
      setError('Please select a location');
      return;
    }

    if (!formData.serviceDate) {
      setError('Please select a service date');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please enter a description');
      return;
    }

    setIsSubmitting(true);

    try {
      // Mock billing record creation
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess('Billing record created successfully!');
      resetForm();
    } catch (error) {
      console.error('Error creating billing record:', error);
      setError('Failed to create billing record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white shadow-md rounded-lg">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <CreditCardIcon className="h-6 w-6 mr-2" />
              Billing Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage billing records, coverage, and claims for patients.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DocumentTextIcon className="inline h-4 w-4 mr-1" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'create'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <PlusIcon className="inline h-4 w-4 mr-1" />
                Create Record
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-600">Total Revenue</p>
                        <p className="text-2xl font-semibold text-blue-900">$24,567</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-8 w-8 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-600">Active Claims</p>
                        <p className="text-2xl font-semibold text-green-900">12</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-yellow-600">Pending</p>
                        <p className="text-2xl font-semibold text-yellow-900">3</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-blue-900 mb-3">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">Consultation - John Doe</p>
                          <p className="text-sm text-gray-600">Service Date: 2025-01-15</p>
                        </div>
                        <span className="text-green-600 font-semibold">$150.00</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">Lab Work - Jane Smith</p>
                          <p className="text-sm text-gray-600">Service Date: 2025-01-14</p>
                        </div>
                        <span className="text-green-600 font-semibold">$85.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'create' && (
              <div className="max-w-2xl">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Create New Billing Record</h2>

                {error && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                        <div className="mt-2 text-sm text-red-700">{error}</div>
                      </div>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Success</h3>
                        <div className="mt-2 text-sm text-green-700">{success}</div>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Patient Selection */}
                  <PatientAutoSuggest
                    onSelect={handlePatientSelect}
                    placeholder="Search for a patient by name or MRN..."
                    label="Patient"
                    required
                  />

                  {/* Location Selection */}
                  <LocationAutoSuggest
                    onSelect={handleLocationSelect}
                    placeholder="Search for a service location..."
                    label="Service Location"
                    required
                  />

                  {/* Service Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CalendarIcon className="inline h-4 w-4 mr-1" />
                      Service Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.serviceDate}
                      onChange={(e) => handleInputChange('serviceDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  {/* Amount and Currency */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <CurrencyDollarIcon className="inline h-4 w-4 mr-1" />
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => handleInputChange('currency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                    >
                      {billingCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {billingStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Brief description of services provided"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      required
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Any additional notes or comments..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Billing Record'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
