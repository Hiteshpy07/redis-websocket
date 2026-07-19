import { useState } from 'react';
import Canvas from './Canvas';

export default function App() {
  const [userAuth, setUserAuth] = useState(null); 
  const [inputName, setInputName] = useState('');
  const [inputRoom, setInputRoom] = useState('meeting-123');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!inputName.trim() || !inputRoom.trim()) return;

    setUserAuth({
      username: inputName.trim(),
      roomId: inputRoom.trim()
    });
  };

  // Auth Gate: Check if user has logged in
  if (!userAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-gray-100 font-mono p-4">
        <form 
          onSubmit={handleLoginSubmit}
          className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl flex flex-col gap-4"
        >
          <div className="text-center mb-2">
            <h2 className="text-xl font-bold text-sky-400 flex items-center justify-center gap-2">Co-Sketch</h2>
            {/* <p className="text-xs text-gray-500 mt-1">Provide credential details to link sync pipeline</p> */}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-400">Handle Identity Name</label>
            <input 
              type="text" 
              required
              value={inputName} 
              onChange={(e) => setInputName(e.target.value)} 
              // placeholder="e.g., hitesh_dev" 
              className="bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-gray-400">Room ID</label>
            <input 
              type="text" 
              required
              value={inputRoom} 
              onChange={(e) => setInputRoom(e.target.value)} 
              placeholder="meeting-123" 
              className="bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold p-2.5 rounded-lg active:scale-95 transition-all mt-2"
          >
            Start!
          </button>
        </form>
      </div>
    );
  }

  // Once authenticated, pass states straight down to Canvas workspace
  return (
    <Canvas 
      authenticatedUser={userAuth.username} 
      activeRoom={userAuth.roomId}
      onLogout={() => setUserAuth(null)}
    />
  );
}