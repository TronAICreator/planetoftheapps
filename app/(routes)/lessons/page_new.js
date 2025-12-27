"use client";
import { useState, useEffect } from 'react';
import { isUserAuthenticated, getUserRole } from '../../../utils/auth';
import PhonicsLesson from '../../../components/PhonicsLesson';
import { loadSynchronizedLessons, addLessonUpdateListener, removeLessonUpdateListener } from '../../../utils/lessonSync';

export default function LessonsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  // Load lessons and sync with admin updates
  const loadLessons = () => {
    try {
      const syncedLessons = loadSynchronizedLessons();
      setLessons(syncedLessons);
      console.log('📚 Student area loaded lessons:', syncedLessons.length, 'lessons');
      
      // Log recording statistics
      syncedLessons.forEach(lesson => {
        const mainRecordings = Object.keys(lesson.wordRecordings?.mainText || {}).length;
        const pageRecordings = Object.values(lesson.wordRecordings?.pages || {})
          .reduce((total, page) => total + Object.keys(page).length, 0);
        if (mainRecordings > 0 || pageRecordings > 0) {
          console.log(`🎤 "${lesson.title}" has ${mainRecordings} main text + ${pageRecordings} page recordings`);
        }
      });
    } catch (error) {
      console.error('Error loading lessons:', error);
    }
  };

  useEffect(() => {
    // Check authentication
    const authenticated = isUserAuthenticated();
    const role = getUserRole();
    
    setIsAuthenticated(authenticated);
    setUserRole(role);
    setLoading(false);

    if (!authenticated) {
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }

    // Load lessons data
    loadLessons();

    // Listen for lesson updates from admin area
    const handleLessonsUpdate = (event) => {
      console.log('🔄 Received lesson update from admin area');
      setLessons(event.detail.lessons);
    };

    addLessonUpdateListener(handleLessonsUpdate);

    // Load completed lessons from localStorage
    const saved = localStorage.getItem('completed_lessons');
    if (saved) {
      setCompletedLessons(new Set(JSON.parse(saved)));
    }

    return () => {
      removeLessonUpdateListener(handleLessonsUpdate);
    };
  }, []);

  const handleLessonComplete = (success, lessonId) => {
    if (success && lessonId) {
      const newCompleted = new Set(completedLessons);
      newCompleted.add(lessonId);
      setCompletedLessons(newCompleted);
      localStorage.setItem('completed_lessons', JSON.stringify([...newCompleted]));
      
      console.log('✅ Lesson completed:', lessonId);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="text-center">
          <p className="text-gray-600">Loading lessons...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="text-center">
          <h1 className="font-display text-4xl text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-700 mb-4">
            You must be logged in to access lessons.
          </p>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {!selectedLesson && (
        <>
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl text-brand-blue mb-4">
              Phonics Academy Lessons
            </h1>
            <p className="text-xl text-gray-600">
              Interactive phonics lessons with teacher recordings
            </p>
            {userRole === 'admin' && (
              <p className="text-sm text-blue-600 mt-2">
                🔧 Admin: You can manage lessons in the <a href="/admin" className="underline">Admin Dashboard</a>
              </p>
            )}
          </div>

          {/* Lesson Statistics */}
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-medium text-blue-800 mb-2">📊 Your Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{lessons.length}</div>
                <div className="text-sm text-blue-700">Total Lessons</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{completedLessons.size}</div>
                <div className="text-sm text-green-700">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {lessons.filter(lesson => 
                    Object.keys(lesson.wordRecordings?.mainText || {}).length > 0 ||
                    Object.values(lesson.wordRecordings?.pages || {}).reduce((total, page) => total + Object.keys(page).length, 0) > 0
                  ).length}
                </div>
                <div className="text-sm text-orange-700">With Teacher Voice</div>
              </div>
            </div>
          </div>

          {/* Lessons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => {
              const isCompleted = completedLessons.has(lesson.id);
              const mainRecordings = Object.keys(lesson.wordRecordings?.mainText || {}).length;
              const pageRecordings = Object.values(lesson.wordRecordings?.pages || {})
                .reduce((total, page) => total + Object.keys(page).length, 0);
              const hasTeacherVoice = mainRecordings > 0 || pageRecordings > 0;

              return (
                <div 
                  key={lesson.id} 
                  className={`bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                    isCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedLesson(lesson)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-medium text-gray-800">{lesson.title}</h3>
                    <div className="flex flex-col items-end gap-1">
                      {isCompleted && (
                        <span className="text-green-600 text-sm">✅ Complete</span>
                      )}
                      {hasTeacherVoice && (
                        <span className="text-blue-600 text-sm">🎤 Teacher Voice</span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{lesson.summary}</p>
                  
                  <div className="mb-3">
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

                  {hasTeacherVoice && (
                    <div className="mb-3 text-xs text-blue-600">
                      🎤 {mainRecordings} main words + {pageRecordings} practice words recorded
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {lesson.phonics?.map((phonic, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {phonic}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button className="w-full bg-brand-blue hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors duration-200">
                    {isCompleted ? 'Review Lesson' : 'Start Lesson'} →
                  </button>
                </div>
              );
            })}
          </div>

          {lessons.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No lessons available yet.</p>
              {userRole === 'admin' && (
                <p className="text-blue-600 mt-2">
                  <a href="/admin" className="underline">Create your first lesson in the Admin Dashboard</a>
                </p>
              )}
            </div>
          )}
        </>
      )}

      {selectedLesson && (
        <div>
          <button
            onClick={() => setSelectedLesson(null)}
            className="mb-6 text-brand-blue hover:text-blue-600 flex items-center gap-2 text-lg"
          >
            ← Back to Lessons
          </button>
          <PhonicsLesson 
            lesson={selectedLesson} 
            onComplete={(success) => handleLessonComplete(success, selectedLesson.id)}
          />
        </div>
      )}
    </div>
  );
}