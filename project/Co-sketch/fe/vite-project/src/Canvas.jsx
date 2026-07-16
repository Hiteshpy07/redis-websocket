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
    <div>canvas area</div>
  );
}

