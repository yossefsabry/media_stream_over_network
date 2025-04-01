// zoom clone using socket.io and peerjs 
// SOME REFERENCES
// https://peerjs.com/
// THANK BUDY ;): https://www.youtube.com/watch?v=DvlyzDZDEq4


import express from 'express';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';
import { v4 as uuidV4 } from 'uuid';

const app = express();
const server = http.createServer(app);
const io = new SocketIoServer(server);


app.set("view engine", "ejs");
app.use(express.static('public'));


app.get("/", (_req, res)=> { 
    res.redirect(`/${uuidV4()}`); 
})

app.get('/:room', (req, res)=> {
    res.render('room', {roomId: req.params.room});
})


io.on('connection', socket=> {
    socket.on('join-room', (roomId, userId) =>  {
        socket.join(roomId);

        socket.broadcast.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            socket.broadcast.to(roomId).emit('user-disconnected', userId);
        });

    })
})

server.listen(3000)

