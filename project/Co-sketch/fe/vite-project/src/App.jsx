import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function App() {
  // 1. Core State Hooks
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // 2. Ref Storage Nodes
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  const roomId = "meeting-123"; 
  const username = "Hitesh";

  // 3. Side Effects Lifecycle Layers
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    newSocket.emit('join_room', roomId);

    newSocket.on('receive_chat_message', (data) => {
      setChatLog((prev) => [...prev, `${data.user}: ${data.message}`]);
    });

    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement.clientWidth * 2;
    canvas.height = canvas.parentElement.clientHeight * 2;
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.lineCap = "round";
    context.strokeStyle = "#38bdf8"; 
    context.lineWidth = 4;
    contextRef.current = context;
  }, []);

  // 4. Operational Handler Functions (MUST BE ABOVE THE RETURN STATEMENT!)
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !socket) return;
    socket.emit('send_chat_message', {
      roomId,
      user: username,
      message: message
    });
    setMessage('');
  };

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // 5. Render Output Block
  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-100 font-mono overflow-hidden">
      
      {/* LEFT PANEL: CHAT */}
      <div className="w-[40%] h-full bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h1 className="font-bold text-lg text-emerald-400">🌐 SyncBoard Chat</h1>
          <span className="text-xs bg-gray-800 text-gray-300 border border-gray-700 px-2 py-1 rounded">
            Room: {roomId}
          </span>
        </div>

        <div className="px-4 py-2 border-b border-gray-800 bg-gray-950/40 text-xs text-gray-400">
          User: <span className="text-sky-400 font-bold">@{username}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-950/20">
          {chatLog.length === 0 ? (
            <div className="text-gray-600 text-sm text-center my-auto italic">
              No transmission logs yet. Type below to broadcast!
            </div>
          ) : (
            chatLog.map((log, index) => {
              const [sender, ...msgBody] = log.split(": ");
              const fullMsg = msgBody.join(": ");
              const isMe = sender === username || sender === "Me";

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
                    {sender}
                  </span>
                  <span className="break-words">{fullMsg}</span>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSendMessage} className="p-3 bg-gray-900 border-t border-gray-800 flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a guess or message..."
            className="flex-1 bg-gray-950 border border-gray-800 rounded-md p-2.5 outline-none text-sm text-gray-100 placeholder-gray-600 focus:border-sky-500 transition-colors"
          />
          <button 
            type="submit" 
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm px-5 rounded-md active:scale-95 transition-transform"
          >
            SEND
          </button>
        </form>
      </div>

      {/* RIGHT PANEL: CANVAS LAYOUT */}
      <div className="w-[60%] h-full flex flex-col bg-gray-950 relative">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-300">🖌️ Workspace Canvas</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <button 
            onClick={clearLocalCanvas} 
            className="text-xs bg-red-950 hover:bg-red-900 text-red-400 border border-red-900/50 px-3 py-1 rounded transition-colors"
          >
            Clear Local
          </button>
        </div>

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