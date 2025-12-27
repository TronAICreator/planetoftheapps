// Lesson Management with Pages and Blocks Data Schema and Helpers
// This module manages lessons with multi-page support

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Data file paths
const LESSONS_FILE = path.join(process.cwd(), 'data', 'lessons.json');

// Block Types
export const BLOCK_TYPES = {
  PHONICS: 'phonics',
  WORD_LIST: 'word_list', 
  TEXT: 'text',
  IMAGE: 'image',
  INSTRUCTIONS: 'instructions'
};

// Lesson Schema with Pages
/**
 * @typedef {Object} Lesson
 * @property {string} id - uuid
 * @property {string} title
 * @property {string} [description] - optional description
 * @property {string} [level] - difficulty level
 * @property {LessonPage[]} pages - array of lesson pages (max 7)
 * @property {string} created_by - user_id who created it
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 * @property {boolean} is_published - whether lesson is published
 * @property {boolean} is_deleted - soft delete flag
 */

/**
 * @typedef {Object} LessonPage
 * @property {string} id - uuid
 * @property {string} lesson_id - foreign key to lesson
 * @property {number} page_number - 1-7 (sequential)
 * @property {string} [title] - optional page title
 * @property {LessonBlock[]} blocks - content blocks for this page
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 */

/**
 * @typedef {Object} LessonBlock
 * @property {string} id - uuid
 * @property {string} page_id - foreign key to lesson page
 * @property {'phonics'|'word_list'|'text'|'image'|'instructions'} block_type
 * @property {Object} content - varies by block_type
 * @property {number} display_order - order within page
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 */

// Content schemas by block type
/**
 * Phonics Block Content
 * @typedef {Object} PhonicsContent
 * @property {Array<{key: string, label: string}>} items - phonics items
 */

/**
 * Word List Block Content
 * @typedef {Object} WordListContent
 * @property {string[]} words - array of words
 */

/**
 * Text Block Content
 * @typedef {Object} TextContent
 * @property {string} text - text content
 */

/**
 * Image Block Content
 * @typedef {Object} ImageContent
 * @property {string} src - image URL
 * @property {string} [alt] - alt text
 * @property {string} [caption] - optional caption
 */

/**
 * Instructions Block Content
 * @typedef {Object} InstructionsContent
 * @property {string} text - instruction text
 */

// Default lessons file (empty)
const DEFAULT_LESSONS = [];

/**
 * Read all lessons from file (including deleted)
 * @returns {Promise<Lesson[]>}
 */
export async function readAllLessons() {
  try {
    const raw = await fs.readFile(LESSONS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Initialize empty lessons file if missing
      await fs.mkdir(path.dirname(LESSONS_FILE), { recursive: true });
      await writeLessons(DEFAULT_LESSONS);
      return DEFAULT_LESSONS;
    }
    throw err;
  }
}

/**
 * Read active lessons from file (excluding deleted)
 * @returns {Promise<Lesson[]>}
 */
export async function readLessons() {
  try {
    const allLessons = await readAllLessons();
    // Filter out soft-deleted lessons by default
    return allLessons.filter((lesson) => !lesson.is_deleted);
  } catch (err) {
    throw err;
  }
}

/**
 * Write lessons to file
 * @param {Lesson[]} lessons
 * @returns {Promise<void>}
 */
export async function writeLessons(lessons) {
  await fs.mkdir(path.dirname(LESSONS_FILE), { recursive: true });
  await fs.writeFile(LESSONS_FILE, JSON.stringify(lessons, null, 2), 'utf8');
}

/**
 * Create a new lesson with default first page
 * @param {Object} data
 * @returns {Promise<Lesson>}
 */
export async function createLesson(data) {
  const lessons = await readAllLessons();
  
  const lessonId = uuidv4();
  const pageId = uuidv4();
  const now = new Date().toISOString();
  
  const newLesson = {
    id: lessonId,
    title: data.title || 'New Lesson',
    description: data.description || '',
    level: data.level || 'beginner',
    pages: [
      {
        id: pageId,
        lesson_id: lessonId,
        page_number: 1,
        title: 'Page 1',
        blocks: [],
        created_at: now,
        updated_at: now
      }
    ],
    created_by: data.created_by || 'system',
    created_at: now,
    updated_at: now,
    is_published: false,
    is_deleted: false
  };

  lessons.push(newLesson);
  await writeLessons(lessons);
  
  return newLesson;
}

/**
 * Get lesson by ID with all pages and blocks
 * @param {string} id
 * @returns {Promise<Lesson | null>}
 */
export async function getLessonById(id) {
  const lessons = await readAllLessons();
  return lessons.find(l => l.id === id && !l.is_deleted) || null;
}

/**
 * Update lesson metadata (not pages/blocks)
 * @param {string} id
 * @param {Partial<Omit<Lesson, 'id' | 'pages' | 'created_at'>>} updates
 * @returns {Promise<Lesson | null>}
 */
export async function updateLesson(id, updates) {
  const lessons = await readAllLessons();
  const index = lessons.findIndex(l => l.id === id);
  
  if (index === -1) return null;
  
  lessons[index] = {
    ...lessons[index],
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  await writeLessons(lessons);
  return lessons[index];
}

/**
 * Add a new page to a lesson (max 7 pages)
 * @param {string} lessonId
 * @param {Object} pageData
 * @returns {Promise<LessonPage | null>}
 */
export async function addLessonPage(lessonId, pageData = {}) {
  const lessons = await readAllLessons();
  const lessonIndex = lessons.findIndex(l => l.id === lessonId && !l.is_deleted);
  
  if (lessonIndex === -1) return null;
  
  const lesson = lessons[lessonIndex];
  
  // Check max 7 pages limit
  if (lesson.pages.length >= 7) {
    throw new Error('Maximum 7 pages per lesson allowed');
  }
  
  const pageId = uuidv4();
  const pageNumber = lesson.pages.length + 1;
  const now = new Date().toISOString();
  
  const newPage = {
    id: pageId,
    lesson_id: lessonId,
    page_number: pageNumber,
    title: pageData.title || `Page ${pageNumber}`,
    blocks: [],
    created_at: now,
    updated_at: now
  };
  
  lesson.pages.push(newPage);
  lesson.updated_at = now;
  
  await writeLessons(lessons);
  return newPage;
}

/**
 * Update a lesson page
 * @param {string} lessonId
 * @param {string} pageId
 * @param {Partial<Omit<LessonPage, 'id' | 'lesson_id' | 'created_at'>>} updates
 * @returns {Promise<LessonPage | null>}
 */
export async function updateLessonPage(lessonId, pageId, updates) {
  const lessons = await readAllLessons();
  const lessonIndex = lessons.findIndex(l => l.id === lessonId && !l.is_deleted);
  
  if (lessonIndex === -1) return null;
  
  const lesson = lessons[lessonIndex];
  const pageIndex = lesson.pages.findIndex(p => p.id === pageId);
  
  if (pageIndex === -1) return null;
  
  const now = new Date().toISOString();
  
  lesson.pages[pageIndex] = {
    ...lesson.pages[pageIndex],
    ...updates,
    updated_at: now
  };
  
  lesson.updated_at = now;
  
  await writeLessons(lessons);
  return lesson.pages[pageIndex];
}

/**
 * Delete a lesson page (except if it's the last one)
 * @param {string} lessonId
 * @param {string} pageId
 * @returns {Promise<boolean>}
 */
export async function deleteLessonPage(lessonId, pageId) {
  const lessons = await readAllLessons();
  const lessonIndex = lessons.findIndex(l => l.id === lessonId && !l.is_deleted);
  
  if (lessonIndex === -1) return false;
  
  const lesson = lessons[lessonIndex];
  
  // Don't allow deleting the last page
  if (lesson.pages.length <= 1) {
    throw new Error('Cannot delete the last page of a lesson');
  }
  
  const pageIndex = lesson.pages.findIndex(p => p.id === pageId);
  if (pageIndex === -1) return false;
  
  // Remove the page
  lesson.pages.splice(pageIndex, 1);
  
  // Renumber remaining pages
  lesson.pages.forEach((page, index) => {
    page.page_number = index + 1;
    page.updated_at = new Date().toISOString();
  });
  
  lesson.updated_at = new Date().toISOString();
  
  await writeLessons(lessons);
  return true;
}

/**
 * Add a block to a lesson page
 * @param {string} lessonId
 * @param {string} pageId
 * @param {Object} blockData
 * @returns {Promise<LessonBlock | null>}
 */
export async function addLessonBlock(lessonId, pageId, blockData) {
  const lessons = await readAllLessons();
  const lessonIndex = lessons.findIndex(l => l.id === lessonId && !l.is_deleted);
  
  if (lessonIndex === -1) return null;
  
  const lesson = lessons[lessonIndex];
  const pageIndex = lesson.pages.findIndex(p => p.id === pageId);
  
  if (pageIndex === -1) return null;
  
  const page = lesson.pages[pageIndex];
  const blockId = uuidv4();
  const now = new Date().toISOString();
  
  const newBlock = {
    id: blockId,
    page_id: pageId,
    block_type: blockData.block_type,
    content: blockData.content || {},
    display_order: blockData.display_order || (page.blocks.length + 1),
    created_at: now,
    updated_at: now
  };
  
  page.blocks.push(newBlock);
  page.updated_at = now;
  lesson.updated_at = now;
  
  await writeLessons(lessons);
  return newBlock;
}

/**
 * Update a lesson block
 * @param {string} lessonId
 * @param {string} pageId
 * @param {string} blockId
 * @param {Partial<Omit<LessonBlock, 'id' | 'page_id' | 'created_at'>>} updates
 * @returns {Promise<LessonBlock | null>}
 */
export async function updateLessonBlock(lessonId, pageId, blockId, updates) {
  const lessons = await readAllLessons();
  const lessonIndex = lessons.findIndex(l => l.id === lessonId && !l.is_deleted);
  
  if (lessonIndex === -1) return null;
  
  const lesson = lessons[lessonIndex];
  const pageIndex = lesson.pages.findIndex(p => p.id === pageId);
  
  if (pageIndex === -1) return null;
  
  const page = lesson.pages[pageIndex];
  const blockIndex = page.blocks.findIndex(b => b.id === blockId);
  
  if (blockIndex === -1) return null;
  
  const now = new Date().toISOString();
  
  page.blocks[blockIndex] = {
    ...page.blocks[blockIndex],
    ...updates,
    updated_at: now
  };
  
  page.updated_at = now;
  lesson.updated_at = now;
  
  await writeLessons(lessons);
  return page.blocks[blockIndex];
}

/**
 * Delete a lesson block
 * @param {string} lessonId
 * @param {string} pageId
 * @param {string} blockId
 * @returns {Promise<boolean>}
 */
export async function deleteLessonBlock(lessonId, pageId, blockId) {
  const lessons = await readAllLessons();
  const lessonIndex = lessons.findIndex(l => l.id === lessonId && !l.is_deleted);
  
  if (lessonIndex === -1) return false;
  
  const lesson = lessons[lessonIndex];
  const pageIndex = lesson.pages.findIndex(p => p.id === pageId);
  
  if (pageIndex === -1) return false;
  
  const page = lesson.pages[pageIndex];
  const blockIndex = page.blocks.findIndex(b => b.id === blockId);
  
  if (blockIndex === -1) return false;
  
  page.blocks.splice(blockIndex, 1);
  
  // Reorder remaining blocks
  page.blocks.forEach((block, index) => {
    block.display_order = index + 1;
    block.updated_at = new Date().toISOString();
  });
  
  page.updated_at = new Date().toISOString();
  lesson.updated_at = new Date().toISOString();
  
  await writeLessons(lessons);
  return true;
}

/**
 * Reorder blocks within a page
 * @param {string} lessonId
 * @param {string} pageId
 * @param {string[]} blockIds - ordered array of block IDs
 * @returns {Promise<boolean>}
 */
export async function reorderLessonBlocks(lessonId, pageId, blockIds) {
  const lessons = await readAllLessons();
  const lessonIndex = lessons.findIndex(l => l.id === lessonId && !l.is_deleted);
  
  if (lessonIndex === -1) return false;
  
  const lesson = lessons[lessonIndex];
  const pageIndex = lesson.pages.findIndex(p => p.id === pageId);
  
  if (pageIndex === -1) return false;
  
  const page = lesson.pages[pageIndex];
  const now = new Date().toISOString();
  
  // Create new ordered blocks array
  const orderedBlocks = [];
  
  blockIds.forEach((blockId, index) => {
    const block = page.blocks.find(b => b.id === blockId);
    if (block) {
      orderedBlocks.push({
        ...block,
        display_order: index + 1,
        updated_at: now
      });
    }
  });
  
  page.blocks = orderedBlocks;
  page.updated_at = now;
  lesson.updated_at = now;
  
  await writeLessons(lessons);
  return true;
}

/**
 * Search and filter lessons
 * @param {Object} filters
 * @returns {Promise<Object>}
 */
export async function searchLessons(filters = {}) {
  const lessons = await readLessons();
  
  let filteredLessons = lessons;
  
  // Filter by title/description search
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredLessons = filteredLessons.filter(lesson => 
      lesson.title.toLowerCase().includes(searchLower) ||
      (lesson.description && lesson.description.toLowerCase().includes(searchLower))
    );
  }
  
  // Filter by level
  if (filters.level) {
    filteredLessons = filteredLessons.filter(lesson => lesson.level === filters.level);
  }
  
  // Filter by published status
  if (filters.published !== undefined) {
    filteredLessons = filteredLessons.filter(lesson => lesson.is_published === filters.published);
  }
  
  // Filter by creator
  if (filters.created_by) {
    filteredLessons = filteredLessons.filter(lesson => lesson.created_by === filters.created_by);
  }
  
  // Sort by created_at (newest first)
  filteredLessons.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;
  
  const paginatedLessons = filteredLessons.slice(offset, offset + limit);
  
  return {
    lessons: paginatedLessons,
    total: filteredLessons.length,
    totalPages: Math.ceil(filteredLessons.length / limit),
    page,
    limit
  };
}

/**
 * Validate lesson data
 * @param {Object} data
 * @returns {Object}
 */
export function validateLesson(data) {
  const errors = [];
  
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string.');
  }
  
  if (data.pages && Array.isArray(data.pages) && data.pages.length > 7) {
    errors.push('Maximum 7 pages per lesson allowed.');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate block content based on type
 * @param {string} blockType
 * @param {Object} content
 * @returns {Object}
 */
export function validateBlockContent(blockType, content) {
  const errors = [];
  
  switch (blockType) {
    case BLOCK_TYPES.PHONICS:
      if (!content.items || !Array.isArray(content.items)) {
        errors.push('Phonics block requires items array');
      } else {
        content.items.forEach((item, index) => {
          if (!item.key || !item.label) {
            errors.push(`Phonics item ${index + 1} requires key and label`);
          }
        });
      }
      break;
      
    case BLOCK_TYPES.WORD_LIST:
      if (!content.words || !Array.isArray(content.words)) {
        errors.push('Word list block requires words array');
      }
      break;
      
    case BLOCK_TYPES.TEXT:
      if (!content.text || typeof content.text !== 'string') {
        errors.push('Text block requires text string');
      }
      break;
      
    case BLOCK_TYPES.IMAGE:
      if (!content.src || typeof content.src !== 'string') {
        errors.push('Image block requires src URL');
      }
      break;
      
    case BLOCK_TYPES.INSTRUCTIONS:
      if (!content.text || typeof content.text !== 'string') {
        errors.push('Instructions block requires text string');
      }
      break;
      
    default:
      errors.push(`Unknown block type: ${blockType}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}