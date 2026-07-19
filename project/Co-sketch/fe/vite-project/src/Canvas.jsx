import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { FiPlusCircle } from "react-icons/fi";


export default function Canvas({ authenticatedUser, activeRoom, onLogout }) {
  // Core Operational States
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState("brush"); 
  const [isChatOpen, setIsChatOpen] = useState(false);  
  const [pendingImage, setPendingImage] = useState(null); // Tracks the current base64 image preview 

  const roomId = activeRoom;
  const username = authenticatedUser;

  const [myColor] = useState(() => {
    const colors = ["#38bdf8", "#f43f5e", "#10b981", "#a855f7", "#eab308", "#f97316"];
    return colors[Math.floor(Math.random() * colors.length)];
  });
//function that will select random color out of the array



  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });      
  const canvasSnapshot = useRef(null);    

  // WebSocket connection and send data to the pub-sub channel
  useEffect(() => { 
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    newSocket.emit('join_room', roomId);
    
    //chat channel
    newSocket.on('receive_chat_message', (data) => {
      const logMessage = data.image 
    ? `${data.user}: ${data.message} [IMAGE_ATTACHMENT]${data.image}` 
    : `${data.user}: ${data.message}`;
      setChatLog((prev) => [...prev, logMessage]);
    });
    //draw channel
    newSocket.on('receive_draw_stroke', (data) => {
      if (data.sender === username) return; // Skip echoed strokes
      drawOnCanvas(data.type, data.x1, data.y1, data.x2, data.y2, data.color);
    });

    return () => newSocket.disconnect();
  }, [username, roomId]);

  //fucntion to avoid overwrting while draeing shape
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
    context.lineWidth = 4;
    contextRef.current = context;
  }, []);

  //function to draw shape based on mouse activity
  const drawOnCanvas = (type, x1, y1, x2, y2, strokeColor) => {
    const ctx = contextRef.current;
    if (!ctx) return;
    ctx.strokeStyle = strokeColor;
    ctx.beginPath();
    
    if (type === 'brush' || type === 'line') {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    } else if (type === 'rect') {
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
    } else if (type === 'circle') {
      const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
    }
    ctx.stroke();
  };

  //putting chat data to the redis channel
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!socket) return;
    
    // Ensure we don't fire blank packets if there's no text AND no image
    if (!message.trim() && !pendingImage) return;

    // Send unified text + media payload over the socket pipe
    socket.emit('send_chat_message', { 
      roomId, 
      user: username, 
      message: message.trim(),
      image: pendingImage // Can be a string payload or null
    });

    // Clear message field and erase image preview box after dispatching
    setMessage('');
    setPendingImage(null);
  };

  // Mouse Down Trigger-brush event
  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    setIsDrawing(true);
    startPos.current = { x: offsetX, y: offsetY };
    lastPos.current = { x: offsetX, y: offsetY };

    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    if (canvas && ctx) {
      // Freeze snapshot buffer data image state
      canvasSnapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  // Drag Coordinate Loop Generator
  const draw = ({ nativeEvent }) => {
    if (!isDrawing || !socket) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = contextRef.current;

    if (activeTool === 'brush') {
      const x1 = lastPos.current.x;
      const y1 = lastPos.current.y;
      
      drawOnCanvas('brush', x1, y1, offsetX, offsetY, myColor);

      socket.emit('send_draw_stroke', {
        roomId, sender: username, type: 'brush', color: myColor,
        x1, y1, x2: offsetX, y2: offsetY
      });

      lastPos.current = { x: offsetX, y: offsetY };
    } else {
      if (canvasSnapshot.current && ctx) {
        ctx.putImageData(canvasSnapshot.current, 0, 0); // Cleans preview frames
        drawOnCanvas(activeTool, startPos.current.x, startPos.current.y, offsetX, offsetY, myColor);
      }
    }
  };

  // Mouse Released Event
  const stopDrawing = ({ nativeEvent }) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool !== 'brush' && socket) {
      const { offsetX, offsetY } = nativeEvent;
      socket.emit('send_draw_stroke', {
        roomId, sender: username, type: activeTool, color: myColor,
        x1: startPos.current.x, y1: startPos.current.y, x2: offsetX, y2: offsetY
      });
    }
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  //screenshot of the canvas and download it as a png file
  const downloadCanvasSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageStream = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = imageStream;
    downloadLink.download = `SyncBoard-Export-${new Date().toISOString().slice(0,10)}.png`;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

  };


  const handlefileupload = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    fileInput.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          // Save the base64 data string to our message preview state
          setPendingImage(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    };

    fileInput.click();
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-100 font-mono overflow-hidden relative">
      
      
      <div className="w-full h-full flex flex-col bg-gray-950 relative">
        
        {/* Dynamic Controls Header Panel Toolbar */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-sm text-sky-400">🌐 Co-Sketch Workspace</h1>
            
            {/* shapes ribbon container here */}
            <div className="flex bg-gray-950 border border-gray-800 p-1 rounded-md gap-1">
              {[
                { id: "brush", label: "Free Hand" },
                { id: "rect", label: "Rectangle" },
                { id: "circle", label: "Circle" },
                { id: "line", label: "Straight Line" }
              ].map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveTool(tool.id)}   
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    activeTool === tool.id 
                      ? "bg-sky-600 text-white shadow" 
                      : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                  }`}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={downloadCanvasSnapshot}
              className="text-xs bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-900/50 px-3 py-1 rounded transition-colors"
            >
              📸 Export Image
            </button>
            <button 
              onClick={clearLocalCanvas} 
              className="text-xs bg-red-950 hover:bg-red-900 text-red-400 border border-red-900/50 px-3 py-1 rounded transition-colors"
            >
              Clear Board
            </button>
            {/* a disconnect button from the room , no need to refesh anymore */}
            <button 
              onClick={onLogout}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-1 rounded transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* user details , ink color , room id , username */}
        <div className="px-4 py-2 border-b border-gray-800 bg-gray-950/40 text-xs text-gray-400 flex justify-between items-center z-10">
          <span><span className="text-sky-400 font-bold">@{username}</span> in room <span className="text-emerald-400 font-bold">#{roomId}</span></span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500">Ink Selection Color:</span>
            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: myColor }} />
          </div>
        </div>

        {/* canvas */}
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

      {/* chat butto shifted from right side to left on a flating part */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="absolute bottom-6 right-6 z-40 p-4 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-2xl transition-all font-sans font-bold flex items-center gap-2 active:scale-95"
      >
        💬 {isChatOpen ? "Close Discussion Chat" : "Open Chat Panel"}
        {chatLog.length > 0 && !isChatOpen && (
          <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
            {chatLog.length}
          </span>
        )}
      </button>

      {/* FLOATING ACTION LOG PANEL MODAL */}
      {/* FLOATING ACTION LOG PANEL MODAL */}
{isChatOpen && (
  <div className="absolute bottom-24 right-6 z-40 w-96 h-[480px] bg-gray-900 border border-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden font-mono animate-fade-in">
    <div className="p-3 bg-gray-950/80 border-b border-gray-800 flex justify-between items-center">
      <span className="text-xs font-bold text-emerald-400">📝 Chat Stream Channels</span>
    </div>

    {/* Message Display Log Stream Area */}
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-gray-950/20">
      {chatLog.length === 0 ? (
        <span className="text-xs italic text-gray-600 my-auto text-center">No logs generated. Send a message below.</span>
      ) : (
        chatLog.map((log, index) => {
          // If your server broadcasts objects instead of hard strings, parse them here:
          // For compatibility with string logging arrays, we intercept data fields cleanly
          const hasImage = log.includes("data:image/");
          
          let sender = username;
          let msgBody = log;
          let imageSource = null;

          if (log.includes(": ")) {
            const parts = log.split(": ");
            sender = parts[0];
            msgBody = parts.slice(1).join(": ");
          }

          const isMe = sender === username;

          // Extract image if it was compressed into string logs
          if (msgBody.includes("[IMAGE_ATTACHMENT]")) {
            const dataSegments = msgBody.split("[IMAGE_ATTACHMENT]");
            msgBody = dataSegments[0];
            imageSource = dataSegments[1];
          }

          return (
            <div key={index} className={`max-w-[80%] rounded-lg p-2.5 text-xs border ${isMe ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-200 self-end" : "bg-gray-800 border-gray-700 text-gray-200 self-start"}`}>
              <span className={`block text-[9px] font-bold mb-1 ${isMe ? "text-emerald-400" : "text-sky-400"}`}>{sender}</span>
              
              {/* Render image inside chat list if present */}
              {imageSource && (
                <img src={imageSource} alt="Shared media upload" className="max-w-full rounded border border-gray-700 mb-1.5 object-cover max-h-32 bg-gray-950" />
              )}
              
              {msgBody.trim() && <span className="break-words">{msgBody}</span>}
            </div>
          );
        })
      )}
    </div>

    {/* 🚀 IMAGE PREVIEW BOX: Renders above input area only when an image is loaded */}
    {pendingImage && (
      <div className="p-2 bg-gray-950 border-t border-gray-800 flex items-center justify-between gap-2 animate-slide-up">
        <div className="flex items-center gap-2 overflow-hidden">
          <img src={pendingImage} alt="Preview thumbnail" className="w-10 h-10 object-cover rounded border border-sky-500/50" />
          <span className="text-[10px] text-gray-400 truncate italic">Ready to transmit image payload...</span>
        </div>
        <button 
          type="button"
          onClick={() => setPendingImage(null)} 
          className="text-[10px] bg-red-950/60 text-red-400 border border-red-900/40 hover:bg-red-900 px-2 py-1 rounded"
        >
          Remove
        </button>
      </div>
    )}

    {/* Form Form Field Deck */}
    <form onSubmit={handleSendMessage} className="p-2 bg-gray-950/60 border-t border-gray-800 flex gap-2 items-center">
      {/* Upload Clip Button Trigger */}
      <button
        type="button"
        onClick={handlefileupload}
        className="p-2 bg-gray-950 hover:bg-gray-900 border border-gray-800 text-gray-400 hover:text-sky-400 rounded-md transition-colors active:scale-95"
        title="Upload Image Attachment"
      >
        📎
      </button>

      <input 
        type="text" 
        value={message} 
        onChange={(e) => setMessage(e.target.value)} 
        placeholder={pendingImage ? "Add a caption..." : "Type a message..."} 
        className="flex-1 bg-gray-950 border border-gray-800 rounded-md p-2 text-xs text-gray-100 outline-none focus:border-sky-500" 
      />
      <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-8 px-4 rounded-md">
        SEND
      </button>
    </form>
  </div>
)}

    </div>
  );
}