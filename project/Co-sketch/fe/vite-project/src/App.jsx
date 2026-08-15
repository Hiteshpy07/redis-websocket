import { useState } from 'react';
import Canvas from './Canvas';
import Auth from './AuthFE';
import { getSession, logoutUser } from "./auth/Oauth"; 

export default function App() {
  const [userAuth, setUserAuth] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState("general-squad");

  useEffect(() => {
    // Check if user is already authenticated on app open
    getSession().then((savedSession) => {
      setSession(savedSession);
      setLoading(false);
    });
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
    await logoutUser();
    setSession(null);
  };

  if (loading) return null;

  if (!session) {
    return <LoginScreen onLoginSuccess={(newSession) => setSession(newSession)} />;
  }
  

  // Auth Gate: Check if user has logged in
  // Once authenticated, pass states straight down to Canvas workspace
  return (
    <Canvas
      authenticatedUser={session.user.name || session.user.email}
      userAvatar={session.user.avatar}
      token={session.token} // 👈 Pass token down to Canvas
      activeRoom={activeRoom}
      onLogout={handleLogout}
    />
  );
}