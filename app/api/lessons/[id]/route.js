import { NextResponse } from 'next/server';
import { 
  getLessonById, 
  updateLesson, 
  deleteLesson 
} from '@/utils/lessons';

export async function GET(req, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing lesson id' }, { status: 400 });
    }

    const lesson = await getLessonById(id);
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    return NextResponse.json(lesson);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to get lesson', details: String(err) }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing lesson id' }, { status: 400 });
    }

    const updatedLesson = await updateLesson(id, body);
    if (!updatedLesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    return NextResponse.json(updatedLesson);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update lesson', details: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing lesson id' }, { status: 400 });
    }

    const deleted = await deleteLesson(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, removed: deleted });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete lesson', details: String(err) }, { status: 500 });
  }
}
