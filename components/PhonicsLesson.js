"use client";
import { useState, useRef, useEffect } from 'react';
import { evaluatePronunciation, checkAudioSupport, PHONICS_LIBRARY, RECORDING_MANAGER, getAllWordsForPhonic, loadPhonicsLibrary } from '../utils/phonics';
import useStudentAudio from './useStudentAudio';
import EnhancedWord from './EnhancedWord';
import EnhancedText from './EnhancedText';
import EnhancedPhonics from './EnhancedPhonics';

// No-op speakText function - computer audio disabled, teacher recordings only
const speakText = (text, settings) => {
  console.log('Computer audio disabled - teacher recordings only:', text);
  return false;
};

// Import speech settings for structure compatibility
const SPEECH_SETTINGS = {
  default: { rate: 0.8, pitch: 1.0, volume: 0.9 },
  phonic: { rate: 0.6, pitch: 1.1, volume: 1.0 },
  word: { rate: 0.9, pitch: 1.0, volume: 0.9 }
};

export default function PhonicsLesson({ lesson, onComplete, recordedPhonic }) {
  // Audio attachment integration
  const {
    attachments,
    loading: audioLoading,
    error: audioError,
    playAudio,
    currentlyPlayingId,
    loadingStates,
    refreshAttachments
  } = useStudentAudio(lesson.id);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [feedback, setFeedback] = useState('');

  const [testResult, setTestResult] = useState(null);
  const [audioSupport, setAudioSupport] = useState(null);
  const [processingAudio, setProcessingAudio] = useState(false);
  const [savedRecording, setSavedRecording] = useState(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [phonicsLibraryLoaded, setPhonicsLibraryLoaded] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [sentencePhonics, setSentencePhonics] = useState({});

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const lessonId = `${lesson.missingPhonic || lesson.phonic}_${Date.now()}`;  // Check audio support on component mount
  useEffect(() => {
    const support = checkAudioSupport();
    setAudioSupport(support);

    if (!support.canRecord) {
      setFeedback('Microphone access not available. Please check browser permissions.');
    }

    // Load phonics library from persistent storage
    const initPhonics = async () => {
      await loadPhonicsLibrary();
      setPhonicsLibraryLoaded(true);
    };
    initPhonics();
  }, []);

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        processRecording(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setFeedback('🎤 Recording... Speak clearly and click stop when done');
      setTestResult(null);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setFeedback('Unable to access microphone. Please check permissions and try again.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setProcessingAudio(true);
      setFeedback('🔄 Processing your recording...');
    }
  };

  // Process the recorded audio with enhanced feedback
  const processRecording = async (audioBlob) => {
    try {
      const result = await evaluatePronunciation(audioBlob, lesson.missingPhonic || lesson.phonic);
      setProcessingAudio(false);

      // Save the recording for replay during lesson - keep until manually reviewed
      const recordingData = RECORDING_MANAGER.saveRecording(lessonId, audioBlob, {
        phonic: lesson.missingPhonic || lesson.phonic,
        timestamp: new Date().toISOString(),
        lessonCompleted: false,
        needsManualReview: true
      });
      setSavedRecording(recordingData);

      if (result.success) {
        setTestResult('success');
        setFeedback(`🎉 GREAT JOB!!! (Score: ${result.score}%)\n✅ Recording saved for review. You can continue practicing or move to the next lesson.`);

      } else {
        setTestResult('fail');
        setFeedback(`❌ Try again!`);
        if (result.suggestions) {
          setFeedback(prev => `${prev}\n💡 Tip: ${result.suggestions}`);
        }
      }
    } catch (error) {
      setProcessingAudio(false);
      setFeedback('Error processing audio. Please try again.');
    }
  };

  // Play the saved user recording
  const playUserRecording = () => {
    if (savedRecording?.blob) {
      const audio = new Audio(URL.createObjectURL(savedRecording.blob));
      audio.play().catch(error => {
        console.error('Error playing user recording:', error);
        setFeedback('Unable to play your recording. Please try recording again.');
      });
    }
  };

  // Reset recording and clear saved data
  const resetRecording = () => {
    setAudioBlob(null);
    setFeedback('');
    setTestResult(null);
    if (savedRecording) {
      RECORDING_MANAGER.deleteRecording(lessonId);
      setSavedRecording(null);
    }
  };

  // Handle word hover to read the word with enhanced interactivity and recording priority
  const handleWordHover = (word, index, sentenceId, focusPhonic = null, readAlongPhonic = null, wordRecording = null, recordedPhonic = null) => {
    // Only speak if it's a valid word (contains letters and is not just punctuation or symbols)
    const cleanWord = word.replace(/[.,!?;]/, '');
    const isValidWord = /^[a-zA-Z]+$/.test(cleanWord) && cleanWord.length > 0;
    
    // Check if this word contains the focus phonic
    const containsFocusPhonic = focusPhonic && cleanWord.toLowerCase().includes(focusPhonic.toLowerCase());
    
    // Check if this word contains the read along phonic that should play the phonic sound
    const hasReadAlongPhonic = readAlongPhonic && cleanWord.toLowerCase().includes(readAlongPhonic.toLowerCase());
    
    if (!processingAudio && currentlyPlaying !== sentenceId && isValidWord) {
      setHoveredWord(`${sentenceId}-${index}`);
      
      // Enhanced Priority System for Human Recorded Audio:
      
      // Priority 1: Teacher recorded word audio (highest priority)
      if (wordRecording?.audio) {
        console.log(`🎤 Playing teacher-recorded word audio for "${cleanWord}"`);
        const audio = new Audio(wordRecording.audio);
        audio.onplay = () => {
          setCurrentlyPlaying(`word-${cleanWord}-${index}`);
          console.log(`🔊 Now playing: "${cleanWord}" (teacher recording)`);
        };
        audio.onended = () => {
          setCurrentlyPlaying(null);
          console.log(`✅ Finished playing: "${cleanWord}"`);
        };
        audio.onerror = (error) => {
          console.error(`❌ Error playing word recording for "${cleanWord}":`, error);
          setCurrentlyPlaying(null);
        };
        audio.play().catch(error => console.error(`❌ Failed to play audio for "${cleanWord}":`, error));
      }
      
      // Priority 2: Recorded phonic sound for focus phonic words
      else if (containsFocusPhonic && recordedPhonic?.audio) {
        console.log(`🎵 Playing recorded phonic "${focusPhonic}" for word "${cleanWord}"`);
        const audio = new Audio();
        audio.oncanplay = () => {
          setCurrentlyPlaying(`phonic-${focusPhonic}-${index}`);
          console.log(`🔊 Now playing phonic: "${focusPhonic}" in word "${cleanWord}"`);
          audio.play().catch(error => console.error(`❌ Failed to play phonic audio for "${focusPhonic}":`, error));
        };
        audio.onended = () => {
          setCurrentlyPlaying(null);
          console.log(`✅ Finished playing phonic: "${focusPhonic}"`);
        };
        audio.onerror = (error) => {
          console.error(`❌ Error playing phonic recording for "${focusPhonic}":`, error);
          setCurrentlyPlaying(null);
        };
        audio.volume = 0.8;
        audio.src = recordedPhonic.audio;
        audio.load();
      }
      
      // Priority 3: Check for any recorded phonics library sounds
      else if (hasReadAlongPhonic && PHONICS_LIBRARY[readAlongPhonic]?.recordedAudio) {
        console.log(`📋 Playing phonics library recording for "${readAlongPhonic}" in word "${cleanWord}"`);
        const audio = new Audio();
        audio.oncanplay = () => {
          setCurrentlyPlaying(`library-${readAlongPhonic}-${index}`);
          audio.play().catch(error => console.error(`❌ Failed to play library phonic:`, error));
        };
        audio.onended = () => setCurrentlyPlaying(null);
        audio.onerror = (error) => {
          console.error(`❌ Error playing library phonic for "${readAlongPhonic}":`, error);
          setCurrentlyPlaying(null);
        };
        audio.volume = 0.8;
        audio.src = PHONICS_LIBRARY[readAlongPhonic].recordedAudio;
        audio.load();
      }
      
      // Priority 4: Look for admin recordings from focus/practice sessions
      else if (lesson.focusRecordings?.[cleanWord.toLowerCase()]) {
        console.log(`🎙️ Playing admin-recorded audio for "${cleanWord}"`);
        const audio = new Audio(lesson.focusRecordings[cleanWord.toLowerCase()].audio);
        audio.onplay = () => setCurrentlyPlaying(`admin-${cleanWord}-${index}`);
        audio.onended = () => setCurrentlyPlaying(null);
        audio.play().catch(error => console.error(`❌ Failed to play admin recording:`, error));
      }
      
      // No recordings available - silent mode with helpful feedback
      else {
        console.log(`🤫 "${cleanWord}" - No human recordings available (silent mode - teacher recordings only)`);
        // Show visual feedback for words without recordings
        setFeedback(`📝 "${cleanWord}" - No teacher recording yet. Ask your teacher to record this word! 🎤`);
        setTimeout(() => setFeedback(''), 2000);
      }
      
      // Reset hover state after a delay
      setTimeout(() => setHoveredWord(null), 1500);
    }
  };

  // Sentence playback removed - only teacher recordings supported

  // Update phonic for a sentence
  const updateSentencePhonic = (sentenceId, phonic) => {
    setSentencePhonics(prev => ({
      ...prev,
      [sentenceId]: phonic
    }));
  };

  // Split sentence into words for hover functionality with enhanced styling and comprehensive recording support
  const renderInteractiveText = (text, sentenceId, missingWords = {}, adminRecordings = {}, focusPhonic = null, readAlongPhonic = null, wordRecordings = null, recordedPhonic = null) => {
    return text.split(' ').map((word, index) => {
      const isMissing = missingWords[index];
      const hasAdminRecording = adminRecordings[index];
      const cleanWord = word.replace(/[.,!?;]/, '');
      const containsFocusPhonic = focusPhonic && cleanWord.toLowerCase().includes(focusPhonic.toLowerCase());
      const containsReadAlongPhonic = readAlongPhonic && cleanWord.toLowerCase().includes(readAlongPhonic.toLowerCase());
      
      // Get comprehensive word recording based on section
      const wordRecording = wordRecordings ? wordRecordings[index] : null;
      const hasWordRecording = wordRecording?.audio;
      
      if (isMissing) {
        return (
          <span
            key={index}
            className="cursor-pointer transition-all duration-300 px-2 py-1 rounded-md inline-block m-1 bg-red-100 border-2 border-red-300 text-red-700"
            onClick={() => {
              const isValidWord = /^[a-zA-Z]+$/.test(cleanWord) && cleanWord.length > 0;
              
              // Priority system for missing words: word recording > admin recording > synthetic
              if (hasWordRecording) {
                console.log(`Playing word recording for missing word: "${cleanWord}"`);
                const audio = new Audio(wordRecording.audio);
                audio.play();
              } else if (hasAdminRecording?.audio) {
                console.log(`Playing admin recording for missing word: "${cleanWord}"`);
                const audio = new Audio(hasAdminRecording.audio);
                audio.play();
              } else if (isValidWord) {
                console.log(`Missing word "${cleanWord}" - no teacher recording available (silent)`);
              }
              // Only play teacher recordings - no synthetic audio
            }}
            title={`Missing word: "${cleanWord}" - ${hasWordRecording ? "Click to hear teacher's recording 🎤" : hasAdminRecording ? "Click to hear admin recording 🎙️" : "No teacher recording available (silent)"}`}
          >
            ___
            {hasWordRecording && (
              <span className="text-sm ml-1 text-blue-600 bg-blue-100 rounded-full px-1 animate-pulse">
                🎤
              </span>
            )}
            {!hasWordRecording && hasAdminRecording && (
              <span className="text-xs ml-1 text-gray-500">🎙️</span>
            )}
          </span>
        );
      }

      // Check for different types of recordings
      const hasLibraryPhonic = readAlongPhonic && PHONICS_LIBRARY[readAlongPhonic]?.recordedAudio;
      const hasFocusRecording = lesson.focusRecordings?.[cleanWord.toLowerCase()];
      const hasAnyRecording = hasWordRecording || (containsFocusPhonic && recordedPhonic?.audio) || hasLibraryPhonic || hasFocusRecording;
      
      return (
        <span
          key={index}
          className={`cursor-pointer transition-all duration-300 px-3 py-2 rounded-lg inline-block m-1 font-medium ${
            hoveredWord === `${sentenceId}-${index}`
              ? 'bg-orange-400 text-white shadow-xl scale-110 font-bold border-2 border-orange-600'
              : currentlyPlaying?.includes(`${index}`)
              ? 'bg-green-400 text-white shadow-lg animate-pulse border-2 border-green-600'
              : containsFocusPhonic 
                ? recordedPhonic?.audio
                  ? 'bg-purple-500 border-2 border-purple-600 text-white shadow-lg hover:bg-purple-600'
                  : 'bg-purple-200 border-2 border-purple-300 text-purple-800 hover:bg-purple-300'
                : containsReadAlongPhonic
                ? hasLibraryPhonic
                  ? 'bg-green-500 border-2 border-green-600 text-white shadow-lg hover:bg-green-600'
                  : 'bg-green-200 border-2 border-green-300 text-green-800 hover:bg-green-300'
                : hasWordRecording
                ? 'bg-blue-500 border-2 border-blue-600 text-white shadow-lg hover:bg-blue-600'
                : hasFocusRecording
                ? 'bg-teal-500 border-2 border-teal-600 text-white shadow-lg hover:bg-teal-600'
                : 'bg-gray-200 border-2 border-gray-300 text-gray-800 hover:bg-yellow-200 hover:border-yellow-400'
          }`}
          onMouseEnter={() => {
            const isValidWord = /^[a-zA-Z]+$/.test(cleanWord) && cleanWord.length > 0;
            if (isValidWord) {
              handleWordHover(cleanWord, index, sentenceId, focusPhonic, readAlongPhonic, wordRecording, recordedPhonic);
            }
          }}
          title={
            /^[a-zA-Z]+$/.test(cleanWord) && cleanWord.length > 0 
              ? containsFocusPhonic 
                ? recordedPhonic?.audio
                  ? `🎵 Focus phonic: "${cleanWord}" - Hover to play recorded "${focusPhonic}" sound! 🔊`
                  : `🎯 Focus phonic: "${cleanWord}" - No phonic recording available (silent)`
                : containsReadAlongPhonic
                ? hasLibraryPhonic
                  ? `📚 Read along phonic: "${cleanWord}" - Hover to play "${readAlongPhonic}" sound! 🔊`
                  : `📖 Read along phonic: "${cleanWord}" - No recording available (silent)`
                : hasWordRecording
                ? `🎤 Teacher recorded: "${cleanWord}" - Hover to play! 🔊`
                : hasFocusRecording
                ? `🎙️ Admin recorded: "${cleanWord}" - Hover to play! 🔊`
                : `📝 "${cleanWord}" - No recording available (ask teacher to record!) 🤫`
              : ''
          }
        >
          <span className="relative">
            {word}
            {/* Enhanced Recording Indicators */}
            {hasWordRecording && (
              <span className="absolute -top-1 -right-1 text-xs bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-lg">
                🎤
              </span>
            )}
            {!hasWordRecording && containsFocusPhonic && recordedPhonic?.audio && (
              <span className="absolute -top-1 -right-1 text-xs bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-lg">
                🎵
              </span>
            )}
            {!hasWordRecording && !containsFocusPhonic && hasLibraryPhonic && (
              <span className="absolute -top-1 -right-1 text-xs bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-lg">
                📚
              </span>
            )}
            {!hasWordRecording && !containsFocusPhonic && !hasLibraryPhonic && hasFocusRecording && (
              <span className="absolute -top-1 -right-1 text-xs bg-teal-600 text-white rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-lg">
                �️
              </span>
            )}
            {!hasAnyRecording && (
              <span className="absolute -top-1 -right-1 text-xs bg-gray-400 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-50">
                🤫
              </span>
            )}
          </span>
        </span>
      );
    });
  };

  // Enhanced render function using new audio components
  const renderEnhancedText = (text, textType = 'text') => {
    // Get relevant audio attachments for this text
    const textAttachments = attachments.filter(attachment => {
      const voiceRecording = attachment.voiceRecording;
      if (!voiceRecording) return false;

      // Match based on type and content
      if (textType === 'phonics' && voiceRecording.type === 'phonics') {
        return voiceRecording.title?.toLowerCase().includes(lesson.missingPhonic || lesson.phonic);
      }
      
      return voiceRecording.type === textType || voiceRecording.type === 'text';
    });

    if (textType === 'phonics') {
      // For phonics lessons, use the EnhancedPhonics component
      const phonicsData = {
        letter: lesson.missingPhonic || lesson.phonic,
        sound: lesson.missingPhonic || lesson.phonic,
        name: lesson.title,
      };
      
      return (
        <EnhancedPhonics
          phonicsData={phonicsData}
          audioAttachments={textAttachments}
          onPlayAudio={playAudio}
          currentlyPlaying={currentlyPlayingId}
          showLetterAudio={true}
          showSoundAudio={true}
          className="mb-6"
        />
      );
    }

    // For regular text, use EnhancedText component
    return (
      <EnhancedText
        text={text}
        audioAttachments={textAttachments}
        onPlayAudio={playAudio}
        currentlyPlaying={currentlyPlayingId}
        highlightedWords={[lesson.missingPhonic || lesson.phonic]}
        showWordAudio={true}
        showTextAudio={true}
        className="text-lg leading-relaxed"
      />
    );
  };  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Enhanced Audio Guide Panel */}
      <div className="mb-6 bg-gradient-to-r from-purple-100 to-pink-100 border-4 border-purple-300 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-500 rounded-full p-2 animate-bounce">
            <span className="text-2xl">🎧</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-purple-700">🌟 Audio Adventure Guide! 🌟</h3>
            <p className="text-lg text-purple-600">Hover over colorful words to hear amazing sounds! 🚀</p>
          </div>
        </div>
        
        {/* Colorful Legend */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl p-4 border-2 border-blue-300 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full font-bold">🎤 Blue</span>
              <span className="text-blue-700 font-medium">Teacher's Voice!</span>
            </div>
            <p className="text-sm text-blue-600">Your teacher recorded these words just for you! 🥰</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 border-2 border-purple-300 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-purple-500 text-white px-3 py-1 rounded-full font-bold">🎵 Purple</span>
              <span className="text-purple-700 font-medium">Focus Sounds!</span>
            </div>
            <p className="text-sm text-purple-600">Special sounds your teacher wants you to practice! 🎯</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 border-2 border-green-300 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-green-500 text-white px-3 py-1 rounded-full font-bold">📚 Green</span>
              <span className="text-green-700 font-medium">Phonic Library!</span>
            </div>
            <p className="text-sm text-green-600">Sounds from our phonics library! 📖</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 border-2 border-teal-300 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-teal-500 text-white px-3 py-1 rounded-full font-bold">🎙️ Teal</span>
              <span className="text-teal-700 font-medium">Practice Recordings!</span>
            </div>
            <p className="text-sm text-teal-600">Extra practice recordings made by your teacher! 🌟</p>
          </div>
        </div>

        {/* Recording Statistics */}
        {(lesson.wordRecordings?.mainText || lesson.wordRecordings?.pages || recordedPhonic) && (
          <div className="bg-white rounded-xl p-4 border-2 border-yellow-300">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📊</span>
              <h4 className="text-lg font-bold text-yellow-700">Your Audio Collection:</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {lesson.text && lesson.wordRecordings?.mainText && (
                <div className="bg-blue-100 rounded-lg p-3 border-2 border-blue-200">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500 text-xl">🎤</span>
                    <div>
                      <div className="font-bold text-blue-700">{Object.keys(lesson.wordRecordings.mainText).length}</div>
                      <div className="text-xs text-blue-600">Teacher Words</div>
                    </div>
                  </div>
                </div>
              )}
              
              {lesson.pages && lesson.wordRecordings?.pages && (
                <div className="bg-green-100 rounded-lg p-3 border-2 border-green-200">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 text-xl">📚</span>
                    <div>
                      <div className="font-bold text-green-700">
                        {Object.values(lesson.wordRecordings.pages).reduce((total, page) => total + Object.keys(page).length, 0)}
                      </div>
                      <div className="text-xs text-green-600">Sentence Words</div>
                    </div>
                  </div>
                </div>
              )}
              
              {recordedPhonic && (
                <div className="bg-purple-100 rounded-lg p-3 border-2 border-purple-200">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-500 text-xl">🎵</span>
                    <div>
                      <div className="font-bold text-purple-700">1</div>
                      <div className="text-xs text-purple-600">Special Sound</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Fun Instruction */}
        <div className="mt-4 bg-yellow-200 rounded-xl p-3 border-2 border-yellow-400">
          <p className="text-center text-yellow-800 font-medium">
            ✨ Hover your mouse over the colorful word bubbles to hear them! ✨
          </p>
        </div>
      </div>

      {/* Read Along Section - MOVED TO TOP */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📖 Read Along (hover over words to hear them):
        </label>
        <div className="space-y-4">
          {/* Main lesson text if no pages */}
          {(!lesson.pages || lesson.pages.length === 0) && lesson.text && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="lesson-main-text bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">📖 Main Lesson Content:</span>
                </div>
                
                {/* Audio Status */}
                {audioLoading && (
                  <div className="mb-4 text-center">
                    <span className="text-blue-600">🔄 Loading audio attachments...</span>
                  </div>
                )}
                
                {audioError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600">
                    ⚠️ Error loading audio: {audioError}
                  </div>
                )}

                {/* Enhanced Phonics Display */}
                {lesson.missingPhonic || lesson.phonic ? (
                  <div className="mb-6">
                    {renderEnhancedText(lesson.text || lesson.sentence || 'Practice phonics', 'phonics')}
                  </div>
                ) : null}

                {/* Enhanced Text Content */}
                {lesson.text && (
                  <div className="mb-4">
                    {renderEnhancedText(lesson.text, 'text')}
                  </div>
                )}
              </div>
              {lesson.readAlongPhonic && (
                <div className="mt-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1">
                  🎵 Read along phonic: "{lesson.readAlongPhonic}" (highlighted in green, plays phonic sound on hover)
                  {lesson.readAlongDisplayText && (
                    <div 
                      className="mt-2 inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-2 rounded-full border border-blue-300 cursor-pointer hover:bg-blue-200 hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                      onMouseEnter={() => {
                        if (audioSupport?.canSpeak) {
                          console.log('Attempting to speak:', lesson.readAlongDisplayText);
                          // Check if the display text contains a phonic that should be pronounced as a sound
                          const phonicMatch = lesson.readAlongDisplayText.match(/\b(ph|th|sh|ch|ck|ng|qu|wh|kn|wr|gh|oa|ee|ai|ay|ow|ou|oo|ar|er|ir|or|ur)\b/i);
                          if (phonicMatch) {
                            console.log('Found phonic:', phonicMatch[0], 'using phonic settings');
                            // Play the phonic sound with enhanced settings
                            speakText(phonicMatch[0], {
                              ...SPEECH_SETTINGS.phonic,
                              rate: 0.5, // Even slower for phonics
                              pitch: 1.2, // Higher pitch for emphasis
                              volume: 1.0
                            });
                          } else {
                            console.log('No phonic found, using default settings');
                            // Play the regular text
                            speakText(lesson.readAlongDisplayText, SPEECH_SETTINGS.default);
                          }
                        } else {
                          console.log('Audio support not available');
                        }
                      }}
                      title="Hover to hear this message (phonics will play as sounds) 🔊"
                    >
                      🎵 {lesson.readAlongDisplayText}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Enhanced Individual pages/sentences */}
          {lesson.pages && lesson.pages.length > 0 && lesson.pages.map((page, index) => {
            const pageId = page.id || `page-${index}`;
            return (
              <div key={pageId} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">📄 Page {index + 1}:</span>
                </div>
                
                {/* Enhanced Page Content */}
                {renderEnhancedText(page.content, 'text')}
                {page.focusPhonic && (
                  <div className="mt-2 text-sm text-purple-600 bg-purple-50 border border-purple-200 rounded px-2 py-1">
                    🎯 Focus phonic: "{page.focusPhonic}" {(page.recordedPhonic || recordedPhonic) ? '🎵 (plays recorded sound on hover)' : '(silent - no recording)'}
                    {(page.recordedPhonic || recordedPhonic) && (
                      <button
                        className="ml-3 inline-block bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full border border-purple-300 cursor-pointer hover:bg-purple-200 hover:shadow-lg transition-all duration-200"
                        onClick={() => {
                          const recordedPhonicData = page.recordedPhonic || recordedPhonic;
                          if (recordedPhonicData?.audio) {
                            console.log(`🎵 Playing test recorded phonic "${page.focusPhonic}"`);
                            const audio = new Audio(recordedPhonicData.audio);
                            audio.play();
                          }
                        }}
                        title={`Test recorded "${page.focusPhonic}" sound`}
                      >
                        🎵 Test Sound
                      </button>
                    )}
                    {lesson.readAlongDisplayText && (
                      <div 
                        className="mt-2 inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-2 rounded-full border border-blue-300 cursor-pointer hover:bg-blue-200 hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                        onMouseEnter={() => {
                          if (audioSupport?.canSpeak) {
                            console.log('Attempting to speak:', lesson.readAlongDisplayText);
                            // Check if the display text contains a phonic that should be pronounced as a sound
                            const phonicMatch = lesson.readAlongDisplayText.match(/\b(ph|th|sh|ch|ck|ng|qu|wh|kn|wr|gh|oa|ee|ai|ay|ow|ou|oo|ar|er|ir|or|ur)\b/i);
                            if (phonicMatch) {
                              console.log('Found phonic:', phonicMatch[0], 'using phonic settings');
                              // Play the phonic sound with enhanced settings
                              speakText(phonicMatch[0], {
                                ...SPEECH_SETTINGS.phonic,
                                rate: 0.5, // Even slower for phonics
                                pitch: 1.2, // Higher pitch for emphasis
                                volume: 1.0
                              });
                            } else {
                              console.log('No phonic found, using default settings');
                              // Play the regular text
                              speakText(lesson.readAlongDisplayText, SPEECH_SETTINGS.default);
                            }
                          } else {
                            console.log('Audio support not available');
                          }
                        }}
                        title="Hover to hear this message (phonics will play as sounds) 🔊"
                      >
                        🎵 {lesson.readAlongDisplayText}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Enhanced Fallback to main text if both are missing */}
          {(!lesson.pages || lesson.pages.length === 0) && !lesson.text && lesson.sentence && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">📝 Practice Sentence:</span>
              </div>
              
              {/* Enhanced Sentence Content */}
              {renderEnhancedText(lesson.sentence, 'text')}
              {lesson.readAlongPhonic && (
                <div className="mt-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1">
                  🎵 Read along phonic: "{lesson.readAlongPhonic}" (highlighted in green, plays phonic sound on hover)
                  {lesson.readAlongDisplayText && (
                    <div 
                      className="mt-2 inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-2 rounded-full border border-blue-300 cursor-pointer hover:bg-blue-200 hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                      onMouseEnter={() => {
                        if (audioSupport?.canSpeak) {
                          console.log('Attempting to speak:', lesson.readAlongDisplayText);
                          // Check if the display text contains a phonic that should be pronounced as a sound
                          const phonicMatch = lesson.readAlongDisplayText.match(/\b(ph|th|sh|ch|ck|ng|qu|wh|kn|wr|gh|oa|ee|ai|ay|ow|ou|oo|ar|er|ir|or|ur)\b/i);
                          if (phonicMatch) {
                            console.log('Found phonic:', phonicMatch[0], 'using phonic settings');
                            // Play the phonic sound with enhanced settings
                            speakText(phonicMatch[0], {
                              ...SPEECH_SETTINGS.phonic,
                              rate: 0.5, // Even slower for phonics
                              pitch: 1.2, // Higher pitch for emphasis
                              volume: 1.0
                            });
                          } else {
                            console.log('No phonic found, using default settings');
                            // Play the regular text
                            speakText(lesson.readAlongDisplayText, SPEECH_SETTINGS.default);
                          }
                        } else {
                          console.log('Audio support not available');
                        }
                      }}
                      title="Hover to hear this message (phonics will play as sounds) 🔊"
                    >
                      🎵 {lesson.readAlongDisplayText}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            💡 Move your mouse over each word to hear its pronunciation
          </p>
        </div>
      </div>
      
      {/* Audio Support Warning */}
      {audioSupport && !audioSupport.fullSupport && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded-lg mb-4">
          <p style={{fontSize: '16px'}}>⚠️ Limited audio support detected. Some features may not work properly.</p>
        </div>
      )}

      {/* Voice Quality Indicator */}
      {voiceReady && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-4">
          <p style={{fontSize: '16px'}}>🎤 High-quality voice ready for natural speech synthesis</p>
        </div>
      )}
      
      {/* Enhanced Phonics Info with Recorded Audio */}
      {PHONICS_LIBRARY[lesson.missingPhonic || lesson.phonic] && (
        <div className="bg-gradient-to-r from-green-100 to-blue-100 border-4 border-green-300 rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-500 rounded-full p-2 animate-pulse">
              <span className="text-3xl">🎯</span>
            </div>
            <div>
              <h4 className="text-2xl font-bold text-green-800">
                🌟 Learning about "{lesson.missingPhonic || lesson.phonic}" 🌟
              </h4>
              <p className="text-lg text-green-600">Let's discover this amazing sound!</p>
            </div>
          </div>

          {/* Phonic Sound Player */}
          {recordedPhonic?.audio && (
            <div className="bg-white rounded-xl p-4 mb-4 border-3 border-purple-300 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎵</span>
                  <div>
                    <h5 className="font-bold text-purple-700">Your Teacher's Special Recording!</h5>
                    <p className="text-purple-600">Click to hear the "{lesson.missingPhonic || lesson.phonic}" sound!</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    console.log(`🎵 Playing recorded phonic: "${lesson.missingPhonic || lesson.phonic}"`);
                    const audio = new Audio(recordedPhonic.audio);
                    audio.play().catch(error => console.error('Error playing phonic:', error));
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  🔊 Play Sound!
                </button>
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-xl p-4 mb-4 border-2 border-blue-300">
            <h5 className="font-bold text-blue-800 mb-3 text-xl">💡 Teacher's Tip:</h5>
            <p className="text-blue-700 text-lg leading-relaxed">
              {PHONICS_LIBRARY[lesson.missingPhonic || lesson.phonic].tips}
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-4 border-2 border-yellow-300">
            <h5 className="font-bold text-yellow-800 mb-3 text-xl">🌈 Practice Words:</h5>
            <div className="flex flex-wrap gap-2">
              {getAllWordsForPhonic(lesson.missingPhonic || lesson.phonic).map((word, index) => {
                // Check if this word has a recording
                const wordHasRecording = lesson.focusRecordings?.[word.toLowerCase()] || 
                                       lesson.wordRecordings?.mainText?.[index] ||
                                       PHONICS_LIBRARY[lesson.missingPhonic || lesson.phonic]?.wordRecordings?.[word];
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (wordHasRecording) {
                        console.log(`🎤 Playing recorded word: "${word}"`);
                        const audioUrl = lesson.focusRecordings?.[word.toLowerCase()]?.audio ||
                                       lesson.wordRecordings?.mainText?.[index]?.audio ||
                                       PHONICS_LIBRARY[lesson.missingPhonic || lesson.phonic]?.wordRecordings?.[word];
                        if (audioUrl) {
                          const audio = new Audio(audioUrl);
                          audio.play().catch(error => console.error('Error playing word:', error));
                        }
                      } else {
                        console.log(`📝 Word "${word}" - no recording available`);
                        setFeedback(`📝 "${word}" - Ask your teacher to record this word! 🎤`);
                        setTimeout(() => setFeedback(''), 2000);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                      wordHasRecording
                        ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg border-2 border-green-600'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-2 border-gray-400'
                    }`}
                    title={wordHasRecording ? `🎤 "${word}" - Click to hear recording!` : `📝 "${word}" - No recording yet`}
                  >
                    {word} {wordHasRecording ? '🎤' : '🤫'}
                  </button>
                );
              })}
              {getAllWordsForPhonic(lesson.missingPhonic || lesson.phonic).length === 0 && (
                <div className="text-gray-500 italic bg-gray-100 p-3 rounded-lg">
                  <span className="text-2xl mr-2">📚</span>
                  No practice words available for this phonic yet!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audio Attachments Summary */}
      {attachments && attachments.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-3">🎵 Audio Available for This Lesson</h4>
          <div className="grid gap-2">
            {attachments.map(attachment => (
              <div key={attachment.id} className="flex items-center justify-between bg-white rounded p-2 border">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {attachment.voiceRecording?.type === 'phonics' ? '🎯' : 
                     attachment.voiceRecording?.type === 'word' ? '🔤' : '📖'}
                  </span>
                  <span className="font-medium">{attachment.voiceRecording?.title}</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {attachment.voiceRecording?.type}
                  </span>
                </div>
                <button
                  onClick={() => playAudio(attachment.id)}
                  disabled={loadingStates[attachment.id]}
                  className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  title="Play this audio"
                >
                  {loadingStates[attachment.id] ? '⏳' : 
                   currentlyPlayingId === attachment.id ? '⏸️' : '▶️'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phonics Recording Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🎯 Record yourself saying: <strong className="text-lg text-blue-600">{lesson.missingPhonic || lesson.phonic}</strong>
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          {!isRecording && !audioBlob && !processingAudio && (
            <div className="flex justify-center items-center">
              <button
                onClick={startRecording}
                disabled={!audioSupport?.canRecord}
                className="bg-red-500 hover:bg-green-500 text-white px-8 py-4 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontSize: '24px', fontWeight: 'bold' }}
              >
                Record
              </button>
            </div>
          )}
          
          {isRecording && (
            <div>
              <div className="animate-pulse text-red-500 mb-3 text-lg">
                🔴 Recording in progress...
              </div>
              <div className="w-12 h-12 mx-auto mb-3">
                <div className="w-full h-full border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <button
                onClick={stopRecording}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
              >
                ⏹️ Stop Recording
              </button>
            </div>
          )}

          {processingAudio && (
            <div>
              <div className="animate-pulse text-blue-500 mb-3">
                🔄 Analyzing your pronunciation...
              </div>
              <div className="w-8 h-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {audioBlob && !processingAudio && (
            <div>
              <div className="mb-3">
                <audio controls src={URL.createObjectURL(audioBlob)} className="mx-auto" />
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={resetRecording}
                  className="btn-outline-multicolor"
                >
                  🔄 Record Again
                </button>
                {savedRecording && (
                  <button
                    onClick={playUserRecording}
                    className="btn-multicolor"
                  >
                    � Play My Recording
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Associated Images */}
      {lesson.imageFiles && lesson.imageFiles.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🖼️ Lesson Images:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lesson.imageFiles.map((image, index) => (
              <div key={image.id || index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="aspect-video bg-white rounded-lg mb-2 flex items-center justify-center border-2 border-dashed border-gray-300">
                  {image.file ? (
                    <img 
                      src={URL.createObjectURL(image.file)} 
                      alt={image.name}
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-gray-500 text-center">
                      <span style={{fontSize: '32px'}}>🖼️</span>
                      <p style={{fontSize: '14px'}}>{image.name}</p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 text-center truncate">{image.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* Feedback Section */}
      {feedback && (
        <div className={`p-4 rounded-lg mb-4 ${
          testResult === 'success' 
            ? 'bg-green-100 border border-green-300 text-green-700'
            : testResult === 'fail'
            ? 'bg-red-100 border border-red-300 text-red-700'
            : 'bg-blue-100 border border-blue-300 text-blue-700'
        }`}>
          <p className="font-medium text-lg whitespace-pre-line">{feedback}</p>
          
          <div className="flex gap-3 mt-3 flex-wrap">
            
            {testResult === 'success' && (
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
              >
                📚 Continue to Next Lesson
              </button>
            )}
          </div>
        </div>
      )}

      {/* Word Practice Recording Section */}
      {getAllWordsForPhonic(lesson.missingPhonic || lesson.phonic).length > 0 && (
        <div className="mb-6">
          <h4 className="block text-sm font-medium text-gray-700 mb-3" style={{fontSize: '18px'}}>
            🗣️ Practice Recording Words
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {getAllWordsForPhonic(lesson.missingPhonic || lesson.phonic).map((word, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                <div className="font-medium text-gray-800 mb-2" style={{fontSize: '16px'}}>{word}</div>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (!isRecording) {
                        setFeedback(`🎤 Recording "${word}" - speak clearly and click "Stop Recording" when done`);
                        startRecording();
                      } else {
                        stopRecording();
                      }
                    }}
                    className={`w-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white px-2 py-1 rounded text-xs transition-colors`}
                    disabled={!audioSupport?.canRecord || processingAudio}
                  >
                    {isRecording ? '⏹️ Stop' : '🎤 Record'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-gray-600 italic">
            💡 Click "Record" to practice saying each word yourself
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-2">📋 Instructions:</h4>
        <ol className="text-sm text-gray-600 space-y-1">
          <li>1. 🎤 Click "Start Recording" and clearly say: <strong>{lesson.missingPhonic || lesson.phonic}</strong></li>
          <li>2. ⏹️ Click "Stop Recording" when finished</li>
          <li>3. � Play back your recording to hear how you sound</li>
          <li>4. �🖱️ Hover over words in the sentence to hear their pronunciation</li>
          <li>5. 📊 Get instant feedback on your pronunciation accuracy</li>
          <li>6. 🔄 Try again if needed to improve your score</li>
          <li>7. ✅ Recordings are automatically saved during practice and deleted when lesson is completed</li>
        </ol>
      </div>
    </div>
  );
}