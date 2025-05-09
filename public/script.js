const ROOM_ID = window.location.pathname.split('/')[1] || 'default-room';
const serverUrl = `https://${window.location.hostname}:4430`;
const socket = io(serverUrl, {
    secure: true,
    rejectUnauthorized: false
});

// DOM Elements
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true;
myVideo.autoplay = true;
myVideo.playsInline = true;
videoGrid.appendChild(myVideo);

// Connection tracking
const peers = {};
let localStream = null;
let myPeerId = null;

// PeerJS Configuration
const myPeer = new Peer({
    host: window.location.hostname,
    port: 3001,
    path: '/peerjs',
    secure: true,
    debug: 3,
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { 
                urls: 'turn:numb.viagenie.ca:3478',
                credential: 'muazkh',
                username: 'webrtc@live.com'
            }
        ]
    }
});

// Initialize media and connections
async function setupMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        myVideo.srcObject = localStream;
        
        // Handle incoming calls
        myPeer.on('call', call => {
            console.log('Incoming call from:', call.peer);
            call.answer(localStream);
            
            const video = createVideoElement(call.peer);
            call.on('stream', userVideoStream => {
                video.srcObject = userVideoStream;
            });
            
            call.on('close', () => {
                removeVideoElement(call.peer);
            });
            
            peers[call.peer] = call;
        });

    } catch (err) {
        console.error('Media access error:', err);
    }
}

// Connect to a new user
function connectToNewUser(userId) {
    if (userId === myPeerId) return; // Don't connect to ourselves
    
    console.log('Connecting to new user:', userId);
    
    // Check if we already have a connection to this user
    if (peers[userId]) {
        console.log('Already connected to:', userId);
        return;
    }
    
    const call = myPeer.call(userId, localStream);
    const video = createVideoElement(userId);
    
    call.on('stream', userVideoStream => {
        console.log('Received stream from:', userId);
        video.srcObject = userVideoStream;
    });
    
    call.on('close', () => {
        console.log('Call closed with:', userId);
        removeVideoElement(userId);
        delete peers[userId];
    });
    
    call.on('error', err => {
        console.error('Call error with', userId, ':', err);
        removeVideoElement(userId);
        delete peers[userId];
    });
    
    peers[userId] = call;
}

// Helper to create video element
function createVideoElement(userId) {
    const existingVideo = document.getElementById(`video-${userId}`);
    if (existingVideo) return existingVideo;
    
    const video = document.createElement('video');
    video.id = `video-${userId}`;
    video.autoplay = true;
    video.playsInline = true;
    videoGrid.appendChild(video);
    return video;
}

// Helper to remove video element
function removeVideoElement(userId) {
    const video = document.getElementById(`video-${userId}`);
    if (video) {
        // Clean up the stream
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        video.remove();
    }
}

// Handle disconnections
function handleUserDisconnected(userId) {
    console.log('User disconnected:', userId);
    if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
    }
    removeVideoElement(userId);
}

// PeerJS events
myPeer.on('open', id => {
    console.log('My peer ID:', id);
    myPeerId = id;
    socket.emit('join-room', ROOM_ID, id);
});

myPeer.on('error', err => {
    console.error('PeerJS error:', err);
});

// Socket.io events
socket.on('user-connected', userId => {
    console.log('User connected:', userId);
    // Wait a moment before connecting to avoid race conditions
    setTimeout(() => connectToNewUser(userId), 1000);
});

socket.on('user-disconnected', userId => {
    handleUserDisconnected(userId);
});

// Start the application
setupMedia();
