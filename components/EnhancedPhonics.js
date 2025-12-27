// Enhanced Phonics Component with Audio Support
'use client';

import { useState } from 'react';
import StudentAudioButton from './StudentAudioButton';

export default function EnhancedPhonics({ 
  phonicsData = {},
  audioAttachments = [],
  onPlayAudio = null,
  currentlyPlaying = null,
  showLetterAudio = true,
  showSoundAudio = true,
  className = '',
  onLetterClick = null,
  highlightedLetters = []
}) {
  const [hoveredLetter, setHoveredLetter] = useState(null);

  // Create phonics audio mapping
  const phonicsAudioMap = audioAttachments
    .filter(attachment => attachment.voiceRecording?.type === 'phonics')
    .reduce((map, attachment) => {
      const title = attachment.voiceRecording?.title?.toLowerCase();
      if (title) {
        // Map both letter and sound representations
        map[title] = attachment;
        
        // Also map by phonics data keys if available
        Object.entries(phonicsData).forEach(([key, value]) => {
          if (typeof value === 'string' && value.toLowerCase() === title) {
            map[key] = attachment;
          }
        });
      }
      return map;
    }, {});

  const handlePhonicsAudioPlay = async (attachmentId) => {
    if (onPlayAudio) {
      await onPlayAudio(attachmentId);
    }
  };

  const renderPhonicsElement = (key, value, label) => {
    if (!value) return null;

    const audioAttachment = phonicsAudioMap[key] || phonicsAudioMap[value.toLowerCase()];
    const hasAudio = audioAttachment && audioAttachment.voiceRecording;
    const isPlaying = currentlyPlaying === audioAttachment?.id;
    const isHighlighted = highlightedLetters.includes(value.toLowerCase());

    const handlePlay = async () => {
      if (hasAudio) {
        await handlePhonicsAudioPlay(audioAttachment.id);
      }
    };

    const handleClick = () => {
      if (onLetterClick) {
        onLetterClick(value, key);
      }
    };

    return (
      <div 
        key={key}
        className={`
          phonics-element p-4 border rounded-lg transition-all
          ${isHighlighted ? 'bg-yellow-100 border-yellow-400' : 'bg-white border-gray-200'}
          ${hasAudio ? 'cursor-pointer hover:bg-blue-50' : ''}
          ${isPlaying ? 'ring-2 ring-blue-500' : ''}
        `}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
          </div>
          
          {hasAudio && (
            <div className="flex items-center gap-2">
              {showLetterAudio && (
                <StudentAudioButton
                  onPlay={handlePlay}
                  isPlaying={isPlaying}
                  size="sm"
                  variant="phonics"
                  title={`Play audio for ${value}`}
                />
              )}
            </div>
          )}
        </div>
        
        {hasAudio && (
          <div className="mt-2 text-xs text-green-600">
            🔊 Audio available
          </div>
        )}
      </div>
    );
  };

  const commonPhonicsKeys = [
    { key: 'letter', label: 'Letter' },
    { key: 'sound', label: 'Sound' },
    { key: 'name', label: 'Name' },
    { key: 'phoneme', label: 'Phoneme' },
    { key: 'grapheme', label: 'Grapheme' }
  ];

  return (
    <div className={`enhanced-phonics ${className}`}>
      <div className="phonics-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Render common phonics elements */}
        {commonPhonicsKeys.map(({ key, label }) => 
          renderPhonicsElement(key, phonicsData[key], label)
        )}
        
        {/* Render any additional phonics data */}
        {Object.entries(phonicsData)
          .filter(([key]) => !commonPhonicsKeys.find(item => item.key === key))
          .map(([key, value]) => 
            renderPhonicsElement(key, value, key.charAt(0).toUpperCase() + key.slice(1))
          )}
      </div>

      {/* Audio Summary */}
      {Object.keys(phonicsAudioMap).length > 0 && (
        <div className="audio-summary mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-blue-800 mb-1">
            📚 Phonics Audio Available
          </div>
          <div className="text-xs text-blue-600">
            {Object.keys(phonicsAudioMap).length} audio recording(s) available for this phonics lesson
          </div>
        </div>
      )}
    </div>
  );
}