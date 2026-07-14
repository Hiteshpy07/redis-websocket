import { useState,useEffect} from 'react'
import {io} from 'socket.io-client'

function App() {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);

  const roomId = "meeting-123"; 
  const username = "Hitesh";


  useEffect(() => {
    // 1. Connect to our Node backend server
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    newSocket.emit('join_room', roomId);

    newSocket.on('receive_chat_message', (data) => {
      setChatLog((prev) => [...prev, `${data.user}: ${data.message}`]);
    });
    return () => newSocket.disconnect();
  }, []);


  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !socket) return;
    socket.emit('send_chat_message', {
      roomId,
      user: username,
      message: message
    });

    setMessage(''); // Clear input box
  };

   return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-mono">
      {/* 1. Window Shell Wrapper */}
      <div className="w-full max-w-md bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Title Bar Header */}
        <div className="bg-black text-white p-3 border-b-2 border-black flex justify-between items-center">
          <span className="font-bold">🌐 SyncBoard Chat</span>
          <span className="text-xs bg-gray-8xl text-black bg-yellow-300 px-2 py-0.5 font-bold border border-black">
            Room: {roomId}
          </span>
        </div>

        {/* User Badge Info Bar */}
        <div className="bg-gray-50 p-2 border-b-2 border-black text-xs text-gray-7xl flex gap-2">
          <span>Active Identity:</span>
          <span className="font-bold text-blue-600">@{username}</span>
        </div>

        {/* 2. Scrollable Chat Message Display Box */}
        <div className="h-64 overflow-y-auto p-4 flex flex-col gap-2 bg-gray-50">
          {chatLog.length === 0 ? (
            <div className="text-gray-400 text-sm text-center my-auto italic">
              No messages yet. Type a guess below to test the connection pipe!
            </div>
          ) : (
            chatLog.map((log, index) => {
              // Split "User: Message" to style them dynamically
              const [sender, ...msgBody] = log.split(": ");
              const fullMsg = msgBody.join(": ");
              const isMe = sender === username || sender === "Me";

              return (
                <div 
                  key={index} 
                  className={`max-w-[85%] rounded px-3 py-1.5 text-sm border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    isMe 
                      ? "bg-green-200 self-end" 
                      : "bg-blue-100 self-start"
                  }`}
                >
                  <span className="block text-[10px] font-bold text-gray-600 uppercase mb-0.5">
                    {sender}
                  </span>
                  <span className="break-words">{fullMsg}</span>
                </div>
              );
            })
          )}
        </div>

        {/* 3. Message Input Form Dock */}
        <form onSubmit={handleSendMessage} className="flex border-t-2 border-black">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message or guess here..."
            className="flex-1 p-3 outline-none text-sm border-r-2 border-black focus:bg-yellow-50 transition-colors"
          />
          <button 
            type="submit" 
            className="bg-yellow-400 hover:bg-yellow-350 text-black font-bold text-sm px-6 active:translate-x-0.5 active:translate-y-0.5 transition-transform"
          >
            SEND
          </button>
        </form>

      </div>
    </div>
  );
  
}

export default App
