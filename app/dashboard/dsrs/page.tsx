'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DSR {
  id: string;
  date: string;
  summary: string;
  rawInputs: string;
  llmModel: string | null;
  generatedBy: string;
  status: string;
  errorMessage: string | null;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export default function DSRsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dsrs, setDsrs] = useState<DSR[]>([]);
  const [selectedDsr, setSelectedDsr] = useState<DSR | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }
    
    setUser(JSON.parse(userData));
    fetchDSRs();
  }, []);

  const fetchDSRs = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = '/api/dsrs';
      
      if (statusFilter) {
        url += `?status=${statusFilter}`;
      }
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch DSRs');
      
      const data = await res.json();
      setDsrs(data.dsrs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDSRDetails = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/dsrs/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch DSR details');
      
      const data = await res.json();
      setSelectedDsr(data.dsr);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (user) fetchDSRs();
  }, [statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'published': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading DSRs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Daily Status Reports</h1>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* DSR Layout */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex" style={{ height: 'calc(100vh - 280px)' }}>
            {/* DSR List */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              {dsrs.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">📝</div>
                  <p className="text-gray-600">No DSRs found</p>
                </div>
              ) : (
                dsrs.map((dsr) => (
                  <div
                    key={dsr.id}
                    onClick={() => fetchDSRDetails(dsr.id)}
                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                      selectedDsr?.id === dsr.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-gray-900">
                        {new Date(dsr.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(dsr.status)}`}>
                        {dsr.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {dsr.user.name}
                    </div>
                    
                    {dsr.llmModel && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>AI Generated</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* DSR Detail */}
            <div className="flex-1 overflow-y-auto">
              {!selectedDsr ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📝</div>
                    <p className="text-gray-600">Select a DSR to view details</p>
                  </div>
                </div>
              ) : (
                <div className="p-8">
                  {/* DSR Header */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          Daily Status Report
                        </h2>
                        <p className="text-lg text-gray-600">{formatDate(selectedDsr.date)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedDsr.status)}`}>
                        {selectedDsr.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Generated by:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {selectedDsr.generatedBy === 'system' ? 'Automated' : 'Manual'}
                        </span>
                      </div>
                      
                      {selectedDsr.llmModel && (
                        <div>
                          <span className="text-gray-600">AI Model:</span>
                          <span className="ml-2 font-medium text-gray-900">{selectedDsr.llmModel}</span>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-gray-600">Created by:</span>
                        <span className="ml-2 font-medium text-gray-900">{selectedDsr.user.name}</span>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Generated at:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {new Date(selectedDsr.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
                    <div className="bg-gray-50 rounded-lg p-6 prose max-w-none">
                      <div className="whitespace-pre-wrap text-gray-800">{selectedDsr.summary}</div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {selectedDsr.errorMessage && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-red-900 mb-3">Error</h3>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                        {selectedDsr.errorMessage}
                      </div>
                    </div>
                  )}

                  {/* Raw Inputs */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Raw Data</h3>
                    <details className="bg-gray-50 rounded-lg p-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                        View raw inputs (JSON)
                      </summary>
                      <pre className="mt-4 text-xs text-gray-600 overflow-x-auto">
                        {JSON.stringify(JSON.parse(selectedDsr.rawInputs), null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
