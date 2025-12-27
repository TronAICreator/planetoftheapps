// Lesson Audio Attachment Library Data Schema and Helpers
// This module manages the attachment relationships between lessons and voice recordings

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Data file paths
const LESSON_AUDIO_ATTACHMENTS_FILE = path.join(process.cwd(), 'data', 'lesson-audio-attachments.json');

/**
 * @typedef {Object} LessonAudioAttachment
 * @property {string} id - uuid
 * @property {string} lesson_id - foreign key to lesson
 * @property {string} voice_recording_id - foreign key to voice recording
 * @property {"phonics"|"word"|"text"} attachment_type
 * @property {string=} target_ref - specific item reference (word, phonics key, etc.)
 * @property {number=} page_number - optional page number (1-7)
 * @property {string=} block_id - optional block ID for block-level attachments
 * @property {number=} display_order
 * @property {string=} created_by
 * @property {string=} created_at
 */

/** @returns {LessonAudioAttachment[]} */
export function readLessonAudioAttachments() {
  if (!fs.existsSync(LESSON_AUDIO_ATTACHMENTS_FILE)) return [];
  
  const raw = fs.readFileSync(LESSON_AUDIO_ATTACHMENTS_FILE, 'utf8');
  return raw ? JSON.parse(raw) : [];
}

/** @param {LessonAudioAttachment[]} data */
export function writeLessonAudioAttachments(data) {
  fs.mkdirSync(path.dirname(LESSON_AUDIO_ATTACHMENTS_FILE), { recursive: true });
  fs.writeFileSync(LESSON_AUDIO_ATTACHMENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Get all audio attachments for a specific lesson
 * @param {string} lessonId 
 * @returns {Promise<LessonAudioAttachment[]>}
 */
export async function getAttachmentsForLesson(lessonId) {
  const attachments = readLessonAudioAttachments();
  return attachments.filter(attachment => attachment.lesson_id === lessonId);
}

/**
 * Get audio attachments for a specific lesson page
 * @param {string} lessonId
 * @param {number} pageNumber 
 * @returns {Promise<LessonAudioAttachment[]>}
 */
export async function getAttachmentsForLessonPage(lessonId, pageNumber) {
  const attachments = readLessonAudioAttachments();
  return attachments.filter(attachment => 
    attachment.lesson_id === lessonId && 
    attachment.page_number === pageNumber
  );
}

/**
 * Get audio attachments for a specific block
 * @param {string} lessonId
 * @param {string} blockId 
 * @returns {Promise<LessonAudioAttachment[]>}
 */
export async function getAttachmentsForBlock(lessonId, blockId) {
  const attachments = readLessonAudioAttachments();
  return attachments.filter(attachment => 
    attachment.lesson_id === lessonId && 
    attachment.block_id === blockId
  );
}

/**
 * Get audio attachments with priority fallback (block → page → lesson)
 * @param {string} lessonId
 * @param {number} [pageNumber] 
 * @param {string} [blockId]
 * @param {string} [targetRef]
 * @returns {Promise<LessonAudioAttachment[]>}
 */
export async function getAudioAttachmentsWithFallback(lessonId, pageNumber, blockId, targetRef) {
  const attachments = readLessonAudioAttachments();
  const lessonAttachments = attachments.filter(attachment => attachment.lesson_id === lessonId);

  // Priority 1: Block-level with matching target_ref
  if (blockId && targetRef) {
    const blockTargetAttachments = lessonAttachments.filter(attachment => 
      attachment.block_id === blockId && 
      attachment.target_ref === targetRef
    );
    if (blockTargetAttachments.length > 0) return blockTargetAttachments;
  }

  // Priority 2: Block-level (any target_ref)
  if (blockId) {
    const blockAttachments = lessonAttachments.filter(attachment => 
      attachment.block_id === blockId
    );
    if (blockAttachments.length > 0) return blockAttachments;
  }

  // Priority 3: Page-level with matching target_ref
  if (pageNumber && targetRef) {
    const pageTargetAttachments = lessonAttachments.filter(attachment => 
      attachment.page_number === pageNumber && 
      attachment.target_ref === targetRef &&
      !attachment.block_id // Page-level only
    );
    if (pageTargetAttachments.length > 0) return pageTargetAttachments;
  }

  // Priority 4: Page-level (any target_ref)
  if (pageNumber) {
    const pageAttachments = lessonAttachments.filter(attachment => 
      attachment.page_number === pageNumber &&
      !attachment.block_id // Page-level only
    );
    if (pageAttachments.length > 0) return pageAttachments;
  }

  // Priority 5: Lesson-level with matching target_ref
  if (targetRef) {
    const lessonTargetAttachments = lessonAttachments.filter(attachment => 
      attachment.target_ref === targetRef &&
      !attachment.page_number && // Lesson-level only
      !attachment.block_id
    );
    if (lessonTargetAttachments.length > 0) return lessonTargetAttachments;
  }

  // Priority 6: Lesson-level (any target_ref)
  const lessonLevelAttachments = lessonAttachments.filter(attachment => 
    !attachment.page_number && 
    !attachment.block_id
  );
  return lessonLevelAttachments;
}

/**
 * Check if a voice recording is already attached to a lesson
 * @param {string} lessonId
 * @param {string} voiceRecordingId 
 * @returns {Promise<boolean>}
 */
export async function isRecordingAttachedToLesson(lessonId, voiceRecordingId) {
  const attachments = readLessonAudioAttachments();
  return attachments.some(attachment => 
    attachment.lesson_id === lessonId && 
    attachment.voice_recording_id === voiceRecordingId
  );
}

/**
 * Get the next display order for a lesson's attachments
 * @param {string} lessonId
 * @param {number} [pageNumber]
 * @param {string} [blockId] 
 * @returns {Promise<number>}
 */
export async function getNextDisplayOrder(lessonId, pageNumber, blockId) {
  const attachments = readLessonAudioAttachments();
  
  let filteredAttachments = attachments.filter(attachment => 
    attachment.lesson_id === lessonId
  );

  // Filter by scope (block > page > lesson)
  if (blockId) {
    filteredAttachments = filteredAttachments.filter(attachment => 
      attachment.block_id === blockId
    );
  } else if (pageNumber) {
    filteredAttachments = filteredAttachments.filter(attachment => 
      attachment.page_number === pageNumber && !attachment.block_id
    );
  } else {
    filteredAttachments = filteredAttachments.filter(attachment => 
      !attachment.page_number && !attachment.block_id
    );
  }
  
  if (filteredAttachments.length === 0) return 1;
  
  const maxOrder = Math.max(...filteredAttachments.map(a => a.display_order || 0));
  return maxOrder + 1;
}

/**
 * Create a new lesson audio attachment
 * @param {Object} data
 * @returns {Promise<LessonAudioAttachment>}
 */
export async function createLessonAudioAttachment(data) {
  const attachments = readLessonAudioAttachments();
  
  const newAttachment = {
    id: uuidv4(),
    lesson_id: data.lesson_id,
    voice_recording_id: data.voice_recording_id,
    attachment_type: data.attachment_type,
    target_ref: data.target_ref || null,
    page_number: data.page_number || null,
    block_id: data.block_id || null,
    display_order: data.display_order || await getNextDisplayOrder(data.lesson_id, data.page_number, data.block_id),
    created_by: data.created_by || 'system',
    created_at: new Date().toISOString()
  };

  attachments.push(newAttachment);
  writeLessonAudioAttachments(attachments);
  
  return newAttachment;
}

/**
 * Update a lesson audio attachment
 * @param {string} id
 * @param {Partial<LessonAudioAttachment>} updates
 * @returns {Promise<LessonAudioAttachment | null>}
 */
export async function updateLessonAudioAttachment(id, updates) {
  const attachments = readLessonAudioAttachments();
  const index = attachments.findIndex(attachment => attachment.id === id);
  
  if (index === -1) return null;
  
  attachments[index] = {
    ...attachments[index],
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  writeLessonAudioAttachments(attachments);
  return attachments[index];
}

/**
 * Delete a lesson audio attachment
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteLessonAudioAttachment(id) {
  const attachments = readLessonAudioAttachments();
  const index = attachments.findIndex(attachment => attachment.id === id);
  
  if (index === -1) return false;
  
  attachments.splice(index, 1);
  writeLessonAudioAttachments(attachments);
  return true;
}

/**
 * Reorder lesson audio attachments
 * @param {string} lessonId
 * @param {string[]} orderedAttachmentIds
 * @param {number} [pageNumber] - scope to specific page
 * @param {string} [blockId] - scope to specific block
 * @returns {Promise<boolean>}
 */
export async function reorderLessonAttachments(lessonId, orderedAttachmentIds, pageNumber, blockId) {
  const attachments = readLessonAudioAttachments();
  
  orderedAttachmentIds.forEach((attachmentId, index) => {
    const attachmentIndex = attachments.findIndex(attachment => 
      attachment.id === attachmentId && 
      attachment.lesson_id === lessonId
    );
    
    if (attachmentIndex !== -1) {
      attachments[attachmentIndex].display_order = index + 1;
      attachments[attachmentIndex].updated_at = new Date().toISOString();
    }
  });
  
  writeLessonAudioAttachments(attachments);
  return true;
}

/**
 * Get all lessons that use a specific voice recording
 * @param {string} voiceRecordingId
 * @returns {Promise<string[]>} Array of lesson IDs
 */
export async function getLessonsUsingRecording(voiceRecordingId) {
  const attachments = readLessonAudioAttachments();
  const lessonIds = attachments
    .filter(attachment => attachment.voice_recording_id === voiceRecordingId)
    .map(attachment => attachment.lesson_id);
  
  return [...new Set(lessonIds)]; // Remove duplicates
}

/**
 * Delete all attachments for a specific voice recording
 * @param {string} voiceRecordingId
 * @returns {Promise<number>} Number of attachments deleted
 */
export async function deleteAllAttachmentsForRecording(voiceRecordingId) {
  const attachments = readLessonAudioAttachments();
  const filteredAttachments = attachments.filter(attachment => 
    attachment.voice_recording_id !== voiceRecordingId
  );
  
  const deletedCount = attachments.length - filteredAttachments.length;
  writeLessonAudioAttachments(filteredAttachments);
  
  return deletedCount;
}

/**
 * Delete all attachments for a specific lesson
 * @param {string} lessonId
 * @returns {Promise<number>} Number of attachments deleted
 */
export async function deleteAllAttachmentsForLesson(lessonId) {
  const attachments = readLessonAudioAttachments();
  const filteredAttachments = attachments.filter(attachment => 
    attachment.lesson_id !== lessonId
  );
  
  const deletedCount = attachments.length - filteredAttachments.length;
  writeLessonAudioAttachments(filteredAttachments);
  
  return deletedCount;
}

/**
 * Delete all attachments for a specific page
 * @param {string} lessonId
 * @param {number} pageNumber
 * @returns {Promise<number>} Number of attachments deleted
 */
export async function deleteAllAttachmentsForPage(lessonId, pageNumber) {
  const attachments = readLessonAudioAttachments();
  const filteredAttachments = attachments.filter(attachment => 
    !(attachment.lesson_id === lessonId && attachment.page_number === pageNumber)
  );
  
  const deletedCount = attachments.length - filteredAttachments.length;
  writeLessonAudioAttachments(filteredAttachments);
  
  return deletedCount;
}

/**
 * Delete all attachments for a specific block
 * @param {string} lessonId
 * @param {string} blockId
 * @returns {Promise<number>} Number of attachments deleted
 */
export async function deleteAllAttachmentsForBlock(lessonId, blockId) {
  const attachments = readLessonAudioAttachments();
  const filteredAttachments = attachments.filter(attachment => 
    !(attachment.lesson_id === lessonId && attachment.block_id === blockId)
  );
  
  const deletedCount = attachments.length - filteredAttachments.length;
  writeLessonAudioAttachments(filteredAttachments);
  
  return deletedCount;
}

/**
 * Validate lesson audio attachment data
 * @param {Object} data
 * @returns {Object}
 */
export function validateLessonAudioAttachment(data) {
  const errors = [];
  
  if (!data.lesson_id || typeof data.lesson_id !== 'string') {
    errors.push('lesson_id is required and must be a string.');
  }
  
  if (!data.voice_recording_id || typeof data.voice_recording_id !== 'string') {
    errors.push('voice_recording_id is required and must be a string.');
  }
  
  if (!data.attachment_type || !['phonics', 'word', 'text'].includes(data.attachment_type)) {
    errors.push('attachment_type is required and must be "phonics", "word", or "text".');
  }
  
  if (data.page_number && (typeof data.page_number !== 'number' || data.page_number < 1 || data.page_number > 7)) {
    errors.push('page_number must be a number between 1 and 7.');
  }
  
  if (data.display_order && (typeof data.display_order !== 'number' || data.display_order < 1)) {
    errors.push('display_order must be a positive number.');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}