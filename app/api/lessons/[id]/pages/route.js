import { NextResponse } from 'next/server';
import { 
  getLessonById, 
  addPageToLesson,
  updateLessonPage,
  deleteLessonPage,
  validateLessonPage,
  reorderLessonPages
} from '@/utils/lessons';

/**
 * GET /api/lessons/[id]/pages
 * Get all pages for a specific lesson
 */
export async function GET(request, { params }) {
  try {
    const { id: lessonId } = params;
    
    const lesson = await getLessonById(lessonId);
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      lessonId,
      pages: lesson.pages || [],
      totalCount: (lesson.pages || []).length
    });
  } catch (error) {
    console.error('Error fetching lesson pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson pages', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lessons/[id]/pages
 * Create a new page in a lesson
 */
export async function POST(request, { params }) {
  try {
    const { id: lessonId } = params;
    const pageData = await request.json();
    
    // Validate page data
    const validation = validateLessonPage(pageData);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Invalid page data', 
        details: validation.errors 
      }, { status: 400 });
    }

    const newPage = await addPageToLesson(lessonId, pageData);
    if (!newPage) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
    
    return NextResponse.json(newPage, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson page:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson page', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/lessons/[id]/pages
 * Reorder pages in a lesson
 */
export async function PATCH(request, { params }) {
  try {
    const { id: lessonId } = params;
    const { pageIds } = await request.json();
    
    if (!Array.isArray(pageIds)) {
      return NextResponse.json({ 
        error: 'pageIds must be an array' 
      }, { status: 400 });
    }

    const updatedLesson = await reorderLessonPages(lessonId, pageIds);
    if (!updatedLesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      lessonId,
      pages: updatedLesson.pages,
      message: 'Pages reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering lesson pages:', error);
    return NextResponse.json(
      { error: 'Failed to reorder lesson pages', details: error.message },
      { status: 500 }
    );
  }
}