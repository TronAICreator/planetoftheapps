// Voice Recording Modal Component - Complete recording interface
'use client';

import { useState, useEffect, useRef } from 'react';
import useVoiceRecording from './useVoiceRecording';

export default function VoiceRecordingModal({ isOpen, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('record');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('letter-sounds');
  const [uploadFile, setUploadFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  const {
    isRecording,
    recordedBlob,
    duration,
    durationSeconds,
    error: recordingError,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    getAudioUrl,
    cleanup
  } = useVoiceRecording();

  // Categories for voice recordings
  const categories = [
    { value: 'letter-sounds', label: 'Letter Sounds' },
    { value: 'word-pronunciation', label: 'Word Pronunciation' },
    { value: 'phonics-rules', label: 'Phonics Rules' },
    { value: 'reading-examples', label: 'Reading Examples' },
    { value: 'vocabulary', label: 'Vocabulary' },
    { value: 'other', label: 'Other' }
  ];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('record');
      setTitle('');
      setDescription('');
      setCategory('letter-sounds');
      setUploadFile(null);
      setSaveError(null);
      setIsPlaying(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      cleanup();
    }
  }, [isOpen, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [cleanup]);

  const handleStartRecording = async () => {
    const success = await startRecording();
    if (!success) {
      // Error is already set in the hook
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleCancelRecording = () => {
    cancelRecording();
    setActiveTab('record');
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        alert('Please select an audio file.');
        event.target.value = '';
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB.');
        event.target.value = '';
        return;
      }

      setUploadFile(file);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title for the recording.');
      return;
    }

    const audioFile = activeTab === 'record' ? recordedBlob : uploadFile;
    if (!audioFile) {
      alert(activeTab === 'record' 
        ? 'Please record audio first.' 
        : 'Please select an audio file to upload.'
      );
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const formData = new FormData();
      
      // Determine file extension based on the audio type
      let fileName;
      if (activeTab === 'record') {
        const mimeType = audioFile.type;
        let extension = '.webm';
        if (mimeType.includes('mp4')) extension = '.mp4';
        else if (mimeType.includes('ogg')) extension = '.ogg';
        fileName = `recording_${Date.now()}${extension}`;
      } else {
        fileName = uploadFile.name;
      }
      
      formData.append('audio', audioFile, fileName);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('duration', activeTab === 'record' ? durationSeconds : 0);

      const response = await fetch('/api/voice-recordings', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save recording');
      }

      const result = await response.json();
      
      // Call the onSave callback to refresh the list
      if (onSave) {
        onSave(result.recording);
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error saving recording:', error);
      setSaveError(error.message || 'Failed to save recording. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasRecording = recordedBlob || uploadFile;
  const currentAudioUrl = activeTab === 'record' ? getAudioUrl() : (uploadFile ? URL.createObjectURL(uploadFile) : null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Record Voice</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'record'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('record')}
            >
              Record Audio
            </button>
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('upload')}
            >
              Upload File
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Recording Tab */}
          {activeTab === 'record' && (
            <div className="space-y-6">
              {!isSupported && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="text-sm text-red-700">
                      Your browser doesn't support audio recording. Please try using a modern browser like Chrome, Firefox, or Safari.
                    </div>
                  </div>
                </div>
              )}

              {recordingError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="text-sm text-red-700">{recordingError}</div>
                  </div>
                </div>
              )}

              {/* Recording Interface */}
              <div className="text-center space-y-4">
                <div className="text-lg font-medium text-gray-900">
                  {isRecording ? 'Recording...' : recordedBlob ? 'Recording Complete' : 'Ready to Record'}
                </div>
                
                {/* Duration Display */}
                <div className="text-3xl font-mono text-gray-600">
                  {duration}
                </div>

                {/* Recording Controls */}
                <div className="flex justify-center space-x-4">
                  {!isRecording && !recordedBlob && (
                    <button
                      onClick={handleStartRecording}
                      disabled={!isSupported}
                      className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-full p-6 transition-colors"
                    >
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}

                  {isRecording && (
                    <button
                      onClick={handleStopRecording}
                      className="bg-gray-500 hover:bg-gray-600 text-white rounded-full p-6 transition-colors"
                    >
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}

                  {recordedBlob && (
                    <button
                      onClick={handleCancelRecording}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                    >
                      Record Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose Audio File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Supported formats: MP3, WAV, OGG, M4A. Maximum size: 10MB.
                </p>
              </div>

              {uploadFile && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="text-sm text-green-700">
                    Selected: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audio Preview */}
          {hasRecording && currentAudioUrl && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="text-sm font-medium text-gray-700">Preview</div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePlayPause}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 transition-colors"
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <audio
                  ref={audioRef}
                  src={currentAudioUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="flex-1"
                  controls
                />
              </div>
            </div>
          )}

          {/* Metadata Form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for this recording"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description or notes about this recording"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Save Error */}
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-700">{saveError}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasRecording || !title.trim() || isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Recording'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}