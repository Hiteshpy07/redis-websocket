import { useState, useEffect } from 'react';
import Canvas from './Canvas';
import { getSession, logoutUser } from "./Oauth"; 
import LoginScreen from './LoginScreen';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState(() => {
    try {
      return sessionStorage.getItem('co_sketch_room') || "general-squad";
    } catch {
      return "general-squad";
    }
  });

  // Check and restore existing session
  useEffect(() => {
    getSession()
      .then((savedSession) => {
        if (savedSession) {
          setSession(savedSession);
        }
      })
      .catch((err) => {
        console.warn("Session check error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Logout error:", err);
    }
    setSession(null);
  };

  const handleLoginSuccess = (newSession, targetRoom) => {
    const room = (targetRoom || activeRoom || "general-squad").toLowerCase();
    setActiveRoom(room);
    try {
      sessionStorage.setItem('co_sketch_room', room);
    } catch (e) {
      console.warn("Could not save room to sessionStorage", e);
    }
    setSession(newSession);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-sky-400 font-mono text-sm">
        Checking session...
      </div>
    );
  }

  const authenticatedUser = session?.user?.name || session?.user?.email;
  const userAvatar = session?.user?.avatar || null;
  const token = session?.token || null;

  if (authenticatedUser) {
    return (
      <Canvas
        authenticatedUser={authenticatedUser}
        userAvatar={userAvatar}
        token={token}
        activeRoom={activeRoom}
        onLogout={handleLogout}
      />
    );
  }

  // Google / GitHub OAuth & Manual Guest Login Screen
  return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
}