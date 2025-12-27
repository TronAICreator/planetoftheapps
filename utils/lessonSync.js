/**
 * Lesson Data Synchronization Utility
 * Provides shared access to lesson data between admin and student areas
 */

import defaultLessons from '../data/lessons.json';

const STORAGE_KEY = 'phonics_lessons_data';
const UPDATE_EVENT = 'lessonsUpdated';

/**
 * Load synchronized lesson data
 * Returns lessons from localStorage with fallback to default lessons
 */
export const loadSynchronizedLessons = () => {
  try {
    const savedLessons = localStorage.getItem(STORAGE_KEY);
    if (savedLessons) {
      const parsedLessons = JSON.parse(savedLessons);
      console.log('📚 Loaded synchronized lessons from storage:', parsedLessons.length, 'lessons');
      return parsedLessons;
    } else {
      // Initialize with default lessons and add wordRecordings structure
      const initializedLessons = defaultLessons.map(lesson => ({
        ...lesson,
        wordRecordings: lesson.wordRecordings || { mainText: {}, pages: {} }
      }));
      saveSynchronizedLessons(initializedLessons);
      console.log('📚 Initialized lessons with word recording structure:', initializedLessons.length, 'lessons');
      return initializedLessons;
    }
  } catch (error) {
    console.error('Error loading synchronized lessons:', error);
    return defaultLessons.map(lesson => ({
      ...lesson,
      wordRecordings: { mainText: {}, pages: {} }
    }));
  }
};

/**
 * Save lesson data to synchronized storage
 * Persists lessons to localStorage and notifies other components
 */
export const saveSynchronizedLessons = (lessons) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
    console.log('💾 Saved synchronized lessons:', lessons.length, 'lessons');
    
    // Trigger a custom event so other components can listen for updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { 
        detail: { lessons: lessons } 
      }));
    }
  } catch (error) {
    console.error('Error saving synchronized lessons:', error);
  }
};

/**
 * Get a specific lesson by ID
 */
export const getLessonById = (lessonId) => {
  const lessons = loadSynchronizedLessons();
  return lessons.find(lesson => lesson.id === lessonId);
};

/**
 * Update a specific lesson
 */
export const updateLesson = (lessonId, updates) => {
  try {
    const lessons = loadSynchronizedLessons();
    const updatedLessons = lessons.map(lesson =>
      lesson.id === lessonId
        ? { ...lesson, ...updates }
        : lesson
    );
    saveSynchronizedLessons(updatedLessons);
    return updatedLessons;
  } catch (error) {
    console.error('Error updating lesson:', error);
    throw error;
  }
};

/**
 * Add a new lesson
 */
export const addLesson = (newLesson) => {
  try {
    const lessons = loadSynchronizedLessons();
    const lessonWithDefaults = {
      ...newLesson,
      wordRecordings: newLesson.wordRecordings || { mainText: {}, pages: {} }
    };
    const updatedLessons = [...lessons, lessonWithDefaults];
    saveSynchronizedLessons(updatedLessons);
    return updatedLessons;
  } catch (error) {
    console.error('Error adding lesson:', error);
    throw error;
  }
};

/**
 * Delete a lesson
 */
export const deleteLesson = (lessonId) => {
  try {
    const lessons = loadSynchronizedLessons();
    const updatedLessons = lessons.filter(lesson => lesson.id !== lessonId);
    saveSynchronizedLessons(updatedLessons);
    return updatedLessons;
  } catch (error) {
    console.error('Error deleting lesson:', error);
    throw error;
  }
};

/**
 * Listen for lesson updates
 * Useful for components that need to react to lesson changes
 */
export const addLessonUpdateListener = (callback) => {
  if (typeof window !== 'undefined') {
    window.addEventListener(UPDATE_EVENT, callback);
  }
};

/**
 * Remove lesson update listener
 */
export const removeLessonUpdateListener = (callback) => {
  if (typeof window !== 'undefined') {
    window.removeEventListener(UPDATE_EVENT, callback);
  }
};

/**
 * Get lesson statistics (useful for admin dashboard)
 */
export const getLessonStats = () => {
  const lessons = loadSynchronizedLessons();
  const stats = {
    totalLessons: lessons.length,
    lessonsWithRecordings: 0,
    totalWordRecordings: 0,
    recordingsByLesson: {}
  };

  lessons.forEach(lesson => {
    const mainTextRecordings = Object.keys(lesson.wordRecordings?.mainText || {}).length;
    const pageRecordings = Object.values(lesson.wordRecordings?.pages || {})
      .reduce((total, page) => total + Object.keys(page).length, 0);
    const totalRecordings = mainTextRecordings + pageRecordings;

    if (totalRecordings > 0) {
      stats.lessonsWithRecordings++;
      stats.totalWordRecordings += totalRecordings;
      stats.recordingsByLesson[lesson.id] = {
        title: lesson.title,
        mainText: mainTextRecordings,
        pages: pageRecordings,
        total: totalRecordings
      };
    }
  });

  return stats;
};

/**
 * Export all data (useful for backups)
 */
export const exportLessonsData = () => {
  const lessons = loadSynchronizedLessons();
  const stats = getLessonStats();
  
  return {
    lessons,
    stats,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
};

/**
 * Import data (useful for restoring backups)
 */
export const importLessonsData = (data) => {
  try {
    if (data.lessons && Array.isArray(data.lessons)) {
      saveSynchronizedLessons(data.lessons);
      console.log('📥 Imported lessons data successfully');
      return true;
    } else {
      throw new Error('Invalid data format');
    }
  } catch (error) {
    console.error('Error importing lessons data:', error);
    return false;
  }
};

/**
 * Clear all lesson data
 * Removes lessons from localStorage and resets to empty array
 */
export const clearAllLessons = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    saveSynchronizedLessons([]); // Save empty array
    console.log('🗑️ Cleared all lessons data');
    
    // Trigger update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { 
        detail: { lessons: [] } 
      }));
    }
    return true;
  } catch (error) {
    console.error('Error clearing lessons data:', error);
    return false;
  }
};