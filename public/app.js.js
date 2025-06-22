import { setupCall } from './webrtc.js';
import { setupExpressionTracking } from './expression.js';

const startBtn = document.getElementById('startCall');
const endBtn = document.getElementById('endCall');
const avatarUpload = document.getElementById('avatarUpload');

let avatarImage = null;
let expressionTracker;
let rtcConnection;

// Load avatar image
avatarUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      avatarImage = new Image();
      avatarImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// Start call with expression mirroring
startBtn.addEventListener('click', async () => {
  if (!avatarImage) {
    alert('Please upload an avatar image first!');
    return;
  }

  rtcConnection = await setupCall();
  expressionTracker = await setupExpressionTracking(avatarImage);
  
  startBtn.disabled = true;
  endBtn.disabled = false;
});

// End call
endBtn.addEventListener('click', () => {
  if (rtcConnection) rtcConnection.close();
  if (expressionTracker) expressionTracker.stop();
  
  startBtn.disabled = false;
  endBtn.disabled = true;
});