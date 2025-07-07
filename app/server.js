import express from 'express';
import next from 'next';
import http from 'http';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const expressApp = express();
  const server = http.createServer(expressApp);
  const io = new Server(server);

  // Routing socket logic
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join-chat', (chatId) => {
      socket.join(chatId);
    });

    socket.on('new-message', (msg) => {
      io.to(msg.chatId).emit('message-received', msg);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  expressApp.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
