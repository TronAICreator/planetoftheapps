// Voice Recording Card Component for displaying recordings in library
'use client';

import { useState } from 'react';
import AudioPlayer from './AudioPlayer';

export default function VoiceRecordingCard({ 
  recording, 
  onEdit = null,
  onDelete = null,
  onAttach = null,
  showActions = true,
  isSelected = false,
  onSelect = null,
  className = ''
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getTypeColor = (type) => {
    switch (type) {
      case 'phonics': return 'bg-blue-100 text-blue-800';
      case 'word': return 'bg-green-100 text-green-800';
      case 'text': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'phonics': return '🔤';
      case 'word': return '📝';
      case 'text': return '📄';
      default: return '🎵';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (durationMs) => {
    if (!durationMs) return 'Unknown';
    const seconds = Math.round(durationMs / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(recording.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(recording);
    }
  };

  return (
    <div 
      className={`
        voice-recording-card bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} 
        ${onSelect ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onSelect ? handleCardClick : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getTypeIcon(recording.type)}</span>
          <div>
            <h3 className="font-medium text-gray-900 truncate">
              {recording.title}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(recording.type)}`}>
                {recording.type}
              </span>
              <span className="text-xs text-gray-500">
                {formatDuration(recording.duration_ms)}
              </span>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center space-x-1">
            {onAttach && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAttach(recording);
                }}
                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                title="Attach to lesson"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            )}

            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(recording);
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Edit recording"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                disabled={isDeleting}
                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                title="Delete recording"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Audio Player */}
      <div className="mb-3">
        <AudioPlayer 
          audioUrl={recording.audio_url || recording.storage_key}
          title={recording.title}
          showControls={true}
          className="w-full"
        />
      </div>

      {/* Transcript/Text */}
      {recording.transcript_or_text && (
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Transcript:</div>
          <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded text-wrap break-words">
            {recording.transcript_or_text}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Created: {formatDate(recording.created_at)}</span>
        <span>By: {recording.created_by}</span>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Recording?
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{recording.title}"? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}