import { NextResponse } from 'next/server';
import { 
  getAttachmentsForLesson,
  createLessonAudioAttachment,
  updateLessonAudioAttachment,
  deleteLessonAudioAttachment,
  isRecordingAttachedToLesson,
  getNextDisplayOrder,
  reorderLessonAttachments,
  validateLessonAudioAttachment
} from '@/utils/lessonAudioAttachments';
import { getVoiceRecordingById } from '@/utils/voiceRecordings';

/**
 * GET /api/lessons/[id]/audio-attachments
 * Get all audio attachments for a specific lesson
 */
export async function GET(request, { params }) {
  try {
    const { id: lessonId } = params;
    
    const attachments = await getAttachmentsForLesson(lessonId);
    
    // Enrich attachments with voice recording details
    const enrichedAttachments = await Promise.all(
      attachments.map(async (attachment) => {
        const voiceRecording = await getVoiceRecordingById(attachment.voice_recording_id);
        return {
          ...attachment,
          voiceRecording: voiceRecording
        };
      })
    );

    return NextResponse.json({
      lessonId,
      attachments: enrichedAttachments,
      totalCount: enrichedAttachments.length
    });
  } catch (error) {
    console.error('Error fetching lesson audio attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson audio attachments', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lessons/[id]/audio-attachments
 * Create a new audio attachment for a lesson
 */
export async function POST(request, { params }) {
  try {
    const { id: lessonId } = params;
    const body = await request.json();

    // Validate the attachment data
    const attachmentData = {
      ...body,
      lesson_id: lessonId
    };

    const validation = validateLessonAudioAttachment(attachmentData);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid attachment data', details: validation.errors },
        { status: 400 }
      );
    }

    // Check if voice recording exists
    const voiceRecording = await getVoiceRecordingById(body.voice_recording_id);
    if (!voiceRecording) {
      return NextResponse.json(
        { error: 'Voice recording not found' },
        { status: 404 }
      );
    }

    // Check if recording is already attached to this lesson (optional - allow duplicates if needed)
    const isAlreadyAttached = await isRecordingAttachedToLesson(lessonId, body.voice_recording_id);
    if (isAlreadyAttached && !body.allowDuplicates) {
      return NextResponse.json(
        { 
          error: 'Recording already attached to lesson',
          details: 'This recording is already attached to this lesson. Set allowDuplicates=true to allow multiple attachments.'
        },
        { status: 409 }
      );
    }

    // Set display order if not provided
    if (!body.display_order) {
      attachmentData.display_order = await getNextDisplayOrder(lessonId);
    }

    // Derive attachment_type from voice recording if not provided
    if (!body.attachment_type) {
      attachmentData.attachment_type = voiceRecording.type;
    }

    const newAttachment = await createLessonAudioAttachment(attachmentData);

    // Return enriched attachment with voice recording details
    const enrichedAttachment = {
      ...newAttachment,
      voiceRecording: voiceRecording
    };

    return NextResponse.json(enrichedAttachment, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson audio attachment:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson audio attachment', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/lessons/[id]/audio-attachments
 * Reorder attachments for a lesson
 */
export async function PUT(request, { params }) {
  try {
    const { id: lessonId } = params;
    const body = await request.json();

    if (!Array.isArray(body.orderedAttachmentIds)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected orderedAttachmentIds array.' },
        { status: 400 }
      );
    }

    await reorderLessonAttachments(lessonId, body.orderedAttachmentIds);

    // Return updated attachments
    const updatedAttachments = await getAttachmentsForLesson(lessonId);
    
    return NextResponse.json({
      success: true,
      message: 'Attachments reordered successfully',
      attachments: updatedAttachments
    });
  } catch (error) {
    console.error('Error reordering lesson audio attachments:', error);
    return NextResponse.json(
      { error: 'Failed to reorder lesson audio attachments', details: error.message },
      { status: 500 }
    );
  }
}