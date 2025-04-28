const socket = io('https://10.3.50.140:4430', {
    secure: true,
    rejectUnauthorized: false // Only for development with self-signed certs
});

const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};

// Get room ID from URL
const ROOM_ID = window.location.pathname.split('/')[1];

// Initialize PeerJS
const myPeer = new Peer(undefined, {
    host: '10.3.50.140',
    port: 3001,
    path: '/peerjs',
    secure: true,
    debug: 3
});

// Handle media stream
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
        addVideoStream(myVideo, stream);

        myPeer.on('call', call => {
            call.answer(stream);
            const video = document.createElement('video');
            call.on('stream', userVideoStream => {
                addVideoStream(video, userVideoStream);
            });
        });

        socket.on('user-connected', userId => {
            connectToNewUser(userId, stream);
        });
    }).catch(err => {
        console.error('Failed to get media devices:', err);
    });

// Handle user disconnection
socket.on('user-disconnected', userId => {
    if (peers[userId]) {
        peers[userId].close();
        delete peers[userId];
    }
});

// When PeerJS connection is open
myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
});

myPeer.on('error', err => {
    console.error('PeerJS error:', err);
});

// Connect to new user
function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');

    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });

    call.on('close', () => {
        video.remove();
    });

    peers[userId] = call;
}

// Add video stream to grid
function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}
