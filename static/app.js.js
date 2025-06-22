// app.js
import { ExpressionMirror } from './wasm/expression_mirror.js';

class UltraLowLatencyMirror {
    constructor() {
        this.hostVideo = document.getElementById('hostVideo');
        this.mirrorVideo = document.getElementById('mirrorVideo');
        this.performanceMetrics = document.getElementById('performanceMetrics');
        this.avatarImage = null;
        this.isRunning = false;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.frameTimes = [];
        
        // WebAssembly module
        this.wasmModule = null;
        
        // Facemesh model
        this.facemesh = null;
        
        // Canvas for processing
        this.processCanvas = document.createElement('canvas');
        this.processCtx = this.processCanvas.getContext('2d', { willReadFrequently: true });
        
        // Video buffers
        this.hostBuffer = new Uint8Array(640 * 480 * 4);
        this.mirrorBuffer = new Uint8Array(640 * 480 * 4);
        
        this.init();
    }
    
    async init() {
        // Load WebAssembly module
        this.wasmModule = await ExpressionMirror();
        
        // Load facemesh model
        await tf.setBackend('wasm');
        this.facemesh = await facemesh.load({ maxFaces: 1 });
        
        // Set up UI events
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('avatarUpload').click();
        });
        document.getElementById('avatarUpload').addEventListener('change', (e) => this.loadAvatar(e));
        
        console.log('System initialized and ready');
    }
    
    async start() {
        if (this.isRunning) return;
        
        try {
            // Get camera stream with preferred constraints for low latency
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 60 },
                    latency: { ideal: 0 }
                },
                audio: false
            });
            
            this.hostVideo.srcObject = stream;
            this.isRunning = true;
            
            // Start processing loop with precise timing
            this.lastFrameTime = performance.now();
            this.processFrame();
            
            // Update UI
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
            
            console.log('Mirroring started');
        } catch (err) {
            console.error('Error starting camera:', err);
        }
    }
    
    stop() {
        this.isRunning = false;
        
        if (this.hostVideo.srcObject) {
            this.hostVideo.srcObject.getTracks().forEach(track => track.stop());
            this.hostVideo.srcObject = null;
        }
        
        // Update UI
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        
        console.log('Mirroring stopped');
    }
    
    async loadAvatar(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = new Image();
            img.onload = () => {
                // Prepare avatar image for processing
                this.processCanvas.width = img.width;
                this.processCanvas.height = img.height;
                this.processCtx.drawImage(img, 0, 0);
                
                // Store as RGBA buffer for WASM
                const imageData = this.processCtx.getImageData(0, 0, img.width, img.height);
                this.avatarImage = new Uint8Array(imageData.data.buffer);
                
                console.log('Avatar image loaded and ready');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    async processFrame() {
        if (!this.isRunning) return;
        
        const startTime = performance.now();
        
        try {
            // 1. Capture frame from host video
            this.processCanvas.width = this.hostVideo.videoWidth;
            this.processCanvas.height = this.hostVideo.videoHeight;
            this.processCtx.drawImage(this.hostVideo, 0, 0);
            
            // 2. Detect facial landmarks using facemesh
            const predictions = await this.facemesh.estimateFaces(this.processCanvas, {
                flipHorizontal: false,
                predictIrises: true
            });
            
            if (predictions.length > 0 && this.avatarImage) {
                // 3. Prepare data for WASM processing
                const landmarks = predictions[0].scaledMesh;
                
                // 4. Process frame in WebAssembly for ultra-low latency
                this.wasmModule.processFrame(
                    landmarks, 
                    this.avatarImage, 
                    this.processCanvas.width, 
                    this.processCanvas.height,
                    this.mirrorBuffer
                );
                
                // 5. Display result
                const imageData = new ImageData(
                    new Uint8ClampedArray(this.mirrorBuffer),
                    this.processCanvas.width,
                    this.processCanvas.height
                );
                
                const mirrorCanvas = document.createElement('canvas');
                mirrorCanvas.width = this.processCanvas.width;
                mirrorCanvas.height = this.processCanvas.height;
                mirrorCanvas.getContext('2d').putImageData(imageData, 0, 0);
                
                this.mirrorVideo.srcObject = mirrorCanvas.captureStream(60);
            }
        } catch (err) {
            console.error('Frame processing error:', err);
        }
        
        // Calculate and display performance metrics
        const processTime = performance.now() - startTime;
        this.frameTimes.push(processTime);
        
        // Update FPS counter every second
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 1000) {
            const fps = this.frameCount;
            const avgLatency = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
            
            this.performanceMetrics.textContent = 
                `Latency: ${avgLatency.toFixed(1)}ms | FPS: ${fps}`;
            
            this.frameCount = 0;
            this.frameTimes = [];
            this.lastFpsUpdate = now;
        }
        
        // Schedule next frame with precise timing
        const targetFrameTime = 1000 / 60; // 60fps
        const elapsed = performance.now() - startTime;
        const delay = Math.max(0, targetFrameTime - elapsed);
        
        setTimeout(() => {
            requestAnimationFrame(() => this.processFrame());
        }, delay);
    }
}

// Initialize when WASM is ready
const mirror = new UltraLowLatencyMirror();