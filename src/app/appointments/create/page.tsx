'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarIcon, ClockIcon, ExclamationTriangleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
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

interface ServiceType {
  code: string;
  display: string;
  system: string;
}

const serviceTypes: ServiceType[] = [
  { code: '408443003', display: 'General medical practice', system: 'http://snomed.info/sct' },
  { code: '394603008', display: 'Cardiology', system: 'http://snomed.info/sct' },
  { code: '394579002', display: 'Cardiothoracic surgery', system: 'http://snomed.info/sct' },
  { code: '394582007', display: 'Dermatology', system: 'http://snomed.info/sct' },
  { code: '394583002', display: 'Endocrinology', system: 'http://snomed.info/sct' },
  { code: '394584008', display: 'Gastroenterology', system: 'http://snomed.info/sct' },
  { code: '394585009', display: 'Obstetrics and gynecology', system: 'http://snomed.info/sct' },
];

export default function CreateAppointment() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const [formData, setFormData] = useState({
    status: 'proposed' as 'proposed' | 'booked',
    patientId: '',
    locationId: '',
    serviceType: serviceTypes[0],
    reasonCode: '',
    comment: '',
    requestedStart: '',
    requestedEnd: ''
  });

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patientId: patient.id }));
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setFormData(prev => ({ ...prev, locationId: location.id }));
  };

  const handleServiceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedType = serviceTypes.find(type => type.code === e.target.value);
    if (selectedType) {
      setFormData(prev => ({ ...prev, serviceType: selectedType }));
    }
  };

  const calculateEndTime = (startTime: string): string => {
    if (!startTime) return '';
    const start = new Date(startTime);
    if (isNaN(start.getTime())) return '';
    const end = new Date(start.getTime() + 30 * 60000); // 30 minutes
    return end.toISOString().slice(0, 16);
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startTime = e.target.value;
    const endTime = calculateEndTime(startTime);
    setFormData(prev => ({
      ...prev,
      requestedStart: startTime,
      requestedEnd: endTime
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.patientId) {
      setError('Please select a patient');
      return;
    }

    if (!formData.locationId) {
      setError('Please select a location');
      return;
    }

    if (!formData.requestedStart) {
      setError('Please select an appointment time');
      return;
    }

    setIsSubmitting(true);

    try {
      const appointmentData = {
        resourceType: 'AppointmentRequest',
        status: formData.status,
        intent: 'order',
        priority: 'routine',
        subject: {
          reference: `Patient/${formData.patientId}`,
          display: selectedPatient?.name || 'Unknown Patient'
        },
        locationReference: [
          {
            reference: `Location/${formData.locationId}`,
            display: selectedLocation?.name || 'Unknown Location'
          }
        ],
        serviceType: [formData.serviceType],
        reasonCode: formData.reasonCode ? [
          {
            text: formData.reasonCode
          }
        ] : undefined,
        description: formData.comment || undefined,
        requestedPeriod: [
          {
            start: formData.requestedStart,
            end: formData.requestedEnd
          }
        ]
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });

      const result = await response.json();

      if (result.ok) {
        router.push('/appointments');
      } else {
        setError(result.error || 'Failed to create appointment request');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Appointments
        </button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <CalendarIcon className="h-6 w-6 mr-2" />
          Create Appointment Request
        </h1>
      </div>

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

      <form onSubmit={handleSubmit} className="space-y-6">
        <PatientAutoSuggest
          onSelect={handlePatientSelect}
          placeholder="Search for a patient by name or MRN..."
          label="Patient"
          required
        />

        <LocationAutoSuggest
          onSelect={handleLocationSelect}
          placeholder="Search for a location..."
          label="Location"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <ClockIcon className="inline h-4 w-4 mr-1" />
            Service Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.serviceType.code}
            onChange={handleServiceTypeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
          >
            {serviceTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.display}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CalendarIcon className="inline h-4 w-4 mr-1" />
            Requested Start Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.requestedStart}
            onChange={handleStartTimeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
            min={new Date().toISOString().slice(0, 16)}
          />
          {formData.requestedEnd && (
            <p className="mt-1 text-sm text-gray-500">
              End time: {new Date(formData.requestedEnd).toLocaleString()}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'proposed' | 'booked' }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="proposed">Proposed</option>
            <option value="booked">Booked</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Appointment
          </label>
          <input
            type="text"
            value={formData.reasonCode}
            onChange={(e) => setFormData(prev => ({ ...prev, reasonCode: e.target.value }))}
            placeholder="e.g., Annual checkup, Follow-up visit"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments
          </label>
          <textarea
            value={formData.comment}
            onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
            placeholder="Any additional notes..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Appointment Request'}
          </button>
        </div>
      </form>
    </div>
  );
}