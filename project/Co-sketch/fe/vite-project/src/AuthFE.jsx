import React, { useState } from 'react';

function Auth({ handleLoginSubmit, inputName, setInputName, inputRoom, setInputRoom }) {
  const quickRooms = ["general-squad", "art-studio", "design-lab", "brainstorm"];

  const generateRandomName = () => {
    const names = ["PixelArtist", "SketchMaster", "DoodleBot", "DesignPro", "CyberDrawer", "DevSketcher"];
    const randomName = names[Math.floor(Math.random() * names.length)] + "_" + Math.floor(100 + Math.random() * 900);
    setInputName(randomName);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-gray-100 font-mono p-4">
      {/* Background ambient glow */}
      <div className="absolute w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <form
        onSubmit={handleLoginSubmit}
        className="w-full max-w-md bg-gray-900/90 border border-gray-800 rounded-2xl p-7 shadow-2xl backdrop-blur flex flex-col gap-5 z-10"
      >
        <div className="text-center">
          <div className="inline-flex p-3 bg-sky-950/80 border border-sky-800/50 rounded-2xl mb-3 shadow-inner text-2xl">
            🎨
          </div>
          <h2 className="text-xl font-bold text-sky-400">Co-Sketch Workspace</h2>
          <p className="text-xs text-gray-400 mt-1">Direct testing mode (OAuth bypassed)</p>
        </div>

        {/* Username Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[11px] uppercase font-bold text-gray-400">Username / Handle</label>
            <button
              type="button"
              onClick={generateRandomName}
              className="text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
            >
              🎲 Randomize
            </button>
          </div>
          <input
            type="text"
            required
            placeholder="e.g. hitesh_dev"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-100 outline-none focus:border-sky-500 transition-all placeholder:text-gray-600"
          />
        </div>

        {/* Room ID Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase font-bold text-gray-400">Room ID</label>
          <input
            type="text"
            required
            placeholder="general-squad"
            value={inputRoom}
            onChange={(e) => setInputRoom(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-100 outline-none focus:border-sky-500 transition-all placeholder:text-gray-600"
          />
          
          {/* Quick preset room badges */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className="text-[10px] text-gray-500 self-center">Presets:</span>
            {quickRooms.map((room) => (
              <button
                key={room}
                type="button"
                onClick={() => setInputRoom(room)}
                className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                  inputRoom === room 
                    ? "bg-sky-950 text-sky-300 border-sky-700" 
                    : "bg-gray-950 text-gray-400 border-gray-800 hover:text-gray-200"
                }`}
              >
                #{room}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold p-3 rounded-xl active:scale-95 transition-all shadow-lg shadow-sky-600/25 mt-2 flex items-center justify-center gap-2"
        >
          🚀 Enter Sketch Canvas
        </button>

        <div className="text-center">
          <span className="text-[10px] text-gray-500">
            🔒 Google & GitHub OAuth code is saved & ready to re-enable anytime.
          </span>
        </div>
      </form>
    </div>
  );
}

export default Auth;