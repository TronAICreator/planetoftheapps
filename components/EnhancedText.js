// Enhanced Text Component with Audio Support
'use client';

import { useState } from 'react';
import EnhancedWord from './EnhancedWord';
import StudentAudioButton from './StudentAudioButton';

export default function EnhancedText({ 
  text = '',
  audioAttachments = [],
  onPlayAudio = null,
  currentlyPlaying = null,
  highlightedWords = [],
  showWordAudio = true,
  showTextAudio = true,
  className = '',
  onWordClick = null,
  onWordHover = null
}) {
  const [hoveredWord, setHoveredWord] = useState(null);

  // Find text-level audio attachment
  const textAudio = audioAttachments.find(attachment => 
    attachment.voiceRecording?.type === 'text'
  );
  
  // Create word mapping for audio attachments
  const wordAudioMap = audioAttachments
    .filter(attachment => attachment.voiceRecording?.type === 'word')
    .reduce((map, attachment) => {
      const word = attachment.voiceRecording?.title?.toLowerCase();
      if (word) {
        map[word] = attachment;
      }
      return map;
    }, {});

  const handleWordHover = (word, isHovered) => {
    setHoveredWord(isHovered ? word : null);
    if (onWordHover) {
      onWordHover(word, isHovered);
    }
  };

  const handleTextAudioPlay = async () => {
    if (textAudio && onPlayAudio) {
      await onPlayAudio(textAudio.id);
    }
  };

  const handleWordAudioPlay = async (attachmentId) => {
    if (onPlayAudio) {
      await onPlayAudio(attachmentId);
    }
  };

  // Split text into words while preserving spacing and punctuation
  const renderText = () => {
    const words = text.split(/(\s+)/);
    
    return words.map((segment, index) => {
      // If it's whitespace, render as-is
      if (/^\s+$/.test(segment)) {
        return <span key={index}>{segment}</span>;
      }

      // Clean the word for lookup (remove punctuation)
      const cleanWord = segment.toLowerCase().replace(/[^\w]/g, '');
      const wordAudio = wordAudioMap[cleanWord];
      const isHighlighted = highlightedWords.includes(cleanWord);

      return (
        <EnhancedWord
          key={index}
          word={segment}
          audioAttachment={wordAudio}
          isHighlighted={isHighlighted}
          onPlayAudio={handleWordAudioPlay}
          currentlyPlaying={currentlyPlaying}
          showAudioButton={showWordAudio}
          onHover={handleWordHover}
          onClick={onWordClick}
        />
      );
    });
  };

  const hasTextAudio = textAudio && textAudio.voiceRecording;
  const isTextPlaying = currentlyPlaying === textAudio?.id;

  return (
    <div className={`enhanced-text ${className}`}>
      {/* Text Audio Control */}
      {hasTextAudio && showTextAudio && (
        <div className="text-audio-controls mb-2 flex items-center gap-2">
          <StudentAudioButton
            onPlay={handleTextAudioPlay}
            isPlaying={isTextPlaying}
            size="sm"
            variant="text"
            title="Play full text audio"
          />
          <span className="text-sm text-gray-600">
            Play entire text
          </span>
        </div>
      )}

      {/* Enhanced Text Content */}
      <div className="text-content text-lg leading-relaxed">
        {renderText()}
      </div>

      {/* Audio Summary */}
      {(hasTextAudio || Object.keys(wordAudioMap).length > 0) && (
        <div className="audio-summary mt-2 text-sm text-gray-500">
          {hasTextAudio && (
            <span className="mr-4">📖 Full text audio available</span>
          )}
          {Object.keys(wordAudioMap).length > 0 && (
            <span>🔤 {Object.keys(wordAudioMap).length} word(s) have audio</span>
          )}
        </div>
      )}
    </div>
  );
}