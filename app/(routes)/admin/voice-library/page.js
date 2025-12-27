// Voice Library Admin Page - Voice Recording Management
'use client';

import { useState, useEffect, useCallback } from 'react';
import VoiceRecordingCard from '@/components/VoiceRecordingCard';
import AudioPlayer from '@/components/AudioPlayer';
import VoiceRecordingModal from '@/components/VoiceRecordingModal';

export default function VoiceLibraryPage() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    search: '',
    page: 1,
    limit: 12
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    page: 1
  });
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Fetch voice recordings
  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/voice-recordings?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch voice recordings');
      }

      const data = await response.json();
      setRecordings(data.recordings || []);
      setPagination({
        total: data.total || 0,
        totalPages: data.totalPages || 0,
        page: data.page || 1
      });
    } catch (err) {
      setError(err.message);
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  // Handle search
  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
  };

  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value, page: 1 }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Handle delete recording
  const handleDeleteRecording = async (recordingId) => {
    try {
      // First check if recording is used in lessons
      const checkResponse = await fetch(`/api/voice-recordings/${recordingId}?check=true`, {
        method: 'DELETE'
      });
      const checkData = await checkResponse.json();

      if (checkData.usedInLessons) {
        const confirmDelete = window.confirm(
          `This recording is used in ${checkData.lessonCount} lesson(s). 
          Do you want to remove it from all lessons and delete it permanently?`
        );
        
        if (!confirmDelete) return;

        // Force delete (cascade)
        const deleteResponse = await fetch(`/api/voice-recordings/${recordingId}?force=true`, {
          method: 'DELETE'
        });
        
        if (!deleteResponse.ok) {
          throw new Error('Failed to delete recording');
        }

        const deleteData = await deleteResponse.json();
        alert(`Recording deleted successfully. Removed from ${deleteData.deletedAttachmentCount} lesson attachment(s).`);
      } else {
        // Simple delete
        const deleteResponse = await fetch(`/api/voice-recordings/${recordingId}`, {
          method: 'DELETE'
        });
        
        if (!deleteResponse.ok) {
          throw new Error('Failed to delete recording');
        }

        alert('Recording deleted successfully.');
      }

      // Refresh the list
      fetchRecordings();
    } catch (err) {
      alert(`Error deleting recording: ${err.message}`);
    }
  };

  // Handle save recording (from modal)
  const handleSaveRecording = (newRecording) => {
    // Add the new recording to the list and refresh
    fetchRecordings();
  };

  return (
    <div className="voice-library-page p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Voice Library</h1>
        <p className="text-gray-600">Manage voice recordings for phonics, words, and text</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search recordings..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="phonics">Phonics</option>
                <option value="word">Words</option>
                <option value="text">Text</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Recording</span>
            </button>

            <button
              onClick={fetchRecordings}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-4 text-sm text-gray-600">
          {!loading && (
            <>
              Showing {recordings.length} of {pagination.total} recordings
              {filters.search && (
                <span> matching "{filters.search}"</span>
              )}
              {filters.type && (
                <span> in {filters.type}</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="text-red-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading recordings</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Loading recordings...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && recordings.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mt-4">No recordings found</h3>
          <p className="text-gray-500 mt-2">
            {filters.search || filters.type 
              ? "Try adjusting your search or filters" 
              : "Get started by adding your first voice recording"
            }
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add First Recording
          </button>
        </div>
      )}

      {/* Recordings Grid */}
      {!loading && !error && recordings.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
            {recordings.map((recording) => (
              <VoiceRecordingCard
                key={recording.id}
                recording={recording}
                onEdit={(recording) => {
                  // TODO: Implement edit modal
                  alert('Edit functionality coming soon!');
                }}
                onDelete={handleDeleteRecording}
                showActions={true}
                className="h-full"
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page <= 1}
                className="px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex space-x-1">
                {[...Array(pagination.totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  const isCurrentPage = pageNum === filters.page;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 text-sm rounded-md ${
                        isCurrentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page >= pagination.totalPages}
                className="px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Voice Recording Modal */}
      <VoiceRecordingModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSave={handleSaveRecording}
      />
    </div>
  );
}