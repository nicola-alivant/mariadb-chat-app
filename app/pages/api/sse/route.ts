/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';

// Store active connections with proper typing
const connections = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  console.log('SSE connection request:', { userId });

  if (!userId) {
    return new NextResponse('Missing userId or chatId', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      const initialMessage = JSON.stringify({
        type: 'connected',
        message: 'SSE connection established'
      });
      controller.enqueue(encoder.encode(`data: ${initialMessage}\n\n`));
      
      // Store connection for this user-chat combination
      const connectionKey = `${userId}`;
      connections.set(connectionKey, controller);
      
      console.log('SSE connection established:', connectionKey);
      console.log('Active connections:', Array.from(connections.keys()));
      
      // Send keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          const pingMessage = JSON.stringify({ type: 'ping' });
          controller.enqueue(encoder.encode(`data: ${pingMessage}\n\n`));
        } catch (error) {
          console.log('Keep-alive failed, removing connection:', connectionKey);
          clearInterval(keepAlive);
          connections.delete(connectionKey);
        }
      }, 30000);
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        console.log('SSE connection closed:', connectionKey);
        clearInterval(keepAlive);
        connections.delete(connectionKey);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

// Function to broadcast message to specific chat
export function broadcastToChat(chatId: string, message: any) {
  console.log('Broadcasting to chat:', chatId, message);
  console.log('Active connections:', Array.from(connections.keys()));
  
  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify(message)}\n\n`;
  
  let broadcastCount = 0;
  
  connections.forEach((controller, connectionKey) => {
    // Check if this connection is for the specific chat
    if (connectionKey.includes(`-${chatId}`)) {
      try {
        controller.enqueue(encoder.encode(data));
        broadcastCount++;
        console.log('Message sent to connection:', connectionKey);
      } catch (error) {
        console.log('Failed to send to connection:', connectionKey, error);
        // Remove dead connection
        connections.delete(connectionKey);
      }
    }
  });
  
  console.log(`Broadcasted to ${broadcastCount} connections`);
}

// Function to get active connections count
export function getActiveConnections() {
  return connections.size;
}