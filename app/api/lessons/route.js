import { NextResponse } from 'next/server';
import { 
  getAllLessons, 
  createLesson, 
  validateLesson 
} from '@/utils/lessons';

export async function GET() {
  try {
    const lessons = await getAllLessons();
    return NextResponse.json(lessons);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load lessons', details: String(err) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    // Validate the lesson data
    const validation = validateLesson(body);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Invalid lesson payload', 
        details: validation.errors 
      }, { status: 400 });
    }

    const newLesson = await createLesson(body);
    return NextResponse.json(newLesson, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create lesson', details: String(err) }, { status: 500 });
  }
}
