import {useEffect, useRef} from 'react';
import {io} from 'socket.io-client';

export default function Canvas(){
const [socket, setSocket] = useState(null);
const [message, setMessage] = useState('');
const [chatLog, setChatLog] = useState([]);
const [isDrawing, setIsDrawing] = useState(false);

const roomId = "meeting-123";

const [username] = useState(() => `User_${Math.floor(100 + Math.random() * 900)}`);//assign a roandom userid to a user loggin in 
const [myColor] = useState(() => {
    const colors = ["#38bdf8", "#f43f5e", "#10b981", "#a855f7", "#eab308", "#f97316"];
    return colors[Math.floor(Math.random() * colors.length)];
  });// asssign a rondom hex code of colr to the user from the array defined 

  //THIS IS A NEW TYPE OF USING USEDTATE , LERN MORE ABOUT IT 

  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const lastPos = useRef({ x: 0, y: 0 });

  //LEARN MORE BETTER USECASES OFO USEREFS -SEE WHY ITS USED 
  useEffect(() => { 
    newSocket.on('receive_draw_stroke', (data) => {
      if (data.sender === username) return; // Skip drawing our own duplicated strokes
      drawSegmentOnCanvas(data.x1, data.y1, data.x2, data.y2, data.color);
    });

    return () => newSocket.disconnect();
  },[username])



  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scale canvas internals by 2x for high-DPI/Retina monitors (crispy lines)
    canvas.width = canvas.parentElement.clientWidth * 2;
    canvas.height = canvas.parentElement.clientHeight * 2;
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.lineCap = "round";
    context.lineWidth = 4;
    contextRef.current = context;
  }, []);



  // Core Native Canvas Drawing Utility
  const drawSegmentOnCanvas = (x1, y1, x2, y2, strokeColor) => {
    const ctx = contextRef.current;
    if (!ctx) return;
    ctx.strokeStyle = strokeColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };


  // Mouse Left-Click Down Interceptor
  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    setIsDrawing(true);
    lastPos.current = { x: offsetX, y: offsetY };
  };

  // Drag Pointer Action Coordinate Generator
  const draw = ({ nativeEvent }) => {
    if (!isDrawing || !socket) return;
    const { offsetX, offsetY } = nativeEvent;
    
    const x1 = lastPos.current.x;
    const y1 = lastPos.current.y;
    const x2 = offsetX;
    const y2 = offsetY;

    // Render locally first for instant 0ms visual update speed
    drawSegmentOnCanvas(x1, y1, x2, y2, myColor);

    // Emit the exact vector path to the server pipeline
    socket.emit('send_draw_stroke', {
      roomId,
      sender: username,
      color: myColor,
      x1, y1, x2, y2
    });

    // Lock position context for next frame segment interval step
    lastPos.current = { x: offsetX, y: offsetY };
  };

  // Mouse Released / Exit Actions
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Wipe Local Monitor View Buffer Function
  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

 return (
    // <div>canvas area</div>
    <div className="flex h-screen w-screen bg-gray-950 text-gray-100 font-mono overflow-hidden">
      
      {/* LEFT SIDE PANEL: REAL-TIME TEXT LOG DOCK (40% Split) */}
      <div className="w-[40%] h-full bg-gray-900 border-r border-gray-800 flex flex-col">
        
        {/* Workspace Title Card Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h1 className="font-bold text-lg text-emerald-400">🌐 SyncBoard Chat</h1>
          <span className="text-xs bg-gray-800 text-gray-300 border border-gray-700 px-2 py-1 rounded">
            Room: {roomId}
          </span>
        </div>

        {/* Local Target Client Tracking Badge */}
        <div className="px-4 py-2 border-b border-gray-800 bg-gray-950/40 text-xs text-gray-400 flex justify-between items-center">
          <span>Identity: <span className="text-sky-400 font-bold">@{username}</span></span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500">Ink Color:</span>
            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: myColor }} />
          </div>
        </div>

        {/* Scrollable Conversation Output Field */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-950/20">
          {chatLog.length === 0 ? (
            <div className="text-gray-600 text-sm text-center my-auto italic">
              No transmission logs yet. Type below to broadcast!
            </div>
          ) : (
            chatLog.map((log, index) => {
              const [sender, ...msgBody] = log.split(": ");
              const fullMsg = msgBody.join(": ");
              const isMe = sender === username;

              return (
                <div 
                  key={index} 
                  className={`max-w-[85%] rounded-lg p-3 text-sm border ${
                    isMe 
                      ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200 self-end" 
                      : "bg-gray-800 border-gray-700 text-gray-200 self-start"
                  }`}
                >
                  <span className={`block text-[10px] font-bold uppercase mb-1 ${isMe ? "text-emerald-400" : "text-sky-400"}`}>
                    {sender} {isMe && "(Me)"}
                  </span>
                  <span className="break-words">{fullMsg}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Action Input Box Form Deck */}
        <form onSubmit={handleSendMessage} className="p-3 bg-gray-900 border-t border-gray-800 flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-950 border border-gray-800 rounded-md p-2.5 outline-none text-sm text-gray-100 placeholder-gray-600 focus:border-sky-500 transition-colors"
          />
          <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm px-5 rounded-md active:scale-95 transition-transform">
            SEND
          </button>
        </form>
      </div>

      {/* RIGHT SIDE PANEL: CANVAS COLLABORATION SKETCHPAD (60% Split) */}
      <div className="w-[60%] h-full flex flex-col bg-gray-950 relative">
        
        {/* Canvas Dashboard Settings Controls Ribbon */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-300">🖌️ Collaborative Canvas Workspace</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <button onClick={clearLocalCanvas} className="text-xs bg-red-950 hover:bg-red-900 text-red-400 border border-red-900/50 px-3 py-1 rounded transition-colors">
            Clear Local
          </button>
        </div>

        {/* Boundary Absolute Mounting Container Frame */}
        <div className="flex-1 w-full h-full bg-gray-900/40 relative">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="absolute top-0 left-0 w-full h-full bg-gray-950 cursor-crosshair"
          />
        </div>
      </div>

    </div>
  );
}

