/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {

  const { userId } = await params;

  try {
    const [messages] = await pool.execute(
      'SELECT * FROM room_chat WHERE user_id = ?',
      [userId]
    ) as any;
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}