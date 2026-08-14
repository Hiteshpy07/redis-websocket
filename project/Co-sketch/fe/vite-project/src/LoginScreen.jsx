// src/components/LoginScreen.jsx
import React, { useState } from "react";
import { loginWithOAuth } from "../services/auth";
import { FaGoogle, FaGithub } from "react-icons/fa";

export default function LoginScreen({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (provider) => {
    try {
      setLoading(true);
      setError("");
      const session = await loginWithOAuth(provider);
      onLoginSuccess(session);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-950 text-gray-100 font-mono p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900/60 p-6 shadow-2xl backdrop-blur">
        <h1 className="text-xl font-bold text-sky-400 text-center mb-2">🌐 Co-Sketch Sync</h1>
        <p className="text-xs text-gray-400 text-center mb-6">Sign in to join or create shared sketch rooms</p>

        {error && (
          <div className="mb-4 rounded bg-red-950/60 border border-red-800 p-2 text-center text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleLogin("google")}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 py-2.5 text-xs font-bold transition active:scale-95 disabled:opacity-50"
          >
            <FaGoogle /> Sign in with Google
          </button>

          <button
            onClick={() => handleLogin("github")}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 py-2.5 text-xs font-bold transition active:scale-95 disabled:opacity-50"
          >
            <FaGithub /> Sign in with GitHub
          </button>
        </div>

        {loading && <p className="mt-4 text-center text-[10px] text-sky-400 animate-pulse">Authenticating...</p>}
      </div>
    </div>
  );
}