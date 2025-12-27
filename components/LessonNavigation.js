"use client";
import { useState } from 'react';

export default function LessonNavigation({ 
  lessons, 
  currentLesson, 
  currentPage, 
  onLessonChange, 
  onPageChange 
}) {
  const [isOpen, setIsOpen] = useState(true);

  const getCurrentLessonIndex = () => {
    return lessons.findIndex(lesson => lesson.id === currentLesson?.id);
  };

  const getCurrentPageIndex = () => {
    return currentLesson?.pages?.findIndex(page => page.id === currentPage?.id) || 0;
  };

  const canGoToNextPage = () => {
    const pageIndex = getCurrentPageIndex();
    return pageIndex < (currentLesson?.pages?.length - 1);
  };

  const canGoToPrevPage = () => {
    return getCurrentPageIndex() > 0;
  };

  const canGoToNextLesson = () => {
    const lessonIndex = getCurrentLessonIndex();
    const isLastPage = getCurrentPageIndex() === (currentLesson?.pages?.length - 1);
    return isLastPage && lessonIndex < (lessons.length - 1);
  };

  const canGoToPrevLesson = () => {
    const lessonIndex = getCurrentLessonIndex();
    const isFirstPage = getCurrentPageIndex() === 0;
    return isFirstPage && lessonIndex > 0;
  };

  const handleNextPage = () => {
    if (canGoToNextPage()) {
      const nextPageIndex = getCurrentPageIndex() + 1;
      onPageChange(currentLesson.pages[nextPageIndex]);
    } else if (canGoToNextLesson()) {
      const nextLessonIndex = getCurrentLessonIndex() + 1;
      const nextLesson = lessons[nextLessonIndex];
      onLessonChange(nextLesson);
      onPageChange(nextLesson.pages[0]);
    }
  };

  const handlePrevPage = () => {
    if (canGoToPrevPage()) {
      const prevPageIndex = getCurrentPageIndex() - 1;
      onPageChange(currentLesson.pages[prevPageIndex]);
    } else if (canGoToPrevLesson()) {
      const prevLessonIndex = getCurrentLessonIndex() - 1;
      const prevLesson = lessons[prevLessonIndex];
      onLessonChange(prevLesson);
      onPageChange(prevLesson.pages[prevLesson.pages.length - 1]);
    }
  };

  const isLessonAvailable = (lesson) => {
    const currentIndex = getCurrentLessonIndex();
    const lessonIndex = lessons.findIndex(l => l.id === lesson.id);
    return lessonIndex <= currentIndex || lesson.completed;
  };

  return (
    <div className="flex">
      {/* Main Content Area */}
      <div className="flex-1 pr-4">
        {/* Navigation Arrows */}
        <div className="flex justify-between items-center mb-6">
          {/* Previous Arrow */}
          <button
            onClick={handlePrevPage}
            disabled={!canGoToPrevPage() && !canGoToPrevLesson()}
            className={`group relative p-4 rounded-full transition-all duration-300 ${
              canGoToPrevPage() || canGoToPrevLesson()
                ? 'bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 shadow-lg hover:shadow-xl transform hover:scale-110 cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="text-white text-2xl font-bold transform group-hover:-translate-x-1 transition-transform">
              ←
            </div>
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{fontSize: '16px'}}>
              Previous
            </div>
          </button>

          {/* Page Indicator */}
          <div className="bg-white border-2 border-blue-300 rounded-full px-6 py-2 shadow-md">
            <span className="text-blue-600 font-bold" style={{fontSize: '24px'}}>
              Page {getCurrentPageIndex() + 1} of {currentLesson?.pages?.length || 1}
            </span>
          </div>

          {/* Next Arrow */}
          <button
            onClick={handleNextPage}
            disabled={!canGoToNextPage() && !canGoToNextLesson()}
            className={`group relative p-4 rounded-full transition-all duration-300 ${
              canGoToNextPage() || canGoToNextLesson()
                ? 'bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 shadow-lg hover:shadow-xl transform hover:scale-110 cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="text-white text-2xl font-bold transform group-hover:translate-x-1 transition-transform">
              →
            </div>
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{fontSize: '16px'}}>
              {canGoToNextPage() ? 'Next Page' : 'Next Lesson'}
            </div>
          </button>
        </div>

        {/* Content will be rendered by parent component */}
        <div className="lesson-content">
          {/* This will be filled by the parent component */}
        </div>
      </div>

      {/* Right Sidebar - Lesson Menu */}
      <div className={`transition-all duration-300 ${isOpen ? 'w-80' : 'w-12'}`}>
        <div className="bg-white border-l-2 border-blue-200 h-full p-4 shadow-lg">
          {/* Toggle Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="mb-4 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-200"
          >
            {isOpen ? '→' : '←'}
          </button>

          {isOpen && (
            <div>
              <h3 className="text-lg font-bold text-blue-600 mb-4 text-center">
                📚 Lesson Menu
              </h3>

              <div className="space-y-3">
                {lessons.map((lesson, index) => {
                  const isCurrentLesson = lesson.id === currentLesson?.id;
                  const isAvailable = isLessonAvailable(lesson);
                  
                  return (
                    <div key={lesson.id} className="relative">
                      <button
                        onClick={() => {
                          if (isAvailable) {
                            onLessonChange(lesson);
                            onPageChange(lesson.pages[0]);
                          }
                        }}
                        disabled={!isAvailable}
                        className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                          isCurrentLesson
                            ? 'bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg'
                            : isAvailable
                            ? 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium" style={{fontSize: '24px'}}>
                              Lesson {index + 1}
                            </div>
                            <div className="opacity-80" style={{fontSize: '16px'}}>
                              {lesson.title}
                            </div>
                          </div>
                          <div style={{fontSize: '24px'}}>
                            {lesson.completed ? '✅' : isCurrentLesson ? '🎯' : isAvailable ? '📖' : '🔒'}
                          </div>
                        </div>
                        
                        {/* Progress bar for current lesson */}
                        {isCurrentLesson && lesson.pages && (
                          <div className="mt-2 bg-white bg-opacity-30 rounded-full h-2">
                            <div 
                              className="bg-white rounded-full h-2 transition-all duration-300"
                              style={{
                                width: `${((getCurrentPageIndex() + 1) / lesson.pages.length) * 100}%`
                              }}
                            ></div>
                          </div>
                        )}
                      </button>

                      {/* Page dots for current lesson */}
                      {isCurrentLesson && lesson.pages && (
                        <div className="flex justify-center mt-2 space-x-1">
                          {lesson.pages.map((page, pageIndex) => (
                            <button
                              key={page.id}
                              onClick={() => onPageChange(page)}
                              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                pageIndex === getCurrentPageIndex()
                                  ? 'bg-orange-500'
                                  : pageIndex < getCurrentPageIndex()
                                  ? 'bg-green-500'
                                  : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress Summary */}
              <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2" style={{fontSize: '24px'}}>Progress</h4>
                <div className="text-blue-600" style={{fontSize: '22px'}}>
                  <div>Lesson {getCurrentLessonIndex() + 1} of {lessons.length}</div>
                  <div>Page {getCurrentPageIndex() + 1} of {currentLesson?.pages?.length || 1}</div>
                </div>
                
                <div className="mt-2 bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 rounded-full h-2 transition-all duration-300"
                    style={{
                      width: `${((getCurrentLessonIndex() * (currentLesson?.pages?.length || 1) + getCurrentPageIndex() + 1) / (lessons.reduce((total, l) => total + (l.pages?.length || 1), 0))) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}