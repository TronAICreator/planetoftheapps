// Student Audio Button - Small button for playing attached audio
'use client';

import { useState, useEffect } from 'react';

export default function StudentAudioButton({ 
  onPlay,
  isPlaying = false,
  disabled = false,
  size = 'sm',
  className = '',
  title = 'Play audio',
  variant = 'primary'
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    try {
      if (onPlay) {
        await onPlay();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    'xs': 'w-4 h-4 p-0.5',
    'sm': 'w-6 h-6 p-1',
    'md': 'w-8 h-8 p-1.5',
    'lg': 'w-10 h-10 p-2'
  };

  const variantClasses = {
    'primary': 'bg-blue-500 hover:bg-blue-600 text-white',
    'secondary': 'bg-gray-200 hover:bg-gray-300 text-gray-700',
    'phonics': 'bg-purple-500 hover:bg-purple-600 text-white',
    'word': 'bg-green-500 hover:bg-green-600 text-white',
    'text': 'bg-orange-500 hover:bg-orange-600 text-white'
  };

  const iconSize = {
    'xs': 'w-2 h-2',
    'sm': 'w-3 h-3', 
    'md': 'w-4 h-4',
    'lg': 'w-5 h-5'
  }[size];

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-full 
        flex items-center justify-center
        transition-all duration-200
        hover:scale-110
        active:scale-95
        disabled:opacity-50 
        disabled:cursor-not-allowed
        disabled:hover:scale-100
        shadow-sm
        ${className}
      `}
      title={title}
    >
      {isLoading ? (
        <div className={`${iconSize} border border-current border-t-transparent rounded-full animate-spin`} />
      ) : isPlaying ? (
        <svg className={iconSize} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className={iconSize} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}