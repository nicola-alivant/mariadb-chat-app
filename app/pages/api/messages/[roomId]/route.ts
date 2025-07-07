/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../../lib/database';
import { verifyToken } from '../../../../../lib/auth';
import { broadcastToChat } from '../../../sse/route';

function generateChatId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `C${timestamp}${random}`.toUpperCase().substr(0, 15);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {

  const { roomId } = await params;

  try {
    const [messages] = await pool.execute(
      'SELECT * FROM chat WHERE room_id = ? ORDER BY send_at ASC',
      [roomId]
    ) as any;
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = await params;
  const { senderId, message } = await request.json();
  
  try {
    const [result] = await pool.execute(
      'INSERT INTO chat (id, room_id, sender_id, message) VALUES (?, ?, ?, ?)',
      [generateChatId(), roomId, senderId, message]
    ) as any;
    
    const [messageData] = await pool.execute(
      'SELECT * FROM chat WHERE id = ?',
      [result.insertId]
    ) as any;

    console.log('Message saved to database:', messageData[0]);
    console.log('Broadcasting to roomId:', roomId);
    
    // Broadcast message to all connected clients in this chat
    broadcastToChat(roomId, {
      type: 'new-message',
      message: messageData[0]
    });
    
    return NextResponse.json(messageData[0], { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}