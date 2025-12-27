'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isUserAuthenticated, isUserAdmin } from '../../../../../utils/auth';

export default function LessonEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editLessonId = searchParams.get('edit');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Lesson data
  const [lesson, setLesson] = useState({
    id: '',
    title: '',
    summary: '',
    text: '',
    phonics: [],
    missingPhonic: '',
    difficulty: 'beginner',
    order: 1,
    completed: false,
    pages: []
  });

  // UI state
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [newPhonicInput, setNewPhonicInput] = useState('');

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

    if (editLessonId) {
      loadLesson(editLessonId);
    } else {
      // Initialize new lesson
      setLesson(prev => ({
        ...prev,
        pages: [createNewPage()]
      }));
    }
  }, [router, editLessonId]);

  const loadLesson = async (lessonId) => {
    try {
      setError(null);
      const response = await fetch(`/api/lessons/${lessonId}`);
      if (!response.ok) {
        throw new Error('Failed to load lesson');
      }
      
      const lessonData = await response.json();
      setLesson(lessonData);
      
      // Ensure lesson has at least one page
      if (!lessonData.pages || lessonData.pages.length === 0) {
        setLesson(prev => ({
          ...prev,
          pages: [createNewPage()]
        }));
      }
    } catch (err) {
      console.error('Error loading lesson:', err);
      setError(err.message);
    }
  };

  const createNewPage = () => ({
    id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: '',
    blocks: [createNewBlock()]
  });

  const createNewBlock = (type = 'text') => ({
    id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    content: '',
    order: 0
  });

  const updateLesson = (field, value) => {
    setLesson(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updatePage = (pageIndex, field, value) => {
    setLesson(prev => ({
      ...prev,
      pages: prev.pages.map((page, index) =>
        index === pageIndex ? { ...page, [field]: value } : page
      )
    }));
  };

  const updateBlock = (pageIndex, blockIndex, field, value) => {
    setLesson(prev => ({
      ...prev,
      pages: prev.pages.map((page, pIndex) =>
        pIndex === pageIndex
          ? {
              ...page,
              blocks: page.blocks.map((block, bIndex) =>
                bIndex === blockIndex ? { ...block, [field]: value } : block
              )
            }
          : page
      )
    }));
  };

  const addPage = () => {
    if (lesson.pages.length >= 7) {
      setError('Maximum 7 pages per lesson');
      return;
    }

    setLesson(prev => ({
      ...prev,
      pages: [...prev.pages, createNewPage()]
    }));
    setActivePageIndex(lesson.pages.length);
  };

  const deletePage = (pageIndex) => {
    if (lesson.pages.length <= 1) {
      setError('Lesson must have at least one page');
      return;
    }

    setLesson(prev => ({
      ...prev,
      pages: prev.pages.filter((_, index) => index !== pageIndex)
    }));
    
    if (activePageIndex >= lesson.pages.length - 1) {
      setActivePageIndex(Math.max(0, lesson.pages.length - 2));
    }
  };

  const addBlock = (pageIndex, blockType = 'text') => {
    setLesson(prev => ({
      ...prev,
      pages: prev.pages.map((page, index) =>
        index === pageIndex
          ? {
              ...page,
              blocks: [...page.blocks, createNewBlock(blockType)]
            }
          : page
      )
    }));
  };

  const deleteBlock = (pageIndex, blockIndex) => {
    setLesson(prev => ({
      ...prev,
      pages: prev.pages.map((page, pIndex) =>
        pIndex === pageIndex
          ? {
              ...page,
              blocks: page.blocks.filter((_, bIndex) => bIndex !== blockIndex)
            }
          : page
      )
    }));
  };

  const addPhonic = () => {
    if (newPhonicInput.trim() && !lesson.phonics.includes(newPhonicInput.trim())) {
      updateLesson('phonics', [...lesson.phonics, newPhonicInput.trim()]);
      setNewPhonicInput('');
    }
  };

  const removePhonic = (phonic) => {
    updateLesson('phonics', lesson.phonics.filter(p => p !== phonic));
  };

  const saveLesson = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate lesson
      if (!lesson.title.trim()) {
        throw new Error('Lesson title is required');
      }

      if (lesson.pages.length === 0) {
        throw new Error('Lesson must have at least one page');
      }

      // Clean up the lesson data
      const lessonData = {
        ...lesson,
        pages: lesson.pages.map((page, pageIndex) => ({
          ...page,
          blocks: page.blocks.map((block, blockIndex) => ({
            ...block,
            order: blockIndex
          }))
        }))
      };

      const url = editLessonId ? `/api/lessons/${editLessonId}` : '/api/lessons';
      const method = editLessonId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(lessonData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save lesson');
      }

      const savedLesson = await response.json();
      setSuccess(editLessonId ? 'Lesson updated successfully!' : 'Lesson created successfully!');
      
      if (!editLessonId) {
        // Redirect to edit mode for the new lesson
        router.push(`/admin/lessons/editor?edit=${savedLesson.id}`);
      }
    } catch (err) {
      console.error('Error saving lesson:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderBlockEditor = (page, pageIndex, block, blockIndex) => {
    return (
      <div key={block.id} className="border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Block {blockIndex + 1}</span>
            <select
              value={block.type}
              onChange={(e) => updateBlock(pageIndex, blockIndex, 'type', e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="text">Text</option>
              <option value="phonics">Phonics</option>
              <option value="word_list">Word List</option>
              <option value="image">Image</option>
              <option value="instructions">Instructions</option>
            </select>
          </div>
          <button
            onClick={() => deleteBlock(pageIndex, blockIndex)}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            🗑️ Delete
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content:
            </label>
            <textarea
              value={block.content}
              onChange={(e) => updateBlock(pageIndex, blockIndex, 'content', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              rows={block.type === 'word_list' ? 6 : 3}
              placeholder={getBlockPlaceholder(block.type)}
            />
          </div>

          {block.type === 'image' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alt text (optional):
              </label>
              <input
                type="text"
                value={block.alt || ''}
                onChange={(e) => updateBlock(pageIndex, blockIndex, 'alt', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Describe the image for accessibility"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const getBlockPlaceholder = (type) => {
    switch (type) {
      case 'phonics':
        return 'Enter a phonics sound (e.g., "sh", "ch", "th")';
      case 'word_list':
        return 'Enter words, one per line:\ncat\nhat\nbat';
      case 'text':
        return 'Enter reading text or story content';
      case 'image':
        return 'Enter image URL or path';
      case 'instructions':
        return 'Enter instructions for the student';
      default:
        return 'Enter content';
    }
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
          <p className="text-xl text-gray-600">Loading lesson editor...</p>
        </div>
      </div>
    );
  }

  const currentPage = lesson.pages[activePageIndex];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {editLessonId ? 'Edit Lesson' : 'Create New Lesson'}
              </h1>
              <p className="text-gray-600">Build multi-page lessons with content blocks</p>
            </div>
            
            <div className="flex gap-3">
              {lesson.id && (
                <button
                  onClick={() => router.push(`/student/lessons/${lesson.id}`)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  👀 Preview
                </button>
              )}
              
              <button
                onClick={saveLesson}
                disabled={saving}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                {saving ? '💾 Saving...' : '💾 Save'}
              </button>
              
              <button
                onClick={() => router.push('/admin/lessons')}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lesson Settings */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Lesson Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={lesson.title}
                    onChange={(e) => updateLesson('title', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter lesson title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Summary
                  </label>
                  <textarea
                    value={lesson.summary}
                    onChange={(e) => updateLesson('summary', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    rows={3}
                    placeholder="Brief description of the lesson"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Order
                    </label>
                    <input
                      type="number"
                      value={lesson.order}
                      onChange={(e) => updateLesson('order', parseInt(e.target.value) || 1)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty
                    </label>
                    <select
                      value={lesson.difficulty}
                      onChange={(e) => updateLesson('difficulty', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                {/* Phonics */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phonics
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newPhonicInput}
                      onChange={(e) => setNewPhonicInput(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-3 py-2"
                      placeholder="Add phonics sound"
                      onKeyPress={(e) => e.key === 'Enter' && addPhonic()}
                    />
                    <button
                      onClick={addPhonic}
                      className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lesson.phonics.map((phonic, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                      >
                        {phonic}
                        <button
                          onClick={() => removePhonic(phonic)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Missing Phonic
                  </label>
                  <input
                    type="text"
                    value={lesson.missingPhonic}
                    onChange={(e) => updateLesson('missingPhonic', e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter missing phonic sound"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Page Editor */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md">
              {/* Page tabs */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Pages</h2>
                  <button
                    onClick={addPage}
                    disabled={lesson.pages.length >= 7}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1 rounded text-sm font-medium"
                  >
                    + Add Page
                  </button>
                </div>
                
                <div className="flex gap-2 overflow-x-auto">
                  {lesson.pages.map((page, index) => (
                    <div key={page.id} className="flex items-center gap-1">
                      <button
                        onClick={() => setActivePageIndex(index)}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          index === activePageIndex
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Page {index + 1}
                      </button>
                      {lesson.pages.length > 1 && (
                        <button
                          onClick={() => deletePage(index)}
                          className="text-red-500 hover:text-red-700 text-sm ml-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Page content */}
              {currentPage && (
                <div className="p-6">
                  {/* Page title */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Title (optional)
                    </label>
                    <input
                      type="text"
                      value={currentPage.title}
                      onChange={(e) => updatePage(activePageIndex, 'title', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="Enter page title"
                    />
                  </div>

                  {/* Blocks */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-md font-semibold text-gray-800">Content Blocks</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => addBlock(activePageIndex, 'text')}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                        >
                          + Text
                        </button>
                        <button
                          onClick={() => addBlock(activePageIndex, 'phonics')}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm"
                        >
                          + Phonics
                        </button>
                        <button
                          onClick={() => addBlock(activePageIndex, 'word_list')}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                        >
                          + Words
                        </button>
                      </div>
                    </div>

                    <div>
                      {currentPage.blocks && currentPage.blocks.length > 0 ? (
                        currentPage.blocks.map((block, blockIndex) =>
                          renderBlockEditor(currentPage, activePageIndex, block, blockIndex)
                        )
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>No blocks yet. Add some content to get started!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}