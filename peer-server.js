import { PeerServer } from 'peer';
import { readFileSync } from 'fs';

const peerServer = PeerServer({
    port: 3001,
    path: '/peerjs',
    ssl: {
        key: readFileSync('./server.key', 'utf8'),
        cert: readFileSync('./server.crt', 'utf8')
    }
});

console.log('PeerJS server running on port 3001');
