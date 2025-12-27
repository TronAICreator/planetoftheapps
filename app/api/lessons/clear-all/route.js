import { NextResponse } from 'next/server';

/**
 * DELETE /api/lessons/clear-all
 * Clear all lessons from both JSON file and localStorage synchronization
 */
export async function DELETE() {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Clear the lessons.json file
    const dataFile = path.join(process.cwd(), 'data', 'lessons.json');
    await fs.writeFile(dataFile, JSON.stringify([], null, 2), 'utf8');
    
    return NextResponse.json({ 
      success: true, 
      message: 'All lessons cleared successfully. Please refresh your browser to clear localStorage cache.' 
    });
  } catch (error) {
    console.error('Error clearing lessons:', error);
    return NextResponse.json(
      { error: 'Failed to clear lessons', details: error.message },
      { status: 500 }
    );
  }
}