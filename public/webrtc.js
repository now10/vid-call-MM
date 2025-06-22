export async function setupWebRTC() {
  const localVideo = document.getElementById('localVideo');
  const remoteVideo = document.getElementById('remoteVideo');
  
  // Get user media
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  localVideo.srcObject = stream;
  
  // Create RTCPeerConnection
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  
  // Add local stream to connection
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
  
  // Handle remote stream
  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };
  
  // WebSocket signaling
  const socket = io();
  
  socket.on('signal', async (data) => {
    if (data.description) {
      await pc.setRemoteDescription(data.description);
      if (data.description.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal', { description: pc.localDescription });
      }
    } else if (data.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  });
  
  // ICE Candidate handling
  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      socket.emit('signal', { candidate });
    }
  };
  
  return pc;
}