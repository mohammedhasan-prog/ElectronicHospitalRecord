'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserGroupIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  UserIcon,
  HeartIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  patients: number;
  appointments: number;
  practitioners: number;
  organizations: number;
  locations: number;
}

interface RecentActivity {
  id: string;
  type: 'patient' | 'appointment' | 'allergy' | 'report';
  title: string;
  subtitle?: string;
  timestamp: string;
  status?: 'success' | 'pending' | 'warning';
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    patients: 0,
    appointments: 0,
    practitioners: 0,
    organizations: 0,
    locations: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch stats
        const statsRes = await fetch('/api/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          console.log('Stats API Response:', statsData); // Debug log
          if (statsData?.ok && statsData?.data) {
            setStats({
              patients: statsData.data.patients ?? 0,
              appointments: statsData.data.appointments ?? 0,
              practitioners: statsData.data.practitioners ?? 0,
              organizations: statsData.data.organizations ?? 0,
              locations: 0, // Not included in stats API yet
            });
          }
        } else {
          console.error('Stats API failed:', statsRes.status, statsRes.statusText);
        }

        // Mock recent activity (in real system, this would come from audit logs)
        setRecentActivity([
          {
            id: '1',
            type: 'patient',
            title: 'New patient registered',
            subtitle: 'John Doe - MRN: 12345',
            timestamp: '5 minutes ago',
            status: 'success',
          },
          {
            id: '2',
            type: 'appointment',
            title: 'Appointment scheduled',
            subtitle: 'Dr. Smith - Tomorrow 2:00 PM',
            timestamp: '12 minutes ago',
            status: 'pending',
          },
          {
            id: '3',
            type: 'allergy',
            title: 'Allergy recorded',
            subtitle: 'Penicillin allergy - Patient ID: 98765',
            timestamp: '1 hour ago',
            status: 'warning',
          },
          {
            id: '4',
            type: 'report',
            title: 'Diagnostic report reviewed',
            subtitle: 'Blood work results - Patient ID: 54321',
            timestamp: '2 hours ago',
            status: 'success',
          },
        ]);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const quickActions = [
    {
      title: 'Register Patient',
      description: 'Add new patient to the system',
      icon: UserIcon,
      href: '/patients/new',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'Schedule Appointment',
      description: 'Book a new appointment',
      icon: CalendarIcon,
      href: '/appointments/create',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'Record Allergy',
      description: 'Document patient allergies',
      icon: HeartIcon,
      href: '/clinical/allergies/create',
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      title: 'View Reports',
      description: 'Access diagnostic reports',
      icon: DocumentTextIcon,
      href: '/clinical/diagnostic-reports',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  const statCards = [
    {
      title: 'Total Patients',
      value: stats.patients,
      icon: UserGroupIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/patients',
    },
    {
      title: 'Appointments',
      value: stats.appointments,
      icon: CalendarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/appointments',
    },
    {
      title: 'Practitioners',
      value: stats.practitioners,
      icon: UserIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      href: '/practitioners',
    },
    {
      title: 'Organizations',
      value: stats.organizations,
      icon: BuildingOfficeIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/organizations',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'patient': return UserIcon;
      case 'appointment': return CalendarIcon;
      case 'allergy': return HeartIcon;
      case 'report': return DocumentTextIcon;
      default: return DocumentTextIcon;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success': return CheckCircleIcon;
      case 'warning': return ExclamationTriangleIcon;
      case 'pending': return ClockIcon;
      default: return CheckCircleIcon;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'pending': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to your Electronic Health Record system</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Prominent Total Patients Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <div className="text-sm font-medium text-blue-600">Total Patients</div>
            <div className="text-2xl font-bold text-blue-800">
              {isLoading ? (
                <div className="h-6 w-12 bg-blue-200 rounded animate-pulse"></div>
              ) : (
                <span>
                  {stats.patients === null || stats.patients === undefined ? 
                    <span className="text-blue-400">--</span> : 
                    stats.patients.toLocaleString()
                  }
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <ClockIcon className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <div className="text-3xl font-bold text-gray-900 mt-2">
                      {isLoading ? (
                        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                      ) : (
                        <span>
                          {card.value === null || card.value === undefined ? 
                            <span className="text-gray-400">--</span> : 
                            card.value.toLocaleString()
                          }
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              <p className="text-sm text-gray-600 mt-1">Common tasks and workflows</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.title}
                      href={action.href}
                      className={`${action.color} text-white rounded-lg p-4 hover:shadow-lg transition-all duration-200 group`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-6 w-6" />
                        <div className="flex-1">
                          <div className="font-medium">{action.title}</div>
                          <div className="text-sm opacity-90">{action.description}</div>
                        </div>
                        <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <p className="text-sm text-gray-600 mt-1">Latest system events</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const ActivityIcon = getActivityIcon(activity.type);
                const StatusIcon = getStatusIcon(activity.status);
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <ActivityIcon className="h-4 w-4 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      {activity.subtitle && (
                        <p className="text-sm text-gray-600">{activity.subtitle}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <StatusIcon className={`h-4 w-4 ${getStatusColor(activity.status)}`} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                href="/audit-logs"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all activity →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
          <p className="text-sm text-gray-600 mt-1">Current system health and performance</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">FHIR API</p>
                <p className="text-sm text-green-600">Operational</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Authentication</p>
                <p className="text-sm text-green-600">Active</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Performance</p>
                <p className="text-sm text-green-600">Optimal</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
