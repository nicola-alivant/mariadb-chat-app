/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/database';
import { verifyToken } from '../../../../lib/auth';
import { broadcastToChat } from '../../sse/route';

export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  
  if (!token) {
    return NextResponse.json({ message: 'No token provided' }, { status: 401 });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  const { chatId } = await params;

  try {
    const [messages] = await pool.execute(
      'SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC',
      [chatId]
    ) as any;
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  
  if (!token) {
    return NextResponse.json({ message: 'No token provided' }, { status: 401 });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  const { chatId } = await params;
  const { text, receiverId, senderName } = await request.json();
  
  try {
    const [result] = await pool.execute(
      'INSERT INTO messages (chat_id, text, senderId, senderName, receiverId) VALUES (?, ?, ?, ?, ?)',
      [chatId, text, decoded.userId, senderName, receiverId]
    ) as any;
    
    const [messageData] = await pool.execute(
      'SELECT * FROM messages WHERE id = ?',
      [result.insertId]
    ) as any;

    console.log('Message saved to database:', messageData[0]);
    console.log('Broadcasting to chatId:', chatId);
    
    // Broadcast message to all connected clients in this chat
    broadcastToChat(chatId, {
      type: 'new-message',
      message: messageData[0]
    });
    
    return NextResponse.json(messageData[0], { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}