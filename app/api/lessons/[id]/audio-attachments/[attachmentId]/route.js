import { NextResponse } from 'next/server';
import { 
  updateLessonAudioAttachment,
  deleteLessonAudioAttachment,
  validateLessonAudioAttachment
} from '@/utils/lessonAudioAttachments';
import { getVoiceRecordingById } from '@/utils/voiceRecordings';

/**
 * PATCH /api/lessons/[id]/audio-attachments/[attachmentId]
 * Update a specific audio attachment
 */
export async function PATCH(request, { params }) {
  try {
    const { id: lessonId, attachmentId } = params;
    const body = await request.json();

    // Validate the update data (only validate provided fields)
    if (body.target_ref !== undefined || body.display_order !== undefined || body.attachment_type !== undefined) {
      const updateData = {
        lesson_id: lessonId,
        voice_recording_id: 'dummy', // Will be ignored in validation
        created_by: 'system', // Will be ignored in validation
        ...body
      };

      // For updates, we only validate the fields being updated
      if (body.attachment_type && !['phonics', 'word', 'text'].includes(body.attachment_type)) {
        return NextResponse.json(
          { error: 'Invalid attachment_type. Must be "phonics", "word", or "text".' },
          { status: 400 }
        );
      }

      if (body.display_order && (typeof body.display_order !== 'number' || body.display_order < 1)) {
        return NextResponse.json(
          { error: 'display_order must be a positive number.' },
          { status: 400 }
        );
      }
    }

    const updatedAttachment = await updateLessonAudioAttachment(attachmentId, body);

    if (!updatedAttachment) {
      return NextResponse.json(
        { error: 'Audio attachment not found' },
        { status: 404 }
      );
    }

    // Verify the attachment belongs to the specified lesson
    if (updatedAttachment.lesson_id !== lessonId) {
      return NextResponse.json(
        { error: 'Audio attachment does not belong to the specified lesson' },
        { status: 400 }
      );
    }

    // Enrich with voice recording details
    const voiceRecording = await getVoiceRecordingById(updatedAttachment.voice_recording_id);
    const enrichedAttachment = {
      ...updatedAttachment,
      voiceRecording: voiceRecording
    };

    return NextResponse.json(enrichedAttachment);
  } catch (error) {
    console.error('Error updating lesson audio attachment:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson audio attachment', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lessons/[id]/audio-attachments/[attachmentId]
 * Delete a specific audio attachment (remove from lesson only)
 */
export async function DELETE(request, { params }) {
  try {
    const { id: lessonId, attachmentId } = params;

    const deleteSuccess = await deleteLessonAudioAttachment(attachmentId);

    if (!deleteSuccess) {
      return NextResponse.json(
        { error: 'Audio attachment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Audio attachment removed from lesson successfully',
      deletedAttachmentId: attachmentId,
      lessonId: lessonId
    });
  } catch (error) {
    console.error('Error deleting lesson audio attachment:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson audio attachment', details: error.message },
      { status: 500 }
    );
  }
}