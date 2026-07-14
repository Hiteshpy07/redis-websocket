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
   <>
   <div className='text-2xl font-bold'>Hello world </div>
   </>
  )
}

export default App
