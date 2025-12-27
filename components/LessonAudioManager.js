// Lesson Audio Manager Component for Lesson Builder
'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from './AudioPlayer';
import AudioAttachmentModal from './AudioAttachmentModal';

export default function LessonAudioManager({ lessonId, onUpdate = null }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Fetch lesson audio attachments
  const fetchAttachments = async () => {
    if (!lessonId) {
      setAttachments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/lessons/${lessonId}/audio-attachments`);
      if (!response.ok) {
        throw new Error('Failed to fetch audio attachments');
      }

      const data = await response.json();
      setAttachments(data.attachments || []);
      
      if (onUpdate) {
        onUpdate(data.attachments || []);
      }
    } catch (err) {
      setError(err.message);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [lessonId]);

  // Handle new attachments from modal
  const handleNewAttachments = (newAttachments) => {
    setAttachments(prev => [...prev, ...newAttachments]);
    if (onUpdate) {
      onUpdate([...attachments, ...newAttachments]);
    }
  };

  // Handle remove attachment
  const handleRemoveAttachment = async (attachmentId) => {
    const confirmed = window.confirm('Remove this audio attachment from the lesson?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/lessons/${lessonId}/audio-attachments/${attachmentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove attachment');
      }

      const updatedAttachments = attachments.filter(a => a.id !== attachmentId);
      setAttachments(updatedAttachments);
      
      if (onUpdate) {
        onUpdate(updatedAttachments);
      }
    } catch (err) {
      alert(`Error removing attachment: ${err.message}`);
    }
  };

  // Handle update attachment (target reference)
  const handleUpdateAttachment = async (attachmentId, updates) => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}/audio-attachments/${attachmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update attachment');
      }

      const updatedAttachment = await response.json();
      const updatedAttachments = attachments.map(a => 
        a.id === attachmentId ? updatedAttachment : a
      );
      
      setAttachments(updatedAttachments);
      
      if (onUpdate) {
        onUpdate(updatedAttachments);
      }
    } catch (err) {
      alert(`Error updating attachment: ${err.message}`);
    }
  };

  // Handle reorder attachments
  const handleReorder = async (newOrder) => {
    const orderedIds = newOrder.map(a => a.id);
    
    try {
      const response = await fetch(`/api/lessons/${lessonId}/audio-attachments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedAttachmentIds: orderedIds })
      });

      if (!response.ok) {
        throw new Error('Failed to reorder attachments');
      }

      setAttachments(newOrder);
      
      if (onUpdate) {
        onUpdate(newOrder);
      }
    } catch (err) {
      alert(`Error reordering attachments: ${err.message}`);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newAttachments = [...attachments];
    const [draggedItem] = newAttachments.splice(draggedIndex, 1);
    newAttachments.splice(dropIndex, 0, draggedItem);

    handleReorder(newAttachments);
    setDraggedIndex(null);
  };

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

  if (!lessonId) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <p className="text-gray-600">Save the lesson first to manage audio attachments.</p>
      </div>
    );
  }

  return (
    <div className="lesson-audio-manager">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Audio Attachments</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setShowAttachModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Audio</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="text-red-800">Error loading attachments: {error}</div>
          <button
            onClick={fetchAttachments}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-gray-600">Loading attachments...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && attachments.length === 0 && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <svg className="mx-auto w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mt-4">No audio attachments</h3>
          <p className="text-gray-500 mt-2">Add voice recordings to enhance this lesson</p>
          <button
            onClick={() => setShowAttachModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add First Audio
          </button>
        </div>
      )}

      {/* Attachments List */}
      {!loading && !error && attachments.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-2">
            💡 Drag and drop to reorder attachments
          </div>
          
          {attachments.map((attachment, index) => (
            <div
              key={attachment.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-move ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getTypeIcon(attachment.attachment_type)}</span>
                      <h4 className="font-medium text-gray-900">
                        {attachment.voiceRecording?.title || 'Unknown Recording'}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(attachment.attachment_type)}`}>
                        {attachment.attachment_type}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mt-1">
                      Order: {attachment.display_order}
                      {attachment.target_ref && (
                        <span> • Target: {attachment.target_ref}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const newTarget = prompt('Enter target reference (optional):', attachment.target_ref || '');
                      if (newTarget !== null) {
                        handleUpdateAttachment(attachment.id, { target_ref: newTarget });
                      }
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Edit target reference"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Remove attachment"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Audio Player */}
              {attachment.voiceRecording && (
                <div className="mb-3">
                  <AudioPlayer 
                    audioUrl={attachment.voiceRecording.audio_url || attachment.voiceRecording.storage_key}
                    title={attachment.voiceRecording.title}
                    showControls={true}
                    className="w-full"
                  />
                </div>
              )}

              {/* Transcript */}
              {attachment.voiceRecording?.transcript_or_text && (
                <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                  <span className="font-medium">Transcript:</span> {attachment.voiceRecording.transcript_or_text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Attachment Modal */}
      <AudioAttachmentModal
        isOpen={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        lessonId={lessonId}
        onAttach={handleNewAttachments}
        existingAttachments={attachments}
      />
    </div>
  );
}