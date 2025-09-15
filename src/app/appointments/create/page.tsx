'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarIcon, ClockIcon, UserIcon, MapPinIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

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
}

interface ServiceType {
  code: string;
  display: string;
  system: string;
}

interface FormData {
  status: 'proposed' | 'booked';
  patientId: string;
  locationId: string;
  slotReference: string;
  serviceType: {
    code: string;
    display: string;
    system: string;
  };
  reasonCode: string;
  comment: string;
  requestedPeriod: {
    start: string;
    end: string;
  };
}

const serviceTypes: ServiceType[] = [
  { code: '408443003', display: 'General medical practice', system: 'http://snomed.info/sct' },
  { code: '394603008', display: 'Cardiology', system: 'http://snomed.info/sct' },
  { code: '394579002', display: 'Cardiothoracic surgery', system: 'http://snomed.info/sct' },
  { code: '394582007', display: 'Dermatology', system: 'http://snomed.info/sct' },
  { code: '394583002', display: 'Endocrinology', system: 'http://snomed.info/sct' },
  { code: '394584008', display: 'Gastroenterology', system: 'http://snomed.info/sct' },
  { code: '394585009', display: 'Obstetrics and gynecology', system: 'http://snomed.info/sct' },
  { code: '394589003', display: 'Nephrology', system: 'http://snomed.info/sct' },
  { code: '394591006', display: 'Neurology', system: 'http://snomed.info/sct' },
  { code: '394594003', display: 'Ophthalmology', system: 'http://snomed.info/sct' },
  { code: '394610002', display: 'Neurosurgery', system: 'http://snomed.info/sct' },
  { code: '394611003', display: 'Plastic surgery', system: 'http://snomed.info/sct' },
  { code: '394801008', display: 'Trauma and orthopedics', system: 'http://snomed.info/sct' },
  { code: '394810000', display: 'Rheumatology', system: 'http://snomed.info/sct' },
  { code: '394914008', display: 'Radiology', system: 'http://snomed.info/sct' },
];

export default function CreateAppointment() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
  // Patient search state
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [formData, setFormData] = useState<FormData>({
    status: 'proposed',
    patientId: '',
    locationId: '',
    slotReference: '',
    serviceType: serviceTypes[0],
    reasonCode: '',
    comment: '',
    requestedPeriod: {
      start: '',
      end: ''
    }
  });

  // Load patients and locations
  useEffect(() => {
    loadPatients();
    loadLocations();
  }, []);

  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const response = await fetch('/api/patients?_count=50');
      const data = await response.json();
      
      if (data.entry) {
        const patientList = data.entry.map((entry: any) => ({
          id: entry.resource.id,
          name: entry.resource.name?.[0] ? 
            `${entry.resource.name[0].given?.join(' ') || ''} ${entry.resource.name[0].family || ''}`.trim() : 
            'Unknown Patient',
          display: entry.resource.name?.[0] ? 
            `${entry.resource.name[0].given?.join(' ') || ''} ${entry.resource.name[0].family || ''}`.trim() : 
            'Unknown Patient'
        }));
        setPatients(patientList);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await fetch('/api/locations?-physicalType=bu&_count=50');
      const data = await response.json();
      
      if (data.entry) {
        const locationList = data.entry.map((entry: any) => ({
          id: entry.resource.id,
          name: entry.resource.name || 'Unknown Location',
          display: entry.resource.name || 'Unknown Location'
        }));
        setLocations(locationList);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  // Patient search function
  const searchPatients = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setPatientSearchResults([]);
      setShowPatientDropdown(false);
      return;
    }

    setSearchingPatients(true);
    try {
      // Search by name (family and given)
      const nameResponse = await fetch(`/api/patients?name=${encodeURIComponent(query)}&_count=10`);
      let searchResults: Patient[] = [];

      if (nameResponse.ok) {
        const nameData = await nameResponse.json();
        if (nameData.entry) {
          searchResults = nameData.entry.map((entry: any) => ({
            id: entry.resource.id,
            name: entry.resource.name?.[0] ? 
              `${entry.resource.name[0].given?.join(' ') || ''} ${entry.resource.name[0].family || ''}`.trim() : 
              'Unknown Patient',
            display: entry.resource.name?.[0] ? 
              `${entry.resource.name[0].given?.join(' ') || ''} ${entry.resource.name[0].family || ''}`.trim() : 
              'Unknown Patient',
            birthDate: entry.resource.birthDate,
            gender: entry.resource.gender,
            identifier: entry.resource.identifier
          }));
        }
      }

      // If no results by name, try searching by identifier (MRN)
      if (searchResults.length === 0) {
        const idResponse = await fetch(`/api/patients?identifier=${encodeURIComponent(query)}&_count=10`);
        if (idResponse.ok) {
          const idData = await idResponse.json();
          if (idData.entry) {
            searchResults = idData.entry.map((entry: any) => ({
              id: entry.resource.id,
              name: entry.resource.name?.[0] ? 
                `${entry.resource.name[0].given?.join(' ') || ''} ${entry.resource.name[0].family || ''}`.trim() : 
                'Unknown Patient',
              display: entry.resource.name?.[0] ? 
                `${entry.resource.name[0].given?.join(' ') || ''} ${entry.resource.name[0].family || ''}`.trim() : 
                'Unknown Patient',
              birthDate: entry.resource.birthDate,
              gender: entry.resource.gender,
              identifier: entry.resource.identifier
            }));
          }
        }
      }

      setPatientSearchResults(searchResults);
      setShowPatientDropdown(true);
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatientSearchResults([]);
    } finally {
      setSearchingPatients(false);
    }
  };

  // Handle patient search input with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPatients(patientSearchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [patientSearchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.patient-search-container')) {
        setShowPatientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patientId: patient.id }));
    setPatientSearchQuery(patient.name);
    setShowPatientDropdown(false);
  };

  const clearPatientSelection = () => {
    setSelectedPatient(null);
    setFormData(prev => ({ ...prev, patientId: '' }));
    setPatientSearchQuery('');
    setPatientSearchResults([]);
    setShowPatientDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate form data
      if (!formData.patientId) {
        throw new Error('Patient is required');
      }

      if (formData.status === 'proposed') {
        if (!formData.locationId) {
          throw new Error('Location is required for proposed appointments');
        }
        if (!formData.requestedPeriod.start || !formData.requestedPeriod.end) {
          throw new Error('Start and end times are required for proposed appointments');
        }
      } else if (formData.status === 'booked') {
        if (!formData.slotReference) {
          throw new Error('Slot reference is required for booked appointments');
        }
      }

      // Build appointment payload according to Oracle Health FHIR spec
      const appointmentPayload: any = {
        resourceType: 'Appointment',
        status: formData.status
      };

      // Add status-specific fields
      if (formData.status === 'proposed') {
        // Structure serviceType to match the working Python script
        appointmentPayload.serviceType = [{
          coding: [{
            system: formData.serviceType.system,
            code: formData.serviceType.code,
            display: formData.serviceType.display
          }]
        }];

        appointmentPayload.participant = [
          {
            actor: {
              reference: `Patient/${formData.patientId}`,
              display: selectedPatient?.name || formData.patientId
            },
            status: 'needs-action'
          },
          {
            actor: {
              reference: `Location/${formData.locationId}`,
              display: locations.find(l => l.id === formData.locationId)?.display
            },
            status: 'needs-action'
          }
        ];

        appointmentPayload.requestedPeriod = [{
          start: formData.requestedPeriod.start,
          end: formData.requestedPeriod.end
        }];
      } else {
        appointmentPayload.slot = [{
          reference: formData.slotReference
        }];

        appointmentPayload.participant = [{
          actor: {
            reference: `Patient/${formData.patientId}`,
            display: selectedPatient?.name || formData.patientId
          },
          status: 'accepted'
        }];
      }

      // Add optional fields
      if (formData.reasonCode.trim()) {
        appointmentPayload.reasonCode = [{
          text: formData.reasonCode.trim()
        }];
      }

      if (formData.comment.trim()) {
        appointmentPayload.comment = formData.comment.trim();
      }

      console.log('Creating appointment with payload:', JSON.stringify(appointmentPayload, null, 2));

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to create appointment');
      }

      console.log('Appointment created successfully:', result);
      
      // Redirect to appointments list or show success message
      router.push('/appointments?created=true');
    } catch (error) {
      console.error('Error creating appointment:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 8; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  const formatDateTimeLocal = (dateString: string, timeString: string) => {
    if (!dateString || !timeString) return '';
    return `${dateString}T${timeString}:00`;
  };

  const handleStartDateTimeChange = (date: string, time: string) => {
    const datetime = formatDateTimeLocal(date, time);
    if (datetime) {
      const isoString = new Date(datetime).toISOString();
      setFormData(prev => ({
        ...prev,
        requestedPeriod: {
          ...prev.requestedPeriod,
          start: isoString
        }
      }));
    }
  };

  const handleEndDateTimeChange = (date: string, time: string) => {
    const datetime = formatDateTimeLocal(date, time);
    if (datetime) {
      const isoString = new Date(datetime).toISOString();
      setFormData(prev => ({
        ...prev,
        requestedPeriod: {
          ...prev.requestedPeriod,
          end: isoString
        }
      }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Create New Appointment</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-1 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Appointment Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appointment Status
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="proposed"
                  checked={formData.status === 'proposed'}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'proposed' | 'booked' }))}
                  className="mr-2"
                />
                <span className="text-sm">Proposed (Request)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="booked"
                  checked={formData.status === 'booked'}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'proposed' | 'booked' }))}
                  className="mr-2"
                />
                <span className="text-sm">Booked (Confirmed)</span>
              </label>
            </div>
          </div>

          {/* Patient Search */}
          <div className="relative patient-search-container">
            <label htmlFor="patient" className="block text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="inline h-4 w-4 mr-1" />
              Patient *
            </label>
            
            {selectedPatient ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-900">{selectedPatient.name}</p>
                    <div className="text-sm text-green-700">
                      {selectedPatient.birthDate && (
                        <span className="mr-4">DOB: {selectedPatient.birthDate}</span>
                      )}
                      {selectedPatient.gender && (
                        <span className="mr-4">Gender: {selectedPatient.gender}</span>
                      )}
                      {selectedPatient.identifier && selectedPatient.identifier[0] && (
                        <span>MRN: {selectedPatient.identifier[0].value}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearPatientSelection}
                    className="text-red-600 hover:text-red-800"
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
                  id="patient"
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  placeholder="Search by patient name or MRN..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                />
                
                {/* Search Results Dropdown */}
                {showPatientDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {searchingPatients ? (
                      <div className="px-3 py-2 text-gray-500">Searching...</div>
                    ) : patientSearchResults.length > 0 ? (
                      patientSearchResults.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => selectPatient(patient)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium">{patient.name}</div>
                          <div className="text-sm text-gray-600">
                            {patient.birthDate && (
                              <span className="mr-4">DOB: {patient.birthDate}</span>
                            )}
                            {patient.gender && (
                              <span className="mr-4">Gender: {patient.gender}</span>
                            )}
                            {patient.identifier && patient.identifier[0] && (
                              <span>MRN: {patient.identifier[0].value}</span>
                            )}
                          </div>
                        </button>
                      ))
                    ) : patientSearchQuery.length >= 2 ? (
                      <div className="px-3 py-2 text-gray-500">No patients found</div>
                    ) : (
                      <div className="px-3 py-2 text-gray-500">Type at least 2 characters to search</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conditional fields based on status */}
          {formData.status === 'proposed' && (
            <>
              {/* Service Type */}
              <div>
                <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type *
                </label>
                <select
                  id="serviceType"
                  value={formData.serviceType.code}
                  onChange={(e) => {
                    const selectedService = serviceTypes.find(s => s.code === e.target.value);
                    if (selectedService) {
                      setFormData(prev => ({ ...prev, serviceType: selectedService }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {serviceTypes.map((service) => (
                    <option key={service.code} value={service.code}>
                      {service.display}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Selection */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPinIcon className="inline h-4 w-4 mr-1" />
                  Location *
                </label>
                <select
                  id="location"
                  value={formData.locationId}
                  onChange={(e) => setFormData(prev => ({ ...prev, locationId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loadingLocations}
                >
                  <option value="">
                    {loadingLocations ? 'Loading locations...' : 'Select a location'}
                  </option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Requested Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <ClockIcon className="inline h-4 w-4 mr-1" />
                    Requested Start *
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      onChange={(e) => {
                        const currentStart = formData.requestedPeriod.start ? new Date(formData.requestedPeriod.start) : new Date();
                        const time = currentStart.toTimeString().slice(0, 5);
                        handleStartDateTimeChange(e.target.value, time);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <select
                      onChange={(e) => {
                        const currentStart = formData.requestedPeriod.start ? new Date(formData.requestedPeriod.start) : new Date();
                        const date = currentStart.toISOString().split('T')[0];
                        handleStartDateTimeChange(date, e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select time</option>
                      {generateTimeOptions().map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <ClockIcon className="inline h-4 w-4 mr-1" />
                    Requested End *
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      onChange={(e) => {
                        const currentEnd = formData.requestedPeriod.end ? new Date(formData.requestedPeriod.end) : new Date();
                        const time = currentEnd.toTimeString().slice(0, 5);
                        handleEndDateTimeChange(e.target.value, time);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <select
                      onChange={(e) => {
                        const currentEnd = formData.requestedPeriod.end ? new Date(formData.requestedPeriod.end) : new Date();
                        const date = currentEnd.toISOString().split('T')[0];
                        handleEndDateTimeChange(date, e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select time</option>
                      {generateTimeOptions().map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {formData.status === 'booked' && (
            <div>
              <label htmlFor="slotReference" className="block text-sm font-medium text-gray-700 mb-2">
                Slot Reference *
              </label>
              <input
                type="text"
                id="slotReference"
                value={formData.slotReference}
                onChange={(e) => setFormData(prev => ({ ...prev, slotReference: e.target.value }))}
                placeholder="e.g., Slot/24477854-21304876-62852027-0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Reference to the slot in which this appointment is being booked
              </p>
            </div>
          )}

          {/* Reason Code */}
          <div>
            <label htmlFor="reasonCode" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Appointment
            </label>
            <input
              type="text"
              id="reasonCode"
              value={formData.reasonCode}
              onChange={(e) => setFormData(prev => ({ ...prev, reasonCode: e.target.value }))}
              placeholder="e.g., I have a cramp"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments
            </label>
            <textarea
              id="comment"
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Additional text to aid in facilitating the appointment"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-between pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}