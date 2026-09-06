import { useState, useEffect } from 'react';
import Canvas from './Canvas';
import { getSession, logoutUser } from "./Oauth"; 
import LoginScreen from './LoginScreen';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRoom] = useState("general-squad");

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

  // Google / GitHub OAuth Login Screen
  return <LoginScreen onLoginSuccess={(newSession) => setSession(newSession)} />;
}