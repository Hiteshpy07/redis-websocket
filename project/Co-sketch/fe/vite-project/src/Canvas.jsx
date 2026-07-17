import {useEffect, useRef,useState} from 'react';
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
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    newSocket.emit('join_room', roomId);
    newSocket.on('receive_draw_stroke', (data) => {
      if (data.sender === username) return; // Skip drawing our own duplicated strokes
      drawOnCanvas(data.x1, data.y1, data.x2, data.y2, data.color);
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
  const drawOnCanvas = (type,x1, y1, x2, y2, strokeColor) => {
    const ctx = contextRef.current;
    if (!ctx) return;
    ctx.strokeStyle = strokeColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    
    if (type === 'rect') {
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
  }else if (type === 'circle') {
    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
  }else if (type === 'line') {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();

  };


  /// Mouse Left-Click Down Interceptor
  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    setIsDrawing(true);
    startPos.current = { x: offsetX, y: offsetY };
    lastPos.current = { x: offsetX, y: offsetY };

    // 👇 ADD THIS CODE BLOCKED RIGHT HERE 👇
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    if (canvas && ctx) {
      // Take a picture of the pixel state BEFORE the shape layout alters it
      canvasSnapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };
  // Drag Pointer Action Coordinate Generator
const draw = ({ nativeEvent }) => {
    if (!isDrawing || !socket) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = contextRef.current; // Grab the canvas brush context

    // 🟢 Path A: Your existing freehand brush logic
    if (activeTool === 'brush') {
      const x1 = lastPos.current.x;
      const y1 = lastPos.current.y;
      const x2 = offsetX;
      const y2 = offsetY;

      // Render locally first for instant 0ms visual update speed
      drawOnCanvas(x1, y1, x2, y2, myColor);

      // Emit the exact vector path to the server pipeline continuously
      socket.emit('send_draw_stroke', {
        roomId,
        sender: username,
        type: 'brush', // Let the server know this is a brush stroke
        color: myColor,
        x1, y1, x2, y2
      });

      // Keep updating the last position so the line stays connected
      lastPos.current = { x: offsetX, y: offsetY };
    } 
    
    // 🔵 Path B: The new shape preview logic (Rect, Circle, Line)
    else {
      if (canvasSnapshot.current && ctx) {
        // 1. Clear out the previous frame's ghost preview lines
        ctx.putImageData(canvasSnapshot.current, 0, 0); 
        
        // 2. Draw the fresh shape preview from where the click started to the current mouse position
        drawShapeOnCanvas(
          activeTool, 
          startPos.current.x, 
          startPos.current.y, 
          offsetX, 
          offsetY, 
          myColor
        );
      }
    }
  };

    // Lock position context for next frame segment interval step
    lastPos.current = { x: offsetX, y: offsetY };
  };

  // Mouse Released / Exit Actions
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
      


      {/* RIGHT SIDE PANEL: CANVAS COLLABORATION SKETCHPAD (60% Split) */}
      <div className="w-[100%] h-full flex flex-col bg-gray-950 relative">
        

        {/* Local Target Client Tracking Badge */}
        <div className="px-4 py-2 border-b border-gray-800 bg-gray-950/40 text-xs text-gray-400 flex justify-between items-center">
          <span>Identity: <span className="text-sky-400 font-bold">@{username}</span></span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500">Ink Color:</span>
            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: myColor }} />
          </div>
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

