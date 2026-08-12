import express from 'express';
import cors from 'cors';
import { redis, redisSub } from './services/redis.js'; //importing the redis server and the duplicate server for pubsub model
import { initSocket } from './services/websoc.js'; //importing the socket.io server and the raw http server instance


const app = express();
app.use(cors({origin: '*'}));
   
const { server, io } = initSocket(app);// made it from the exported socket io instance from websoc.js file


const CHAT_CHANNEL = 'CO_SKETCH_CHANNEL';
const DRAW_CHANNEL = 'CO_SKETCH_DRAW_CHANNEL';

//settig up the reis suscribe model, to listen any new data iin the chat channel
async function setupRedisSubscription() {
    await redisSub.subscribe(CHAT_CHANNEL);
    await redisSub.subscribe(DRAW_CHANNEL);
    //setup the duplicate server to the suscribe mode for the channel
   redisSub.on('message', (channel, message) => {
    if (channel === CHAT_CHANNEL) {
        console.log(`Received message from Redis channel ${channel}: ${message}`);
        const data = JSON.parse(message); 
        
        // Broadcast the full payload back out to the sockets in the room
        io.to(data.roomId).emit('receive_chat_message', {
            user: data.user,
            message: data.message,
            image: data.image // 🚀 Added this line to pass the image payload to the frontend!
        });
    }
// 🏁 Safely closed both the if-statement and the subscriber block brackets!
    //io.to(data.roomId).emit(...): Takes the verified data object and pushes it down the WebSocket pipe to every browser instance currently sitting inside that specific room.
    else if (channel === DRAW_CHANNEL) {
      const data = JSON.parse(message)
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

socket.on('send_chat_message', (data) => {
  const logContent = data.image ? "[Media Attachment Payload]" : data.message;
  console.log(`Received from client ${socket.id}: ${logContent}`);
  
  // Publish the raw unified data object directly to the Redis engine
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