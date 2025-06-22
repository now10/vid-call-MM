const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const sharp = require('sharp');
const { Worker } = require('worker_threads');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    pingTimeout: 30000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8 // 100MB
});

// WebSocket connection for ultra-low latency communication
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Set TCP_NODELAY for reduced latency
    socket.conn.transport.socket.setNoDelay(true);
    
    socket.on('join_session', (sessionId) => {
        socket.join(sessionId);
        console.log(`Client joined session: ${sessionId}`);
    });
    
    socket.on('host_frame', (data) => {
        // Forward to other participants with minimal processing
        socket.to(data.sessionId).emit('mirror_frame', {
            landmarks: data.landmarks,
            timestamp: Date.now()
        });
    });
    
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('WebSocket server ready for low-latency communication');
});

// GPU-accelerated processing worker pool
const gpuWorkers = [];
const MAX_WORKERS = 4; // Adjust based on available GPUs

function initWorkerPool() {
    for (let i = 0; i < MAX_WORKERS; i++) {
        const worker = new Worker('./gpu_worker.js');
        gpuWorkers.push({
            worker,
            busy: false
        });
    }
}

// Initialize worker pool
initWorkerPool();