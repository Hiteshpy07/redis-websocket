import { useState } from 'react';
import Canvas from './Canvas';
import auth from './auth/auth';

export default function App() {
  const [userAuth, setUserAuth] = useState(null);
    const handleLoginSubmit = (e) => {
        e.preventDefault();
        if (!inputName.trim() || !inputRoom.trim()) return;

        setUserAuth({
            username: inputName.trim(),
            roomId: inputRoom.trim()
        });
    };
  
  const [inputName, setInputName] = useState('');
  const [inputRoom, setInputRoom] = useState('meeting-123');

  // Auth Gate: Check if user has logged in
  // Once authenticated, pass states straight down to Canvas workspace
  return (
    !userAuth ? (
      <auth 
        handleLoginSubmit={handleLoginSubmit}
        inputName={inputName}
        setInputName={setInputName}
        inputRoom={inputRoom}
        setInputRoom={setInputRoom}
      />
    ) : (
    <Canvas 
      authenticatedUser={userAuth.username} 
      activeRoom={userAuth.roomId}
      onLogout={() => setUserAuth(null)}
    />)
  );
}