'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LessonAudioPlayer from '../../components/LessonAudioPlayer';
import { isUserAuthenticated } from '../../utils/auth';

export default function StudentPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Function to get vibrant colors for lesson cards
  const getCardColor = (index) => {
    const colors = [
      { bg: 'from-red-400 to-red-500', border: 'border-red-300', text: 'text-red-900', emoji: '🔴' },
      { bg: 'from-blue-400 to-blue-500', border: 'border-blue-300', text: 'text-blue-900', emoji: '🔵' },
      { bg: 'from-green-400 to-green-500', border: 'border-green-300', text: 'text-green-900', emoji: '🟢' },
      { bg: 'from-yellow-400 to-yellow-500', border: 'border-yellow-300', text: 'text-yellow-900', emoji: '🟡' },
      { bg: 'from-purple-400 to-purple-500', border: 'border-purple-300', text: 'text-purple-900', emoji: '🟣' },
      { bg: 'from-pink-400 to-pink-500', border: 'border-pink-300', text: 'text-pink-900', emoji: '🩷' },
      { bg: 'from-orange-400 to-orange-500', border: 'border-orange-300', text: 'text-orange-900', emoji: '🟠' },
      { bg: 'from-teal-400 to-teal-500', border: 'border-teal-300', text: 'text-teal-900', emoji: '🔷' }
    ];
    return colors[index % colors.length];
  };

  useEffect(() => {
    const authenticated = isUserAuthenticated();
    setIsAuthenticated(authenticated);

    if (!authenticated) {
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      return;
    }

    // Clear localStorage cache of lessons since we're loading from API now
    localStorage.removeItem('phonics_lessons_data');
    
    loadLessons();
  }, [router]);

  const loadLessons = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/lessons');
      if (!response.ok) {
        throw new Error('Failed to load lessons');
      }
      
      const lessonsData = await response.json();
      
      // Sort lessons by order
      const sortedLessons = lessonsData.sort((a, b) => (a.order || 0) - (b.order || 0));
      setLessons(sortedLessons);
    } catch (err) {
      console.error('Error loading lessons:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openLesson = (lessonId) => {
    router.push(`/student/lessons/${lessonId}`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Required</h2>
          <p className="text-gray-600 mb-4">You need to log in to access the lessons.</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading lessons...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">😞</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadLessons}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🎓 Welcome to Your Lessons!
            </h1>
            <p className="text-gray-600">
              Choose a lesson to start learning and practicing phonics
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {lessons.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Lessons Available</h2>
            <p className="text-gray-600">
              There are no lessons available right now. Please check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson, index) => {
              const cardStyle = getCardColor(index);
              const pageCount = lesson.pages ? lesson.pages.length : 0;
              
              return (
                <div
                  key={lesson.id}
                  className={`bg-gradient-to-br ${cardStyle.bg} ${cardStyle.border} border-2 rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-200 cursor-pointer`}
                  onClick={() => openLesson(lesson.id)}
                >
                  {/* Card Header */}
                  <div className="bg-white bg-opacity-20 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{cardStyle.emoji}</span>
                      <span className="text-white text-sm font-semibold bg-black bg-opacity-20 px-2 py-1 rounded">
                        Lesson {lesson.order || index + 1}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 bg-white">
                    <h3 className={`text-xl font-bold ${cardStyle.text} mb-2 line-clamp-2`}>
                      {lesson.title}
                    </h3>
                    
                    {lesson.summary && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {lesson.summary}
                      </p>
                    )}

                    {/* Lesson details */}
                    <div className="space-y-2 mb-4">
                      {pageCount > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>📄</span>
                          <span>{pageCount} page{pageCount !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      
                      {lesson.phonics && lesson.phonics.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>🎵</span>
                          <span>Phonics: {lesson.phonics.join(', ')}</span>
                        </div>
                      )}
                      
                      {lesson.difficulty && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>⭐</span>
                          <span className="capitalize">{lesson.difficulty}</span>
                        </div>
                      )}
                    </div>

                    {/* Audio player */}
                    <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                      <LessonAudioPlayer
                        lessonId={lesson.id}
                        pageId={null}
                        blockId={null}
                        showControls={true}
                        className="w-full"
                      />
                    </div>

                    {/* Action button */}
                    <button 
                      className={`w-full py-3 px-4 bg-gradient-to-r ${cardStyle.bg} text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openLesson(lesson.id);
                      }}
                    >
                      Start Learning! 🚀
                    </button>

                    {/* Progress indicator */}
                    {lesson.completed && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-green-600 text-sm font-semibold">
                        <span>✅</span>
                        <span>Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Back to admin link */}
        <div className="text-center mt-12">
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
          >
            ← Back to Admin
          </button>
        </div>
      </div>
    </div>
  );
}