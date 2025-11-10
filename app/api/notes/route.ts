import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/notes - Get daily notes
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      userId: user.id,
    };

    if (date) {
      where.date = new Date(date);
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const notes = await prisma.dailyNote.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Notes fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST /api/notes - Create or update daily note
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, title, content, mood, tags, isPrivate } = body;

    if (!date || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert - create or update if exists for this date
    const note = await prisma.dailyNote.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: new Date(date),
        },
      },
      create: {
        userId: user.id,
        date: new Date(date),
        title,
        content,
        mood: mood || 'NEUTRAL',
        tags: tags || [],
        isPrivate: isPrivate || false,
      },
      update: {
        title,
        content,
        mood: mood || 'NEUTRAL',
        tags: tags || [],
        isPrivate: isPrivate !== undefined ? isPrivate : false,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Note create/update error:', error);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}
