import { useState, useEffect } from 'react';
import Canvas from './Canvas';
import Auth from './AuthFE';
import { getSession, logoutUser } from "./Oauth"; 
import LoginScreen from './LoginScreen';

export default function App() {
  const [userAuth, setUserAuth] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inputName, setInputName] = useState("");
  const [inputRoom, setInputRoom] = useState("general-squad");

  useEffect(() => {
    // Check if user is already authenticated on app open
    getSession()
      .then((savedSession) => {
        if (savedSession) setSession(savedSession);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!inputName.trim() || !inputRoom.trim()) return;

    setUserAuth({
      username: inputName.trim(),
      roomId: inputRoom.trim()
    });
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {}
    setSession(null);
    setUserAuth(null);
  };

  if (loading) return null;

  const authenticatedUser = session?.user?.name || session?.user?.email || userAuth?.username;
  const userAvatar = session?.user?.avatar || null;
  const token = session?.token || 'guest-token';
  const activeRoom = userAuth?.roomId || 'general-squad';

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

  // If chrome extension runtime is available, show OAuth LoginScreen, else AuthFE
  const isExtension = typeof chrome !== 'undefined' && !!chrome?.identity;
  if (isExtension) {
    return <LoginScreen onLoginSuccess={(newSession) => setSession(newSession)} />;
  }

  return (
    <Auth
      handleLoginSubmit={handleLoginSubmit}
      inputName={inputName}
      setInputName={setInputName}
      inputRoom={inputRoom}
      setInputRoom={setInputRoom}
    />
  );
}