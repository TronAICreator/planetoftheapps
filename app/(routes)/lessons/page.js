'use client';

import { useState, useEffect } from 'react';
import PhonicsLesson from '../../../components/PhonicsLesson';
import { isUserAuthenticated, clearUserSession } from '../../../utils/auth';
import { loadSynchronizedLessons } from '../../../utils/lessonSync';

export default function LessonsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Function to get vibrant solid colors for kids
  const getButtonColor = (index) => {
    const colors = [
      { bg: 'bg-red-500', hover: 'hover:bg-red-600', emoji: '🔴' },
      { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', emoji: '🔵' },
      { bg: 'bg-green-500', hover: 'hover:bg-green-600', emoji: '🟢' },
      { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', emoji: '🟡' },
      { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', emoji: '🟣' },
      { bg: 'bg-pink-500', hover: 'hover:bg-pink-600', emoji: '🩷' },
      { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', emoji: '🟠' },
      { bg: 'bg-teal-500', hover: 'hover:bg-teal-600', emoji: '🔷' }
    ];
    return colors[index % colors.length];
  };

  const loadLessonsFromAPI = async () => {
    try {
      const response = await fetch('/api/lessons');
      if (response.ok) {
        const lessonsData = await response.json();
        const sortedLessons = lessonsData.sort((a, b) => (a.order || 0) - (b.order || 0));
        setLessons(sortedLessons);
        
        if (sortedLessons.length > 0 && !selectedLesson) {
          setSelectedLesson(sortedLessons[0]);
        }
      } else {
        console.error('Failed to load lessons from API');
        setLessons([]);
      }
    } catch (error) {
      console.error('Error loading lessons:', error);
      setLessons([]);
    }
  };

  useEffect(() => {
    const authenticated = isUserAuthenticated();
    setIsAuthenticated(authenticated);
    setLoading(false);

    if (!authenticated) {
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return;
    }

    // Clear localStorage cache since lessons are now managed via API
    localStorage.removeItem('phonics_lessons_data');
    
    // Load lessons from API instead of localStorage
    loadLessonsFromAPI();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(45deg, #ff9a9e 0%, #fecfef 25%, #fecfef 50%, #a8edea 75%, #fed6e3 100%)'
      }}>
        <div className="bg-white p-12 rounded-3xl shadow-2xl text-center border-4 border-blue-400">
          <div className="mb-6">
            <span className="text-8xl animate-spin">🎡</span>
          </div>
          <h2 className="text-3xl font-bold text-blue-600 mb-4">Getting Your Lessons Ready! 🎯</h2>
          <p className="text-xl text-blue-500">Just a moment while we prepare your colorful adventure...</p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-bounce"></div>
            <div className="w-4 h-4 bg-yellow-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-4 h-4 bg-green-500 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(45deg, #ff9a9e 0%, #fecfef 25%, #fecfef 50%, #a8edea 75%, #fed6e3 100%)'
      }}>
        <div className="bg-white p-12 rounded-3xl shadow-2xl text-center border-4 border-red-400">
          <div className="mb-6">
            <span className="text-8xl">🔐</span>
          </div>
          <h2 className="text-3xl font-bold text-red-600 mb-4">Oops! Need to Login First! 🎪</h2>
          <p className="text-xl text-red-500">Don't worry, just login to start your colorful learning journey!</p>
          <div className="mt-6">
            <span className="text-6xl animate-bounce">🎨</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(45deg, #ff9a9e 0%, #fecfef 25%, #fecfef 50%, #a8edea 75%, #fed6e3 100%)'
    }}>
      <header className="bg-rainbow-gradient shadow-2xl" style={{
        background: 'linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3, #54a0ff)'
      }}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-full p-3 shadow-lg animate-bounce">
                <span className="text-5xl">🎓</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                  🌈 Phonics Academy 🌟
                </h1>
                <p className="text-white text-lg opacity-90 mt-1">
                  ✨ Learn, Play, and Grow! ✨
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                clearUserSession();
                window.location.href = "/login";
              }}
              className="px-8 py-4 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-all duration-200 font-bold shadow-xl hover:shadow-2xl transform hover:scale-110 text-lg border-4 border-white"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-yellow-400" style={{
              background: 'linear-gradient(145deg, #ffffff, #f0f8ff)'
            }}>
              <div className="flex items-center space-x-3 mb-8">
                <div className="bg-yellow-400 rounded-full p-2 animate-pulse">
                  <span className="text-3xl">📖</span>
                </div>
                <h2 className="text-2xl font-bold text-purple-600">My Lessons 🎯</h2>
              </div>
              
              {lessons.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mb-6">
                    <span className="text-6xl">🎪</span>
                  </div>
                  <h3 className="text-2xl font-bold text-purple-600 mb-3">Coming Soon! 🌟</h3>
                  <p className="text-lg text-purple-500">Exciting lessons are being prepared for you!</p>
                  <div className="mt-4 flex justify-center space-x-3">
                    <span className="text-3xl animate-bounce">🎨</span>
                    <span className="text-3xl animate-bounce delay-100">📚</span>
                    <span className="text-3xl animate-bounce delay-200">✨</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {lessons.map((lesson, index) => {
                    const colorScheme = getButtonColor(index);
                    const isSelected = selectedLesson?.id === lesson.id;
                    
                    return (
                      <div
                        key={lesson.id}
                        onClick={() => setSelectedLesson(lesson)}
                        className={`p-5 rounded-xl border-3 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xl ring-4 ring-indigo-300'
                            : `${colorScheme.bg} ${colorScheme.hover} text-white border-white shadow-lg hover:shadow-2xl hover:ring-4 hover:ring-opacity-50`
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{colorScheme.emoji}</span>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-white">
                              {lesson.title}
                            </h3>
                            {lesson.summary && (
                              <p className="text-sm mt-1 text-white opacity-90">
                                {lesson.summary}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <span className="text-2xl animate-bounce">⭐</span>
                          )}
                        </div>
                        {/* Progress indicator */}
                        <div className="mt-3">
                          <div className="bg-white bg-opacity-30 rounded-full h-2">
                            <div className={`${isSelected ? 'bg-yellow-300' : 'bg-white'} h-2 rounded-full transition-all duration-500`} 
                                 style={{ width: `${Math.random() * 80 + 20}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            {selectedLesson ? (
              <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-green-400" style={{
                background: 'linear-gradient(145deg, #ffffff, #f8faff)'
              }}>
                <div className="mb-6 p-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl text-white text-center">
                  <h2 className="text-2xl font-bold">🎉 {selectedLesson.title} 🎉</h2>
                  <p className="mt-2 text-lg opacity-90">Let's learn together! 📚✨</p>
                </div>
                <PhonicsLesson 
                  lesson={selectedLesson}
                  wordRecordings={selectedLesson.wordRecordings || { mainText: {}, pages: {} }}
                  recordedPhonic={selectedLesson.recordedPhonic}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-2xl p-12 text-center border-4 border-purple-400" style={{
                background: 'linear-gradient(145deg, #ffffff, #faf5ff)'
              }}>
                <div className="mb-6">
                  <span className="text-8xl animate-bounce">🎯</span>
                </div>
                <h3 className="text-3xl font-bold text-purple-600 mb-4">Ready to Learn? 🌟</h3>
                <p className="text-xl text-purple-500">Pick a colorful lesson to start your adventure! 🚀</p>
                <div className="mt-6 flex justify-center space-x-4">
                  <span className="text-4xl animate-pulse">📚</span>
                  <span className="text-4xl animate-pulse delay-100">✨</span>
                  <span className="text-4xl animate-pulse delay-200">🎨</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
