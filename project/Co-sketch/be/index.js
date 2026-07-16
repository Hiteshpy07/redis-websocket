import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import { createServer } from 'http'; //new thing ? why used here?
//Line 4 (createServer): Imports Node's native HTTP module. Socket.io cannot attach directly to an Express app wrapper; it needs a raw HTTP server instance to establish its persistent handshake.

import { Server } from 'socket.io'; //useing websockets

const app = express();
app.use(cors({origin: '*'}));

const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
//wrapping the ecpress server by a raw HTTP server instance to allow socket.io to work with it. The cors option allows cross-origin requests from any domain.

const redis = new Redis('redis://localhost:6379'); // Connect to Redis server in docer, not direclty running it ,  so redis:// not http://
const redisSub = redis.duplicate();//duplicate redis server for pubsub model 

const CHAT_CHANNEL = 'CO_SKETCH_CHANNEL';
const DRAQW_CHANNEL = 'CO_SKETCH_DRAW_CHANNEL';



//settig up the reis suscribe model, to listen any new data iin the chat channel
async function setupRedisSubscription() {
    await redisSub.subscribe(CHAT_CHANNEL);
    await redisSub.subscribe(DRAW_CHANNEL);
    //setup the duplicate server to the suscribe mode for the channel
    redisSub.on('message',(channel,message)=>{
        if (channel === CHAT_CHANNEL) //double check , if listening to corrext chaneel , there can be multiple chaneel runninng side by side
            {
                console.log(`Received message from Redis channel ${channel}: ${message}`);
                const data = JSON.parse(message);//good practice he- always sent datat from BE to FE IN JSON FORMAT, EASE TO USE THERE
                io.to(data.roomId).emit('receive_chat_message', {
        user: data.user,
        message: data.message
      });
    }

    //io.to(data.roomId).emit(...): Takes the verified data object and pushes it down the WebSocket pipe to every browser instance currently sitting inside that specific room.

    else if (channel === DRAW_CHANNEL) {
  io.to(data.roomId).emit('receive_draw_stroke', data);
}//same as above, but for the drawing channel
  });
}
setupRedisSubscription().catch(console.error);


//IOSOCKET CONNECTION
io.on('connection',(socket)=>{
    console.log(`New client connected: ${socket.id}`);


socket.on('join_room',(roomID)=>{
    socket.join(roomID);
    console.log(`Client ${socket.id} joined room ${roomID}`);

})

socket.on('send_chat_message',(data)=>{
    console.log(`Received message from client ${socket.id}: ${data.message}`);
    // Publish the message to the Redis channel
    console.log(`⚡ Publishing to Redis: ${data.message}`);
    redis.publish(CHAT_CHANNEL, JSON.stringify(data));
});

socket.on('disconnect', () => {
    console.log(`🛑 Disconnected: ${socket.id}`);
  });

  socket.on('send_draw_stroke', async (strokeData) => {
  await redis.publish(DRAW_CHANNEL, JSON.stringify(strokeData));
});
});
  server.listen(3001, () => {
  console.log('🚀 co-sketch on port 3001');
});