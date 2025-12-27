"use client";
import { useEffect, useState } from "react";
import { isUserAuthenticated, isUserAdmin, clearUserSession } from "../../../utils/auth";
import PhonicsLesson from "../../../components/PhonicsLesson";
import { RECORDING_MANAGER, PHONICS_LIBRARY, addCustomWordToPhonic, removeCustomWordFromPhonic, getAllWordsForPhonic, removeDefaultWordFromPhonic, restoreDefaultWordForPhonic, loadPhonicsLibrary } from "../../../utils/phonics";
import { loadSynchronizedLessons, saveSynchronizedLessons, updateLesson, addLesson, deleteLesson, getLessonStats } from "../../../utils/lessonSync";
import LessonAudioManager from "../../../components/LessonAudioManager";
import axios from 'axios';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'lessons', 'lesson-editor', 'users', 'media', 'recordings', 'analytics', 'voice-library'
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [savedRecordings, setSavedRecordings] = useState([]);
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonsList, setLessonsList] = useState([]);
  const [phonicsLibraryVersion, setPhonicsLibraryVersion] = useState(0); // Force re-render when phonics library changes
  
  // Focus section state
  const [focusSettings, setFocusSettings] = useState({
    currentSentence: '',
    selectedWords: [],
    missingWords: {},
    recordedWords: {},
    completeSentence: '',
    currentPhonic: '',
    recordedPhonic: null // Store recorded phonic audio
  });
  const [isRecordingWord, setIsRecordingWord] = useState(false);
  const [recordingWordIndex, setRecordingWordIndex] = useState(null);
  const [audioSupport, setAudioSupport] = useState(null);
  
  // Phonic recording state
  const [isRecordingPhonic, setIsRecordingPhonic] = useState(false);
  
  // Practice sentences missing words state
  const [practiceSentencesState, setPracticeSentencesState] = useState({});
  const [isRecordingPracticeWord, setIsRecordingPracticeWord] = useState(false);
  const [recordingPracticeInfo, setRecordingPracticeInfo] = useState({ sentenceIndex: null, wordIndex: null });

  // Voice Library state
  const [voiceLibrary, setVoiceLibrary] = useState({ phonics: [], words: [], texts: [] });
  const [currentRecording, setCurrentRecording] = useState({ type: 'phonics', label: '', audio: null, blob: null, mimeType: null, isRecording: false, mediaRecorder: null, timeoutId: null });
  const [selectedCategory, setSelectedCategory] = useState('phonics');
  const [searchTerm, setSearchTerm] = useState('');
  const [playingAudio, setPlayingAudio] = useState(null);

  // Comprehensive word recording state
  const [isRecordingAllWords, setIsRecordingAllWords] = useState(false);
  const [recordingAllWordsInfo, setRecordingAllWordsInfo] = useState({ 
    section: null, // 'mainText' or 'pages'
    pageIndex: null, // only for pages section
    wordIndex: null,
    word: null
  });

  const [usersList, setUsersList] = useState([
    { id: 1, name: "John Smith", email: "john@example.com", role: "student", joinDate: "2024-01-15", lessonsCompleted: 12 },
    { id: 2, name: "Sarah Johnson", email: "sarah@example.com", role: "student", joinDate: "2024-02-20", lessonsCompleted: 8 },
    { id: 3, name: "Mike Davis", email: "mike@example.com", role: "admin", joinDate: "2024-01-01", lessonsCompleted: 0 },
  ]);
  const [uploadedMedia, setUploadedMedia] = useState([
    { id: 1, name: "elephant-sound.mp3", type: "audio", size: "2.1 MB", uploadDate: "2024-03-01" },
    { id: 2, name: "phonics-image.jpg", type: "image", size: "1.5 MB", uploadDate: "2024-03-02" },
  ]);
  
  // Form state for lesson editing/adding
  const [lessonForm, setLessonForm] = useState({
    title: '',
    summary: '',
    text: '',
    phonics: [],
    missingPhonic: '',
    difficulty: 'beginner',
    pages: [],
    audioFiles: [],
    imageFiles: [],
    recordedPhonic: null, // Voice Library phonic recording assignment
    // Comprehensive word recordings for all lesson content
    wordRecordings: {
      mainText: {}, // {wordIndex: {word: 'word', audio: 'url', blob: blob, timestamp: ''}}
      pages: {} // {pageIndex: {wordIndex: {...}}}
    }
  });
  
  // Sample phonics lessons data
  const [phonicsLessons, setPhonicsLessons] = useState([
    {
      id: 1,
      phonic: 'ph',
      sentence: 'The elephant ate a phone with his foot.',
      difficulty: 'beginner'
    },
    {
      id: 2, 
      phonic: 'th',
      sentence: 'The thick thread was worth three things.',
      difficulty: 'intermediate'
    },
    {
      id: 3,
      phonic: 'sh',
      sentence: 'She washed the dishes with fresh shampoo.',
      difficulty: 'beginner'
    },
    {
      id: 4,
      phonic: 'ch',
      sentence: 'The child chose cheese and cherries for lunch.',
      difficulty: 'intermediate'
    }
  ]);

  // Update current lesson in synchronized storage when word recordings change
  const updateCurrentLessonInStorage = () => {
    if (editingLesson && lessonForm) {
      try {
        const updatedLessons = lessonsList.map(lesson =>
          lesson.id === editingLesson.id
            ? { ...lesson, ...lessonForm }
            : lesson
        );
        setLessonsList(updatedLessons);
        saveSynchronizedLessons(updatedLessons);
        console.log('🎤 Updated lesson with new word recordings in synchronized storage');
      } catch (error) {
        console.error('Error updating lesson in storage:', error);
      }
    }
  };

  useEffect(() => {
    // Check authentication status
    const authenticated = isUserAuthenticated();
    const admin = isUserAdmin();
    
    setIsAuthenticated(authenticated);
    setIsAdmin(admin);
    setLoading(false);

    // If not authenticated or not admin, redirect to login
    if (!authenticated || !admin) {
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return;
    }

    // Load synchronized lessons data
    const lessons = loadSynchronizedLessons();
    setLessonsList(lessons);

    // Load saved recordings for review
    loadSavedRecordings();
    
    // Load phonics library from persistent storage
    const initPhonics = async () => {
      await loadPhonicsLibrary();
      setPhonicsLibraryVersion(prev => prev + 1); // Trigger re-render
    };
    initPhonics();

    // Check audio support for focus section
    import('../../../utils/phonics').then(({ checkAudioSupport }) => {
      const support = checkAudioSupport();
      setAudioSupport(support);
    });

    // Load Voice Library from localStorage
    loadVoiceLibrary();
  }, []);

  const loadSavedRecordings = () => {
    const recordings = RECORDING_MANAGER.getAllRecordingsForReview();
    setSavedRecordings(recordings);
  };

  const handleDeleteRecording = (lessonId) => {
    RECORDING_MANAGER.deleteRecording(lessonId);
    loadSavedRecordings(); // Refresh the list
  };

  const handleMarkAsReviewed = (lessonId) => {
    RECORDING_MANAGER.markAsReviewed(lessonId);
    loadSavedRecordings(); // Refresh the list
  };

  // Lesson management functions
  const handleEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title || '',
      summary: lesson.summary || '',
      text: lesson.text || '',
      phonics: lesson.phonics || [],
      missingPhonic: lesson.missingPhonic || '',
      difficulty: lesson.difficulty || 'beginner',
      pages: lesson.pages || [],
      audioFiles: lesson.audioFiles || [],
      imageFiles: lesson.imageFiles || [],
      recordedPhonic: lesson.recordedPhonic || null,
      wordRecordings: lesson.wordRecordings || { mainText: {}, pages: {} }
    });
    setActiveView('lesson-editor');
  };

  const handleAddNewLesson = () => {
    setEditingLesson(null);
    setLessonForm({
      title: '',
      summary: '',
      text: '',
      phonics: [],
      missingPhonic: '',
      difficulty: 'beginner',
      pages: [],
      audioFiles: [],
      imageFiles: [],
      recordedPhonic: null,
      wordRecordings: { mainText: {}, pages: {} }
    });
    setActiveView('lesson-editor');
  };

  const handleSaveLesson = async () => {
    try {
      let updatedLessons;
      
      if (editingLesson) {
        // Update existing lesson
        const updatedLesson = { ...editingLesson, ...lessonForm };
        
        // Update lessons array
        updatedLessons = lessonsList.map(lesson =>
          lesson.id === editingLesson.id
            ? updatedLesson
            : lesson
        );
        
        console.log('📝 Updated lesson:', updatedLesson.title, 'with', Object.keys(updatedLesson.wordRecordings?.mainText || {}).length, 'word recordings');
        
      } else {
        // Add new lesson
        const newLesson = {
          id: `lesson-${Date.now()}`,
          ...lessonForm,
          order: lessonsList.length + 1,
          completed: false
        };
        
        // Add to lessons array
        updatedLessons = [...lessonsList, newLesson];
        
        console.log('➕ Added new lesson:', newLesson.title, 'with', Object.keys(newLesson.wordRecordings?.mainText || {}).length, 'word recordings');
      }
      
      // Update state and synchronize storage
      setLessonsList(updatedLessons);
      saveSynchronizedLessons(updatedLessons);
      
      setActiveView('lessons');
      setEditingLesson(null);
      
      // Clear the form
      setLessonForm({
        title: '',
        summary: '',
        text: '',
        phonics: [],
        missingPhonic: '',
        difficulty: 'beginner',
        pages: [],
        audioFiles: [],
        imageFiles: [],
        recordedPhonic: null,
        wordRecordings: { mainText: {}, pages: {} }
      });
      
      // Show success message
      alert('✅ Lesson saved successfully! Word recordings are now available to students.');
      
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Failed to save lesson. Please try again.');
    }
  };  const handleDeleteLesson = async (lessonId) => {
    if (confirm('Are you sure you want to delete this lesson?')) {
      try {
        // Remove from local state and synchronized storage
        const updatedLessons = lessonsList.filter(lesson => lesson.id !== lessonId);
        setLessonsList(updatedLessons);
        saveSynchronizedLessons(updatedLessons);
        
        console.log('🗑️ Deleted lesson and synchronized storage');
        alert('✅ Lesson deleted successfully!');
      } catch (error) {
        console.error('Error deleting lesson:', error);
        alert('Failed to delete lesson. Please try again.');
      }
    }
  };

  const updateLessonForm = (field, value) => {
    setLessonForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addPhonic = (phonic) => {
    if (phonic && !lessonForm.phonics.includes(phonic)) {
      updateLessonForm('phonics', [...lessonForm.phonics, phonic]);
    }
  };

  const removePhonic = (phonic) => {
    updateLessonForm('phonics', lessonForm.phonics.filter(p => p !== phonic));
  };

  const handleLogout = () => {
    clearUserSession();
    window.location.href = "/login";
  };

  const handleLessonComplete = (success) => {
    // Remove automatic completion alert - let users manually proceed
    // Lessons will remain available for continued practice
  };

  // Save lesson order immediately when changed
  const handleSaveLessonOrder = async () => {
    if (!editingLesson) return;
    
    try {
      const updatedLesson = { 
        ...editingLesson, 
        order: lessonForm.order || (lessonsList.length + 1) 
      };
      
      // Update local state immediately
      const updatedLessons = lessonsList.map(lesson => 
        lesson.id === editingLesson.id ? updatedLesson : lesson
      );
      
      // Sort by order if specified
      if (updatedLesson.order) {
        updatedLessons.sort((a, b) => (a.order || 999) - (b.order || 999));
      }
      
      setLessonsList(updatedLessons);
      setEditingLesson(updatedLesson);
      
      // Also save to local storage/API if needed
      try {
        const response = await axios.put(`/api/lessons/${editingLesson.id}`, updatedLesson);
        console.log('Lesson order saved:', response.data);
      } catch (apiError) {
        // Fallback to local storage if API fails
        console.log('API save failed, using local storage');
        localStorage.setItem('lessons', JSON.stringify(updatedLessons));
      }
      
      // Show success message
      alert('✅ Lesson order saved successfully!');
      
    } catch (error) {
      console.error('Error saving lesson order:', error);
      alert('❌ Failed to save lesson order. Please try again.');
    }
  };

  // User management functions
  const handleAddUser = (userData) => {
    const newUser = {
      id: Date.now(),
      ...userData,
      joinDate: new Date().toISOString().split('T')[0],
      lessonsCompleted: 0
    };
    setUsersList([...usersList, newUser]);
  };

  const handleEditUser = (userId, userData) => {
    const updatedUsers = usersList.map(user => 
      user.id === userId ? { ...user, ...userData } : user
    );
    setUsersList(updatedUsers);
  };

  const handleDeleteUser = (userId) => {
    if (confirm('Are you sure you want to delete this user?')) {
      const updatedUsers = usersList.filter(user => user.id !== userId);
      setUsersList(updatedUsers);
    }
  };

  // Media management functions
  const handleMediaUpload = (files, type) => {
    const newFiles = Array.from(files).map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: type,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      uploadDate: new Date().toISOString().split('T')[0],
      file: file
    }));
    
    // Always add to general media library
    setUploadedMedia([...uploadedMedia, ...newFiles]);
    
    // If we're in lesson editing mode, also add to lesson form
    if (activeView === 'lesson-editor') {
      if (type === 'audio') {
        setLessonForm(prev => ({
          ...prev,
          audioFiles: [...(prev.audioFiles || []), ...newFiles]
        }));
      } else if (type === 'image') {
        setLessonForm(prev => ({
          ...prev,
          imageFiles: [...(prev.imageFiles || []), ...newFiles]
        }));
      }
    }
  };

  const handleRemoveMediaFromLesson = (mediaId, type) => {
    if (type === 'audio') {
      setLessonForm(prev => ({
        ...prev,
        audioFiles: (prev.audioFiles || []).filter(file => file.id !== mediaId)
      }));
    } else if (type === 'image') {
      setLessonForm(prev => ({
        ...prev,
        imageFiles: (prev.imageFiles || []).filter(file => file.id !== mediaId)
      }));
    }
  };

  const handleAddExistingMediaToLesson = (media) => {
    if (media.type === 'audio' && !(lessonForm.audioFiles || []).find(f => f.id === media.id)) {
      setLessonForm(prev => ({
        ...prev,
        audioFiles: [...(prev.audioFiles || []), media]
      }));
    } else if (media.type === 'image' && !(lessonForm.imageFiles || []).find(f => f.id === media.id)) {
      setLessonForm(prev => ({
        ...prev,
        imageFiles: [...(prev.imageFiles || []), media]
      }));
    }
  };

  const handleDeleteMedia = (mediaId) => {
    if (confirm('Are you sure you want to delete this media file?')) {
      const updatedMedia = uploadedMedia.filter(media => media.id !== mediaId);
      setUploadedMedia(updatedMedia);
    }
  };

  const handlePreviewMedia = (media) => {
    if (media.type === 'audio') {
      const audio = new Audio(URL.createObjectURL(media.file));
      audio.play();
    } else if (media.type === 'image') {
      window.open(URL.createObjectURL(media.file), '_blank');
    }
  };

  // Focus section recording functions
  const startWordRecording = async (wordIndex, word) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Save recorded word
        setFocusSettings(prev => ({
          ...prev,
          recordedWords: {
            ...prev.recordedWords,
            [wordIndex]: {
              word: word,
              audio: audioUrl,
              blob: audioBlob,
              timestamp: new Date().toISOString()
            }
          }
        }));
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        setIsRecordingWord(false);
        setRecordingWordIndex(null);
      };

      mediaRecorder.start();
      setIsRecordingWord(true);
      setRecordingWordIndex(wordIndex);
      
      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions and try again.');
    }
  };

  const stopWordRecording = () => {
    // This will be handled by the mediaRecorder.onstop event
  };

  // Phonic recording functions for focus section
  const startPhonicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      // Use best available format
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Use default
          }
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Save recorded phonic
        setFocusSettings(prev => ({
          ...prev,
          recordedPhonic: {
            phonic: prev.currentPhonic,
            audio: audioUrl,
            blob: audioBlob,
            mimeType: mediaRecorder.mimeType || 'audio/wav',
            timestamp: new Date().toISOString()
          }
        }));
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        setIsRecordingPhonic(false);
        
        console.log('🎵 Recorded phonic:', focusSettings.currentPhonic, 'with format:', mediaRecorder.mimeType);
      };

      mediaRecorder.start();
      setIsRecordingPhonic(true);
      
      // Auto-stop after 3 seconds (phonics are typically short)
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error accessing microphone for phonic recording:', error);
      alert('Unable to access microphone for phonic recording. Please check permissions and try again.');
    }
  };

  const stopPhonicRecording = () => {
    // This will be handled by the mediaRecorder.onstop event
  };

  const playRecordedPhonic = () => {
    if (focusSettings.recordedPhonic && focusSettings.recordedPhonic.audio) {
      try {
        const audio = new Audio();
        
        audio.oncanplay = () => {
          console.log('🎵 Playing recorded phonic:', focusSettings.recordedPhonic.phonic);
          audio.play().catch((error) => {
            console.error('Error playing recorded phonic:', error);
            alert('Unable to play recorded phonic. Please try recording again.');
          });
        };
        
        audio.onerror = (error) => {
          console.error('Error loading recorded phonic audio:', error);
          alert('Recorded phonic audio appears to be corrupted. Please try recording again.');
        };
        
        audio.volume = 0.8;
        audio.src = focusSettings.recordedPhonic.audio;
        audio.load();
      } catch (error) {
        console.error('Error creating audio for recorded phonic:', error);
        alert('Unable to play recorded phonic.');
      }
    } else {
      alert('No phonic recording available. Please record a phonic first.');
    }
  };

  // Practice sentences recording functions
  const startPracticeWordRecording = async (sentenceIndex, wordIndex, word) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Save recorded word for practice sentence
        setPracticeSentencesState(prev => ({
          ...prev,
          [sentenceIndex]: {
            ...prev[sentenceIndex],
            recordedWords: {
              ...prev[sentenceIndex]?.recordedWords,
              [wordIndex]: {
                word: word,
                audio: audioUrl,
                blob: audioBlob,
                timestamp: new Date().toISOString()
              }
            }
          }
        }));
        
        // Update the lesson form to include the recorded word
        const newPages = [...lessonForm.pages];
        if (!newPages[sentenceIndex].adminRecordings) {
          newPages[sentenceIndex].adminRecordings = {};
        }
        newPages[sentenceIndex].adminRecordings[wordIndex] = {
          word: word,
          audio: audioUrl,
          blob: audioBlob,
          timestamp: new Date().toISOString()
        };
        updateLessonForm('pages', newPages);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        setIsRecordingPracticeWord(false);
        setRecordingPracticeInfo({ sentenceIndex: null, wordIndex: null });
      };

      mediaRecorder.start();
      setIsRecordingPracticeWord(true);
      setRecordingPracticeInfo({ sentenceIndex, wordIndex });
      
      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions and try again.');
    }
  };

  const stopPracticeWordRecording = () => {
    // This will be handled by the mediaRecorder.onstop event
  };

  // Comprehensive word recording functions for all lesson words
  const startAllWordsRecording = async (section, pageIndex, wordIndex, word) => {
    try {
      // Validate parameters
      if (!section || wordIndex === null || wordIndex === undefined) {
        console.error('Invalid recording parameters:', { section, pageIndex, wordIndex, word });
        return;
      }
      
      if (section === 'pages' && (pageIndex === null || pageIndex === undefined)) {
        console.error('pageIndex is required for pages section');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const audioChunks = [];

      console.log('Starting recording:', { section, pageIndex, wordIndex, word });
      setIsRecordingAllWords(true);
      setRecordingAllWordsInfo({ section, pageIndex, wordIndex, word });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Save recorded word to comprehensive structure
        console.log('Saving recording:', { section, pageIndex, wordIndex, word });
        
        try {
          setLessonForm(prev => {
            console.log('Previous state:', prev);
            console.log('Previous wordRecordings:', prev.wordRecordings);
            
            const newWordRecordings = { 
              mainText: prev.wordRecordings?.mainText || {},
              pages: prev.wordRecordings?.pages || {}
            };
            
            console.log('Initialized newWordRecordings:', newWordRecordings);
            
            if (section === 'mainText') {
              console.log('Saving to mainText');
              newWordRecordings.mainText = {
                ...newWordRecordings.mainText,
                [wordIndex]: {
                  word: word,
                  audio: audioUrl,
                  blob: audioBlob,
                  timestamp: new Date().toISOString()
                }
              };
            } else if (section === 'pages' && pageIndex !== null && pageIndex !== undefined) {
              console.log('Saving to pages, pageIndex:', pageIndex);
              console.log('pages object before:', newWordRecordings.pages);
              
              // Ensure pages object exists and initialize the specific page if needed
              if (!newWordRecordings.pages) {
                console.log('Creating pages object');
                newWordRecordings.pages = {};
              }
              if (!newWordRecordings.pages[pageIndex]) {
                console.log('Creating page at index:', pageIndex);
                newWordRecordings.pages[pageIndex] = {};
              }
              
              console.log('About to save to pages[' + pageIndex + '][' + wordIndex + ']');
              newWordRecordings.pages[pageIndex][wordIndex] = {
                word: word,
                audio: audioUrl,
                blob: audioBlob,
                timestamp: new Date().toISOString()
              };
            }

            console.log('Final newWordRecordings:', newWordRecordings);
            return {
              ...prev,
              wordRecordings: newWordRecordings
            };
          });

          // Update the lesson in synchronized storage with new word recordings
          setTimeout(() => {
            updateCurrentLessonInStorage();
          }, 100);
          
        } catch (error) {
          console.error('Error saving recording:', error);
          alert('Error saving recording: ' + error.message);
        }

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        setIsRecordingAllWords(false);
        setRecordingAllWordsInfo({ section: null, pageIndex: null, wordIndex: null, word: null });
      };

      mediaRecorder.start();

      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 5000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions and try again.');
    }
  };

  const stopAllWordsRecording = () => {
    // This will be handled by the mediaRecorder.onstop event
  };

  // Voice Library Functions
  const loadVoiceLibrary = () => {
    try {
      const saved = localStorage.getItem('phonics_voice_library');
      if (saved) {
        const library = JSON.parse(saved);
        setVoiceLibrary(library);
        console.log('📚 Loaded Voice Library:', library);
      }
    } catch (error) {
      console.error('Error loading Voice Library:', error);
    }
  };

  const saveVoiceLibrary = (library) => {
    try {
      localStorage.setItem('phonics_voice_library', JSON.stringify(library));
      console.log('💾 Saved Voice Library:', library);
    } catch (error) {
      console.error('Error saving Voice Library:', error);
    }
  };

  const startVoiceRecording = async (type) => {
    console.log('🎙️ startVoiceRecording called with type:', type);
    console.log('🎙️ Current recording state:', currentRecording);
    console.log('🎙️ Navigator.mediaDevices available:', !!navigator.mediaDevices);
    console.log('🎙️ getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
    
    try {
      console.log('🎙️ Requesting microphone access for', type);
      
      // Check if we already have permission
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        console.log('🎙️ Microphone permission status:', permission.state);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      console.log('🎙️ Microphone access granted, stream tracks:', stream.getTracks().length);
      
      // DIAGNOSTIC 2: Setup WebAudio analyser to verify live audio signal
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let maxLevel = 0;
      let audioDetected = false;
      
      // Monitor audio levels during recording
      const levelCheck = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const currentLevel = Math.max(...dataArray);
        maxLevel = Math.max(maxLevel, currentLevel);
        if (currentLevel > 10) audioDetected = true;
        console.log('🔊 Live audio level:', currentLevel, 'max:', maxLevel);
      }, 500);
      
      // DIAGNOSTIC 3: Enhanced MIME type detection with playback verification
      const supportedMimes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus', 
        'audio/mp4',
        'audio/wav'
      ];
      
      let mimeType = '';
      let playbackMime = '';
      
      for (const mime of supportedMimes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          mimeType = mime;
          // Test if Audio element can play this format
          const testAudio = new Audio();
          const canPlay = testAudio.canPlayType(mime.split(';')[0]);
          console.log('🔍 MIME test:', mime, 'record:', true, 'playback:', canPlay);
          if (canPlay === 'probably' || canPlay === 'maybe') {
            playbackMime = mime;
            break;
          }
        }
      }
      
      if (!mimeType) mimeType = ''; // Use default
      console.log('🎙️ Selected MIME type:', mimeType, 'playback compatible:', playbackMime);
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('🎙️ Data available, size:', event.data.size);
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🎙️ Recording stopped, chunks:', audioChunks.length);
        clearInterval(levelCheck);
        
        // DIAGNOSTIC 4: Audio level verification
        console.log('🔊 Final audio stats - Max level:', maxLevel, 'Audio detected:', audioDetected);
        if (!audioDetected && maxLevel < 5) {
          console.warn('⚠️ Very low or no audio signal detected during recording!');
        }
        
        if (audioChunks.length === 0) {
          alert('❌ No audio data recorded. Please check your microphone and try again.');
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          setCurrentRecording(prev => ({ ...prev, isRecording: false, mediaRecorder: null }));
          return;
        }
        
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/wav' });
        console.log('🎙️ Created audio blob:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunks.length,
          chunkSizes: audioChunks.map(c => c.size)
        });
        
        // DIAGNOSTIC 5: Validate blob size (should be > 1KB for meaningful audio)
        const minExpectedSize = 1024; // 1KB minimum
        if (audioBlob.size < minExpectedSize) {
          console.error('❌ Blob too small:', audioBlob.size, 'expected >', minExpectedSize);
          alert(`❌ Recording failed - file too small (${audioBlob.size} bytes). Audio may not have been captured.`);
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          setCurrentRecording(prev => ({ ...prev, isRecording: false, mediaRecorder: null }));
          return;
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('🎙️ Created audio URL:', audioUrl);
        
        // DIAGNOSTIC 6: Test audio decoding capability
        try {
          const testAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await testAudioCtx.decodeAudioData(arrayBuffer);
          console.log('✅ Audio decode test successful:', {
            duration: audioBuffer.duration,
            sampleRate: audioBuffer.sampleRate,
            channels: audioBuffer.numberOfChannels,
            length: audioBuffer.length
          });
          
          // Check for silent audio (all samples near zero)
          const channelData = audioBuffer.getChannelData(0);
          const maxSample = Math.max(...channelData);
          const minSample = Math.min(...channelData);
          const peak = Math.max(Math.abs(maxSample), Math.abs(minSample));
          console.log('🔊 Audio amplitude analysis:', { maxSample, minSample, peak });
          
          if (peak < 0.001) {
            console.warn('⚠️ Audio appears to be silent (peak < 0.001)');
            alert('⚠️ Warning: Recorded audio appears to be very quiet or silent');
          }
          
          testAudioCtx.close();
        } catch (decodeError) {
          console.error('❌ Audio decode failed:', decodeError);
          alert('❌ Audio file corrupt or unsupported format: ' + decodeError.message);
        }
        
        setCurrentRecording(prev => ({
          ...prev,
          audio: audioUrl,
          blob: audioBlob,
          mimeType: mediaRecorder.mimeType || 'audio/wav',
          isRecording: false,
          mediaRecorder: null
        }));
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        console.log(`🎙️ Completed ${type} recording with format:`, mediaRecorder.mimeType);
        
        // Auto-play the recording for immediate feedback
        setTimeout(() => {
          console.log('🎙️ Auto-playing recorded audio for feedback');
          playVoiceRecording(audioUrl, 'auto-preview');
        }, 100);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('🎙️ MediaRecorder error:', event.error);
        alert('❌ Recording error: ' + event.error.message);
        stream.getTracks().forEach(track => track.stop());
        setCurrentRecording(prev => ({ ...prev, isRecording: false, mediaRecorder: null }));
      };
      
      mediaRecorder.onstart = () => {
        console.log('🎙️ MediaRecorder started successfully');
      };

      // Start recording with regular data intervals
      mediaRecorder.start(100); // Record in 100ms chunks for better data availability
      
      setCurrentRecording(prev => ({
        ...prev,
        type,
        isRecording: true,
        mediaRecorder,
        audio: null,
        blob: null
      }));
      
      console.log(`🎙️ Started ${type} recording with format:`, mimeType);
      
      // Auto-stop after 10 seconds if user doesn't manually stop
      const timeoutId = setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          console.log('🎙️ Auto-stopping recording after 10 seconds');
          mediaRecorder.stop();
        }
      }, 10000);
      
      // Store timeout ID to clear it if manually stopped
      setCurrentRecording(prev => ({ ...prev, timeoutId }));
      
    } catch (error) {
      console.error('🎙️ Error accessing microphone:', error);
      if (error.name === 'NotAllowedError') {
        alert('❌ Microphone access denied. Please allow microphone permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('❌ No microphone found. Please check your microphone connection.');
      } else {
        alert('❌ Unable to access microphone: ' + error.message);
      }
      setCurrentRecording(prev => ({ ...prev, isRecording: false, mediaRecorder: null }));
    }
  };

  const stopVoiceRecording = () => {
    console.log('🎙️ Manually stopping recording');
    
    if (currentRecording.mediaRecorder && currentRecording.mediaRecorder.state === 'recording') {
      // Clear any auto-stop timeout
      if (currentRecording.timeoutId) {
        clearTimeout(currentRecording.timeoutId);
      }
      
      currentRecording.mediaRecorder.stop();
      console.log('🎙️ Recording stopped manually');
    } else {
      console.log('🎙️ No active recording to stop');
      // Reset recording state if stuck
      setCurrentRecording(prev => ({ 
        ...prev, 
        isRecording: false, 
        mediaRecorder: null,
        timeoutId: null
      }));
    }
  };

  const saveVoiceRecording = () => {
    if (!currentRecording.audio || !currentRecording.label.trim()) {
      alert('Please provide a label and complete the recording first.');
      return;
    }

    const newRecording = {
      id: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: currentRecording.label.trim(),
      audio: currentRecording.audio,
      blob: currentRecording.blob,
      mimeType: currentRecording.mimeType || 'audio/wav',
      type: currentRecording.type,
      timestamp: new Date().toISOString(),
      assignedTo: [] // Will track lesson/phonic/word assignments
    };

    const updatedLibrary = {
      ...voiceLibrary,
      [currentRecording.type]: [...voiceLibrary[currentRecording.type], newRecording]
    };

    setVoiceLibrary(updatedLibrary);
    saveVoiceLibrary(updatedLibrary);

    // Reset recording state
    setCurrentRecording({ 
      type: currentRecording.type, 
      label: '', 
      audio: null, 
      blob: null,
      mimeType: null,
      isRecording: false, 
      mediaRecorder: null,
      timeoutId: null
    });

    console.log('💾 Saved recording with format:', newRecording.mimeType);
    alert(`✅ ${currentRecording.type} recording saved successfully!`);
  };

  const deleteVoiceRecording = (type, recordingId) => {
    if (confirm('Are you sure you want to delete this recording?')) {
      const updatedLibrary = {
        ...voiceLibrary,
        [type]: voiceLibrary[type].filter(recording => recording.id !== recordingId)
      };
      setVoiceLibrary(updatedLibrary);
      saveVoiceLibrary(updatedLibrary);
    }
  };

  // KNOWN-GOOD REFERENCE IMPLEMENTATION
  const knownGoodRecording = async () => {
    console.log('🧪 Starting known-good recording implementation');
    
    try {
      // Step 1: Request microphone with optimal settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          volume: 1.0
        }
      });
      
      // Step 2: Verify audio track
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) throw new Error('No audio tracks available');
      
      console.log('🧪 Audio track:', {
        label: audioTracks[0].label,
        enabled: audioTracks[0].enabled,
        muted: audioTracks[0].muted
      });
      
      // Step 3: Select best MIME type with playback verification
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav'
      ];
      
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          const testAudio = new Audio();
          const playSupport = testAudio.canPlayType(mime.split(';')[0]);
          console.log('🧪 MIME test:', mime, 'record: ✓', 'play:', playSupport);
          if (playSupport === 'probably' || playSupport === 'maybe') {
            selectedMime = mime;
            break;
          }
        }
      }
      
      if (!selectedMime) selectedMime = ''; // Use browser default
      console.log('🧪 Selected MIME:', selectedMime);
      
      // Step 4: Setup MediaRecorder
      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : {});
      const chunks = [];
      
      // Step 5: Setup WebAudio level monitoring
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let maxLevel = 0;
      
      const levelMonitor = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const currentLevel = Math.max(...dataArray);
        maxLevel = Math.max(maxLevel, currentLevel);
        console.log('🧪 Audio level:', currentLevel);
      }, 200);
      
      // Step 6: Recording event handlers
      recorder.ondataavailable = (event) => {
        console.log('🧪 Data chunk:', event.data.size, 'bytes');
        if (event.data.size > 0) chunks.push(event.data);
      };
      
      recorder.onstop = async () => {
        clearInterval(levelMonitor);
        audioContext.close();
        stream.getTracks().forEach(track => track.stop());
        
        console.log('🧪 Recording complete. Chunks:', chunks.length, 'Max level:', maxLevel);
        
        if (chunks.length === 0) {
          alert('❌ No audio data recorded');
          return;
        }
        
        // Step 7: Create and validate blob
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/wav' });
        console.log('🧪 Blob created:', {
          size: blob.size,
          type: blob.type,
          sizeMB: (blob.size / 1024 / 1024).toFixed(2)
        });
        
        if (blob.size < 1024) {
          alert('❌ Recording too small (< 1KB)');
          return;
        }
        
        // Step 8: Test audio decoding
        try {
          const testContext = new (window.AudioContext || window.webkitAudioContext)();
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await testContext.decodeAudioData(arrayBuffer);
          
          console.log('🧪 Decode test successful:', {
            duration: audioBuffer.duration,
            channels: audioBuffer.numberOfChannels,
            sampleRate: audioBuffer.sampleRate
          });
          
          // Check for silence
          const samples = audioBuffer.getChannelData(0);
          const peak = Math.max(...samples.map(Math.abs));
          console.log('🧪 Audio peak amplitude:', peak);
          
          testContext.close();
          
          if (peak < 0.001) {
            alert('⚠️ Audio appears silent (peak < 0.001)');
            return;
          }
        } catch (decodeError) {
          console.error('🧪 Decode failed:', decodeError);
          alert('❌ Audio decode failed: ' + decodeError.message);
          return;
        }
        
        // Step 9: Test playback
        const url = URL.createObjectURL(blob);
        const audio = new Audio();
        
        audio.volume = 1.0;
        audio.muted = false;
        audio.preload = 'auto';
        
        audio.oncanplay = async () => {
          console.log('🧪 Audio ready for playback');
          try {
            await audio.play();
            console.log('🧪 ✅ Known-good test SUCCESSFUL!');
            alert('✅ Known-good recording test successful! Audio recorded and played back correctly.');
          } catch (playError) {
            console.error('🧪 Playback failed:', playError);
            alert('❌ Playback failed: ' + playError.message);
          }
        };
        
        audio.onerror = (error) => {
          console.error('🧪 Audio error:', error);
          alert('❌ Audio playback error');
        };
        
        audio.src = url;
      };
      
      // Step 10: Start recording
      console.log('🧪 Starting 3-second recording...');
      alert('🧪 Known-good test: Recording for 3 seconds, please speak...');
      
      recorder.start(100); // 100ms chunks
      
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 3000);
      
    } catch (error) {
      console.error('🧪 Known-good test failed:', error);
      alert('❌ Known-good test failed: ' + error.message);
    }
  };

  const playVoiceRecording = (audioUrl, recordingId) => {
    console.log(`🔊 Attempting to play: ${recordingId}`, audioUrl);
    
    if (playingAudio === recordingId) {
      // Stop current audio
      setPlayingAudio(null);
      document.querySelectorAll('audio').forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      console.log('🔊 Stopped current audio');
      return;
    }

    // Stop any currently playing audio
    if (playingAudio) {
      document.querySelectorAll('audio').forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    }

    try {
      const audio = new Audio();
      
      // ENHANCED AUDIO SETUP
      audio.volume = 1.0;  // Full volume
      audio.muted = false; // Ensure not muted
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous'; // Handle CORS if needed
      
      console.log('🔊 Audio element configured:', {
        volume: audio.volume,
        muted: audio.muted,
        preload: audio.preload
      });
      
      // COMPREHENSIVE EVENT LOGGING
      audio.onloadstart = () => {
        console.log('🔊 Load started for:', recordingId);
      };
      
      audio.onloadedmetadata = () => {
        console.log('🔊 Metadata loaded:', {
          duration: audio.duration,
          readyState: audio.readyState,
          networkState: audio.networkState,
          volume: audio.volume,
          muted: audio.muted
        });
      };
      
      audio.oncanplay = async () => {
        console.log('🔊 Can play audio:', recordingId, 'duration:', audio.duration);
        
        if (audio.duration === 0 || isNaN(audio.duration)) {
          console.error('🔊 Invalid duration detected');
          alert('❌ Audio file appears to have no duration');
          return;
        }
        
        setPlayingAudio(recordingId);
        
        try {
          const playPromise = audio.play();
          console.log('🔊 Play promise created');
          
          await playPromise;
          console.log('🔊 ✅ Playback started successfully');
          
        } catch (playError) {
          console.error('🔊 Play failed:', playError);
          setPlayingAudio(null);
          
          // Specific error handling
          if (playError.name === 'NotAllowedError') {
            alert('❌ Playback blocked by browser. Click to allow audio playback.');
          } else if (playError.name === 'NotSupportedError') {
            alert('❌ Audio format not supported by your browser');
          } else {
            alert('❌ Playback error: ' + playError.message);
          }
        }
      };
      
      audio.onplaying = () => {
        console.log('🔊 Audio is now playing');
      };
      
      audio.ontimeupdate = () => {
        if (audio.currentTime > 0) {
          console.log('🔊 Time:', audio.currentTime.toFixed(2), '/', audio.duration?.toFixed(2));
        }
      };
      
      audio.onended = () => {
        console.log('🔊 ✅ Playback completed:', recordingId);
        setPlayingAudio(null);
      };
      
      audio.onerror = (event) => {
        console.error('🔊 Audio error for:', recordingId, {
          error: audio.error,
          code: audio.error?.code,
          message: audio.error?.message,
          networkState: audio.networkState,
          readyState: audio.readyState
        });
        
        setPlayingAudio(null);
        
        // Decode error codes
        let errorMsg = 'Unknown audio error';
        if (audio.error?.code === 1) errorMsg = 'Audio loading aborted';
        if (audio.error?.code === 2) errorMsg = 'Network error loading audio';
        if (audio.error?.code === 3) errorMsg = 'Audio decoding error - format not supported';
        if (audio.error?.code === 4) errorMsg = 'Audio format not supported';
        
        alert('❌ ' + errorMsg);
      };
      
      audio.onabort = () => {
        console.log('🔊 Audio loading aborted:', recordingId);
        setPlayingAudio(null);
      };
      
      audio.onstalled = () => {
        console.log('🔊 Audio loading stalled:', recordingId);
      };
      
      audio.onwaiting = () => {
        console.log('🔊 Audio waiting for data:', recordingId);
      };
      
      // Set source and begin loading
      console.log('🔊 Setting audio source:', audioUrl);
      audio.src = audioUrl;
      audio.load(); // Explicitly trigger loading
      
    } catch (error) {
      console.error('🔊 Error creating audio element:', error);
      setPlayingAudio(null);
      alert('❌ Unable to create audio player: ' + error.message);
    }
  };

  const assignRecordingToContent = (recordingId, contentType, contentId) => {
    // This function will be used to assign recordings to lessons/phonics/words
    console.log(`Assigning recording ${recordingId} to ${contentType}: ${contentId}`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="text-center">
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="text-center">
          <h1 className="font-display text-4xl text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-700 mb-4">
            You must be logged in as an administrator to access this page.
          </p>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-brand-blue" style={{fontSize: '36px'}}>Admin Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          style={{fontSize: '24px'}}
        >
          Logout
        </button>
      </div>
      
      <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-6">
        <p className="font-medium" style={{fontSize: '22px'}}>✅ Authentication Successful</p>
        <p style={{fontSize: '16px'}}>You are logged in as an administrator.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 overflow-x-auto">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`py-2 px-4 border-b-2 font-medium transition-all duration-200 whitespace-nowrap ${
                activeView === 'dashboard'
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-blue-600 hover:text-blue-800 hover:border-blue-300 bg-blue-50 hover:bg-blue-100'
              }`}
              style={{fontSize: '24px'}}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveView('lessons')}
              className={`py-2 px-4 border-b-2 font-medium transition-all duration-200 whitespace-nowrap ${
                activeView === 'lessons'
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-blue-600 hover:text-blue-800 hover:border-blue-300 bg-blue-50 hover:bg-blue-100'
              }`}
              style={{fontSize: '24px'}}
            >
              📚 Lessons
            </button>
            <button
              onClick={() => setActiveView('users')}
              className={`py-2 px-4 border-b-2 font-medium transition-all duration-200 whitespace-nowrap ${
                activeView === 'users'
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-blue-600 hover:text-blue-800 hover:border-blue-300 bg-blue-50 hover:bg-blue-100'
              }`}
              style={{fontSize: '24px'}}
            >
              👥 Users
            </button>
            <button
              onClick={() => setActiveView('media')}
              className={`py-2 px-4 border-b-2 font-medium transition-all duration-200 whitespace-nowrap ${
                activeView === 'media'
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-blue-600 hover:text-blue-800 hover:border-blue-300 bg-blue-50 hover:bg-blue-100'
              }`}
              style={{fontSize: '24px'}}
            >
              🎵 Media Library
            </button>
            <button
              onClick={() => window.open('/admin/voice-library', '_blank')}
              className="py-2 px-4 border-b-2 font-medium transition-all duration-200 whitespace-nowrap border-transparent text-blue-600 hover:text-blue-800 hover:border-blue-300 bg-blue-50 hover:bg-blue-100"
              style={{fontSize: '24px'}}
              title="Open Voice Library in new tab"
            >
              🎙️ Voice Library
            </button>
            <button
              onClick={() => setActiveView('recordings')}
              className={`py-2 px-4 border-b-2 font-medium transition-all duration-200 whitespace-nowrap ${
                activeView === 'recordings'
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-blue-600 hover:text-blue-800 hover:border-blue-300 bg-blue-50 hover:bg-blue-100'
              }`}
              style={{fontSize: '24px'}}
            >
              🔊 Recordings ({savedRecordings.length})
            </button>
            <button
              onClick={() => setActiveView('focus')}
              className={`py-2 px-4 border-b-2 font-medium transition-all duration-200 whitespace-nowrap ${
                activeView === 'focus'
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-blue-600 hover:text-blue-800 hover:border-blue-300 bg-blue-50 hover:bg-blue-100'
              }`}
              style={{fontSize: '24px'}}
            >
              🎯 Focus Manager
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`py-2 px-4 border-b-2 font-medium transition-all duration-200 whitespace-nowrap ${
                activeView === 'analytics'
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-blue-600 hover:text-blue-800 hover:border-blue-300 bg-blue-50 hover:bg-blue-100'
              }`}
              style={{fontSize: '24px'}}
            >
              📈 Analytics
            </button>
          </nav>
        </div>
      </div>

      {/* Dashboard Overview */}
      {activeView === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600" style={{fontSize: '16px'}}>Total Lessons</p>
                  <p className="text-3xl font-bold text-blue-600">{lessonsList.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <span style={{fontSize: '24px'}}>📚</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600" style={{fontSize: '16px'}}>Active Users</p>
                  <p className="text-3xl font-bold text-green-600">{usersList.filter(u => u.role === 'student').length}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <span style={{fontSize: '24px'}}>👥</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600" style={{fontSize: '16px'}}>Pending Recordings</p>
                  <p className="text-3xl font-bold text-orange-600">{savedRecordings.length}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <span style={{fontSize: '24px'}}>🔊</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600" style={{fontSize: '16px'}}>Media Files</p>
                  <p className="text-3xl font-bold text-purple-600">{uploadedMedia.length}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <span style={{fontSize: '24px'}}>🎵</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800 mb-4" style={{fontSize: '26px'}}>Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  setEditingLesson(null);
                  setLessonForm({
                    title: '',
                    summary: '',
                    text: '',
                    phonics: [],
                    missingPhonic: '',
                    difficulty: 'beginner',
                    pages: [],
                    audioFiles: [],
                    imageFiles: [],
                    wordRecordings: { mainText: {}, pages: {} }
                  });
                  setActiveView('lesson-editor');
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg transition-all duration-200 flex flex-col items-center gap-2"
              >
                <span style={{fontSize: '32px'}}>➕</span>
                <span style={{fontSize: '22px'}}>Create Lesson</span>
              </button>

              <button
                onClick={() => setActiveView('users')}
                className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg transition-all duration-200 flex flex-col items-center gap-2"
              >
                <span style={{fontSize: '32px'}}>👤</span>
                <span style={{fontSize: '22px'}}>Manage Users</span>
              </button>

              <button
                onClick={() => setActiveView('media')}
                className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-lg transition-all duration-200 flex flex-col items-center gap-2"
              >
                <span style={{fontSize: '32px'}}>📁</span>
                <span style={{fontSize: '22px'}}>Upload Media</span>
              </button>

              <button
                onClick={() => setActiveView('recordings')}
                className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-lg transition-all duration-200 flex flex-col items-center gap-2"
              >
                <span style={{fontSize: '32px'}}>🎧</span>
                <span style={{fontSize: '22px'}}>Review Audio</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800 mb-4" style={{fontSize: '26px'}}>Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span style={{fontSize: '20px'}}>📚</span>
                <div>
                  <p style={{fontSize: '22px'}} className="text-gray-800">New lesson "Phonics Practice" created</p>
                  <p style={{fontSize: '16px'}} className="text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span style={{fontSize: '20px'}}>👤</span>
                <div>
                  <p style={{fontSize: '22px'}} className="text-gray-800">Student "Sarah Johnson" completed Lesson 3</p>
                  <p style={{fontSize: '16px'}} className="text-gray-500">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span style={{fontSize: '20px'}}>🔊</span>
                <div>
                  <p style={{fontSize: '22px'}} className="text-gray-800">New recording submitted for review</p>
                  <p style={{fontSize: '16px'}} className="text-gray-500">6 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Management View */}
      {activeView === 'lessons' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 style={{fontSize: '26px'}} className="font-semibold text-gray-800">Lesson Management</h2>
              <p style={{fontSize: '22px'}} className="mt-2 text-gray-700">
                Manage phonics lessons with interactive features and recording capabilities.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingLesson(null);
                setLessonForm({
                  title: '',
                  summary: '',
                  text: '',
                  phonics: [],
                  missingPhonic: '',
                  difficulty: 'beginner',
                  pages: [],
                  audioFiles: [],
                  imageFiles: [],
                  wordRecordings: { mainText: {}, pages: {} }
                });
                setActiveView('lesson-editor');
              }}
              className="btn-multicolor flex items-center gap-2"
              style={{fontSize: '24px'}}
            >
              ➕ Create New Lesson
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessonsList.map((lesson) => (
              <div key={lesson.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 style={{fontSize: '22px'}} className="font-medium text-gray-800">{lesson.title}</h3>
                    <p style={{fontSize: '16px'}} className="text-gray-500">Order: {lesson.order}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    lesson.difficulty === 'beginner' 
                      ? 'bg-green-100 text-green-800'
                      : lesson.difficulty === 'intermediate'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {lesson.difficulty}
                  </span>
                </div>
                
                <p style={{fontSize: '22px'}} className="text-gray-600 mb-3">{lesson.summary}</p>
                
                {/* Interactive Lesson Text Preview */}
                {lesson.text && (
                  <div className="mb-3">
                    <h4 style={{fontSize: '14px'}} className="font-medium text-gray-700 mb-2">Lesson Text Preview:</h4>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm max-h-24 overflow-y-auto">
                      {lesson.text.split(' ').map((word, wordIndex) => {
                        const cleanWord = word.replace(/[.,!?;]/, '');
                        const isValidWord = /^[a-zA-Z]+$/.test(cleanWord);
                        const hasRecording = lesson.wordRecordings?.mainText?.[wordIndex];
                        
                        if (!isValidWord) {
                          return <span key={wordIndex} className="text-gray-600">{word} </span>;
                        }
                        
                        return (
                          <span
                            key={wordIndex}
                            className={`cursor-pointer transition-colors duration-200 ${
                              hasRecording 
                                ? 'text-blue-600 bg-blue-100 px-1 rounded hover:bg-blue-200' 
                                : 'text-gray-700 hover:text-blue-500'
                            }`}
                            onClick={() => {
                              if (hasRecording && hasRecording.audio) {
                                const audio = new Audio(hasRecording.audio);
                                audio.play().catch(console.error);
                              }
                            }}
                            title={hasRecording ? `Click to hear "${cleanWord}" 🎤` : `"${cleanWord}" - No recording yet`}
                          >
                            {word}{hasRecording && <span className="text-xs ml-0.5">🎤</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="mb-4">
                  <h4 style={{fontSize: '16px'}} className="font-medium text-gray-700 mb-2">Phonics:</h4>
                  <div className="flex flex-wrap gap-1">
                    {lesson.phonics?.map((phonic, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {phonic}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 style={{fontSize: '16px'}} className="font-medium text-gray-700 mb-1">Missing Phonic:</h4>
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                    {lesson.missingPhonic || 'Not set'}
                  </span>
                </div>

                {/* Word Recordings Summary */}
                <div className="mb-4">
                  <h4 style={{fontSize: '16px'}} className="font-medium text-gray-700 mb-2">🎤 Recorded Words:</h4>
                  {lesson.wordRecordings && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Main Text:</span>
                        <span className="text-blue-600 font-medium">
                          {Object.keys(lesson.wordRecordings.mainText || {}).length} recorded
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Practice Pages:</span>
                        <span className="text-blue-600 font-medium">
                          {Object.values(lesson.wordRecordings.pages || {}).reduce((total, page) => total + Object.keys(page || {}).length, 0)} recorded
                        </span>
                      </div>
                      
                      {/* Show recorded words preview */}
                      {Object.keys(lesson.wordRecordings.mainText || {}).length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">Preview recorded words:</div>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                            {Object.entries(lesson.wordRecordings.mainText || {}).slice(0, 8).map(([wordIndex, recording]) => (
                              <button
                                key={wordIndex}
                                onClick={() => {
                                  if (recording.audio) {
                                    const audio = new Audio(recording.audio);
                                    audio.play().catch(console.error);
                                  }
                                }}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-xs flex items-center gap-1 transition-colors duration-200"
                                title={`Click to hear "${recording.word}"`}
                              >
                                {recording.word}
                                <span className="text-blue-500">🎤</span>
                              </button>
                            ))}
                            {Object.keys(lesson.wordRecordings.mainText || {}).length > 8 && (
                              <span className="text-xs text-gray-400 px-1">
                                +{Object.keys(lesson.wordRecordings.mainText).length - 8} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!lesson.wordRecordings || (Object.keys(lesson.wordRecordings.mainText || {}).length === 0 && Object.keys(lesson.wordRecordings.pages || {}).length === 0) && (
                    <p className="text-xs text-gray-400 italic">No words recorded yet</p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setEditingLesson(lesson);
                      setLessonForm({
                        title: lesson.title || '',
                        summary: lesson.summary || '',
                        text: lesson.text || '',
                        phonics: lesson.phonics || [],
                        missingPhonic: lesson.missingPhonic || '',
                        difficulty: lesson.difficulty || 'beginner',
                        pages: lesson.pages || [],
                        audioFiles: lesson.audioFiles || [],
                        imageFiles: lesson.imageFiles || [],
                        wordRecordings: lesson.wordRecordings || { mainText: {}, pages: {} }
                      });
                      setActiveView('lesson-editor');
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-all duration-200"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setSelectedLesson(lesson)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-all duration-200"
                  >
                    🚀 Preview
                  </button>
                  <button
                    onClick={() => {
                      setEditingLesson(lesson);
                      setLessonForm({
                        title: lesson.title || '',
                        summary: lesson.summary || '',
                        text: lesson.text || '',
                        phonics: lesson.phonics || [],
                        missingPhonic: lesson.missingPhonic || '',
                        difficulty: lesson.difficulty || 'beginner',
                        pages: lesson.pages || [],
                        audioFiles: lesson.audioFiles || [],
                        imageFiles: lesson.imageFiles || [],
                        wordRecordings: lesson.wordRecordings || { mainText: {}, pages: {} }
                      });
                      setActiveView('lesson-editor');
                      // Scroll to word recording section after a brief delay
                      setTimeout(() => {
                        const recordingSection = document.querySelector('[data-section="word-recordings"]');
                        if (recordingSection) {
                          recordingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 300);
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm transition-all duration-200"
                    title="Jump to word recording interface"
                  >
                    🎤 Record Words
                  </button>
                  <button
                    onClick={() => handleDeleteLesson(lesson.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-all duration-200"
                  >
                    🗑️ Delete
                  </button>
                  {lesson.wordRecordings && Object.keys(lesson.wordRecordings.mainText || {}).length > 0 && (
                    <button
                      onClick={async () => {
                        // Play all recorded words in sequence
                        const recordings = Object.values(lesson.wordRecordings.mainText || {});
                        for (let i = 0; i < recordings.length; i++) {
                          if (recordings[i].audio) {
                            const audio = new Audio(recordings[i].audio);
                            await new Promise(resolve => {
                              audio.onended = resolve;
                              audio.onerror = resolve;
                              audio.play().catch(resolve);
                            });
                            // Small pause between words
                            await new Promise(resolve => setTimeout(resolve, 300));
                          }
                        }
                      }}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition-all duration-200"
                      title="Play all recorded words in sequence"
                    >
                      🎵 Play All
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedLesson && (
            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
              <button
                onClick={() => setSelectedLesson(null)}
                className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
                style={{fontSize: '22px'}}
              >
                ← Back to Lessons
              </button>
              <PhonicsLesson 
                lesson={selectedLesson} 
                onComplete={handleLessonComplete}
              />
            </div>
          )}
        </div>
      )}

      {/* Enhanced Lesson Editor */}
      {activeView === 'lesson-editor' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 style={{fontSize: '26px'}} className="font-semibold text-gray-800">
                {editingLesson ? `Edit: ${editingLesson.title}` : 'Create New Lesson'}
              </h2>
              <p style={{fontSize: '22px'}} className="text-gray-600">
                Build interactive phonics lessons with audio and visual elements
              </p>
            </div>
            <button
              onClick={() => setActiveView('lessons')}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
              style={{fontSize: '22px'}}
            >
              ← Back to Lessons
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label style={{fontSize: '24px'}} className="block font-medium text-gray-700 mb-2">
                  Lesson Title
                </label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) => updateLessonForm('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{fontSize: '22px'}}
                  placeholder="Enter lesson title"
                />
              </div>
              
              <div>
                <label style={{fontSize: '24px'}} className="block font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={lessonForm.difficulty}
                  onChange={(e) => updateLessonForm('difficulty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{fontSize: '22px'}}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Summary */}
            <div>
              <label style={{fontSize: '24px'}} className="block font-medium text-gray-700 mb-2">
                Lesson Summary
              </label>
              <textarea
                value={lessonForm.summary}
                onChange={(e) => updateLessonForm('summary', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{fontSize: '22px'}}
                placeholder="Brief description of the lesson"
              />
            </div>

            {/* Lesson Text */}
            <div>
              <label style={{fontSize: '24px'}} className="block font-medium text-gray-700 mb-2">
                Lesson Text
                <span style={{fontSize: '16px'}} className="text-gray-500 ml-2">
                  (Words will be interactive - mouse rollover will read them)
                </span>
              </label>
              <textarea
                value={lessonForm.text}
                onChange={(e) => updateLessonForm('text', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{fontSize: '22px'}}
                placeholder="Enter the lesson text with words students will practice"
              />
              
              {/* Read Along Phonic for Main Text */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Read Along Phonic (plays sound on hover):
                </label>
                <input
                  type="text"
                  value={lessonForm.readAlongPhonic || ''}
                  onChange={(e) => updateLessonForm('readAlongPhonic', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  style={{fontSize: '16px'}}
                  placeholder="e.g., 'ph', 'th', 'sh' - this sound will play when hovering over words containing it"
                />
                {lessonForm.readAlongPhonic && (
                  <p className="text-xs text-green-600 mb-2">
                    🎵 Words containing "{lessonForm.readAlongPhonic}" will play the phonic sound on hover
                  </p>
                )}
                
                {/* Custom Display Text for Read Along */}
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Display Text (shown below highlighted words):
                </label>
                <input
                  type="text"
                  value={lessonForm.readAlongDisplayText || ''}
                  onChange={(e) => updateLessonForm('readAlongDisplayText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{fontSize: '16px'}}
                  placeholder="e.g., 'Focus on the ph sound', 'Listen for the digraph' - appears below green words"
                />
                {lessonForm.readAlongDisplayText && (
                  <p className="text-xs text-blue-600 mt-1">
                    📝 Will display: "{lessonForm.readAlongDisplayText}" below highlighted words in student area
                  </p>
                )}
              </div>

              {/* Main Text Word Recording Section */}
              {lessonForm.text && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg" data-section="word-recordings">
                  <h4 className="text-lg font-medium text-blue-800 mb-3">🎤 Record Individual Words (Main Text)</h4>
                  <p className="text-sm text-blue-600 mb-4">Record your voice for each word to replace synthetic speech. Students will hear your recordings on hover.</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {lessonForm.text.split(' ').map((word, wordIndex) => {
                      const cleanWord = word.replace(/[.,!?;]/, '');
                      const isValidWord = /^[a-zA-Z]+$/.test(cleanWord) && cleanWord.length > 0;
                      const isRecorded = lessonForm.wordRecordings?.mainText?.[wordIndex];
                      const isCurrentlyRecording = isRecordingAllWords && 
                        recordingAllWordsInfo.section === 'mainText' && 
                        recordingAllWordsInfo.wordIndex === wordIndex;

                      if (!isValidWord) return null;

                      return (
                        <div key={wordIndex} className="bg-white border border-gray-200 rounded-lg p-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">{cleanWord}</span>
                            <button
                              onClick={() => {
                                if (isCurrentlyRecording) {
                                  stopAllWordsRecording();
                                } else {
                                  startAllWordsRecording('mainText', null, wordIndex, cleanWord);
                                }
                              }}
                              className={`px-2 py-1 rounded text-xs ${
                                isCurrentlyRecording 
                                  ? 'bg-red-500 text-white' 
                                  : 'bg-green-500 hover:bg-green-600 text-white'
                              }`}
                            >
                              {isCurrentlyRecording ? '🛑 Stop' : '🎤 Record'}
                            </button>
                            {isRecorded && (
                              <button
                                onClick={() => {
                                  const audio = new Audio(isRecorded.audio);
                                  audio.play();
                                }}
                                className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
                              >
                                ▶️ Play
                              </button>
                            )}
                          </div>
                          {isRecorded && (
                            <p className="text-xs text-green-600 mt-1">
                              ✅ Recorded {new Date(isRecorded.timestamp).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {lessonForm.text.split(' ').filter(word => /^[a-zA-Z]+$/.test(word.replace(/[.,!?;]/, ''))).length === 0 && (
                    <p className="text-gray-500 text-sm">Enter lesson text above to see word recording options.</p>
                  )}
                </div>
              )}
            </div>

            {/* Recording Summary Panel */}
            {(lessonForm.text || (lessonForm.pages && lessonForm.pages.length > 0)) && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="text-lg font-medium text-blue-800 mb-3">📊 Recording Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Main Text Summary */}
                  {lessonForm.text && (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <h5 className="font-medium text-gray-700 mb-2">Main Text</h5>
                      {(() => {
                        const words = lessonForm.text.split(' ').filter(word => 
                          /^[a-zA-Z]+$/.test(word.replace(/[.,!?;]/, ''))
                        );
                        const recordedCount = Object.keys(lessonForm.wordRecordings?.mainText || {}).length;
                        return (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {recordedCount} / {words.length} words recorded
                            </span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{width: words.length ? `${(recordedCount / words.length) * 100}%` : '0%'}}
                              ></div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  {/* Pages Summary */}
                  {lessonForm.pages && lessonForm.pages.length > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-green-100">
                      <h5 className="font-medium text-gray-700 mb-2">Practice Sentences</h5>
                      {(() => {
                        let totalWords = 0;
                        let totalRecorded = 0;
                        
                        lessonForm.pages.forEach((page, index) => {
                          if (page.content) {
                            const words = page.content.split(' ').filter(word => 
                              /^[a-zA-Z]+$/.test(word.replace(/[.,!?;]/, ''))
                            );
                            totalWords += words.length;
                            totalRecorded += Object.keys(lessonForm.wordRecordings?.pages?.[index] || {}).length;
                          }
                        });
                        
                        return (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {totalRecorded} / {totalWords} words recorded
                            </span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{width: totalWords ? `${(totalRecorded / totalWords) * 100}%` : '0%'}}
                              ></div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                
                <div className="mt-3 text-xs text-gray-600">
                  💡 <strong>Playback Priority:</strong> Your recordings → Phonic sounds → Synthetic voice
                </div>
              </div>
            )}

            {/* Individual Practice Sentences */}
            <div className="border-t border-gray-200 pt-6">
              <h3 style={{fontSize: '24px'}} className="font-medium text-gray-700 mb-4">Practice Sentences</h3>
              <p style={{fontSize: '16px'}} className="text-gray-600 mb-4">
                Add individual sentences that students will practice. Each sentence will have its own play button and interactive word hovering. You can make words "missing" so students must record them.
              </p>
              
              <div className="space-y-6">
                {(lessonForm.pages || []).map((page, index) => {
                  const sentenceState = practiceSentencesState[index] || { missingWords: {}, recordedWords: {} };
                  const words = (page.content || '').split(' ');
                  
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center gap-3 mb-3">
                        <label style={{fontSize: '18px'}} className="font-medium text-gray-700">
                          Sentence {index + 1}:
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const newPages = lessonForm.pages.filter((_, i) => i !== index);
                            updateLessonForm('pages', newPages);
                            // Clean up sentence state
                            setPracticeSentencesState(prev => {
                              const newState = {...prev};
                              delete newState[index];
                              return newState;
                            });
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <textarea
                        value={page.content || ''}
                        onChange={(e) => {
                          const newPages = [...lessonForm.pages];
                          newPages[index] = {
                            ...newPages[index],
                            id: newPages[index].id || `page-${index + 1}`,
                            content: e.target.value,
                            focus: lessonForm.missingPhonic,
                            completed: false
                          };
                          updateLessonForm('pages', newPages);
                        }}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                        style={{fontSize: '18px'}}
                        placeholder="Enter a practice sentence..."
                      />

                      {/* Focus Phonic Input */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Focus Phonic (not spoken on hover):
                        </label>
                        <input
                          type="text"
                          value={page.focusPhonic || ''}
                          onChange={(e) => {
                            const newPages = [...lessonForm.pages];
                            newPages[index] = {
                              ...newPages[index],
                              focusPhonic: e.target.value
                            };
                            updateLessonForm('pages', newPages);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{fontSize: '16px'}}
                          placeholder="e.g., 'ph', 'th', 'sh'"
                        />
                        {page.focusPhonic && (
                          <p className="text-xs text-blue-600 mt-1">
                            🎯 Students will focus on the "{page.focusPhonic}" sound (not spoken on hover)
                          </p>
                        )}
                      </div>

                      {/* Interactive Word Management for Practice Sentences */}
                      {page.content && (
                        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                          <h5 style={{fontSize: '16px'}} className="font-medium text-gray-700 mb-2">
                            Word Management (click to toggle missing/interactive):
                          </h5>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {words.map((word, wordIndex) => {
                              const isMissing = sentenceState.missingWords[wordIndex];
                              const isRecorded = sentenceState.recordedWords[wordIndex] || page.adminRecordings?.[wordIndex];
                              const cleanWord = word.replace(/[.,!?;]/, '');
                              const isCurrentlyRecording = isRecordingPracticeWord && 
                                recordingPracticeInfo.sentenceIndex === index && 
                                recordingPracticeInfo.wordIndex === wordIndex;
                              
                              return (
                                <div key={wordIndex} className="inline-block">
                                  <button
                                    onClick={() => {
                                      const newState = {...sentenceState};
                                      if (isMissing) {
                                        // Remove from missing words
                                        delete newState.missingWords[wordIndex];
                                      } else {
                                        // Add to missing words
                                        newState.missingWords = {...newState.missingWords, [wordIndex]: cleanWord};
                                      }
                                      
                                      setPracticeSentencesState(prev => ({
                                        ...prev,
                                        [index]: newState
                                      }));

                                      // Update lesson form
                                      const newPages = [...lessonForm.pages];
                                      newPages[index].missingWords = newState.missingWords;
                                      updateLessonForm('pages', newPages);
                                    }}
                                    onMouseEnter={() => {
                                      // Audio disabled - only teacher recordings supported
                                    }}
                                    className={`px-2 py-1 rounded border-2 transition-all duration-200 text-sm ${
                                      isMissing 
                                        ? 'border-red-300 bg-red-100 text-red-700' 
                                        : isRecorded
                                        ? 'border-green-300 bg-green-100 text-green-700'
                                        : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                    }`}
                                    title={
                                      isMissing 
                                        ? 'Missing word - click to make interactive' 
                                        : 'Interactive word - click to make missing'
                                    }
                                  >
                                    {isMissing ? '___' : word}
                                    {isRecorded && <span className="text-xs ml-1">🎤</span>}
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {/* Missing Words Recording Section */}
                          {Object.keys(sentenceState.missingWords).length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                              <h6 className="text-sm font-medium text-yellow-800 mb-2">Missing Words - Record Pronunciations:</h6>
                              <div className="space-y-2">
                                {Object.entries(sentenceState.missingWords).map(([wordIndex, word]) => {
                                  const isRecorded = sentenceState.recordedWords[wordIndex] || page.adminRecordings?.[wordIndex];
                                  const isCurrentlyRecording = isRecordingPracticeWord && 
                                    recordingPracticeInfo.sentenceIndex === index && 
                                    recordingPracticeInfo.wordIndex === parseInt(wordIndex);
                                  
                                  return (
                                    <div key={wordIndex} className="flex items-center justify-between bg-white rounded p-2">
                                      <span className="text-sm font-medium">
                                        Position {parseInt(wordIndex) + 1}: "{word}"
                                        {isRecorded && <span className="ml-2 text-xs bg-green-100 text-green-600 px-1 py-0.5 rounded">✓ Recorded</span>}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            if (isCurrentlyRecording) {
                                              stopPracticeWordRecording();
                                            } else {
                                              startPracticeWordRecording(index, parseInt(wordIndex), word);
                                            }
                                          }}
                                          className={`px-2 py-1 rounded text-xs ${
                                            isCurrentlyRecording
                                              ? 'bg-red-500 text-white'
                                              : 'bg-green-500 hover:bg-green-600 text-white'
                                          }`}
                                          disabled={!audioSupport?.canRecord}
                                        >
                                          {isCurrentlyRecording ? '⏹️ Stop' : '🎤 Record'}
                                        </button>
                                        {isRecorded && (
                                          <button
                                            onClick={() => {
                                              const recording = sentenceState.recordedWords[wordIndex] || page.adminRecordings?.[wordIndex];
                                              if (recording?.audio) {
                                                const audio = new Audio(recording.audio);
                                                audio.play();
                                              }
                                            }}
                                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
                                          >
                                            ▶️ Play
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {isRecordingPracticeWord && recordingPracticeInfo.sentenceIndex === index && (
                                <div className="mt-2 text-sm text-red-600 animate-pulse">
                                  🔴 Recording word... Click stop when finished.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Page Word Recording Section */}
                      {page.content && (
                        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <h5 className="text-md font-medium text-purple-800 mb-3">🎤 Record Individual Words (Sentence {index + 1})</h5>
                          <p className="text-sm text-purple-600 mb-4">Record your voice for each word in this sentence to replace synthetic speech.</p>
                          
                          <div className="flex flex-wrap gap-2">
                            {page.content.split(' ').map((word, wordIndex) => {
                              const cleanWord = word.replace(/[.,!?;]/, '');
                              const isValidWord = /^[a-zA-Z]+$/.test(cleanWord) && cleanWord.length > 0;
                              const isRecorded = lessonForm.wordRecordings?.pages?.[index]?.[wordIndex];
                              const isCurrentlyRecording = isRecordingAllWords && 
                                recordingAllWordsInfo.section === 'pages' && 
                                recordingAllWordsInfo.pageIndex === index &&
                                recordingAllWordsInfo.wordIndex === wordIndex;

                              if (!isValidWord) return null;

                              return (
                                <div key={wordIndex} className="bg-white border border-gray-200 rounded-lg p-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-700">{cleanWord}</span>
                                    <button
                                      onClick={() => {
                                        if (isCurrentlyRecording) {
                                          stopAllWordsRecording();
                                        } else {
                                          startAllWordsRecording('pages', index, wordIndex, cleanWord);
                                        }
                                      }}
                                      className={`px-2 py-1 rounded text-xs ${
                                        isCurrentlyRecording 
                                          ? 'bg-red-500 text-white' 
                                          : 'bg-green-500 hover:bg-green-600 text-white'
                                      }`}
                                    >
                                      {isCurrentlyRecording ? '🛑 Stop' : '🎤 Record'}
                                    </button>
                                    {isRecorded && (
                                      <button
                                        onClick={() => {
                                          const audio = new Audio(isRecorded.audio);
                                          audio.play();
                                        }}
                                        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
                                      >
                                        ▶️ Play
                                      </button>
                                    )}
                                  </div>
                                  {isRecorded && (
                                    <p className="text-xs text-green-600 mt-1">
                                      ✅ Recorded {new Date(isRecorded.timestamp).toLocaleTimeString()}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          
                          {page.content.split(' ').filter(word => /^[a-zA-Z]+$/.test(word.replace(/[.,!?;]/, ''))).length === 0 && (
                            <p className="text-gray-500 text-sm">Enter sentence content above to see word recording options.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <button
                  type="button"
                  onClick={() => {
                    const newPage = {
                      id: `page-${(lessonForm.pages || []).length + 1}`,
                      content: '',
                      focus: lessonForm.missingPhonic,
                      completed: false
                    };
                    updateLessonForm('pages', [...(lessonForm.pages || []), newPage]);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                  style={{fontSize: '18px'}}
                >
                  ➕ Add Practice Sentence
                </button>
                
                {(!lessonForm.pages || lessonForm.pages.length === 0) && (
                  <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p style={{fontSize: '16px'}}>No practice sentences added yet.</p>
                    <p style={{fontSize: '14px'}}>Click "Add Practice Sentence" to create individual sentences for students to practice.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Media Upload Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 style={{fontSize: '24px'}} className="font-medium text-gray-700 mb-4">Media Assets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label style={{fontSize: '22px'}} className="block font-medium text-gray-700 mb-2">
                    Audio Files
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input 
                      type="file" 
                      accept="audio/*" 
                      multiple 
                      className="hidden" 
                      id="audio-upload"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleMediaUpload(e.target.files, 'audio');
                        }
                      }}
                    />
                    <label htmlFor="audio-upload" className="cursor-pointer">
                      <span style={{fontSize: '32px'}} className="block mb-2">🎵</span>
                      <p style={{fontSize: '22px'}} className="text-gray-600">Click to upload audio files</p>
                      <p style={{fontSize: '16px'}} className="text-gray-500">MP3, WAV, OGG supported</p>
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{fontSize: '22px'}} className="block font-medium text-gray-700 mb-2">
                    Image Files
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      id="image-upload"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleMediaUpload(e.target.files, 'image');
                        }
                      }}
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <span style={{fontSize: '32px'}} className="block mb-2">🖼️</span>
                      <p style={{fontSize: '22px'}} className="text-gray-600">Click to upload images</p>
                      <p style={{fontSize: '16px'}} className="text-gray-500">JPG, PNG, GIF supported</p>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Recording Attachments Section */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <LessonAudioManager 
                lessonId={editingLesson?.id || null}
                onUpdate={(attachments) => {
                  // Optional: store attachments in lesson form for reference
                  setLessonForm(prev => ({
                    ...prev,
                    audioAttachments: attachments
                  }));
                }}
              />
            </div>

            {/* Associated Media Files */}
            {((lessonForm.audioFiles?.length > 0) || (lessonForm.imageFiles?.length > 0)) && (
              <div className="border-t border-gray-200 pt-6">
                <h3 style={{fontSize: '24px'}} className="font-medium text-gray-700 mb-4">Associated Media Files</h3>
                
                {/* Audio Files */}
                {lessonForm.audioFiles?.length > 0 && (
                  <div className="mb-6">
                    <h4 style={{fontSize: '22px'}} className="font-medium text-gray-700 mb-3">
                      Audio Files ({lessonForm.audioFiles?.length || 0})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {lessonForm.audioFiles?.map((file) => (
                        <div key={file.id} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                          <div className="flex items-center gap-3 mb-3">
                            <span style={{fontSize: '20px'}}>🎵</span>
                            <div className="flex-1 min-w-0">
                              <p style={{fontSize: '18px'}} className="font-medium text-gray-800 truncate">
                                {file.name}
                              </p>
                              <p style={{fontSize: '14px'}} className="text-gray-500">{file.size}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePreviewMedia(file)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                            >
                              Play
                            </button>
                            <button
                              onClick={() => handleRemoveMediaFromLesson(file.id, 'audio')}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image Files */}
                {lessonForm.imageFiles?.length > 0 && (
                  <div className="mb-6">
                    <h4 style={{fontSize: '22px'}} className="font-medium text-gray-700 mb-3">
                      Image Files ({lessonForm.imageFiles?.length || 0})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {lessonForm.imageFiles?.map((file) => (
                        <div key={file.id} className="border border-gray-200 rounded-lg p-4 bg-green-50">
                          <div className="flex items-center gap-3 mb-3">
                            <span style={{fontSize: '20px'}}>🖼️</span>
                            <div className="flex-1 min-w-0">
                              <p style={{fontSize: '18px'}} className="font-medium text-gray-800 truncate">
                                {file.name}
                              </p>
                              <p style={{fontSize: '14px'}} className="text-gray-500">{file.size}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePreviewMedia(file)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => handleRemoveMediaFromLesson(file.id, 'image')}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Existing Media */}
                {uploadedMedia.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 style={{fontSize: '20px'}} className="font-medium text-gray-700 mb-3">
                      Add Existing Media from Library
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                      {uploadedMedia
                        .filter(media => 
                          !(lessonForm.audioFiles || []).find(f => f.id === media.id) && 
                          !(lessonForm.imageFiles || []).find(f => f.id === media.id)
                        )
                        .map((media) => (
                          <div key={media.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                              <span style={{fontSize: '16px'}}>
                                {media.type === 'audio' ? '🎵' : '🖼️'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p style={{fontSize: '14px'}} className="font-medium text-gray-800 truncate">
                                  {media.name}
                                </p>
                                <p style={{fontSize: '12px'}} className="text-gray-500">{media.size}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddExistingMediaToLesson(media)}
                              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
                            >
                              Add to Lesson
                            </button>
                          </div>
                        ))}
                    </div>
                    {uploadedMedia.filter(media => 
                      !(lessonForm.audioFiles || []).find(f => f.id === media.id) && 
                      !(lessonForm.imageFiles || []).find(f => f.id === media.id)
                    ).length === 0 && (
                      <p style={{fontSize: '16px'}} className="text-gray-500 text-center py-4">
                        All available media files are already associated with this lesson.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Phonics Management */}
            <div className="border-t border-gray-200 pt-6">
              <label style={{fontSize: '24px'}} className="block font-medium text-gray-700 mb-4">
                Lesson Phonics
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  id="new-phonic"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{fontSize: '22px'}}
                  placeholder="Enter phonic (e.g., 'ph', 'th')"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addPhonic(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('new-phonic');
                    addPhonic(input.value);
                    input.value = '';
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-all duration-200"
                  style={{fontSize: '24px'}}
                >
                  Add Phonic
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {lessonForm.phonics.map((phonic, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2"
                    style={{fontSize: '22px'}}
                  >
                    {phonic}
                    <button
                      onClick={() => removePhonic(phonic)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Missing Phonic */}
            <div className="mb-6">
              <label style={{fontSize: '24px'}} className="block font-medium text-gray-700 mb-2">
                Missing Phonic
                <span style={{fontSize: '16px'}} className="text-gray-500 ml-2">
                  (Students will record this phonic)
                </span>
              </label>
              <input
                type="text"
                value={lessonForm.missingPhonic}
                onChange={(e) => updateLessonForm('missingPhonic', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{fontSize: '22px'}}
                placeholder="Enter the phonic students need to record"
              />
            </div>

            {/* Voice Library Assignments */}
            <div className="border-t border-gray-200 pt-6">
              <h3 style={{fontSize: '24px'}} className="font-medium text-gray-700 mb-4 flex items-center gap-2">
                🎙️ Voice Library Assignments
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Assigned Phonics Recordings */}
                <div>
                  <h4 className="text-lg font-medium text-gray-700 mb-3">Phonics Recordings</h4>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    {voiceLibrary.phonics.length > 0 ? (
                      <div className="space-y-2">
                        {voiceLibrary.phonics.map(recording => (
                          <div key={recording.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex-1">
                              <span className="font-medium">{recording.label}</span>
                              <div className="text-xs text-gray-500">
                                {new Date(recording.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => playVoiceRecording(recording.audio, recording.id)}
                                className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm"
                              >
                                {playingAudio === recording.id ? '⏸️' : '▶️'}
                              </button>
                              <button
                                onClick={() => {
                                  // Assign to lesson's missing phonic
                                  if (lessonForm.missingPhonic) {
                                    updateLessonForm('recordedPhonic', recording);
                                    alert(`Assigned "${recording.label}" to "${lessonForm.missingPhonic}" phonic`);
                                  } else {
                                    alert('Please set a missing phonic first');
                                  }
                                }}
                                disabled={!lessonForm.missingPhonic}
                                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-2 py-1 rounded text-sm"
                              >
                                📎 Assign
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <p>No phonics recordings available.</p>
                        <button
                          onClick={() => setActiveView('voice-library')}
                          className="text-blue-600 hover:text-blue-800 text-sm underline mt-1"
                        >
                          Create recordings in Voice Library →
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Currently Assigned Phonic */}
                  {lessonForm.recordedPhonic && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h5 className="font-medium text-green-700">✅ Assigned Phonic Recording</h5>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm">{lessonForm.recordedPhonic.label}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => playVoiceRecording(lessonForm.recordedPhonic.audio, 'assigned-phonic')}
                            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                          >
                            {playingAudio === 'assigned-phonic' ? '⏸️' : '▶️'}
                          </button>
                          <button
                            onClick={() => updateLessonForm('recordedPhonic', null)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assigned Text Recordings */}
                <div>
                  <h4 className="text-lg font-medium text-gray-700 mb-3">Text & Word Recordings</h4>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    {[...voiceLibrary.words, ...voiceLibrary.texts].length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {[...voiceLibrary.words, ...voiceLibrary.texts].map(recording => (
                          <div key={recording.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex-1">
                              <span className="font-medium">{recording.label}</span>
                              <span className="text-xs text-gray-500 ml-2">({recording.type})</span>
                              <div className="text-xs text-gray-500">
                                {new Date(recording.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => playVoiceRecording(recording.audio, recording.id)}
                                className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm"
                              >
                                {playingAudio === recording.id ? '⏸️' : '▶️'}
                              </button>
                              <button
                                onClick={() => {
                                  // For future implementation: assign to specific words or texts
                                  alert('Word/text assignment feature coming soon!');
                                }}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm"
                              >
                                📎 Assign
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <p>No word/text recordings available.</p>
                        <button
                          onClick={() => setActiveView('voice-library')}
                          className="text-blue-600 hover:text-blue-800 text-sm underline mt-1"
                        >
                          Create recordings in Voice Library →
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Custom Words Management */}
            {lessonForm.missingPhonic && PHONICS_LIBRARY[lessonForm.missingPhonic] && (
              <div className="border-t border-gray-200 pt-6">
                <label style={{fontSize: '24px'}} className="block font-medium text-gray-700 mb-4">
                  Practice Words for "{lessonForm.missingPhonic}"
                  <span style={{fontSize: '16px'}} className="text-gray-500 ml-2">
                    (Students can practice recording these words)
                  </span>
                </label>
                
                {/* Add new word */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    id="new-practice-word"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    style={{fontSize: '20px'}}
                    placeholder={`Add a word with "${lessonForm.missingPhonic}" sound (e.g., ${PHONICS_LIBRARY[lessonForm.missingPhonic].examples[0]})`}
                    onKeyPress={async (e) => {
                      if (e.key === 'Enter') {
                        const word = e.target.value.trim();
                        if (word) {
                          await addCustomWordToPhonic(lessonForm.missingPhonic, word);
                          e.target.value = '';
                          // Force re-render by updating a state
                          setLessonForm(prev => ({ ...prev }));
                          setPhonicsLibraryVersion(prev => prev + 1);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const input = document.getElementById('new-practice-word');
                      const word = input.value.trim();
                      if (word) {
                        await addCustomWordToPhonic(lessonForm.missingPhonic, word);
                        input.value = '';
                        // Force re-render by updating a state
                        setLessonForm(prev => ({ ...prev }));
                        setPhonicsLibraryVersion(prev => prev + 1);
                      }
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"
                    style={{fontSize: '20px'}}
                  >
                    ➕ Add Word
                  </button>
                </div>

                {/* Display all words */}
                <div className="space-y-4">
                  {/* Active Default words */}
                  <div>
                    <h4 style={{fontSize: '18px'}} className="font-medium text-gray-600 mb-2">Active Default Words:</h4>
                    <div className="flex flex-wrap gap-2">
                      {PHONICS_LIBRARY[lessonForm.missingPhonic].examples
                        .filter(word => !PHONICS_LIBRARY[lessonForm.missingPhonic].disabledWords?.includes(word.toLowerCase()))
                        .map((word, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-1"
                          style={{fontSize: '16px'}}
                        >
                          {word}
                          <button
                            onClick={async () => {
                              await removeDefaultWordFromPhonic(lessonForm.missingPhonic, word);
                              // Force re-render by updating a state
                              setLessonForm(prev => ({ ...prev }));
                              setPhonicsLibraryVersion(prev => prev + 1);
                            }}
                            className="text-red-500 hover:text-red-700 ml-1"
                            title="Disable this default word"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {PHONICS_LIBRARY[lessonForm.missingPhonic].examples
                        .filter(word => !PHONICS_LIBRARY[lessonForm.missingPhonic].disabledWords?.includes(word.toLowerCase()))
                        .length === 0 && (
                        <span className="text-gray-400 italic">All default words have been disabled</span>
                      )}
                    </div>
                  </div>

                  {/* Disabled Default words */}
                  {PHONICS_LIBRARY[lessonForm.missingPhonic].disabledWords && 
                   PHONICS_LIBRARY[lessonForm.missingPhonic].disabledWords.length > 0 && (
                    <div>
                      <h4 style={{fontSize: '18px'}} className="font-medium text-gray-500 mb-2">Disabled Default Words:</h4>
                      <div className="flex flex-wrap gap-2">
                        {PHONICS_LIBRARY[lessonForm.missingPhonic].disabledWords.map((word, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full flex items-center gap-1 opacity-70"
                            style={{fontSize: '16px'}}
                          >
                            {word}
                            <button
                              onClick={async () => {
                                await restoreDefaultWordForPhonic(lessonForm.missingPhonic, word);
                                // Force re-render by updating a state
                                setLessonForm(prev => ({ ...prev }));
                                setPhonicsLibraryVersion(prev => prev + 1);
                              }}
                              className="text-green-500 hover:text-green-700 ml-1"
                              title="Re-enable this default word"
                            >
                              ↻
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom words */}
                  {PHONICS_LIBRARY[lessonForm.missingPhonic].customWords && 
                   PHONICS_LIBRARY[lessonForm.missingPhonic].customWords.length > 0 && (
                    <div>
                      <h4 style={{fontSize: '18px'}} className="font-medium text-gray-600 mb-2">Custom Words:</h4>
                      <div className="flex flex-wrap gap-2">
                        {PHONICS_LIBRARY[lessonForm.missingPhonic].customWords.map((word, index) => (
                          <span
                            key={index}
                            className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center gap-1"
                            style={{fontSize: '16px'}}
                          >
                            {word}
                            <button
                              onClick={async () => {
                                await removeCustomWordFromPhonic(lessonForm.missingPhonic, word);
                                // Force re-render by updating a state
                                setLessonForm(prev => ({ ...prev }));
                                setPhonicsLibraryVersion(prev => prev + 1);
                              }}
                              className="text-red-500 hover:text-red-700 ml-1"
                              title="Remove word"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-500 italic">
                    💡 Students will be able to practice recording all these words during the lesson
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Settings */}
            <div className="border-t border-gray-200 pt-6">
              <h3 style={{fontSize: '24px'}} className="font-medium text-gray-700 mb-4">Advanced Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label style={{fontSize: '22px'}} className="block font-medium text-gray-700 mb-2">
                    Lesson Order
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={lessonForm.order || (lessonsList.length + 1)}
                      onChange={(e) => updateLessonForm('order', parseInt(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{fontSize: '22px'}}
                    />
                    <button
                      onClick={handleSaveLessonOrder}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
                      style={{fontSize: '16px'}}
                      disabled={!editingLesson}
                      title="Save lesson order immediately"
                    >
                      💾 Save Order
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Lower numbers appear first. Changes are saved immediately when you click "Save Order".
                  </p>
                </div>

                <div>
                  <label style={{fontSize: '22px'}} className="block font-medium text-gray-700 mb-2">
                    Estimated Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={lessonForm.duration || 15}
                    onChange={(e) => updateLessonForm('duration', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{fontSize: '22px'}}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveLesson}
                className="btn-multicolor px-6 py-3"
                style={{fontSize: '24px'}}
              >
                {editingLesson ? '💾 Save Changes' : '✨ Create Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Focus Manager View */}
      {activeView === 'focus' && (
        <div>
          <div className="mb-6">
            <h2 style={{fontSize: '26px'}} className="font-semibold text-gray-800">Focus Manager</h2>
            <p style={{fontSize: '22px'}} className="text-gray-600">
              Create interactive sentences with missing words and recording functionality
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            
            {/* Sentence Input */}
            <div>
              <label style={{fontSize: '24px'}} className="block font-medium text-gray-700 mb-2">
                Create Practice Sentence
              </label>
              <textarea
                value={focusSettings.currentSentence}
                onChange={(e) => setFocusSettings(prev => ({...prev, currentSentence: e.target.value}))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{fontSize: '22px'}}
                placeholder="Type your sentence here... (e.g., 'The cat sat on the mat')"
              />
            </div>

            {/* Phonic Focus Input */}
            <div>
              <label style={{fontSize: '24px'}} className="block font-medium text-gray-700 mb-2">
                Focus Phonic
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={focusSettings.currentPhonic}
                  onChange={(e) => setFocusSettings(prev => ({...prev, currentPhonic: e.target.value}))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{fontSize: '22px'}}
                  placeholder="Enter the phonic to focus on (e.g., 'at', 'sh', 'th')"
                />
                
                {/* Phonic Recording Controls */}
                {focusSettings.currentPhonic && (
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={startPhonicRecording}
                      disabled={isRecordingPhonic || !focusSettings.currentPhonic.trim()}
                      className={`px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${
                        isRecordingPhonic 
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                          : 'bg-purple-500 hover:bg-purple-600'
                      }`}
                      style={{fontSize: '16px'}}
                      title={isRecordingPhonic ? 'Recording phonic...' : `Record "${focusSettings.currentPhonic}" sound`}
                    >
                      {isRecordingPhonic ? '⏺️ Recording...' : '🎵 Record Phonic'}
                    </button>
                    
                    {focusSettings.recordedPhonic && (
                      <button
                        onClick={playRecordedPhonic}
                        className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all duration-200"
                        style={{fontSize: '16px'}}
                        title={`Play recorded "${focusSettings.recordedPhonic.phonic}" sound`}
                      >
                        ▶️ Play
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Phonic Recording Status */}
              {focusSettings.recordedPhonic && (
                <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-800 font-medium" style={{fontSize: '14px'}}>
                      🎵 Recorded phonic: "{focusSettings.recordedPhonic.phonic}"
                    </span>
                    <button
                      onClick={() => setFocusSettings(prev => ({...prev, recordedPhonic: null}))}
                      className="text-purple-600 hover:text-purple-800 text-sm"
                      title="Delete phonic recording"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                  <p className="text-purple-600 text-xs mt-1">
                    This phonic sound will be audible when students hover over words containing "{focusSettings.currentPhonic}"
                  </p>
                </div>
              )}
              
              <p className="text-gray-500 text-sm mt-2">
                💡 Record the phonic sound to make it audible when students hover over words containing this phonic
              </p>
            </div>

            {/* Interactive Word Selection */}
            {focusSettings.currentSentence && (
              <div>
                <label style={{fontSize: '24px'}} className="block font-medium text-gray-700 mb-4">
                  Interactive Word Management
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <p style={{fontSize: '18px'}} className="text-gray-600 mb-3">
                    Click on words to make them interactive or missing:
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {focusSettings.currentSentence.split(' ').map((word, index) => {
                      const isMissing = focusSettings.missingWords[index];
                      const isRecorded = focusSettings.recordedWords[index];
                      const cleanWord = word.replace(/[.,!?;]/, '');
                      
                      return (
                        <div key={index} className="inline-block relative mb-2">
                          <button
                            onClick={() => {
                              if (isMissing) {
                                // Remove from missing words
                                const newMissing = {...focusSettings.missingWords};
                                delete newMissing[index];
                                setFocusSettings(prev => ({
                                  ...prev,
                                  missingWords: newMissing
                                }));
                              } else {
                                // Add to missing words
                                setFocusSettings(prev => ({
                                  ...prev,
                                  missingWords: {
                                    ...prev.missingWords,
                                    [index]: cleanWord
                                  }
                                }));
                              }
                            }}
                            onMouseEnter={() => {
                              // Audio disabled - only teacher recordings supported
                            }}
                            className={`px-3 py-2 rounded-lg border-2 transition-all duration-200 ${
                              isMissing 
                                ? 'border-red-300 bg-red-100 text-red-700' 
                                : isRecorded
                                ? 'border-green-300 bg-green-100 text-green-700'
                                : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                            style={{fontSize: '18px'}}
                            title={
                              isMissing 
                                ? 'Missing word - click to restore' 
                                : 'Interactive word - click to make missing'
                            }
                          >
                            {isMissing ? '___' : word}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
                      <span className="text-gray-600">Interactive Word (hover to play)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
                      <span className="text-gray-600">Missing Word (silent)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                      <span className="text-gray-600">Recorded Word</span>
                    </div>
                  </div>
                </div>

                {/* Missing Words Management */}
                {Object.keys(focusSettings.missingWords).length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h4 style={{fontSize: '20px'}} className="font-medium text-yellow-800 mb-3">
                      Missing Words Management
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(focusSettings.missingWords).map(([wordIndex, word]) => {
                        const isRecorded = focusSettings.recordedWords[wordIndex];
                        const isCurrentlyRecording = isRecordingWord && recordingWordIndex === parseInt(wordIndex);
                        
                        return (
                          <div key={wordIndex} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span style={{fontSize: '16px'}} className="font-medium text-gray-800">
                                  Word Position {parseInt(wordIndex) + 1}: "{word}"
                                </span>
                                {isRecorded && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                                    ✓ Recorded
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    if (isCurrentlyRecording) {
                                      stopWordRecording();
                                    } else {
                                      startWordRecording(parseInt(wordIndex), word);
                                    }
                                  }}
                                  className={`px-3 py-1 rounded text-sm ${
                                    isCurrentlyRecording
                                      ? 'bg-red-500 text-white'
                                      : 'bg-green-500 hover:bg-green-600 text-white'
                                  }`}
                                  disabled={!audioSupport?.canRecord}
                                >
                                  {isCurrentlyRecording ? '⏹️ Stop Recording' : '🎤 Record Word'}
                                </button>
                                {isRecorded && (
                                  <button
                                    onClick={() => {
                                      const audio = new Audio(focusSettings.recordedWords[wordIndex].audio);
                                      audio.play();
                                    }}
                                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                                  >
                                    ▶️ Play
                                  </button>
                                )}
                              </div>
                            </div>
                            {isCurrentlyRecording && (
                              <div className="mt-2 text-sm text-red-600 animate-pulse">
                                🔴 Recording "{word}"... Click stop when finished.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sentence Playback */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span style={{fontSize: '20px'}} className="font-medium text-blue-800">Sentence Playback</span>
                    <button
                      onClick={() => {
                        // Play only recorded words - no synthetic speech
                        const words = focusSettings.currentSentence.split(' ');
                        words.forEach((word, index) => {
                          setTimeout(() => {
                            if (focusSettings.missingWords[index] && focusSettings.recordedWords[index]?.audio) {
                              // Play recorded word
                              const audio = new Audio(focusSettings.recordedWords[index].audio);
                              audio.play();
                            }
                            // Skip words without teacher recordings
                          }, index * 600); // 600ms between words
                        });
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-200"
                      style={{fontSize: '18px'}}
                      disabled={!audioSupport?.canSpeak}
                    >
                      ▶️ Play Complete Sentence
                    </button>
                  </div>
                  <p style={{fontSize: '18px'}} className="text-blue-700">
                    This will play the sentence with recorded words filling the gaps
                  </p>
                </div>

                {/* Complete Sentence Generation */}
                {Object.keys(focusSettings.missingWords).length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 style={{fontSize: '20px'}} className="font-medium text-green-800 mb-3">
                      Complete Sentence Preview
                    </h4>
                    
                    {/* Original Sentence */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                      <h5 className="text-sm font-medium text-gray-600 mb-2">Original Sentence with Gaps:</h5>
                      <p style={{fontSize: '18px'}} className="text-gray-800 mb-3">
                        {focusSettings.currentSentence.split(' ').map((word, index) => {
                          if (focusSettings.missingWords[index]) {
                            return (
                              <span key={index} className="font-bold text-red-600 bg-red-100 px-2 py-1 rounded mx-1">
                                ___
                              </span>
                            );
                          }
                          return <span key={index} className="mx-1">{word}</span>;
                        })}
                      </p>
                      
                      {/* Play Original with Gaps */}
                      <div className="text-sm text-gray-500 italic">
                        🔇 Audio disabled - Only teacher recordings supported
                      </div>
                    </div>

                    {/* Complete Sentence with Recordings */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                      <h5 className="text-sm font-medium text-gray-600 mb-2">Complete Sentence with Recordings:</h5>
                      <p style={{fontSize: '18px'}} className="text-gray-800 mb-3">
                        {focusSettings.currentSentence.split(' ').map((word, index) => {
                          if (focusSettings.missingWords[index]) {
                            const isRecorded = focusSettings.recordedWords[index];
                            return (
                              <span 
                                key={index} 
                                className={`font-bold px-2 py-1 rounded mx-1 ${
                                  isRecorded 
                                    ? 'text-green-600 bg-green-100' 
                                    : 'text-gray-500 bg-gray-100'
                                }`}
                              >
                                {isRecorded ? focusSettings.missingWords[index] : '___'}
                                {isRecorded && (
                                  <span className="text-xs ml-1">🎤</span>
                                )}
                              </span>
                            );
                          }
                          return <span key={index} className="mx-1">{word}</span>;
                        })}
                      </p>
                      
                      {/* Play Complete Sentence */}
                      <button
                        onClick={() => {
                          const words = focusSettings.currentSentence.split(' ');
                          words.forEach((word, index) => {
                            setTimeout(() => {
                              if (focusSettings.missingWords[index] && focusSettings.recordedWords[index]?.audio) {
                                // Play recorded word
                                const audio = new Audio(focusSettings.recordedWords[index].audio);
                                audio.play();
                              } else if (!focusSettings.missingWords[index]) {
                                // No synthetic speech - only play teacher recordings
                                console.log('Teacher recording only mode - no synthetic speech');
                              }
                            }, index * 800); // Longer delay to accommodate recordings
                          });
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
                        disabled={!audioSupport?.canSpeak}
                      >
                        ▶️ Play Complete Sentence
                      </button>
                    </div>

                    {/* Save Configuration */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          try {
                            // Create a new lesson with this focus configuration
                            const focusLesson = {
                              id: `focus-lesson-${Date.now()}`,
                              title: `Focus Practice: ${focusSettings.currentPhonic || 'Custom'}`,
                              summary: `Interactive sentence practice with missing word recording`,
                              text: focusSettings.currentSentence,
                              phonics: focusSettings.currentPhonic ? [focusSettings.currentPhonic] : [],
                              missingPhonic: focusSettings.currentPhonic || '',
                              difficulty: 'beginner',
                              order: lessonsList.length + 1,
                              completed: false,
                              // Include recorded phonic data
                              recordedPhonic: focusSettings.recordedPhonic,
                              pages: [{
                                id: `focus-page-${Date.now()}`,
                                content: focusSettings.currentSentence,
                                focus: focusSettings.currentPhonic,
                                missingWords: focusSettings.missingWords,
                                adminRecordings: focusSettings.recordedWords,
                                recordedPhonic: focusSettings.recordedPhonic, // Include in page data too
                                completed: false
                              }]
                            };

                            // Save to lessons list
                            const updatedLessons = [...lessonsList, focusLesson];
                            setLessonsList(updatedLessons);
                            saveSynchronizedLessons(updatedLessons);

                            // Try to save via API
                            try {
                              await axios.post('/api/lessons', focusLesson);
                              alert('✅ Focus lesson saved successfully! It will be available in the student area.');
                            } catch (apiError) {
                              console.warn('API save failed, but lesson added locally:', apiError);
                              alert('✅ Focus lesson saved locally! It will be available in this session.');
                            }

                            // Clear the form
                            setFocusSettings({
                              currentSentence: '',
                              selectedWords: [],
                              missingWords: {},
                              recordedWords: {},
                              completeSentence: '',
                              currentPhonic: '',
                              recordedPhonic: null
                            });
                            
                          } catch (error) {
                            console.error('Error saving focus lesson:', error);
                            alert('❌ Failed to save focus lesson. Please try again.');
                          }
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-all duration-200"
                        style={{fontSize: '18px'}}
                      >
                        💾 Save as New Lesson
                      </button>
                      
                      <button
                        onClick={() => {
                          setFocusSettings({
                            currentSentence: '',
                            selectedWords: [],
                            missingWords: {},
                            recordedWords: {},
                            completeSentence: '',
                            currentPhonic: '',
                            recordedPhonic: null
                          });
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all duration-200"
                        style={{fontSize: '18px'}}
                      >
                        🔄 Clear Form
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audio Support Warning */}
            {audioSupport && !audioSupport.fullSupport && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded-lg">
                <p style={{fontSize: '16px'}}>⚠️ Limited audio support detected. Recording features may not work properly.</p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2" style={{fontSize: '20px'}}>📋 How to Use Focus Manager:</h4>
              <ol className="text-sm text-gray-600 space-y-2">
                <li>1. 📝 Type a practice sentence in the text area</li>
                <li>2. 🎯 Enter the phonic you want students to focus on</li>
                <li>3. 🖱️ Click on words to make them "missing" (silent gaps)</li>
                <li>4. 🎤 Record pronunciation for missing words</li>
                <li>5. ▶️ Test the complete sentence playback</li>
                <li>6. 💾 Save the configuration to make it available in student lessons</li>
                <li>7. ✅ Students will see gaps where missing words are and can record their own pronunciation</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* User Management View */}
      {activeView === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 style={{fontSize: '26px'}} className="font-semibold text-gray-800">User Management</h2>
              <p style={{fontSize: '22px'}} className="text-gray-600">Manage student accounts and track progress</p>
            </div>
            <button 
              onClick={() => {
                const name = prompt('Enter user name:');
                const email = prompt('Enter user email:');
                const role = prompt('Enter user role (student/admin):') || 'student';
                if (name && email) {
                  handleAddUser({ name, email, role });
                }
              }}
              className="btn-multicolor flex items-center gap-2" 
              style={{fontSize: '24px'}}
            >
              ➕ Add New User
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th style={{fontSize: '22px'}} className="px-6 py-3 text-left font-medium text-gray-700">Name</th>
                    <th style={{fontSize: '22px'}} className="px-6 py-3 text-left font-medium text-gray-700">Email</th>
                    <th style={{fontSize: '22px'}} className="px-6 py-3 text-left font-medium text-gray-700">Role</th>
                    <th style={{fontSize: '22px'}} className="px-6 py-3 text-left font-medium text-gray-700">Join Date</th>
                    <th style={{fontSize: '22px'}} className="px-6 py-3 text-left font-medium text-gray-700">Progress</th>
                    <th style={{fontSize: '22px'}} className="px-6 py-3 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usersList.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td style={{fontSize: '22px'}} className="px-6 py-4 text-gray-800">{user.name}</td>
                      <td style={{fontSize: '22px'}} className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{fontSize: '22px'}} className="px-6 py-4 text-gray-600">{user.joinDate}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${Math.min((user.lessonsCompleted / lessonsList.length) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span style={{fontSize: '16px'}} className="text-gray-600">
                            {user.lessonsCompleted}/{lessonsList.length}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEditUser(user.id, { name: prompt('Edit name:', user.name) || user.name, email: prompt('Edit email:', user.email) || user.email })}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Media Library View */}
      {activeView === 'media' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 style={{fontSize: '26px'}} className="font-semibold text-gray-800">Media Library</h2>
              <p style={{fontSize: '22px'}} className="text-gray-600">Upload and manage audio files and images for lessons</p>
            </div>
            <button 
              onClick={() => {
                // Trigger file upload dialog for media files
                const audioInput = document.getElementById('bulk-audio-upload');
                const imageInput = document.getElementById('bulk-image-upload');
                const choice = prompt('Upload files:\n1. Audio files\n2. Image files\nEnter 1 or 2:');
                if (choice === '1' && audioInput) {
                  audioInput.click();
                } else if (choice === '2' && imageInput) {
                  imageInput.click();
                }
              }}
              className="btn-multicolor flex items-center gap-2" 
              style={{fontSize: '24px'}}
            >
              📁 Upload Files
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Audio Upload */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 style={{fontSize: '24px'}} className="font-medium text-gray-800 mb-4">Upload Audio Files</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input 
                  type="file" 
                  accept="audio/*" 
                  multiple 
                  className="hidden" 
                  id="bulk-audio-upload"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleMediaUpload(e.target.files, 'audio');
                    }
                  }}
                />
                <label htmlFor="bulk-audio-upload" className="cursor-pointer">
                  <span style={{fontSize: '48px'}} className="block mb-2">🎵</span>
                  <p style={{fontSize: '22px'}} className="text-gray-600 mb-2">Drop audio files here or click to browse</p>
                  <p style={{fontSize: '16px'}} className="text-gray-500">Supports MP3, WAV, OGG files</p>
                </label>
              </div>
            </div>

            {/* Image Upload */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 style={{fontSize: '24px'}} className="font-medium text-gray-800 mb-4">Upload Images</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  id="bulk-image-upload"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleMediaUpload(e.target.files, 'image');
                    }
                  }}
                />
                <label htmlFor="bulk-image-upload" className="cursor-pointer">
                  <span style={{fontSize: '48px'}} className="block mb-2">🖼️</span>
                  <p style={{fontSize: '22px'}} className="text-gray-600 mb-2">Drop images here or click to browse</p>
                  <p style={{fontSize: '16px'}} className="text-gray-500">Supports JPG, PNG, GIF files</p>
                </label>
              </div>
            </div>
          </div>

          {/* Media Files List */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 style={{fontSize: '24px'}} className="font-medium text-gray-800 mb-4">Uploaded Files</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadedMedia.map((file) => (
                <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <span style={{fontSize: '24px'}}>
                      {file.type === 'audio' ? '🎵' : '🖼️'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p style={{fontSize: '22px'}} className="font-medium text-gray-800 truncate">{file.name}</p>
                      <p style={{fontSize: '16px'}} className="text-gray-500">{file.size}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handlePreviewMedia(file)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Preview
                    </button>
                    <button 
                      onClick={() => handleDeleteMedia(file.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <div>
          <div className="mb-6">
            <h2 style={{fontSize: '26px'}} className="font-semibold text-gray-800">Analytics Dashboard</h2>
            <p style={{fontSize: '22px'}} className="text-gray-600">Track student progress and lesson effectiveness</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 style={{fontSize: '24px'}} className="font-medium text-gray-800 mb-4">Lesson Completion</h3>
              <div className="space-y-3">
                {lessonsList.slice(0, 5).map((lesson, index) => (
                  <div key={lesson.id} className="flex justify-between items-center">
                    <span style={{fontSize: '22px'}} className="text-gray-700">{lesson.title}</span>
                    <span style={{fontSize: '22px'}} className="text-green-600 font-medium">
                      {Math.floor(Math.random() * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 style={{fontSize: '24px'}} className="font-medium text-gray-800 mb-4">Student Progress</h3>
              <div className="space-y-3">
                {usersList.filter(u => u.role === 'student').map((student) => (
                  <div key={student.id} className="flex justify-between items-center">
                    <span style={{fontSize: '22px'}} className="text-gray-700">{student.name}</span>
                    <span style={{fontSize: '22px'}} className="text-blue-600 font-medium">
                      {student.lessonsCompleted} lessons
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 style={{fontSize: '24px'}} className="font-medium text-gray-800 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span style={{fontSize: '20px'}}>✅</span>
                  <span style={{fontSize: '22px'}} className="text-gray-700">5 lessons completed today</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{fontSize: '20px'}}>🔊</span>
                  <span style={{fontSize: '22px'}} className="text-gray-700">3 recordings submitted</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{fontSize: '20px'}}>👤</span>
                  <span style={{fontSize: '22px'}} className="text-gray-700">2 new students joined</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Library View */}
      {activeView === 'voice-library' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 style={{fontSize: '26px'}} className="font-semibold text-gray-800">🎙️ Voice Library</h2>
            <div className="text-sm text-gray-500">
              Phonics: {voiceLibrary.phonics.length} | Words: {voiceLibrary.words.length} | Texts: {voiceLibrary.texts.length}
              <br />
              <span className="text-xs">
                WebM: {MediaRecorder.isTypeSupported('audio/webm') ? '✅' : '❌'} | 
                MP4: {MediaRecorder.isTypeSupported('audio/mp4') ? '✅' : '❌'} | 
                WAV: {MediaRecorder.isTypeSupported('audio/wav') ? '✅' : '❌'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recording Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-medium text-gray-800 mb-4 flex items-center gap-2">
                  🎤 New Recording
                </h3>

                {/* Recording Type Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recording Type</label>
                  <select 
                    value={currentRecording.type}
                    onChange={(e) => setCurrentRecording(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="phonics">🔤 Phonics Sounds</option>
                    <option value="words">📝 Words</option>
                    <option value="texts">📖 Lesson Texts</option>
                  </select>
                </div>

                {/* Recording Label */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
                  <input
                    type="text"
                    value={currentRecording.label}
                    onChange={(e) => setCurrentRecording(prev => ({ ...prev, label: e.target.value }))}
                    placeholder={`Enter ${currentRecording.type} name...`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Recording Controls */}
                <div className="mb-4">
                  <div className="flex gap-3">
                    {!currentRecording.isRecording ? (
                      <button
                        onClick={() => startVoiceRecording(currentRecording.type)}
                        disabled={!currentRecording.label.trim()}
                        className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        🎤 Start Recording
                      </button>
                    ) : (
                      <button
                        onClick={stopVoiceRecording}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 animate-pulse"
                      >
                        ⏹️ Stop Recording
                      </button>
                    )}
                  </div>
                </div>

                {/* Playback Preview */}
                {currentRecording.audio && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-700">Preview Recording</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            console.log('🎵 Playing preview audio:', currentRecording.audio);
                            console.log('🎵 Audio blob size:', currentRecording.blob?.size, 'bytes');
                            console.log('🎵 Audio mime type:', currentRecording.mimeType);
                            playVoiceRecording(currentRecording.audio, 'preview');
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                        >
                          {playingAudio === 'preview' ? '⏸️ Pause' : '▶️ Play'}
                        </button>
                        <button
                          onClick={() => {
                            // Download the audio file for testing
                            if (currentRecording.blob) {
                              const url = URL.createObjectURL(currentRecording.blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `test-recording.${currentRecording.mimeType?.includes('webm') ? 'webm' : 'wav'}`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                          title="Download recording to test"
                        >
                          📥
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveVoiceRecording}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium"
                      >
                        💾 Save
                      </button>
                      <button
                        onClick={() => setCurrentRecording(prev => ({ ...prev, audio: null, blob: null }))}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                      >
                        🗑️ Discard
                      </button>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                  <h4 className="font-medium mb-1">Recording Tips:</h4>
                  <ul className="space-y-1">
                    <li>• Speak clearly and at normal pace</li>
                    <li>• Use a quiet environment</li>
                    <li>• Keep recordings under 10 seconds for phonics</li>
                    <li>• Preview before saving</li>
                  </ul>
                </div>

                {/* Audio Test Button */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-medium text-blue-700 mb-2">🔧 Audio Test</h4>
                  <button
                    onClick={() => {
                      try {
                        // Create a simple beep sound to test audio
                        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                        const oscillator = audioContext.createOscillator();
                        const gainNode = audioContext.createGain();
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        
                        oscillator.frequency.value = 440; // A4 note
                        gainNode.gain.value = 0.1;
                        
                        oscillator.start();
                        oscillator.stop(audioContext.currentTime + 0.2);
                        
                        alert('✅ Audio test successful! Your speakers/headphones are working.');
                      } catch (error) {
                        console.error('Audio test failed:', error);
                        alert('❌ Audio test failed. Check your browser audio permissions and settings.');
                      }
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm mb-2"
                  >
                    🔊 Test Audio Output
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        console.log('🎤 Testing microphone access...');
                        
                        // Request microphone permission
                        const stream = await navigator.mediaDevices.getUserMedia({ 
                          audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true
                          } 
                        });
                        
                        console.log('🎤 Microphone access granted');
                        
                        // Test if we can record
                        const mediaRecorder = new MediaRecorder(stream);
                        let dataReceived = false;
                        
                        mediaRecorder.ondataavailable = (event) => {
                          if (event.data.size > 0) {
                            dataReceived = true;
                            console.log('🎤 Audio data received:', event.data.size, 'bytes');
                          }
                        };
                        
                        mediaRecorder.onstop = () => {
                          stream.getTracks().forEach(track => track.stop());
                          
                          if (dataReceived) {
                            alert('✅ Microphone test successful! Your microphone is working and can record audio.');
                          } else {
                            alert('❌ Microphone test failed - no audio data received. Check microphone levels and speak during the test.');
                          }
                        };
                        
                        mediaRecorder.onerror = (event) => {
                          console.error('🎤 MediaRecorder error:', event.error);
                          stream.getTracks().forEach(track => track.stop());
                          alert('❌ Recording error: ' + event.error.message);
                        };
                        
                        // Record for 2 seconds
                        mediaRecorder.start(100); // Collect data every 100ms
                        
                        alert('🎤 Microphone test started! Please speak for 2 seconds...');
                        
                        setTimeout(() => {
                          if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                          }
                        }, 2000);
                        
                        console.log('🎤 Recording test audio for 2 seconds...');
                        
                      } catch (error) {
                        console.error('🎤 Microphone test failed:', error);
                        if (error.name === 'NotAllowedError') {
                          alert('❌ Microphone access denied. Please allow microphone permissions and try again.');
                        } else if (error.name === 'NotFoundError') {
                          alert('❌ No microphone found. Please check your microphone connection.');
                        } else {
                          alert('❌ Microphone test failed: ' + error.message);
                        }
                      }
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
                  >
                    🎤 Test Microphone
                  </button>
                  <button
                    onClick={() => {
                      console.log('🔍 Debug button clicked');
                      console.log('🔍 currentRecording state:', currentRecording);
                      console.log('🔍 Label:', currentRecording.label);
                      console.log('🔍 Type:', currentRecording.type);
                      console.log('🔍 Is recording:', currentRecording.isRecording);
                      console.log('🔍 startVoiceRecording function:', typeof startVoiceRecording);
                      alert('Debug info logged to console. Check browser console (F12).');
                    }}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded text-sm mt-2"
                  >
                    🔍 Debug State
                  </button>
                  <button
                    onClick={async () => {
                      console.log('🧪 Simple recording test started');
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        console.log('🧪 Got microphone stream');
                        
                        const mediaRecorder = new MediaRecorder(stream);
                        const chunks = [];
                        
                        mediaRecorder.ondataavailable = (e) => {
                          console.log('🧪 Data chunk received:', e.data.size);
                          chunks.push(e.data);
                        };
                        
                        mediaRecorder.onstop = () => {
                          console.log('🧪 Recording stopped, chunks:', chunks.length);
                          const blob = new Blob(chunks);
                          console.log('🧪 Blob created, size:', blob.size);
                          
                          if (blob.size > 0) {
                            const url = URL.createObjectURL(blob);
                            const audio = new Audio(url);
                            audio.play().then(() => {
                              console.log('🧪 Playback started successfully');
                              alert('✅ Simple test successful! Recording and playback working.');
                            }).catch(e => {
                              console.error('🧪 Playback failed:', e);
                              alert('⚠️ Recording successful but playback failed: ' + e.message);
                            });
                          } else {
                            alert('❌ No audio data recorded in simple test');
                          }
                          
                          stream.getTracks().forEach(track => track.stop());
                        };
                        
                        mediaRecorder.start();
                        console.log('🧪 Recording started for 2 seconds');
                        
                        setTimeout(() => {
                          mediaRecorder.stop();
                        }, 2000);
                        
                      } catch (error) {
                        console.error('🧪 Simple test failed:', error);
                        alert('❌ Simple recording test failed: ' + error.message);
                      }
                    }}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-sm mt-2"
                  >
                    🧪 Simple Record Test
                  </button>
                  <button
                    onClick={knownGoodRecording}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded text-sm mt-2"
                  >
                    🎯 Known-Good Test
                  </button>
                  <div className="mt-2 text-xs text-blue-600">
                    Test audio output first, then test microphone before recording
                  </div>
                </div>
              </div>
            </div>

            {/* Library Browser */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                
                {/* Category Tabs */}
                <div className="flex border-b border-gray-200 mb-4">
                  {['phonics', 'words', 'texts'].map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                        selectedCategory === category
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {category === 'phonics' && '🔤'} 
                      {category === 'words' && '📝'} 
                      {category === 'texts' && '📖'} 
                      {category.charAt(0).toUpperCase() + category.slice(1)} ({voiceLibrary[category].length})
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Search ${selectedCategory}...`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Recordings Grid */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {voiceLibrary[selectedCategory]
                    .filter(recording => 
                      recording.label.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(recording => (
                    <div key={recording.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{recording.label}</h4>
                        <p className="text-xs text-gray-500">
                          {new Date(recording.timestamp).toLocaleDateString()} • {recording.type}
                        </p>
                        {recording.assignedTo.length > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            Assigned to {recording.assignedTo.length} item(s)
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => playVoiceRecording(recording.audio, recording.id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
                        >
                          {playingAudio === recording.id ? '⏸️' : '▶️'}
                        </button>
                        <button
                          onClick={() => deleteVoiceRecording(selectedCategory, recording.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {voiceLibrary[selectedCategory].length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">
                        {selectedCategory === 'phonics' && '🔤'}
                        {selectedCategory === 'words' && '📝'}
                        {selectedCategory === 'texts' && '📖'}
                      </div>
                      <p>No {selectedCategory} recordings yet.</p>
                      <p className="text-sm">Create your first recording using the panel on the left.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Recording Review View */}
      {activeView === 'recordings' && (
        <div>
          <div className="mb-6">
            <h2 style={{fontSize: '26px'}} className="font-semibold text-gray-800">Recording Review</h2>
            <p style={{fontSize: '22px'}} className="text-gray-600">
              Review and manage saved pronunciation recordings from student practice sessions.
            </p>
          </div>
          
          {savedRecordings.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
              <span style={{fontSize: '64px'}} className="block mb-4">📭</span>
              <p style={{fontSize: '24px'}} className="text-gray-500 mb-2">No recordings available for review</p>
              <p style={{fontSize: '22px'}} className="text-gray-400">
                Recordings will appear here after students complete phonics practice sessions.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {savedRecordings.map((recording, index) => (
                <div key={recording.lessonId || index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 style={{fontSize: '24px'}} className="font-medium text-gray-800">
                        Phonic: <span className="text-blue-600 font-bold">{recording.metadata.phonic}</span>
                      </h3>
                      <p style={{fontSize: '22px'}} className="text-gray-500">
                        Recorded: {new Date(recording.timestamp).toLocaleString()}
                      </p>
                      <p style={{fontSize: '16px'}} className="text-gray-500">
                        Lesson ID: {recording.lessonId}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMarkAsReviewed(recording.lessonId)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-all duration-200"
                        style={{fontSize: '22px'}}
                      >
                        ✅ Mark Reviewed
                      </button>
                      <button
                        onClick={() => handleDeleteRecording(recording.lessonId)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-all duration-200"
                        style={{fontSize: '22px'}}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 style={{fontSize: '22px'}} className="font-medium text-gray-700 mb-3">Recording Playback:</h4>
                    {recording.url ? (
                      <audio controls src={recording.url} className="w-full">
                        Your browser does not support the audio element.
                      </audio>
                    ) : (
                      <p style={{fontSize: '22px'}} className="text-gray-500">Audio not available for playback</p>
                    )}
                  </div>
                  
                  {recording.metadata.needsManualReview && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded">
                      <p style={{fontSize: '22px'}}>⚠️ This recording needs manual review</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}