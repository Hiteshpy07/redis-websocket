import { createServer } from 'http'; //new thing ? why used here?
//Line 4 (createServer): Imports Node's native HTTP module. Socket.io cannot attach directly to an Express app wrapper; it needs a raw HTTP server instance to establish its persistent handshake.

import { Server } from 'socket.io'; //useing websockets



// const server = createServer(app);
// const io = new Server(server, { cors: { origin: "*" } });
//wrapping the ecpress server by a raw HTTP server instance to allow socket.io to work with it. The cors option allows cross-origin requests from any domain.

//  main problem occuered is that , it is not reading "app" ,which is a exprerss server in the index.js file.

export const initSocket = (app) => {
           const server = createServer(app);
          const io = new Server(server, {
        cors: {
                origin: "*"
         }
    });
    return { server, io };
       }