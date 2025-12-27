// Student Audio Enhancement Hook - for playing attached audio in lessons
'use client';

import { useState, useEffect, useRef } from 'react';

export default function useStudentAudio(lessonId) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [audioRefs, setAudioRefs] = useState(new Map());

  // Fetch lesson audio attachments
  useEffect(() => {
    if (!lessonId) {
      setAttachments([]);
      setLoading(false);
      return;
    }

    const fetchAttachments = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/lessons/${lessonId}/audio-attachments`);
        if (!response.ok) {
          throw new Error('Failed to fetch audio attachments');
        }

        const data = await response.json();
        setAttachments(data.attachments || []);
      } catch (err) {
        setError(err.message);
        setAttachments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttachments();
  }, [lessonId]);

  // Create audio elements for each attachment
  useEffect(() => {
    const refs = new Map();
    
    attachments.forEach(attachment => {
      if (attachment.voiceRecording?.audio_url || attachment.voiceRecording?.storage_key) {
        const audio = new Audio(attachment.voiceRecording.audio_url || attachment.voiceRecording.storage_key);
        audio.preload = 'metadata';
        refs.set(attachment.id, audio);
      }
    });

    setAudioRefs(refs);

    // Cleanup on unmount
    return () => {
      refs.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [attachments]);

  // Play audio by attachment ID
  const playAudio = async (attachmentId) => {
    const audio = audioRefs.get(attachmentId);
    if (!audio) return false;

    try {
      // Stop any currently playing audio
      if (currentAudio && currentAudio !== audio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      setCurrentAudio(audio);
      await audio.play();
      return true;
    } catch (error) {
      console.error('Error playing audio:', error);
      return false;
    }
  };

  // Stop currently playing audio
  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
  };

  // Get attachments by type
  const getAttachmentsByType = (type) => {
    return attachments.filter(a => a.attachment_type === type);
  };

  // Get attachments by target reference
  const getAttachmentsByTarget = (targetRef) => {
    return attachments.filter(a => a.target_ref === targetRef);
  };

  // Find attachment for a specific phonics sound
  const getPhonicsAttachment = (phoneme) => {
    return attachments.find(a => 
      a.attachment_type === 'phonics' && 
      (a.target_ref === phoneme || a.voiceRecording?.transcript_or_text?.toLowerCase().includes(phoneme.toLowerCase()))
    );
  };

  // Find attachment for a specific word
  const getWordAttachment = (word) => {
    return attachments.find(a => 
      a.attachment_type === 'word' && 
      (a.target_ref === word || a.voiceRecording?.transcript_or_text?.toLowerCase() === word.toLowerCase())
    );
  };

  // Find text attachments (for passages)
  const getTextAttachments = () => {
    return attachments.filter(a => a.attachment_type === 'text');
  };

  return {
    attachments,
    loading,
    error,
    currentAudio,
    playAudio,
    stopAudio,
    getAttachmentsByType,
    getAttachmentsByTarget,
    getPhonicsAttachment,
    getWordAttachment,
    getTextAttachments
  };
}