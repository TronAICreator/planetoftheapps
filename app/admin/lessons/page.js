'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isUserAuthenticated, isUserAdmin } from '../../../../utils/auth';

export default function AdminLessonsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const authenticated = isUserAuthenticated();
    const adminStatus = isUserAdmin();
    
    setIsAuthenticated(authenticated);
    setIsAdmin(adminStatus);
    setLoading(false);

    if (!authenticated || !adminStatus) {
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      return;
    }

    loadLessons();
  }, [router]);

  const loadLessons = async () => {
    try {
      setError(null);
      const response = await fetch('/api/lessons');
      if (!response.ok) {
        throw new Error('Failed to load lessons');
      }
      
      const lessonsData = await response.json();
      setLessons(lessonsData.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (err) {
      console.error('Error loading lessons:', err);
      setError(err.message);
    }
  };

  const deleteLesson = async (lessonId) => {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return;
    }

    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete lesson');
      }

      await loadLessons();
    } catch (err) {
      console.error('Error deleting lesson:', err);
      setError(err.message);
    }
  };

  const openLessonEditor = (lesson = null) => {
    const lessonParam = lesson ? `?edit=${lesson.id}` : '';
    router.push(`/admin/lessons/editor${lessonParam}`);
  };

  const openStudentView = () => {
    router.push('/student');
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Access Required</h2>
          <p className="text-gray-600 mb-4">You need admin privileges to access this page.</p>
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading lessons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Lesson Management</h1>
              <p className="text-gray-600">Create and manage multi-page lessons with blocks and audio</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={openStudentView}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                👀 Student View
              </button>
              
              <button
                onClick={() => openLessonEditor()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                ➕ Create New Lesson
              </button>
              
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                ← Back to Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <span className="font-semibold">Error:</span>
              <span className="ml-2">{error}</span>
            </div>
          </div>
        )}

        {lessons.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Lessons Yet</h2>
            <p className="text-gray-600 mb-6">
              Get started by creating your first multi-page lesson!
            </p>
            <button
              onClick={() => openLessonEditor()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Create First Lesson
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => {
              const pageCount = lesson.pages ? lesson.pages.length : 0;
              const totalBlocks = lesson.pages ? lesson.pages.reduce((sum, page) => sum + (page.blocks ? page.blocks.length : 0), 0) : 0;
              
              return (
                <div key={lesson.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg line-clamp-2 mb-1">
                          {lesson.title}
                        </h3>
                        <p className="text-blue-100 text-sm">
                          Lesson {lesson.order || 'No order'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs font-medium">
                          {lesson.difficulty || 'No level'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {lesson.summary && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {lesson.summary}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center bg-gray-50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-blue-600">{pageCount}</div>
                        <div className="text-xs text-gray-600">Pages</div>
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-purple-600">{totalBlocks}</div>
                        <div className="text-xs text-gray-600">Blocks</div>
                      </div>
                    </div>

                    {/* Phonics */}
                    {lesson.phonics && lesson.phonics.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2">Phonics:</p>
                        <div className="flex flex-wrap gap-1">
                          {lesson.phonics.slice(0, 3).map((phonic, index) => (
                            <span
                              key={index}
                              className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full"
                            >
                              {phonic}
                            </span>
                          ))}
                          {lesson.phonics.length > 3 && (
                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                              +{lesson.phonics.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    <div className="mb-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                        lesson.completed
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {lesson.completed ? '✅ Completed' : '⏳ In Progress'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-gray-50 px-4 py-3 border-t">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openLessonEditor(lesson)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-2 rounded font-medium transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => router.push(`/student/lessons/${lesson.id}`)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-2 rounded font-medium transition-colors"
                      >
                        👀 Preview
                      </button>
                      <button
                        onClick={() => deleteLesson(lesson.id)}
                        className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-2 rounded font-medium transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}