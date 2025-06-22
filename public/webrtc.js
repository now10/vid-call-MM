export async function setupCall() {
  const localVideo = document.getElementById('localVideo');
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = stream;

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  stream.getTracks().forEach(track => pc.addTrack(track, stream));

  const socket = io();

  pc.onicecandidate = ({ candidate }) => {
    if (candidate) socket.emit('signal', { candidate });
  };

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

  return pc;
}