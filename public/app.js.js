import { setupWebRTC } from './webrtc.js';
import { setupExpressionTracking } from './expression.js';

// Initialize systems
const startBtn = document.getElementById('startBtn');
const endBtn = document.getElementById('endBtn');

let expressionTracker;
let rtcConnection;

startBtn.addEventListener('click', async () => {
  // Start WebRTC connection
  rtcConnection = await setupWebRTC();
  
  // Start expression tracking
  expressionTracker = await setupExpressionTracking();
  
  startBtn.disabled = true;
  endBtn.disabled = false;
});

endBtn.addEventListener('click', () => {
  if (rtcConnection) rtcConnection.close();
  if (expressionTracker) expressionTracker.stop();
  
  startBtn.disabled = false;
  endBtn.disabled = true;
});