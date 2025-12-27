// Voice Recording Library Data Schema and Helpers
// This module manages the VoiceRecording master library

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Voice Recording Types
export const RECORDING_TYPES = {
  PHONICS: 'phonics',
  WORD: 'word',  
  TEXT: 'text'
};

// Data file paths
const VOICE_RECORDINGS_FILE = path.join(process.cwd(), 'data', 'voice-recordings.json');

// VoiceRecording Schema
/**
 * @typedef {Object} VoiceRecording
 * @property {string} id - uuid
 * @property {'phonics'|'word'|'text'} type
 * @property {string} title - label/name of the recording
 * @property {string} [transcript_or_text] - optional transcript or text content
 * @property {string} [audio_url] - URL to audio file
 * @property {string} [storage_key] - storage identifier (alternative to audio_url)
 * @property {number} duration_ms - duration in milliseconds
 * @property {string} created_by - user_id who created it
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 * @property {boolean} is_deleted - soft delete flag
 */

// Default voice recordings library (empty)
const DEFAULT_VOICE_RECORDINGS = [];

/**
 * Read voice recordings from file
 * @returns {Promise<VoiceRecording[]>}
 */
export async function readVoiceRecordings() {
  try {
    const raw = await fs.readFile(VOICE_RECORDINGS_FILE, 'utf8');
    const recordings = JSON.parse(raw);
    // Filter out soft-deleted recordings by default
    return recordings.filter((r) => !r.is_deleted);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Initialize empty voice recordings file if missing
      await fs.mkdir(path.dirname(VOICE_RECORDINGS_FILE), { recursive: true });
      await fs.writeFile(VOICE_RECORDINGS_FILE, JSON.stringify(DEFAULT_VOICE_RECORDINGS, null, 2), 'utf8');
      return DEFAULT_VOICE_RECORDINGS;
    }
    throw err;
  }
}

/**
 * Read all voice recordings including soft-deleted ones
 * @returns {Promise<VoiceRecording[]>}
 */
export async function readAllVoiceRecordings() {
  try {
    const raw = await fs.readFile(VOICE_RECORDINGS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(path.dirname(VOICE_RECORDINGS_FILE), { recursive: true });
      await fs.writeFile(VOICE_RECORDINGS_FILE, JSON.stringify(DEFAULT_VOICE_RECORDINGS, null, 2), 'utf8');
      return DEFAULT_VOICE_RECORDINGS;
    }
    throw err;
  }
}

/**
 * Write voice recordings to file
 * @param {VoiceRecording[]} recordings
 * @returns {Promise<void>}
 */
export async function writeVoiceRecordings(recordings) {
  await fs.writeFile(VOICE_RECORDINGS_FILE, JSON.stringify(recordings, null, 2), 'utf8');
}

/**
 * Create a new voice recording
 * @param {Omit<VoiceRecording, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>} data
 * @returns {Promise<VoiceRecording>}
 */
export async function createVoiceRecording(data) {
  const recordings = await readAllVoiceRecordings();
  
  const newRecording = {
    ...data,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false
  };

  recordings.push(newRecording);
  await writeVoiceRecordings(recordings);
  
  return newRecording;
}

/**
 * Get voice recording by ID
 * @param {string} id
 * @returns {Promise<VoiceRecording | null>}
 */
export async function getVoiceRecordingById(id) {
  const recordings = await readAllVoiceRecordings();
  return recordings.find(r => r.id === id && !r.is_deleted) || null;
}

/**
 * Update voice recording
 * @param {string} id
 * @param {Partial<Omit<VoiceRecording, 'id' | 'created_at'>>} updates
 * @returns {Promise<VoiceRecording | null>}
 */
export async function updateVoiceRecording(id, updates) {
  const recordings = await readAllVoiceRecordings();
  const index = recordings.findIndex(r => r.id === id);
  
  if (index === -1) return null;
  
  recordings[index] = {
    ...recordings[index],
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  await writeVoiceRecordings(recordings);
  return recordings[index];
}

/**
 * Soft delete voice recording
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function softDeleteVoiceRecording(id) {
  const recordings = await readAllVoiceRecordings();
  const index = recordings.findIndex(r => r.id === id);
  
  if (index === -1) return false;
  
  recordings[index].is_deleted = true;
  recordings[index].updated_at = new Date().toISOString();
  
  await writeVoiceRecordings(recordings);
  return true;
}

/**
 * Hard delete voice recording (permanently remove from file)
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function hardDeleteVoiceRecording(id) {
  const recordings = await readAllVoiceRecordings();
  const index = recordings.findIndex(r => r.id === id);
  
  if (index === -1) return false;
  
  recordings.splice(index, 1);
  await writeVoiceRecordings(recordings);
  return true;
}

/**
 * Search and filter voice recordings
 * @param {Object} filters - Search filters
 * @param {'phonics'|'word'|'text'} [filters.type] - Recording type filter
 * @param {string} [filters.search] - Search term
 * @param {string} [filters.created_by] - Creator filter
 * @param {number} [filters.page] - Page number (default: 1)
 * @param {number} [filters.limit] - Results per page (default: 20)
 * @returns {Promise<{recordings: VoiceRecording[], total: number, page: number, totalPages: number}>}
 */
export async function searchVoiceRecordings(filters) {
  const recordings = await readVoiceRecordings();
  
  let filtered = recordings;
  
  // Filter by type
  if (filters.type) {
    filtered = filtered.filter(r => r.type === filters.type);
  }
  
  // Filter by created_by
  if (filters.created_by) {
    filtered = filtered.filter(r => r.created_by === filters.created_by);
  }
  
  // Search in title and transcript
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(r => 
      r.title.toLowerCase().includes(searchTerm) ||
      (r.transcript_or_text && r.transcript_or_text.toLowerCase().includes(searchTerm))
    );
  }
  
  // Sort by created_at (newest first)
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const paginatedRecordings = filtered.slice(startIndex, endIndex);
  
  return {
    recordings: paginatedRecordings,
    total: filtered.length,
    page,
    totalPages: Math.ceil(filtered.length / limit)
  };
}

/**
 * Validate voice recording data
 * @param {any} data - Data to validate
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function validateVoiceRecording(data) {
  const errors = [];
  
  if (!data.type || !Object.values(RECORDING_TYPES).includes(data.type)) {
    errors.push('Invalid or missing recording type. Must be "phonics", "word", or "text".');
  }
  
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string.');
  }
  
  if (!data.audio_url && !data.storage_key) {
    errors.push('Either audio_url or storage_key is required.');
  }
  
  if (data.duration_ms && (typeof data.duration_ms !== 'number' || data.duration_ms < 0)) {
    errors.push('Duration must be a non-negative number in milliseconds.');
  }
  
  if (!data.created_by || typeof data.created_by !== 'string') {
    errors.push('created_by is required and must be a string.');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}