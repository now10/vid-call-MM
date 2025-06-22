const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*" } 
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket for real-time communication
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle signaling for WebRTC
  socket.on('signal', (data) => {
    socket.broadcast.emit('signal', data);
  });

  // Handle expression data
  socket.on('expression', (data) => {
    socket.broadcast.emit('mirror-expression', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});