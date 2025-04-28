import express from 'express';
import https from 'https';
import { Server as SocketIoServer } from 'socket.io';
import { v4 as uuidV4 } from 'uuid';
import fs from 'fs';

const app = express();

// SSL Certificate setup
const privateKey = fs.readFileSync('./server.key', 'utf8');
const certificate = fs.readFileSync('./server.crt', 'utf8');
const credentials = { key: privateKey, cert: certificate };

// Create HTTPS server
const httpsServer = https.createServer(credentials, app);
const io = new SocketIoServer(httpsServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.set("view engine", "ejs");
app.use(express.static('public'));

app.get("/", (_req, res) => {
    res.redirect(`/${uuidV4()}`);
});

app.get('/:room', (req, res) => {
    res.render('room', { roomId: req.params.room });
});

io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            socket.broadcast.to(roomId).emit('user-disconnected', userId);
        });
    });
});

httpsServer.listen(4430, '0.0.0.0', () => {
    console.log("Running HTTPS server on port 4430");
});
