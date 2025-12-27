'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LessonBlockRenderer from '../../../../components/LessonBlockRenderer';
import LessonAudioPlayer from '../../../../components/LessonAudioPlayer';

export default function StudentLessonViewer() {
  const params = useParams();
  const router = useRouter();
  const { lessonId } = params;
  
  const [lesson, setLesson] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (lessonId) {
      loadLesson();
    }
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/lessons/${lessonId}`);
      if (!response.ok) {
        throw new Error('Failed to load lesson');
      }
      
      const lessonData = await response.json();
      setLesson(lessonData);
      
      // Ensure lesson has pages
      if (!lessonData.pages || lessonData.pages.length === 0) {
        setError('This lesson has no pages to display');
      }
    } catch (err) {
      console.error('Error loading lesson:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToNextPage = () => {
    if (lesson && currentPageIndex < lesson.pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const goToPage = (index) => {
    if (lesson && index >= 0 && index < lesson.pages.length) {
      setCurrentPageIndex(index);
    }
  };

  const goBackToLessons = () => {
    router.push('/student');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading lesson...</p>
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
            onClick={goBackToLessons}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Back to Lessons
          </button>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return null;
  }

  const currentPage = lesson.pages[currentPageIndex];
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === lesson.pages.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={goBackToLessons}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
              Back to Lessons
            </button>
            
            <div className="text-center flex-1 mx-4">
              <h1 className="text-xl font-bold text-gray-800">{lesson.title}</h1>
              <p className="text-sm text-gray-600">
                Page {currentPageIndex + 1} of {lesson.pages.length}
              </p>
            </div>

            {/* Lesson-level audio */}
            <LessonAudioPlayer
              lessonId={lessonId}
              pageId={null}
              blockId={null}
              showControls={true}
              className="flex-shrink-0"
            />
          </div>
          
          {/* Page navigation dots */}
          {lesson.pages.length > 1 && (
            <div className="flex justify-center mt-4 gap-2">
              {lesson.pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToPage(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentPageIndex
                      ? 'bg-blue-500 scale-125'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Page content */}
          <div className="p-8">
            {/* Page title */}
            {currentPage.title && (
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                {currentPage.title}
              </h2>
            )}

            {/* Page-level audio */}
            <div className="flex justify-center mb-6">
              <LessonAudioPlayer
                lessonId={lessonId}
                pageId={currentPage.id}
                blockId={null}
                showControls={true}
                className="w-full max-w-sm"
              />
            </div>

            {/* Page blocks */}
            {currentPage.blocks && currentPage.blocks.length > 0 ? (
              <div className="space-y-6">
                {currentPage.blocks.map((block) => (
                  <LessonBlockRenderer
                    key={block.id}
                    block={block}
                    lessonId={lessonId}
                    pageId={currentPage.id}
                  />
                ))}
              </div>
            ) : (
              // Fallback for legacy pages without blocks
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-900 mb-4 font-mono bg-purple-50 rounded-lg py-4 px-6 shadow-md inline-block">
                  {currentPage.content || 'No content available'}
                </div>
                {currentPage.focus && (
                  <p className="text-purple-700 text-sm">
                    Focus: {currentPage.focus}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="bg-gray-50 px-8 py-6">
            <div className="flex justify-between items-center">
              <button
                onClick={goToPreviousPage}
                disabled={isFirstPage}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isFirstPage
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
                Previous
              </button>

              <div className="text-center">
                <div className="text-2xl mb-2">
                  {isLastPage ? '🎉' : '📖'}
                </div>
                <p className="text-sm text-gray-600">
                  {isLastPage ? 'Great job!' : 'Keep going!'}
                </p>
              </div>

              <button
                onClick={goToNextPage}
                disabled={isLastPage}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isLastPage
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                Next
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}