import { NextResponse } from 'next/server';
import { 
  addBlockToPage,
  updatePageBlock,
  deletePageBlock,
  reorderPageBlocks,
  validateLessonBlock,
  getLessonById
} from '@/utils/lessons';

/**
 * GET /api/lessons/[id]/pages/[pageId]/blocks
 * Get all blocks for a specific page
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
    
    return NextResponse.json({
      lessonId,
      pageId,
      blocks: page.blocks || [],
      totalCount: (page.blocks || []).length
    });
  } catch (error) {
    console.error('Error fetching page blocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page blocks', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lessons/[id]/pages/[pageId]/blocks
 * Create a new block in a page
 */
export async function POST(request, { params }) {
  try {
    const { id: lessonId, pageId } = params;
    const blockData = await request.json();
    
    // Validate block data
    const validation = validateLessonBlock(blockData);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Invalid block data', 
        details: validation.errors 
      }, { status: 400 });
    }

    const newBlock = await addBlockToPage(lessonId, pageId, blockData);
    if (!newBlock) {
      return NextResponse.json({ error: 'Lesson or page not found' }, { status: 404 });
    }
    
    return NextResponse.json(newBlock, { status: 201 });
  } catch (error) {
    console.error('Error creating page block:', error);
    return NextResponse.json(
      { error: 'Failed to create page block', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/lessons/[id]/pages/[pageId]/blocks
 * Reorder blocks in a page
 */
export async function PATCH(request, { params }) {
  try {
    const { id: lessonId, pageId } = params;
    const { blockIds } = await request.json();
    
    if (!Array.isArray(blockIds)) {
      return NextResponse.json({ 
        error: 'blockIds must be an array' 
      }, { status: 400 });
    }

    const updatedPage = await reorderPageBlocks(lessonId, pageId, blockIds);
    if (!updatedPage) {
      return NextResponse.json({ error: 'Lesson or page not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      lessonId,
      pageId,
      blocks: updatedPage.blocks,
      message: 'Blocks reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering page blocks:', error);
    return NextResponse.json(
      { error: 'Failed to reorder page blocks', details: error.message },
      { status: 500 }
    );
  }
}