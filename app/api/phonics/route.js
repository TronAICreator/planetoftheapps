import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const phonicsFile = path.join(process.cwd(), 'data', 'phonics-library.json');

// Default phonics library structure
const DEFAULT_PHONICS = {
  'ph': {
    sound: 'f',
    examples: ['phone', 'elephant', 'graph', 'photo'],
    customWords: [],
    disabledWords: [],
    tips: 'The "ph" makes an "f" sound like in "phone"'
  },
  'th': {
    sound: 'th',
    examples: ['think', 'three', 'tooth', 'math'],
    customWords: [],
    disabledWords: [],
    tips: 'Put your tongue between your teeth and blow air'
  },
  'sh': {
    sound: 'sh',
    examples: ['ship', 'wash', 'fish', 'shoe'],
    customWords: [],
    disabledWords: [],
    tips: 'Make a "shh" sound like telling someone to be quiet'
  },
  'ch': {
    sound: 'ch',
    examples: ['chair', 'cheese', 'beach', 'lunch'],
    customWords: [],
    disabledWords: [],
    tips: 'Start with "t" and end with "sh" sound'
  },
  'ck': {
    sound: 'k',
    examples: ['back', 'duck', 'clock', 'truck'],
    customWords: [],
    disabledWords: [],
    tips: 'Makes a hard "k" sound at the end of words'
  },
  'ng': {
    sound: 'ng',
    examples: ['ring', 'sing', 'king', 'long'],
    customWords: [],
    disabledWords: [],
    tips: 'Sound comes from the back of your throat'
  }
};

async function readPhonicsLibrary() {
  try {
    const raw = await fs.readFile(phonicsFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Initialize phonics file if missing
      await fs.mkdir(path.dirname(phonicsFile), { recursive: true });
      await fs.writeFile(phonicsFile, JSON.stringify(DEFAULT_PHONICS, null, 2), 'utf8');
      return DEFAULT_PHONICS;
    }
    throw err;
  }
}

async function writePhonicsLibrary(phonicsData) {
  await fs.writeFile(phonicsFile, JSON.stringify(phonicsData, null, 2), 'utf8');
}

export async function GET() {
  try {
    const phonicsLibrary = await readPhonicsLibrary();
    return NextResponse.json(phonicsLibrary);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load phonics library', details: String(err) }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid phonics library data' }, { status: 400 });
    }

    await writePhonicsLibrary(body);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update phonics library', details: String(err) }, { status: 500 });
  }
}