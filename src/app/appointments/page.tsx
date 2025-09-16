'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  CalendarIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Appointment {
  id: string;
  status: string;
  serviceType?: Array<{
    text?: string;
    coding?: Array<{
      code?: string;
      display?: string;
    }>;
  }>;
  start?: string;
  end?: string;
  reasonCode?: Array<{
    text?: string;
  }>;
  comment?: string;
  participant?: Array<{
    actor?: {
      reference?: string;
      display?: string;
    };
    status?: string;
  }>;
  meta?: {
    lastUpdated?: string;
  };
}

interface SearchFilters {
  patient: string;
  practitioner: string;
  location: string;
  date: string;
  status: string;
}

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const created = searchParams?.get('created');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    patient: '',
    practitioner: '',
    location: '',
    date: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    hasNext: false,
    cursor: null as string | null
  });

  useEffect(() => {
    loadAppointments();
  }, [filters]);

  const loadAppointments = async (cursor?: string) => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      
      // Add search filters
      if (filters.patient) params.append('patient', filters.patient);
      if (filters.practitioner) params.append('practitioner', filters.practitioner);
      if (filters.location) params.append('location', filters.location);
      if (filters.date) params.append('date', filters.date);
      if (filters.status) params.append('status', filters.status);
      if (cursor) params.append('cursor', cursor);
      
      params.append('_count', '20');

      let response;
      let data;
      
      try {
        // Try main FHIR API first
        response = await fetch(`/api/appointments?${params.toString()}`);
        
        try {
          data = await response.json();
        } catch (parseError) {
          console.error('Failed to parse response JSON:', parseError);
          throw new Error('Server returned invalid response');
        }

        if (!response.ok) {
          console.error('Main API Error:', {
            status: response.status,
            statusText: response.statusText,
            data: data
          });
          
          // If main API fails, try simple fallback
          console.log('Falling back to simple appointments API...');
          throw new Error('Main API failed, attempting fallback');
        }
      } catch (mainApiError) {
        console.warn('Main appointments API failed, using fallback:', mainApiError);
        
        // Fallback to simple API
        response = await fetch('/api/appointments-simple');
        data = await response.json();
        
        if (!response.ok) {
          const errorMessage = data?.error || data?.details || data?.message || 'Failed to load appointments';
          throw new Error(errorMessage);
        }
      }

      console.log('Appointments response:', data);

      // Handle FHIR Bundle response
      const appointmentList = data.entry?.map((entry: any) => entry.resource) || [];
      
      if (cursor) {
        // Append to existing appointments for pagination
        setAppointments(prev => [...prev, ...appointmentList]);
      } else {
        // Replace appointments for new search
        setAppointments(appointmentList);
      }

      // Handle pagination
      const nextLink = data.link?.find((link: any) => link.relation === 'next');
      const nextCursor = nextLink ? new URL(nextLink.url).searchParams.get('cursor') : null;
      
      setPagination({
        total: data.total || 0,
        hasNext: !!nextCursor,
        cursor: nextCursor
      });

    } catch (error) {
      console.error('Error loading appointments:', error);
      setError(error instanceof Error ? error.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (pagination.cursor && !loading) {
      loadAppointments(pagination.cursor);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      patient: '',
      practitioner: '',
      location: '',
      date: '',
      status: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'booked':
        return 'bg-green-100 text-green-800';
      case 'proposed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'fulfilled':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateTimeString?: string) => {
    if (!dateTimeString) return 'Not specified';
    
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getParticipant = (appointment: Appointment, type: string) => {
    return appointment.participant?.find(p => 
      p.actor?.reference?.toLowerCase().startsWith(type.toLowerCase())
    );
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const patientParticipant = getParticipant(appointment, 'patient');
    const reasonText = appointment.reasonCode?.[0]?.text?.toLowerCase() || '';
    const serviceText = appointment.serviceType?.[0]?.text?.toLowerCase() || '';
    const patientDisplay = patientParticipant?.actor?.display?.toLowerCase() || '';
    
    return (
      appointment.id.toLowerCase().includes(searchLower) ||
      reasonText.includes(searchLower) ||
      serviceText.includes(searchLower) ||
      patientDisplay.includes(searchLower)
    );
  });

  return (
    <div className="p-6">
      {/* Success Message */}
      {created && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Appointment created successfully!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-sm text-gray-600">Manage patient appointments and scheduling</p>
          </div>
        </div>
        <Link
          href="/appointments/create"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Appointment
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow-sm rounded-lg mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Patient ID</label>
                <input
                  type="text"
                  value={filters.patient}
                  onChange={(e) => handleFilterChange('patient', e.target.value)}
                  placeholder="Patient/123"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Practitioner ID</label>
                <input
                  type="text"
                  value={filters.practitioner}
                  onChange={(e) => handleFilterChange('practitioner', e.target.value)}
                  placeholder="Practitioner/456"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location ID</label>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  placeholder="Location/789"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="proposed">Proposed</option>
                  <option value="booked">Booked</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="fulfilled">Fulfilled</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-600">
                Found {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
                {pagination.total > 0 && ` of ${pagination.total} total`}
              </span>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Appointments List */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {loading ? 'Loading appointments...' : `${filteredAppointments.length} Appointments`}
          </h2>
        </div>

        {loading && appointments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading appointments...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || Object.values(filters).some(v => v) 
                ? 'Try adjusting your search or filters.' 
                : 'Get started by creating a new appointment.'}
            </p>
            {!searchQuery && !Object.values(filters).some(v => v) && (
              <div className="mt-6">
                <Link
                  href="/appointments/create"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Appointment
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAppointments.map((appointment) => {
              const patientParticipant = getParticipant(appointment, 'patient');
              const practitionerParticipant = getParticipant(appointment, 'practitioner');
              const locationParticipant = getParticipant(appointment, 'location');

              return (
                <div key={appointment.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          Appointment #{appointment.id}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Patient:</span>
                          <span className="font-medium">
                            {patientParticipant?.actor?.display || 'Unknown Patient'}
                          </span>
                        </div>

                        {practitionerParticipant && (
                          <div className="flex items-center space-x-2">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Provider:</span>
                            <span className="font-medium">
                              {practitionerParticipant.actor?.display || 'Unknown Provider'}
                            </span>
                          </div>
                        )}

                        {locationParticipant && (
                          <div className="flex items-center space-x-2">
                            <MapPinIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Location:</span>
                            <span className="font-medium">
                              {locationParticipant.actor?.display || 'Unknown Location'}
                            </span>
                          </div>
                        )}

                        {appointment.start && (
                          <div className="flex items-center space-x-2">
                            <ClockIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Start:</span>
                            <span className="font-medium">{formatDateTime(appointment.start)}</span>
                          </div>
                        )}

                        {appointment.end && (
                          <div className="flex items-center space-x-2">
                            <ClockIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">End:</span>
                            <span className="font-medium">{formatDateTime(appointment.end)}</span>
                          </div>
                        )}

                        {appointment.serviceType?.[0]?.text && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Service:</span>
                            <span className="font-medium">{appointment.serviceType[0].text}</span>
                          </div>
                        )}
                      </div>

                      {appointment.reasonCode?.[0]?.text && (
                        <div className="mt-3">
                          <span className="text-gray-600 text-sm">Reason: </span>
                          <span className="text-sm font-medium">{appointment.reasonCode[0].text}</span>
                        </div>
                      )}

                      {appointment.comment && (
                        <div className="mt-2">
                          <span className="text-gray-600 text-sm">Notes: </span>
                          <span className="text-sm">{appointment.comment}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Button */}
        {pagination.hasNext && !loading && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <button
              onClick={handleLoadMore}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <ChevronRightIcon className="h-4 w-4 mr-1" />
              Load more appointments
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
