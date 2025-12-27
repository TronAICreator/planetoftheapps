import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { 
  readVoiceRecordings, 
  createVoiceRecording, 
  getVoiceRecordingById,
  updateVoiceRecording,
  softDeleteVoiceRecording,
  searchVoiceRecordings,
  validateVoiceRecording 
} from '@/utils/voiceRecordings';
import { getLessonsUsingRecording, deleteAllAttachmentsForRecording } from '@/utils/lessonAudioAttachments';

/**
 * GET /api/voice-recordings
 * Query parameters:
 * - type: filter by recording type (phonics, word, text)
 * - search: search in title and transcript
 * - created_by: filter by creator
 * - page: pagination page (default: 1)
 * - limit: items per page (default: 20)
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');
    const created_by = url.searchParams.get('created_by');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const result = await searchVoiceRecordings({
      type,
      search,
      created_by,
      page,
      limit
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching voice recordings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voice recordings', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voice-recordings
 * Create a new voice recording from uploaded file or form data
 */
export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type');
    
    // Handle multipart form data (file upload)
    if (contentType && contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const audioFile = formData.get('audio');
      const title = formData.get('title');
      const description = formData.get('description');
      const category = formData.get('category');
      const duration = formData.get('duration');

      if (!audioFile) {
        return NextResponse.json(
          { error: 'Audio file is required', message: 'No audio file provided' },
          { status: 400 }
        );
      }

      if (!title) {
        return NextResponse.json(
          { error: 'Title is required', message: 'Please provide a title for the recording' },
          { status: 400 }
        );
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'voice-recordings');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const fileName = `${Date.now()}_${audioFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = join(uploadsDir, fileName);
      
      // Save the file
      const bytes = await audioFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Create the recording entry
      const audioUrl = `/uploads/voice-recordings/${fileName}`;
      
      // Map category to type for backwards compatibility
      let recordingType = 'text'; // default
      if (category === 'letter-sounds' || category === 'phonics-rules') {
        recordingType = 'phonics';
      } else if (category === 'word-pronunciation' || category === 'vocabulary') {
        recordingType = 'word';
      }
      
      const newRecording = await createVoiceRecording({
        type: recordingType,
        title: title.trim(),
        transcript_or_text: description ? description.trim() : '',
        audio_url: audioUrl,
        storage_key: fileName,
        duration_ms: duration ? parseInt(duration) * 1000 : 0, // Convert seconds to ms
        created_by: 'admin', // TODO: Get from session
        category: category || 'other' // Store the original category as well
      });

      return NextResponse.json({ 
        success: true, 
        recording: newRecording,
        message: 'Recording saved successfully' 
      }, { status: 201 });
      
    } else {
      // Handle JSON data (legacy support)
      const body = await request.json();
      
      // Validate the recording data
      const validation = validateVoiceRecording(body);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: 'Invalid voice recording data', details: validation.errors },
          { status: 400 }
        );
      }

      // Set default duration if not provided
      if (!body.duration_ms) {
        body.duration_ms = 0; // Will be updated when actual duration is determined
      }

      const newRecording = await createVoiceRecording({
        type: body.type,
        title: body.title,
        transcript_or_text: body.transcript_or_text,
        audio_url: body.audio_url,
        storage_key: body.storage_key,
        duration_ms: body.duration_ms,
        created_by: body.created_by
      });

      return NextResponse.json(newRecording, { status: 201 });
    }

  } catch (error) {
    console.error('Error creating voice recording:', error);
    return NextResponse.json(
      { error: 'Failed to create voice recording', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/voice-recordings
 * Update multiple voice recordings (bulk operation)
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    
    if (!Array.isArray(body.recordings)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected array of recordings.' },
        { status: 400 }
      );
    }

    const updateResults = [];
    
    for (const recordingUpdate of body.recordings) {
      if (!recordingUpdate.id) {
        updateResults.push({ 
          id: null, 
          success: false, 
          error: 'Recording ID is required for updates' 
        });
        continue;
      }

      try {
        const updatedRecording = await updateVoiceRecording(
          recordingUpdate.id,
          recordingUpdate
        );
        
        updateResults.push({
          id: recordingUpdate.id,
          success: !!updatedRecording,
          recording: updatedRecording,
          error: updatedRecording ? null : 'Recording not found'
        });
      } catch (error) {
        updateResults.push({
          id: recordingUpdate.id,
          success: false,
          error: error.message
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      results: updateResults 
    });
  } catch (error) {
    console.error('Error updating voice recordings:', error);
    return NextResponse.json(
      { error: 'Failed to update voice recordings', details: error.message },
      { status: 500 }
    );
  }
}