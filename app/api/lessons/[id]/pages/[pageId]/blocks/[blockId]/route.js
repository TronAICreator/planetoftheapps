import { NextResponse } from 'next/server';
import { 
  updatePageBlock,
  deletePageBlock,
  validateLessonBlock,
  getLessonById
} from '@/utils/lessons';

/**
 * GET /api/lessons/[id]/pages/[pageId]/blocks/[blockId]
 * Get a specific block from a page
 */
export async function GET(request, { params }) {
  try {
    const { id: lessonId, pageId, blockId } = params;
    
    const lesson = await getLessonById(lessonId);
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
    
    const page = lesson.pages?.find(p => p.id === pageId);
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    
    const block = page.blocks?.find(b => b.id === blockId);
    if (!block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }
    
    return NextResponse.json(block);
  } catch (error) {
    console.error('Error fetching page block:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page block', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/lessons/[id]/pages/[pageId]/blocks/[blockId]
 * Update a specific block in a page
 */
export async function PUT(request, { params }) {
  try {
    const { id: lessonId, pageId, blockId } = params;
    const blockData = await request.json();
    
    // Validate block data
    const validation = validateLessonBlock(blockData);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Invalid block data', 
        details: validation.errors 
      }, { status: 400 });
    }

    const updatedBlock = await updatePageBlock(lessonId, pageId, blockId, blockData);
    if (!updatedBlock) {
      return NextResponse.json({ error: 'Lesson, page, or block not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedBlock);
  } catch (error) {
    console.error('Error updating page block:', error);
    return NextResponse.json(
      { error: 'Failed to update page block', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lessons/[id]/pages/[pageId]/blocks/[blockId]
 * Delete a specific block from a page
 */
export async function DELETE(request, { params }) {
  try {
    const { id: lessonId, pageId, blockId } = params;
    
    const deletedBlock = await deletePageBlock(lessonId, pageId, blockId);
    if (!deletedBlock) {
      return NextResponse.json({ error: 'Lesson, page, or block not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      message: 'Block deleted successfully',
      deletedBlock
    });
  } catch (error) {
    console.error('Error deleting page block:', error);
    return NextResponse.json(
      { error: 'Failed to delete page block', details: error.message },
      { status: 500 }
    );
  }
}