import { NextResponse } from 'next/server';
import { 
  getVoiceRecordingById,
  updateVoiceRecording,
  softDeleteVoiceRecording,
  validateVoiceRecording 
} from '@/utils/voiceRecordings';
import { getLessonsUsingRecording, deleteAllAttachmentsForRecording } from '@/utils/lessonAudioAttachments';

/**
 * GET /api/voice-recordings/[id]
 * Get a specific voice recording by ID
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const recording = await getVoiceRecordingById(id);
    
    if (!recording) {
      return NextResponse.json(
        { error: 'Voice recording not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(recording);
  } catch (error) {
    console.error('Error fetching voice recording:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voice recording', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/voice-recordings/[id]
 * Update a specific voice recording
 */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    // Validate the update data
    const validation = validateVoiceRecording({ ...body, created_by: body.created_by || 'system' });
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid voice recording data', details: validation.errors },
        { status: 400 }
      );
    }

    const updatedRecording = await updateVoiceRecording(id, body);

    if (!updatedRecording) {
      return NextResponse.json(
        { error: 'Voice recording not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedRecording);
  } catch (error) {
    console.error('Error updating voice recording:', error);
    return NextResponse.json(
      { error: 'Failed to update voice recording', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voice-recordings/[id]
 * Delete a voice recording with safety checks
 * Query parameters:
 * - force: if true, cascade delete (remove from all lessons)
 * - check: if true, only check dependencies without deleting
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';
    const checkOnly = url.searchParams.get('check') === 'true';

    // Check if recording exists
    const recording = await getVoiceRecordingById(id);
    if (!recording) {
      return NextResponse.json(
        { error: 'Voice recording not found' },
        { status: 404 }
      );
    }

    // Check if recording is used in any lessons
    const lessonsUsingRecording = await getLessonsUsingRecording(id);
    const isUsedInLessons = lessonsUsingRecording.length > 0;

    // If this is just a dependency check, return the information
    if (checkOnly) {
      return NextResponse.json({
        canDelete: !isUsedInLessons,
        usedInLessons: isUsedInLessons,
        lessonIds: lessonsUsingRecording,
        lessonCount: lessonsUsingRecording.length,
        recording: recording
      });
    }

    // If recording is used in lessons and force is not specified, block deletion
    if (isUsedInLessons && !force) {
      return NextResponse.json({
        error: 'Cannot delete recording',
        reason: 'Recording is used in one or more lessons',
        usedInLessons: true,
        lessonIds: lessonsUsingRecording,
        lessonCount: lessonsUsingRecording.length,
        suggestion: 'Use force=true to cascade delete or remove from lessons first'
      }, { status: 409 }); // Conflict status
    }

    // If force delete, remove all attachments first
    let deletedAttachmentCount = 0;
    if (force && isUsedInLessons) {
      deletedAttachmentCount = await deleteAllAttachmentsForRecording(id);
    }

    // Soft delete the recording
    const deleteSuccess = await softDeleteVoiceRecording(id);
    
    if (!deleteSuccess) {
      return NextResponse.json(
        { error: 'Failed to delete voice recording' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Voice recording deleted successfully',
      deletedRecording: recording,
      cascadeDeleted: force && isUsedInLessons,
      deletedAttachmentCount: deletedAttachmentCount,
      affectedLessonIds: force ? lessonsUsingRecording : []
    });

  } catch (error) {
    console.error('Error deleting voice recording:', error);
    return NextResponse.json(
      { error: 'Failed to delete voice recording', details: error.message },
      { status: 500 }
    );
  }
}