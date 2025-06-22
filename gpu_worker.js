const { parentPort } = require('worker_threads');
const tf = require('@tensorflow/tfjs-node-gpu'); // GPU acceleration
const facemesh = require('@tensorflow-models/facemesh');
const { createCanvas, loadImage } = require('canvas');

// Load models
let model;
async function init() {
    await tf.ready();
    model = await facemesh.load({
        maxFaces: 1,
        detectionConfidence: 0.9,
        meshModelUrl: 'file://./models/facemesh/model.json'
    });
}
init();

parentPort.on('message', async (data) => {
    try {
        const { imageBuffer, width, height } = data;
        
        // Process image with GPU acceleration
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const imageData = new ImageData(new Uint8ClampedArray(imageBuffer), width, height);
        ctx.putImageData(imageData, 0, 0);
        
        // Detect faces with facemesh
        const predictions = await model.estimateFaces(canvas);
        
        // Send results back to main thread
        parentPort.postMessage({
            success: true,
            predictions,
            timestamp: data.timestamp
        });
    } catch (err) {
        parentPort.postMessage({
            success: false,
            error: err.message
        });
    }
});