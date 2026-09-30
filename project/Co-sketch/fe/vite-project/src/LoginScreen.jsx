// src/components/LoginScreen.jsx
import React, { useState } from "react";
import { loginWithOAuth, loginAsGuest, isChromeExtension } from "./Oauth";
import { FaGoogle, FaGithub, FaUserNinja, FaDice, FaHashtag } from "react-icons/fa";

export default function LoginScreen({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guestName, setGuestName] = useState("");
  const [roomId, setRoomId] = useState("general-squad");

  const quickRooms = ["general-squad", "art-studio", "design-lab", "brainstorm"];

  const handleOAuthLogin = async (provider) => {
    try {
      setLoading(true);
      setError("");
      const targetRoom = (roomId.trim() || "general-squad").toLowerCase();
      const session = await loginWithOAuth(provider);
      onLoginSuccess(session, targetRoom);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const targetRoom = (roomId.trim() || "general-squad").toLowerCase();
      const session = await loginAsGuest(guestName);
      onLoginSuccess(session, targetRoom);
    } catch (err) {
      console.error(err);
      setError(err.message || "Guest login failed");
    } finally {
      setLoading(false);
    }
  };

  const randomizeName = () => {
    const names = ["PixelArtist", "SketchMaster", "DoodleBot", "DesignPro", "CyberDrawer", "DevSketcher"];
    const random = names[Math.floor(Math.random() * names.length)] + "_" + Math.floor(100 + Math.random() * 900);
    setGuestName(random);
  };

  const randomizeRoom = () => {
    const random = "room_" + Math.floor(1000 + Math.random() * 9000);
    setRoomId(random);
  };

  const isExt = isChromeExtension();

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-950 text-gray-100 font-mono p-4 select-none">
      {/* Background ambient glow */}
      <div className="absolute w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900/80 p-6 sm:p-7 shadow-2xl backdrop-blur z-10">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-sky-950/80 border border-sky-800/50 rounded-2xl mb-3 shadow-inner text-2xl">
            🎨
          </div>
          <h1 className="text-xl font-bold text-sky-400">Co-Sketch Workspace</h1>
          <p className="text-xs text-gray-400 mt-1">Real-time collaborative canvas & whiteboard</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-950/70 border border-red-800 p-3 text-left text-xs text-red-300 leading-relaxed shadow-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Manual / Guest Login Form */}
        <form onSubmit={handleGuestLogin} className="flex flex-col gap-4 mb-5 pb-5 border-b border-gray-800">
          
          {/* Username Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                Nickname / Handle
              </label>
              <button
                type="button"
                onClick={randomizeName}
                className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition"
              >
                <FaDice /> Randomize
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. Sketcher_404"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 outline-none focus:border-sky-500 transition placeholder:text-gray-600"
            />
          </div>

          {/* Strict Room ID Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                <FaHashtag className="text-sky-400" /> Room ID (Strict Isolation)
              </label>
              <button
                type="button"
                onClick={randomizeRoom}
                className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition"
              >
                🎲 New Room
              </button>
            </div>

            <input
              type="text"
              required
              placeholder="e.g. my-private-room"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 outline-none focus:border-sky-500 transition placeholder:text-gray-600 font-semibold"
            />

            {/* Quick Room Preset Badges */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className="text-[10px] text-gray-500 self-center">Presets:</span>
              {quickRooms.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRoomId(preset)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                    roomId === preset
                      ? "bg-sky-950 text-sky-300 border-sky-600 font-bold"
                      : "bg-gray-950 text-gray-400 border-gray-800 hover:text-gray-200"
                  }`}
                >
                  #{preset}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 py-3 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-lg shadow-sky-600/25 mt-1"
          >
            <FaUserNinja /> Enter #{roomId || "general-squad"}
          </button>
        </form>

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-2.5">
          <div className="text-[10px] uppercase font-bold text-gray-500 text-center tracking-wider mb-0.5">
            {isExt ? "Or Sign in with Extension OAuth" : "Or Sign in with OAuth"}
          </div>

          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-xs font-bold transition active:scale-95 disabled:opacity-50 shadow-md shadow-red-600/20"
          >
            <FaGoogle /> Sign in with Google (Join #{roomId || "room"})
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin("github")}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 py-2.5 text-xs font-bold transition active:scale-95 disabled:opacity-50"
          >
            <FaGithub /> Sign in with GitHub (Join #{roomId || "room"})
          </button>
        </div>

        {loading && (
          <p className="mt-4 text-center text-[10px] text-sky-400 animate-pulse font-semibold">
            Joining room #{roomId}...
          </p>
        )}
      </div>
    </div>
  );
}