// Remove any duplicate ROOM_ID declarations first!
const ROOM_ID = window.location.pathname.split('/')[1] || 'default-room';

window.localStream = null;

const serverUrl = `https://${window.location.hostname}:4430`;
const socket = io(serverUrl, {
    secure: true,
    rejectUnauthorized: false
});

const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};

// Enhanced PeerJS config
const myPeer = new Peer(undefined, {
    host: window.location.hostname,
    port: 3001,
    path: '/peerjs',
    secure: true,
    debug: 3,
    config: {
        'iceServers': [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'turn:numb.viagenie.ca:3478', 
                credential: 'muazkh', username:'web...@live.com' },
            { urls: 'turn:numb.viagenie.ca', 
                credential: 'muazkh', username:'web...@live.com' },
            { urls: 'turn:192.158.29.39:3478?transport=udp', 
                credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=', username:'28224511:1379330808' },
            { urls: 'turn:192.158.29.39:3478?transport=tcp', 
                credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=', username:'28224511:1379330808' 
            }
        ]
    }
});

// Debugging functions
function logConnectionState(connection) {
    connection.on('iceStateChanged', state => {
        console.log('ICE state:', state);
    });
    connection.on('stream', stream => {
        console.log('Stream received:', stream);
    });
    connection.on('error', err => {
        console.error('Connection error:', err);
    });
}

// Handle media stream
async function setupMedia() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        console.log('Got local stream:', stream);
        addVideoStream(myVideo, stream, 'local-video');

        // Modify the call answer section
        myPeer.on('call', call => {
            console.log('Incoming call from:', call.peer);
            call.answer(window.localStream); // Use the global stream reference

            const video = document.createElement('video');
            video.id = `remote-video-${call.peer}`;

            // Add these before the stream handler
            call.on('track', (track, stream) => {
                console.log('Incoming track:', track.kind);
            });

            call.on('stream', userVideoStream => {
                console.log('Received remote stream from:', call.peer);
                console.log('Stream tracks:', userVideoStream.getTracks());
                addVideoStream(video, userVideoStream, `remote-${call.peer}`);
            });

            monitorPeerConnection(call.peerConnection, call.peer);
        });

        socket.on('user-connected', userId => {
            console.log('User connected:', userId);
            connectToNewUser(userId, stream);
        });
    } catch (err) {
        console.error('Media access error:', err);
    }
}

// Modified connectToNewUser function
function connectToNewUser(userId, stream) {
    console.log('Attempting to connect to:', userId);
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    video.id = `remote-video-${userId}`;

    // Add these event listeners first
    call.on('stream', userVideoStream => {
        console.log('Received stream from:', userId, userVideoStream);
        console.log('Stream active tracks:', userVideoStream.getTracks().map(t => t.kind));
        addVideoStream(video, userVideoStream, `remote-${userId}`);
        console.log("adding new video streamer");
    });

    call.on('track', (track, stream) => {
        console.log('Track event:', track.kind, stream);
    });

    call.on('iceStateChanged', state => {
        console.log('ICE state changed:', state);
        if (state === 'connected') {
            console.log('PEER CONNECTION ESTABLISHED');
        }
    });

    call.on('error', err => {
        console.error('Call error:', err);
    });

    // Monitor the underlying RTCPeerConnection
    monitorPeerConnection(call.peerConnection, userId);

    peers[userId] = call;
}

// Add this new helper function
function monitorPeerConnection(pc, peerId) {
    pc.oniceconnectionstatechange = () => {
        console.log(`${peerId} ICE state:`, pc.iceConnectionState);
    };
    
    pc.onconnectionstatechange = () => {
        console.log(`${peerId} Connection state:`, pc.connectionState);
    };
    
    pc.onsignalingstatechange = () => {
        console.log(`${peerId} Signaling state:`, pc.signalingState);
    };
}

// Improved video stream handling
function addVideoStream(video, stream, id) {
    console.log('Adding video stream:', id, stream);
    
    // Remove existing video element if present
    const existingVideo = document.getElementById(id);
    if (existingVideo) {
        existingVideo.remove();
    }

    video.id = id;
    video.srcObject = stream;
    video.playsInline = true;
    video.autoplay = true;
    video.controls = true;  // Add controls for debugging
    
    video.onloadedmetadata = () => {
        console.log('Video metadata loaded:', id, video.videoWidth, 'x', video.videoHeight);
        video.play().then(() => {
            console.log('Video playback started:', id);
        }).catch(err => {
            console.error('Video play failed:', id, err);
        });
    };
    
    video.onerror = (err) => {
        console.error('Video element error:', id, err, video.error);
    };
    
    videoGrid.appendChild(video);
    console.log('Video element added to DOM:', id);
}


// PeerJS events
myPeer.on('open', id => {
    console.log('My peer ID:', id);
    socket.emit('join-room', ROOM_ID, id);
});

myPeer.on('error', err => {
    console.error('PeerJS error:', err);
});

// Handle disconnections
socket.on('user-disconnected', userId => {
    console.log('User disconnected:', userId);
    if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
    }
});

// Start the application
setupMedia();

// Add this after Peer initialization
myPeer.on('iceStateChanged', state => {
    console.log('Global ICE state:', state);
});
