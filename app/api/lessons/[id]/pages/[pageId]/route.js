import { NextResponse } from 'next/server';
import { 
  getLessonById,
  updateLessonPage,
  deleteLessonPage,
  addBlockToPage,
  updatePageBlock,
  deletePageBlock,
  validateLessonPage,
  validateLessonBlock
} from '@/utils/lessons';

/**
 * GET /api/lessons/[id]/pages/[pageId]
 * Get a specific page from a lesson
 */
export async function GET(request, { params }) {
  try {
    const { id: lessonId, pageId } = params;
    
    const lesson = await getLessonById(lessonId);
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
    
    const page = lesson.pages?.find(p => p.id === pageId);
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    
    return NextResponse.json(page);
  } catch (error) {
    console.error('Error fetching lesson page:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson page', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/lessons/[id]/pages/[pageId]
 * Update a specific page in a lesson
 */
export async function PUT(request, { params }) {
  try {
    const { id: lessonId, pageId } = params;
    const pageData = await request.json();
    
    // Validate page data
    const validation = validateLessonPage(pageData);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Invalid page data', 
        details: validation.errors 
      }, { status: 400 });
    }

    const updatedPage = await updateLessonPage(lessonId, pageId, pageData);
    if (!updatedPage) {
      return NextResponse.json({ error: 'Lesson or page not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error('Error updating lesson page:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson page', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lessons/[id]/pages/[pageId]
 * Delete a specific page from a lesson
 */
export async function DELETE(request, { params }) {
  try {
    const { id: lessonId, pageId } = params;
    
    const deletedPage = await deleteLessonPage(lessonId, pageId);
    if (!deletedPage) {
      return NextResponse.json({ error: 'Lesson or page not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      message: 'Page deleted successfully',
      deletedPage
    });
  } catch (error) {
    console.error('Error deleting lesson page:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson page', details: error.message },
      { status: 500 }
    );
  }
}