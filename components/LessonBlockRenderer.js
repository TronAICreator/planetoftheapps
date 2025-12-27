'use client';

import { useState } from 'react';
import LessonAudioPlayer from './LessonAudioPlayer';

export default function LessonBlockRenderer({ 
  block, 
  lessonId, 
  pageId, 
  className = '' 
}) {
  const [imageError, setImageError] = useState(false);

  const renderBlockContent = () => {
    switch (block.type) {
      case 'phonics':
        return (
          <div className="phonics-block bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-200 rounded-lg p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-purple-800 mb-3">
                🎵 Phonics Practice
              </h3>
              <div className="text-4xl font-bold text-purple-900 mb-4 font-mono bg-white rounded-lg py-3 px-4 shadow-md">
                {block.content}
              </div>
              <p className="text-purple-700 text-sm">
                Practice saying this sound out loud!
              </p>
            </div>
          </div>
        );

      case 'word_list':
        const words = block.content.split('\n').filter(word => word.trim());
        return (
          <div className="word-list-block bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4 text-center">
              📝 Word Practice
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {words.map((word, index) => (
                <div
                  key={index}
                  className="bg-white border-2 border-green-200 rounded-lg p-3 text-center font-semibold text-green-900 hover:bg-green-50 transition-colors cursor-pointer"
                >
                  {word.trim()}
                </div>
              ))}
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="text-block bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-orange-800 mb-4 text-center">
              📖 Reading Text
            </h3>
            <div className="bg-white rounded-lg p-4 shadow-md">
              <p className="text-lg leading-relaxed text-gray-800 whitespace-pre-wrap">
                {block.content}
              </p>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="image-block bg-gradient-to-r from-indigo-100 to-purple-100 border-2 border-indigo-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-indigo-800 mb-4 text-center">
              🖼️ Picture
            </h3>
            <div className="text-center">
              {!imageError ? (
                <img
                  src={block.content}
                  alt={block.alt || 'Lesson image'}
                  className="max-w-full h-auto max-h-96 mx-auto rounded-lg shadow-md"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="bg-white border-2 border-dashed border-indigo-300 rounded-lg p-8 text-indigo-600">
                  <div className="text-4xl mb-2">🖼️</div>
                  <p>Image not available</p>
                  <p className="text-sm text-gray-500 mt-1">{block.content}</p>
                </div>
              )}
              {block.caption && (
                <p className="mt-3 text-indigo-700 font-medium">{block.caption}</p>
              )}
            </div>
          </div>
        );

      case 'instructions':
        return (
          <div className="instructions-block bg-gradient-to-r from-cyan-100 to-teal-100 border-2 border-cyan-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-cyan-800 mb-4 text-center">
              ℹ️ Instructions
            </h3>
            <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-cyan-400">
              <p className="text-gray-800 whitespace-pre-wrap">
                {block.content}
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="unknown-block bg-gray-100 border-2 border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-600 mb-4">
              ❓ Unknown Block Type: {block.type}
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {block.content}
            </p>
          </div>
        );
    }
  };

  return (
    <div className={`lesson-block mb-6 ${className}`}>
      {/* Block content */}
      {renderBlockContent()}
      
      {/* Audio player for this specific block */}
      <div className="mt-4 flex justify-center">
        <LessonAudioPlayer
          lessonId={lessonId}
          pageId={pageId}
          blockId={block.id}
          className="w-full max-w-xs"
        />
      </div>
    </div>
  );
}