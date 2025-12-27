// Phonics utility functions

// Common phonics sounds and their example words (will be loaded from API)
export let PHONICS_LIBRARY = {
  'ph': {
    sound: 'f',
    examples: ['phone', 'elephant', 'graph', 'photo'],
    customWords: [], // Additional words that can be added by admin
    disabledWords: [], // Default words that have been disabled by admin
    tips: 'The "ph" makes an "f" sound like in "phone"'
  },
  'th': {
    sound: 'th',
    examples: ['think', 'three', 'tooth', 'math'],
    customWords: [], // Additional words that can be added by admin
    disabledWords: [], // Default words that have been disabled by admin
    tips: 'Put your tongue between your teeth and blow air'
  },
  'sh': {
    sound: 'sh',
    examples: ['ship', 'wash', 'fish', 'shoe'],
    customWords: [], // Additional words that can be added by admin
    disabledWords: [], // Default words that have been disabled by admin
    tips: 'Make a "shh" sound like telling someone to be quiet'
  },
  'ch': {
    sound: 'ch',
    examples: ['chair', 'cheese', 'beach', 'lunch'],
    customWords: [], // Additional words that can be added by admin
    disabledWords: [], // Default words that have been disabled by admin
    tips: 'Start with "t" and end with "sh" sound'
  },
  'ck': {
    sound: 'k',
    examples: ['back', 'duck', 'clock', 'truck'],
    customWords: [], // Additional words that can be added by admin
    disabledWords: [], // Default words that have been disabled by admin
    tips: 'Makes a hard "k" sound at the end of words'
  },
  'ng': {
    sound: 'ng',
    examples: ['ring', 'sing', 'king', 'long'],
    customWords: [], // Additional words that can be added by admin
    disabledWords: [], // Default words that have been disabled by admin
    tips: 'Sound comes from the back of your throat'
  }
};

// Load phonics library from API
export const loadPhonicsLibrary = async () => {
  try {
    if (typeof window !== 'undefined') {
      console.log('Loading phonics library from API...');
      const response = await fetch('/api/phonics');
      if (response.ok) {
        const data = await response.json();
        console.log('Phonics library loaded successfully:', data);
        // Merge with existing library while preserving structure
        Object.keys(data).forEach(key => {
          if (PHONICS_LIBRARY[key]) {
            PHONICS_LIBRARY[key] = { ...PHONICS_LIBRARY[key], ...data[key] };
          } else {
            PHONICS_LIBRARY[key] = data[key];
          }
        });
        return PHONICS_LIBRARY;
      } else {
        console.warn('Failed to load phonics library, status:', response.status);
      }
    }
  } catch (error) {
    console.warn('Failed to load phonics library from API, using defaults:', error);
  }
  return PHONICS_LIBRARY;
};

// Save phonics library to API
export const savePhonicsLibrary = async () => {
  try {
    if (typeof window !== 'undefined') {
      console.log('Saving phonics library to API:', PHONICS_LIBRARY);
      const response = await fetch('/api/phonics', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(PHONICS_LIBRARY),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Save failed with status:', response.status, errorData);
        throw new Error(`Failed to save phonics library: ${response.status}`);
      }
      
      console.log('Phonics library saved successfully');
      return true;
    }
  } catch (error) {
    console.error('Error saving phonics library:', error);
    throw error;
  }
  return false;
};

// Function to get all words (examples + custom) for a phonic, excluding disabled words
export const getAllWordsForPhonic = (phonic) => {
  const phonicData = PHONICS_LIBRARY[phonic];
  if (!phonicData) return [];
  
  // Filter out disabled default words
  const enabledExamples = phonicData.examples.filter(word => 
    !phonicData.disabledWords || !phonicData.disabledWords.includes(word.toLowerCase())
  );
  
  return [...enabledExamples, ...(phonicData.customWords || [])];
};

// Function to add a custom word to a phonic
export const addCustomWordToPhonic = async (phonic, word) => {
  if (PHONICS_LIBRARY[phonic] && word && word.trim()) {
    if (!PHONICS_LIBRARY[phonic].customWords) {
      PHONICS_LIBRARY[phonic].customWords = [];
    }
    const cleanWord = word.trim().toLowerCase();
    if (!PHONICS_LIBRARY[phonic].customWords.includes(cleanWord)) {
      PHONICS_LIBRARY[phonic].customWords.push(cleanWord);
      await savePhonicsLibrary();
    }
  }
};

// Function to remove a custom word from a phonic
export const removeCustomWordFromPhonic = async (phonic, word) => {
  if (PHONICS_LIBRARY[phonic] && PHONICS_LIBRARY[phonic].customWords) {
    PHONICS_LIBRARY[phonic].customWords = PHONICS_LIBRARY[phonic].customWords.filter(
      w => w !== word.trim().toLowerCase()
    );
    await savePhonicsLibrary();
  }
};

// Function to remove a default word from a phonic (moves to disabled list)
export const removeDefaultWordFromPhonic = async (phonic, word) => {
  if (PHONICS_LIBRARY[phonic]) {
    if (!PHONICS_LIBRARY[phonic].disabledWords) {
      PHONICS_LIBRARY[phonic].disabledWords = [];
    }
    const cleanWord = word.trim().toLowerCase();
    if (!PHONICS_LIBRARY[phonic].disabledWords.includes(cleanWord)) {
      PHONICS_LIBRARY[phonic].disabledWords.push(cleanWord);
      await savePhonicsLibrary();
    }
  }
};

// Function to restore a default word for a phonic (removes from disabled list)
export const restoreDefaultWordForPhonic = async (phonic, word) => {
  if (PHONICS_LIBRARY[phonic] && PHONICS_LIBRARY[phonic].disabledWords) {
    const cleanWord = word.trim().toLowerCase();
    PHONICS_LIBRARY[phonic].disabledWords = PHONICS_LIBRARY[phonic].disabledWords.filter(
      w => w !== cleanWord
    );
    await savePhonicsLibrary();
  }
};

// Speech synthesis settings for different phonics with improved voice selection
export const SPEECH_SETTINGS = {
  default: {
    rate: 0.8,
    pitch: 1.0,
    volume: 0.9,
    voice: null // Will be set to most natural voice available
  },
  phonic: {
    rate: 0.6,
    pitch: 1.1,
    volume: 1.0,
    voice: null // Will be set to most natural voice available
  },
  word: {
    rate: 0.9,
    pitch: 1.0,
    volume: 0.9,
    voice: null // Will be set to most natural voice available
  }
};

// Find the best available voice (more human-sounding)
export const getBestVoice = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  
  // Priority order for more natural voices
  const preferredVoices = [
    // High-quality neural voices
    'Microsoft Zira - English (United States)',
    'Microsoft David - English (United States)', 
    'Google US English Female',
    'Google US English Male',
    'Alex', // macOS default
    'Samantha', // macOS high-quality
    // Fallback to any English voice
    voices.find(voice => voice.lang.startsWith('en-') && voice.name.includes('Premium')),
    voices.find(voice => voice.lang.startsWith('en-') && voice.name.includes('Enhanced')),
    voices.find(voice => voice.lang.startsWith('en-') && voice.name.includes('Neural')),
    voices.find(voice => voice.lang.startsWith('en-') && !voice.name.includes('eSpeak')),
    voices.find(voice => voice.lang.startsWith('en-'))
  ];

  // Return the first available preferred voice
  for (const voiceName of preferredVoices) {
    if (typeof voiceName === 'string') {
      const voice = voices.find(v => v.name === voiceName);
      if (voice) return voice;
    } else if (voiceName) {
      return voiceName;
    }
  }

  return voices[0] || null;
};

// Generate practice sentences for phonics
export const generatePracticeSentence = (phonic) => {
  const library = PHONICS_LIBRARY[phonic];
  if (!library) return "Practice saying the phonic sound.";
  
  const examples = library.examples;
  const sentence = `The ${examples[0]} and ${examples[1]} helped with the ${examples[2]}.`;
  return sentence;
};

// Simulate pronunciation scoring (in real app, use speech recognition API)
export const evaluatePronunciation = async (audioBlob, targetPhonic) => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Simulate pronunciation analysis
  // In real implementation, you would:
  // 1. Convert audio to text using Web Speech API or external service
  // 2. Analyze phonetic accuracy
  // 3. Compare with target pronunciation
  
  // For demo, return random score with bias toward success
  const accuracy = Math.random();
  const threshold = 0.3; // 70% success rate for demo
  
  return {
    success: accuracy > threshold,
    score: Math.round(accuracy * 100),
    feedback: accuracy > threshold 
      ? "Great Job! Your pronunciation was excellent!" 
      : "Try again. Focus on the sound and try to match the example.",
    suggestions: accuracy <= threshold 
      ? PHONICS_LIBRARY[targetPhonic]?.tips || "Listen carefully and try again."
      : null
  };
};

// Text-to-speech helper function with improved voice selection
export const speakText = (text, settings = SPEECH_SETTINGS.default) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;
    
    // Set the best available voice
    const bestVoice = getBestVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  }
  return false;
};

// Recording file management
export const RECORDING_MANAGER = {
  recordings: new Map(),
  
  // Save recording for lesson
  saveRecording: (lessonId, audioBlob, metadata = {}) => {
    const recordingData = {
      blob: audioBlob,
      timestamp: Date.now(),
      lessonId,
      metadata
    };
    
    RECORDING_MANAGER.recordings.set(lessonId, recordingData);
    
    // Store in localStorage for persistence
    try {
      const audioUrl = URL.createObjectURL(audioBlob);
      const recordingInfo = {
        timestamp: recordingData.timestamp,
        lessonId,
        metadata,
        url: audioUrl
      };
      
      localStorage.setItem(`recording_${lessonId}`, JSON.stringify(recordingInfo));
    } catch (error) {
      console.warn('Could not save recording to localStorage:', error);
    }
    
    return recordingData;
  },
  
  // Get recording for lesson
  getRecording: (lessonId) => {
    return RECORDING_MANAGER.recordings.get(lessonId);
  },
  
  // Get all recordings for review
  getAllRecordingsForReview: () => {
    const reviewableRecordings = [];
    
    // Check localStorage for saved recordings
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('recording_')) {
          const recordingInfo = JSON.parse(localStorage.getItem(key));
          if (recordingInfo.metadata.needsManualReview) {
            reviewableRecordings.push(recordingInfo);
          }
        }
      }
    } catch (error) {
      console.warn('Could not retrieve recordings from localStorage:', error);
    }
    
    return reviewableRecordings;
  },
  
  // Mark recording as reviewed
  markAsReviewed: (lessonId) => {
    try {
      const recordingKey = `recording_${lessonId}`;
      const recordingInfo = localStorage.getItem(recordingKey);
      if (recordingInfo) {
        const data = JSON.parse(recordingInfo);
        data.metadata.needsManualReview = false;
        data.metadata.reviewedAt = new Date().toISOString();
        localStorage.setItem(recordingKey, JSON.stringify(data));
      }
    } catch (error) {
      console.warn('Could not mark recording as reviewed:', error);
    }
  },
  
  // Delete recording manually (for lesson two review)
  deleteRecording: (lessonId) => {
    const recording = RECORDING_MANAGER.recordings.get(lessonId);
    
    if (recording) {
      // Revoke blob URL to free memory
      URL.revokeObjectURL(URL.createObjectURL(recording.blob));
      RECORDING_MANAGER.recordings.delete(lessonId);
    }
    
    // Remove from localStorage
    try {
      localStorage.removeItem(`recording_${lessonId}`);
    } catch (error) {
      console.warn('Could not remove recording from localStorage:', error);
    }
  },
  
  // Clean up all recordings (call when session ends)
  cleanup: () => {
    RECORDING_MANAGER.recordings.forEach((recording, lessonId) => {
      RECORDING_MANAGER.deleteRecording(lessonId);
    });
  },
  
  // Get all recordings for current session
  getAllRecordings: () => {
    return Array.from(RECORDING_MANAGER.recordings.values());
  }
};// Check browser support for audio recording
export const checkAudioSupport = () => {
  const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  const hasSpeechSynthesis = 'speechSynthesis' in window;
  
  return {
    canRecord: hasMediaDevices,
    canSpeak: hasSpeechSynthesis,
    fullSupport: hasMediaDevices && hasSpeechSynthesis
  };
};

// Format time for audio duration display
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};