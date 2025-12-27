// Audio Attachment Modal for Lesson Builder
'use client';

import { useState, useEffect, useCallback } from 'react';
import VoiceRecordingCard from './VoiceRecordingCard';
import AudioPlayer from './AudioPlayer';

export default function AudioAttachmentModal({ 
  isOpen, 
  onClose, 
  lessonId,
  onAttach,
  existingAttachments = []
}) {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    search: '',
    page: 1,
    limit: 8
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    page: 1
  });
  const [selectedRecordings, setSelectedRecordings] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  // Get IDs of recordings already attached
  const attachedRecordingIds = existingAttachments.map(a => a.voice_recording_id);

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
    if (isOpen) {
      fetchRecordings();
    }
  }, [isOpen, fetchRecordings]);

  // Handle search
  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
  };

  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value, page: 1 }));
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const typeMap = {
      'all': '',
      'phonics': 'phonics',
      'words': 'word',
      'text': 'text'
    };
    handleFilterChange('type', typeMap[tab] || '');
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Handle recording selection
  const handleRecordingSelect = (recording) => {
    setSelectedRecordings(prev => {
      const isSelected = prev.find(r => r.id === recording.id);
      if (isSelected) {
        return prev.filter(r => r.id !== recording.id);
      } else {
        return [...prev, recording];
      }
    });
  };

  // Handle attach selected recordings
  const handleAttachSelected = async () => {
    if (selectedRecordings.length === 0) return;

    try {
      const attachPromises = selectedRecordings.map(async (recording) => {
        const response = await fetch(`/api/lessons/${lessonId}/audio-attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voice_recording_id: recording.id,
            attachment_type: recording.type,
            created_by: 'admin' // TODO: Get from auth context
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to attach recording');
        }
        
        return response.json();
      });

      const newAttachments = await Promise.all(attachPromises);
      
      if (onAttach) {
        onAttach(newAttachments);
      }
      
      setSelectedRecordings([]);
      onClose();
    } catch (err) {
      alert(`Error attaching recordings: ${err.message}`);
    }
  };

  // Filter recordings by already attached
  const availableRecordings = recordings.filter(r => !attachedRecordingIds.includes(r.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Attach Audio to Lesson</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Selection Summary */}
          {selectedRecordings.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  {selectedRecordings.length} recording(s) selected
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedRecordings([])}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear selection
                  </button>
                  <button
                    onClick={handleAttachSelected}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Attach Selected
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs and Filters */}
        <div className="border-b px-6 py-4">
          {/* Tabs */}
          <div className="flex space-x-1 mb-4">
            {[
              { key: 'all', label: 'All', icon: '🎵' },
              { key: 'phonics', label: 'Phonics', icon: '🔤' },
              { key: 'words', label: 'Words', icon: '📝' },
              { key: 'text', label: 'Text', icon: '📄' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search recordings..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={fetchRecordings}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Results Summary */}
          <div className="mt-3 text-sm text-gray-600">
            {!loading && (
              <>
                Showing {availableRecordings.length} of {pagination.total} available recordings
                {attachedRecordingIds.length > 0 && (
                  <span> ({attachedRecordingIds.length} already attached)</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="text-red-800">Error loading recordings: {error}</div>
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
          {!loading && !error && availableRecordings.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                {recordings.length === 0 ? 'No recordings found' : 'All recordings already attached'}
              </h3>
              <p className="text-gray-500 mt-2">
                {recordings.length === 0 
                  ? 'Try adjusting your search or create new recordings in the Voice Library'
                  : 'All available recordings are already attached to this lesson'
                }
              </p>
            </div>
          )}

          {/* Recordings Grid */}
          {!loading && !error && availableRecordings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableRecordings.map((recording) => {
                const isSelected = selectedRecordings.find(r => r.id === recording.id);
                
                return (
                  <VoiceRecordingCard
                    key={recording.id}
                    recording={recording}
                    isSelected={isSelected}
                    onSelect={handleRecordingSelect}
                    showActions={false}
                    className={`cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        {!loading && !error && availableRecordings.length > 0 && pagination.totalPages > 1 && (
          <div className="border-t px-6 py-4">
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
          </div>
        )}
      </div>
    </div>
  );
}