/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/database';

function generateRoomChatId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `RC${timestamp}${random}`.toUpperCase().substr(0, 15);
}

export async function POST(
  request: NextRequest,
) {
  const { userId } = await request.json();
  
  try {
    const [result] = await pool.execute(
      'INSERT INTO room_chat (id, user_id) VALUES (?, ?)',
      [generateRoomChatId(), userId]
    ) as any;
    
    const [messageData] = await pool.execute(
      'SELECT * FROM room_chat WHERE id = ?',
      [result.insertId]
    ) as any;

    console.log('Message saved to database:', messageData[0]);
    console.log('Broadcasting to chatId:', result.insertId);
    
    // // Broadcast message to all connected clients in this chat
    // broadcastToChat(result.insertId, {
    //   type: 'new-message',
    //   message: messageData[0]
    // });
    
    return NextResponse.json({ data: messageData[0]}, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}