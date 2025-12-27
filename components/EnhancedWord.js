// Enhanced Word Component with Audio Support
'use client';

import { useState } from 'react';
import StudentAudioButton from './StudentAudioButton';

export default function EnhancedWord({ 
  word,
  audioAttachment = null,
  isHighlighted = false,
  onPlayAudio = null,
  currentlyPlaying = null,
  className = '',
  showAudioButton = true,
  onHover = null,
  onClick = null
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const isCurrentlyPlaying = currentlyPlaying === audioAttachment?.id;
  const hasAudio = audioAttachment && audioAttachment.voiceRecording;

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onHover) {
      onHover(word, true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onHover) {
      onHover(word, false);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(word);
    }
  };

  const handleAudioPlay = async () => {
    if (hasAudio && onPlayAudio) {
      await onPlayAudio(audioAttachment.id);
    }
  };

  return (
    <span 
      className={`
        enhanced-word relative inline-flex items-center
        ${isHighlighted ? 'bg-yellow-200' : ''}
        ${isHovered ? 'bg-blue-50' : ''}
        ${hasAudio ? 'cursor-pointer' : ''}
        ${className}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <span className="word-text">{word}</span>
      
      {/* Audio Button */}
      {hasAudio && showAudioButton && (isHovered || isCurrentlyPlaying) && (
        <span className="audio-button ml-1">
          <StudentAudioButton
            onPlay={handleAudioPlay}
            isPlaying={isCurrentlyPlaying}
            size="xs"
            variant="word"
            title={`Play audio for "${word}"`}
          />
        </span>
      )}
      
      {/* Audio Indicator */}
      {hasAudio && !showAudioButton && (
        <span className="audio-indicator ml-1 text-green-500" title={`Audio available for "${word}"`}>
          🔊
        </span>
      )}
    </span>
  );
}