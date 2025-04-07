// zoom clone using socket.io and peerjs 

// SOME REFERENCES
// https://peerjs.com/
// THANK BUDY ;): https://www.youtube.com/watch?v=DvlyzDZDEq4
// FOR SSL certificates
// https://medium.com/@Yasirgaji/how-to-get-free-ssl-certificates-from-the-terminal-in-less-than-a-minute-and-more-239688733d69#1ab4



import express from 'express';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';
import { v4 as uuidV4 } from 'uuid';
import fs from 'fs'

const app = express();

// loading the private and crt key for ssl cretificates
const privateKey = fs.readFileSync('./server.key', 'utf8');
const certificates = fs.readFileSync('./server.crt', 'utf8');
const credentials = { key: privateKey, cert: certificates};

const server = http.createServer(app);
// creating a https server
const httpsServer = http.createServer(credentials, app);
const io = new SocketIoServer(httpsServer);

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

//app.listen(3000, () => {
//    console.log("running http server in port 3000");
//})

httpsServer.listen(4430, () => {
    console.log("running https server in port 3000");
})

