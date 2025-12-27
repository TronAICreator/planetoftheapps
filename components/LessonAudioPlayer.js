'use client';

import { useState, useRef, useEffect } from 'react';
import { getAudioAttachmentsWithFallback } from '@/utils/lessonAudioAttachments';

export default function LessonAudioPlayer({ 
  lessonId, 
  pageId = null, 
  blockId = null,
  className = '',
  autoplay = false,
  showControls = true 
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    loadAudio();
  }, [lessonId, pageId, blockId]);

  const loadAudio = async () => {
    try {
      setLoading(true);
      setError(null);

      const attachments = await getAudioAttachmentsWithFallback(lessonId, pageId, blockId);
      
      if (attachments.length === 0) {
        setError('No audio available');
        setAudioSrc(null);
        return;
      }

      // Use the first (highest priority) attachment
      const attachment = attachments[0];
      const audioPath = `/data/voice-recordings/${attachment.voiceRecording.filename}`;
      setAudioSrc(audioPath);

      // If autoplay is enabled, start playing when audio loads
      if (autoplay && audioRef.current) {
        audioRef.current.onloadeddata = () => {
          play();
        };
      }
    } catch (err) {
      console.error('Error loading audio:', err);
      setError('Failed to load audio');
      setAudioSrc(null);
    } finally {
      setLoading(false);
    }
  };

  const play = async () => {
    if (audioRef.current && audioSrc) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Error playing audio:', err);
        setError('Failed to play audio');
      }
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const handleError = () => {
    setError('Audio playback error');
    setIsPlaying(false);
  };

  // Don't render anything if there's no audio and we're not showing controls
  if (!audioSrc && !showControls) {
    return null;
  }

  return (
    <div className={`lesson-audio-player ${className}`}>
      {/* Hidden audio element */}
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onEnded={handleEnded}
          onError={handleError}
          preload="metadata"
        />
      )}

      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
              <span>Loading audio...</span>
            </div>
          ) : error ? (
            <div className="text-gray-400 text-sm">
              {error}
            </div>
          ) : audioSrc ? (
            <button
              onClick={handlePlayPause}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              {isPlaying ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Play
                </>
              )}
            </button>
          ) : (
            <div className="text-gray-400 text-sm">
              No audio available
            </div>
          )}
        </div>
      )}
    </div>
  );
}