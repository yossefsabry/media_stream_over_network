const io = window.io;
const Peer = window.Peer;

const socket = io('https://10.3.50.127:4430');
const videoGrid = document.getElementById('video-grid');

const myPeer = new Peer(undefined, {
    host: '10.3.50.127',
    port: '3001',
    secure: true // Attempt secure connection (you might need to configure PeerJS separately for HTTPS/WSS)

});

const myVideo = document.createElement('video');
myVideo.muted = true;

const peers = {};

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
        addVideoStream(myVideo, stream);

        myPeer.on('call', (call) => {
            call.answer(stream);
            const video = document.createElement('video');
            call.on('stream', userVideoStream => {
                console.log("welccome")
                addVideoStream(video, userVideoStream);
            });
        });

        socket.on('user-connected', userId => {
            connectToNewUser(userId, stream);
        });
    });

socket.on('user-disconnected', (userId) => {
    if (peers[userId]) peers[userId].close();
});

myPeer.on('open', (id) => {
    socket.emit('join-room', ROOM_ID, id);
});

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement("video");

    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
    call.on('close', () => {
        video.remove();
    });
    peers[userId] = call;
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}
