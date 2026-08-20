import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { FiPlusCircle, FiImage, FiCheck, FiX, FiMaximize2, FiMove, FiDownload, FiTrash2, FiLogOut } from "react-icons/fi";
import { FaRegSquare } from "react-icons/fa6";
import { FaRegCircle } from "react-icons/fa";
import { TbStrokeStraight } from "react-icons/tb";
import { FaPaintbrush } from "react-icons/fa6";
import { IoText } from "react-icons/io5";

export default function Canvas({ authenticatedUser, userAvatar, token, activeRoom, onLogout }) {
  // Core Operational States
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState("brush"); 
  const [isChatOpen, setIsChatOpen] = useState(false);  
  const [pendingImage, setPendingImage] = useState(null); // Chat image attachment preview

  // Image Import & Staging Mode
  const [placingImage, setPlacingImage] = useState(null); // { src, x, y, width, height, naturalWidth, naturalHeight, aspectRatio }
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [imageTransformState, setImageTransformState] = useState({ isDragging: false, isResizing: false, handle: null, startX: 0, startY: 0, startObj: null });

  // Custom  COLORSN. ADDED WITH SELECTED STROKE WIDTH TOO
    
  const paletteColors = ["#38bdf8", "#f43f5e", "#10b981", "#a855f7", "#eab308", "#f97316", "#ffffff", "#0284c7"];
  const [selectedColor, setSelectedColor] = useState(() => {
    return paletteColors[Math.floor(Math.random() * paletteColors.length)];
  });
  const [selectedLineWidth, setSelectedLineWidth] = useState(4);



  // Inline typing overlay
  const [textOverlay, setTextOverlay] = useState({ visible: false, x: 0, y: 0, text: '' });
  const textInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const roomId = activeRoom;
  const username = authenticatedUser;

  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const contextRef = useRef(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });      
  const canvasSnapshot = useRef(null);    

  useEffect(() => {
    if (textOverlay.visible && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textOverlay.visible]);

  // Main rendering utility function for brush, shapes, text, and imported images
  const drawOnCanvas = useCallback((type, x1, y1, x2, y2, strokeColor, textValue = '', imageSource = null, width = null, height = null, lineWidth = 4) => {
    const ctx = contextRef.current;
    if (!ctx) return;
    
    ctx.strokeStyle = strokeColor || selectedColor;
    ctx.fillStyle = strokeColor || selectedColor;
    ctx.lineWidth = lineWidth || 4;
    
    if (type === 'brush' || type === 'line') {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if (type === 'rect') {
      ctx.beginPath();
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      ctx.stroke();
    } else if (type === 'circle') {
      ctx.beginPath();
      const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (type === 'text') {
      ctx.font = '24px sans-serif';
      ctx.textBaseline = 'top'; 
      
      if (textValue && textValue.trim()) {
        ctx.fillText(textValue, x1, y1); 
      }
    } else if (type === 'image' && (imageSource || textValue)) {
      const src = imageSource || textValue;
      const img = new Image();
      img.onload = () => {
        const renderW = width || (x2 && x1 ? Math.abs(x2 - x1) : img.width);
        const renderH = height || (y2 && y1 ? Math.abs(y2 - y1) : img.height);
        ctx.drawImage(img, x1, y1, renderW, renderH);
      };
      img.src = src;
    }
  }, [selectedColor]);

  // WebSocket connection setup & listener streams
  useEffect(() => { 
    const newSocket = io('http://localhost:3001', {
      auth: {
        token: token
      }
    });
    setSocket(newSocket);
    newSocket.emit('join_room', roomId);
    
    // Chat channel
    newSocket.on('receive_chat_message', (data) => {
      const logMessage = data.image 
        ? `${data.user}: ${data.message} [IMAGE_ATTACHMENT]${data.image}` 
        : `${data.user}: ${data.message}`;
      setChatLog((prev) => [...prev, logMessage]);
    });

    // Draw channel
    newSocket.on('receive_draw_stroke', (data) => {
      if (data.sender === username) return; // Skip echoed strokes
      drawOnCanvas(
        data.type, 
        data.x1, 
        data.y1, 
        data.x2, 
        data.y2, 
        data.color, 
        data.textValue, 
        data.image, 
        data.width, 
        data.height, 
        data.lineWidth
      );
    });

    return () => newSocket.disconnect();
  }, [username, roomId, token, drawOnCanvas]);

  // Handle high-DPI crisp pixel scaling on canvas mount & resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const setupCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      canvas.style.width = "100%";
      canvas.style.height = "100%";

      const context = canvas.getContext("2d");
      context.scale(2, 2);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = selectedLineWidth;
      contextRef.current = context;
    };

    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [selectedLineWidth]);

  // Process and load an image file into staging placement mode
  const processImageFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgSrc = e.target.result;
      const img = new Image();
      img.onload = () => {
        const container = canvasContainerRef.current;
        const containerW = container ? container.clientWidth : 800;
        const containerH = container ? container.clientHeight : 600;

        // Scale image initially to fit comfortably within 60% of canvas
        const maxInitialW = Math.min(containerW * 0.7, 600);
        const maxInitialH = Math.min(containerH * 0.7, 500);

        let initialW = img.naturalWidth;
        let initialH = img.naturalHeight;
        const aspectRatio = img.naturalWidth / img.naturalHeight;

        if (initialW > maxInitialW || initialH > maxInitialH) {
          if (initialW / maxInitialW > initialH / maxInitialH) {
            initialW = maxInitialW;
            initialH = maxInitialW / aspectRatio;
          } else {
            initialH = maxInitialH;
            initialW = maxInitialH * aspectRatio;
          }
        }

        // Center on canvas
        const initialX = Math.max(20, Math.round((containerW - initialW) / 2));
        const initialY = Math.max(20, Math.round((containerH - initialH) / 2));

        setPlacingImage({
          src: imgSrc,
          x: initialX,
          y: initialY,
          width: Math.round(initialW),
          height: Math.round(initialH),
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          aspectRatio: aspectRatio
        });
      };
      img.src = imgSrc;
    };
    reader.readAsDataURL(file);
  }, []);

  // Global Clipboard Paste (Ctrl+V / Cmd+V) to import images directly onto canvas
  useEffect(() => {
    const handlePaste = (e) => {
      // Don't intercept paste if user is typing in chat or text overlay
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processImageFile]);

  // Commit / Stamp the placed image onto the canvas context and broadcast via socket
  const stampImageToCanvas = () => {
    if (!placingImage) return;

    const ctx = contextRef.current;
    if (ctx) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, placingImage.x, placingImage.y, placingImage.width, placingImage.height);
      };
      img.src = placingImage.src;
    }

    if (socket) {
      socket.emit('send_draw_stroke', {
        roomId,
        sender: username,
        type: 'image',
        image: placingImage.src,
        x1: placingImage.x,
        y1: placingImage.y,
        x2: placingImage.x + placingImage.width,
        y2: placingImage.y + placingImage.height,
        width: placingImage.width,
        height: placingImage.height
      });
    }

    setPlacingImage(null);
  };

  // Fit image to current canvas bounds
  const fitImageToCanvas = () => {
    if (!placingImage || !canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const padding = 40;
    const maxW = container.clientWidth - padding * 2;
    const maxH = container.clientHeight - padding * 2;

    let newW = maxW;
    let newH = maxW / placingImage.aspectRatio;

    if (newH > maxH) {
      newH = maxH;
      newW = maxH * placingImage.aspectRatio;
    }

    setPlacingImage((prev) => ({
      ...prev,
      width: Math.round(newW),
      height: Math.round(newH),
      x: Math.round((container.clientWidth - newW) / 2),
      y: Math.round((container.clientHeight - newH) / 2)
    }));
  };

  // Reset image to original natural dimensions
  const resetImageDimensions = () => {
    if (!placingImage || !canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    setPlacingImage((prev) => ({
      ...prev,
      width: prev.naturalWidth,
      height: prev.naturalHeight,
      x: Math.max(20, Math.round((container.clientWidth - prev.naturalWidth) / 2)),
      y: Math.max(20, Math.round((container.clientHeight - prev.naturalHeight) / 2))
    }));
  };

  // Drag & drop handlers on canvas container
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  // Image placement transform interactions (Move and Resize)
  const handleImageMouseDown = (e, action, handle = null) => {
    e.stopPropagation();
    e.preventDefault();

    setImageTransformState({
      isDragging: action === 'drag',
      isResizing: action === 'resize',
      handle: handle,
      startX: e.clientX,
      startY: e.clientY,
      startObj: { ...placingImage }
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!imageTransformState.isDragging && !imageTransformState.isResizing) return;
      if (!placingImage) return;

      const dx = e.clientX - imageTransformState.startX;
      const dy = e.clientY - imageTransformState.startY;
      const start = imageTransformState.startObj;

      if (imageTransformState.isDragging) {
        setPlacingImage((prev) => ({
          ...prev,
          x: Math.round(start.x + dx),
          y: Math.round(start.y + dy)
        }));
      } else if (imageTransformState.isResizing) {
        const handle = imageTransformState.handle;
        let newWidth = start.width;
        let newHeight = start.height;
        let newX = start.x;
        let newY = start.y;

        if (handle === 'se') {
          newWidth = Math.max(60, start.width + dx);
          newHeight = Math.round(newWidth / start.aspectRatio);
        } else if (handle === 'sw') {
          newWidth = Math.max(60, start.width - dx);
          newHeight = Math.round(newWidth / start.aspectRatio);
          newX = start.x + (start.width - newWidth);
        } else if (handle === 'ne') {
          newWidth = Math.max(60, start.width + dx);
          newHeight = Math.round(newWidth / start.aspectRatio);
          newY = start.y + (start.height - newHeight);
        } else if (handle === 'nw') {
          newWidth = Math.max(60, start.width - dx);
          newHeight = Math.round(newWidth / start.aspectRatio);
          newX = start.x + (start.width - newWidth);
          newY = start.y + (start.height - newHeight);
        }

        setPlacingImage((prev) => ({
          ...prev,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight
        }));
      }
    };

    const handleMouseUp = () => {
      if (imageTransformState.isDragging || imageTransformState.isResizing) {
        setImageTransformState({ isDragging: false, isResizing: false, handle: null, startX: 0, startY: 0, startObj: null });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [imageTransformState, placingImage]);

  // Inline text overlay submission
  const submitTextOverlay = () => {
    if (textOverlay.text.trim()) {
      drawOnCanvas('text', textOverlay.x, textOverlay.y, 0, 0, selectedColor, textOverlay.text);

      if (socket) {
        socket.emit('send_draw_stroke', {
          roomId,
          sender: username,
          type: 'text',
          x1: textOverlay.x,
          y1: textOverlay.y,
          color: selectedColor,
          textValue: textOverlay.text,
          lineWidth: selectedLineWidth
        });
      }
    }
    requestAnimationFrame(() => {
      setTextOverlay({ visible: false, x: 0, y: 0, text: '' });
    });
  };

  // Dispatch chat messages over socket
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!socket) return;
    if (!message.trim() && !pendingImage) return;

    socket.emit('send_chat_message', { 
      roomId, 
      user: username, 
      message: message.trim(),
      image: pendingImage 
    });

    setMessage('');
    setPendingImage(null);
  };

  // Canvas Mouse Down Event Trigger
  const startDrawing = ({ nativeEvent }) => {
    // If an image is currently being placed, do not start drawing stroke
    if (placingImage) return;

    const { offsetX, offsetY } = nativeEvent;

    if (activeTool === 'text') {
      if (textOverlay.visible && textOverlay.text.trim()) {
        submitTextOverlay();
        return;
      }

      setTextOverlay({
        visible: true,
        x: offsetX,
        y: offsetY,
        text: ''
      });
      return;
    }

    setIsDrawing(true);
    startPos.current = { x: offsetX, y: offsetY };
    lastPos.current = { x: offsetX, y: offsetY };

    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    if (canvas && ctx) {
      ctx.lineWidth = selectedLineWidth;
      canvasSnapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  // Canvas Mouse Drag Loop Generator
  const draw = ({ nativeEvent }) => {
    if (!isDrawing || !socket) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = contextRef.current;

    if (activeTool === 'brush') {
      const x1 = lastPos.current.x;
      const y1 = lastPos.current.y;
      
      drawOnCanvas('brush', x1, y1, offsetX, offsetY, selectedColor, '', null, null, null, selectedLineWidth);

      socket.emit('send_draw_stroke', {
        roomId, 
        sender: username, 
        type: 'brush', 
        color: selectedColor,
        x1, 
        y1, 
        x2: offsetX, 
        y2: offsetY,
        lineWidth: selectedLineWidth
      });

      lastPos.current = { x: offsetX, y: offsetY };
    } else {
      if (canvasSnapshot.current && ctx) {
        ctx.putImageData(canvasSnapshot.current, 0, 0); // Cleans preview frames
        drawOnCanvas(activeTool, startPos.current.x, startPos.current.y, offsetX, offsetY, selectedColor, '', null, null, null, selectedLineWidth);
      }
    }
  };

  // Canvas Mouse Released Event
  const stopDrawing = ({ nativeEvent }) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool !== 'brush' && activeTool !== 'text' && socket) {
      const { offsetX, offsetY } = nativeEvent;
      socket.emit('send_draw_stroke', {
        roomId, 
        sender: username, 
        type: activeTool, 
        color: selectedColor,
        x1: startPos.current.x, 
        y1: startPos.current.y, 
        x2: offsetX, 
        y2: offsetY,
        lineWidth: selectedLineWidth
      });
    }
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Export Canvas snapshot as PNG image file
  const downloadCanvasSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageStream = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.href = imageStream;
    downloadLink.download = `CoSketch-Export-${new Date().toISOString().slice(0,10)}.png`;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Chat file upload handler
  const handleChatFileUpload = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    fileInput.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPendingImage(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    };

    fileInput.click();
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-100 font-mono overflow-hidden relative select-none">
      <div className="w-full h-full flex flex-col bg-gray-950 relative">
        
        {/* Dynamic Controls Header Panel Toolbar */}
        <div className="p-3 border-b border-gray-800 flex flex-wrap justify-between items-center bg-gray-900 z-20 gap-3 shadow-md">
          <div className="flex items-center flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎨</span>
              <h1 className="font-bold text-sm text-sky-400">Co-Sketch</h1>
            </div>
            
            {/* Drawing Tools Ribbon */}
            <div className="flex bg-gray-950 border border-gray-800 p-1 rounded-lg gap-1">
              {[
                { id: "brush", label: <FaPaintbrush />, title: "Brush Tool" },
                { id: "rect", label: <FaRegSquare />, title: "Rectangle" },
                { id: "circle", label: <FaRegCircle />, title: "Circle" },
                { id: "line", label: <TbStrokeStraight />, title: "Line" },
                { id: "text", label: <IoText />, title: "Text Tool" }
              ].map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  title={tool.title}
                  onClick={() => setActiveTool(tool.id)}   
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTool === tool.id 
                      ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30 scale-105" 
                      : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                  }`}
                >
                  {tool.label}
                </button>
              ))}
            </div>

            {/* Picture Import Button */}
            <div className="flex items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    processImageFile(e.target.files[0]);
                    e.target.value = ''; // Reset input
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Import Picture to Canvas (or Paste / Drag & Drop)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/60 shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <FiImage className="text-sm text-sky-400" />
                <span>Import Picture</span>
              </button>
            </div>

            {/* Stroke Width Selector */}
            <div className="flex items-center gap-1 bg-gray-950 border border-gray-800 p-1 rounded-lg">
              {[
                { size: 2, label: "2px" },
                { size: 4, label: "4px" },
                { size: 8, label: "8px" },
                { size: 14, label: "14px" }
              ].map((item) => (
                <button
                  key={item.size}
                  type="button"
                  onClick={() => setSelectedLineWidth(item.size)}
                  title={`Stroke size ${item.label}`}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                    selectedLineWidth === item.size
                      ? "bg-gray-800 text-sky-400 font-bold border border-sky-500/30"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Color Palette Ribbon */}
            <div className="flex items-center gap-1.5 bg-gray-950 border border-gray-800 px-2 py-1 rounded-lg">
              {paletteColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  title={`Select color ${color}`}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    selectedColor === color 
                      ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-gray-950 shadow-md" 
                      : "opacity-75 hover:opacity-100 hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 ml-1"
                title="Custom Color Picker"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={downloadCanvasSnapshot}
              title="Download Canvas with all drawings as PNG"
              className="text-xs bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 hover:scale-105"
            >
              <FiDownload /> Export Image
            </button>
            <button 
              onClick={clearLocalCanvas} 
              title="Clear Canvas Board"
              className="text-xs bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800/60 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 hover:scale-105"
            >
              <FiTrash2 /> Clear
            </button>
            <button 
              onClick={onLogout}
              title="Disconnect and leave room"
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
            >
              <FiLogOut /> Disconnect
            </button>
          </div>
        </div>

        {/* User Context & Info Banner */}
        <div className="px-4 py-1.5 border-b border-gray-800/80 bg-gray-950/70 text-xs text-gray-400 flex justify-between items-center z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {userAvatar ? (
              <img src={userAvatar} alt="Avatar" className="w-5 h-5 rounded-full border border-gray-700 object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-sky-900 border border-sky-700 text-[10px] flex items-center justify-center font-bold text-sky-200">
                {username?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <span><span className="text-sky-400 font-bold">@{username}</span> in room <span className="text-emerald-400 font-bold">#{roomId}</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-500 hidden sm:inline">💡 Drag & drop or paste (<kbd className="px-1 py-0.5 bg-gray-900 border border-gray-800 rounded text-[10px]">Ctrl+V</kbd>) pictures anytime</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500">Ink Color:</span>
              <div className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: selectedColor }} />
            </div>
          </div>
        </div>

        {/* Drawing Canvas Area & Interactive Staging Area */}
        <div 
          ref={canvasContainerRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex-1 w-full h-full bg-gray-950 relative overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="absolute top-0 left-0 w-full h-full bg-gray-950 cursor-crosshair"
          />

          {/* Drag & Drop Visual Indicator Overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-sky-950/70 border-4 border-dashed border-sky-400 backdrop-blur-sm z-40 flex flex-col items-center justify-center pointer-events-none transition-all">
              <span className="text-5xl mb-3 animate-bounce">📥</span>
              <span className="text-sky-200 font-bold text-lg">Drop Picture to Place on Canvas</span>
              <span className="text-sky-400/80 text-xs mt-1">Release to position, resize and sketch over it</span>
            </div>
          )}

          {/* Interactive Image Placement & Transformation Overlay */}
          {placingImage && (
            <div 
              style={{
                position: 'absolute',
                left: `${placingImage.x}px`,
                top: `${placingImage.y}px`,
                width: `${placingImage.width}px`,
                height: `${placingImage.height}px`,
                zIndex: 35
              }}
              className="group select-none"
            >
              {/* Bounding box border with animated dashed accent */}
              <div className="absolute inset-0 border-2 border-dashed border-sky-400/90 shadow-2xl rounded-sm pointer-events-none ring-4 ring-sky-500/20" />

              {/* Placed Image Preview */}
              <img
                src={placingImage.src}
                alt="Imported Placement"
                draggable={false}
                onMouseDown={(e) => handleImageMouseDown(e, 'drag')}
                onDoubleClick={stampImageToCanvas}
                className="w-full h-full object-contain cursor-move rounded-sm shadow-xl"
              />

              {/* Resize Handles on 4 Corners */}
              <div
                onMouseDown={(e) => handleImageMouseDown(e, 'resize', 'nw')}
                className="absolute -top-2 -left-2 w-4 h-4 bg-sky-400 border-2 border-gray-950 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                title="Resize Corner"
              />
              <div
                onMouseDown={(e) => handleImageMouseDown(e, 'resize', 'ne')}
                className="absolute -top-2 -right-2 w-4 h-4 bg-sky-400 border-2 border-gray-950 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                title="Resize Corner"
              />
              <div
                onMouseDown={(e) => handleImageMouseDown(e, 'resize', 'sw')}
                className="absolute -bottom-2 -left-2 w-4 h-4 bg-sky-400 border-2 border-gray-950 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                title="Resize Corner"
              />
              <div
                onMouseDown={(e) => handleImageMouseDown(e, 'resize', 'se')}
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-sky-400 border-2 border-gray-950 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                title="Resize Corner"
              />

              {/* Floating Action Controls Ribbon attached to Image */}
              <div 
                className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900/95 border border-sky-500/50 p-1 rounded-lg shadow-2xl flex items-center gap-1.5 backdrop-blur-md whitespace-nowrap z-40"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={stampImageToCanvas}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-2.5 py-1 rounded flex items-center gap-1 shadow-md transition-all active:scale-95"
                  title="Stamp picture onto canvas to start drawing on it (or Double Click / Enter)"
                >
                  <FiCheck className="text-sm font-bold" />
                  <span>Place on Canvas</span>
                </button>

                <button
                  type="button"
                  onClick={fitImageToCanvas}
                  className="bg-gray-800 hover:bg-gray-700 text-sky-300 text-xs px-2 py-1 rounded flex items-center gap-1 border border-gray-700 transition-colors"
                  title="Fit image to canvas boundaries"
                >
                  <FiMaximize2 className="text-xs" />
                  <span>Fit</span>
                </button>

                <button
                  type="button"
                  onClick={resetImageDimensions}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded border border-gray-700 transition-colors"
                  title="Reset to 100% natural size"
                >
                  100%
                </button>

                <button
                  type="button"
                  onClick={() => setPlacingImage(null)}
                  className="bg-red-950 hover:bg-red-900 text-red-300 text-xs px-2 py-1 rounded border border-red-900/60 flex items-center gap-0.5 transition-colors"
                  title="Cancel placement (Esc)"
                >
                  <FiX className="text-xs" />
                  <span>Cancel</span>
                </button>
              </div>

              {/* Drag instruction badge */}
              <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-gray-950/80 border border-gray-800 text-[10px] text-gray-400 px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                Drag to move • Drag corners to scale • Click "Place" to draw on it
              </div>
            </div>
          )}

          {/* Inline Typing Overlay */}
          {textOverlay.visible && (
            <input
              ref={textInputRef}
              type="text"
              value={textOverlay.text}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => setTextOverlay((prev) => ({ ...prev, text: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitTextOverlay();
                if (e.key === 'Escape') setTextOverlay({ visible: false, x: 0, y: 0, text: '' });
              }}
              style={{
                position: 'absolute',
                left: `${textOverlay.x}px`,
                top: `${textOverlay.y}px`,
                color: selectedColor,
                font: '24px sans-serif',
                background: 'rgba(3, 7, 18, 0.85)',
                border: '1px dashed #38bdf8',
                outline: 'none',
                padding: '2px 6px',
                margin: '0',
                lineHeight: '1',
                zIndex: 30,
                minWidth: '150px'
              }}
              placeholder="Type & press Enter..."
            />
          )}
        </div>
      </div>

      {/* Floating Chat Toggle */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="absolute bottom-6 right-6 z-40 p-3.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-2xl transition-all font-sans font-bold flex items-center gap-2 active:scale-95"
      >
        💬 {isChatOpen ? "Close Discussion" : "Discussion"}
        {chatLog.length > 0 && !isChatOpen && (
          <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
            {chatLog.length}
          </span>
        )}
      </button>

      {/* FLOATING ACTION CHAT PANEL MODAL */}
      {isChatOpen && (
        <div className="absolute bottom-20 right-6 z-40 w-96 h-[480px] bg-gray-900 border border-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden font-mono animate-fade-in">
          <div className="p-3 bg-gray-950/80 border-b border-gray-800 flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-400">📝 Room Discussion</span>
            <button 
              onClick={() => setIsChatOpen(false)}
              className="text-gray-400 hover:text-gray-200 text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-gray-950/20">
            {chatLog.length === 0 ? (
              <span className="text-xs italic text-gray-600 my-auto text-center">No messages yet. Send a message below.</span>
            ) : (
              chatLog.map((log, index) => {
                let sender = username;
                let msgBody = log;
                let imageSource = null;

                if (log.includes(": ")) {
                  const parts = log.split(": ");
                  sender = parts[0];
                  msgBody = parts.slice(1).join(": ");
                }

                const isMe = sender === username;

                if (msgBody.includes("[IMAGE_ATTACHMENT]")) {
                  const dataSegments = msgBody.split("[IMAGE_ATTACHMENT]");
                  msgBody = dataSegments[0];
                  imageSource = dataSegments[1];
                }

                return (
                  <div key={index} className={`max-w-[80%] rounded-lg p-2.5 text-xs border ${isMe ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-200 self-end" : "bg-gray-800 border-gray-700 text-gray-200 self-start"}`}>
                    <span className={`block text-[9px] font-bold mb-1 ${isMe ? "text-emerald-400" : "text-sky-400"}`}>{sender}</span>
                    
                    {imageSource && (
                      <img src={imageSource} alt="Shared media upload" className="max-w-full rounded border border-gray-700 mb-1.5 object-cover max-h-32 bg-gray-950" />
                    )}
                    
                    {msgBody.trim() && <span className="break-words">{msgBody}</span>}
                  </div>
                );
              })
            )}
          </div>

          {pendingImage && (
            <div className="p-2 bg-gray-950 border-t border-gray-800 flex items-center justify-between gap-2 animate-slide-up">
              <div className="flex items-center gap-2 overflow-hidden">
                <img src={pendingImage} alt="Preview thumbnail" className="w-10 h-10 object-cover rounded border border-sky-500/50" />
                <span className="text-[10px] text-gray-400 truncate italic">Ready to send image...</span>
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

          <form onSubmit={handleSendMessage} className="p-2 bg-gray-950/60 border-t border-gray-800 flex gap-2 items-center">
            <button
              type="button"
              onClick={handleChatFileUpload}
              className="p-2 bg-gray-950 hover:bg-gray-900 border border-gray-800 text-gray-400 hover:text-sky-400 rounded-md transition-colors active:scale-95"
              title="Attach chat image"
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