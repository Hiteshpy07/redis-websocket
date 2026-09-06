import { useState, useEffect } from 'react';
import Canvas from './Canvas';
import { getSession, logoutUser } from "./Oauth"; 
import LoginScreen from './LoginScreen';
// import Auth from './AuthFE'; // [Bypass screen commented out]

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRoom] = useState("general-squad");

  // [TEMPORARY BYPASS FOR TESTING]: OAuth session check is commented out below.
  /*
  useEffect(() => {
    getSession()
      .then((savedSession) => {
        if (savedSession) setSession(savedSession);
      })
      .catch((err) => console.warn("Session check error:", err))
      .finally(() => setLoading(false));
  }, []);
  */

  // const handleLoginSubmit = (e) => {
  //   e.preventDefault();
  //   if (!inputName.trim() || !inputRoom.trim()) return;

  //   setUserAuth({
  //     username: inputName.trim(),
  //     roomId: inputRoom.trim()
  //   });
  // };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Logout error:", err);
    }
    setSession(null);
    // setUserAuth(null);
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

  // [OAUTH LOGIN SCREEN BYPASS FOR TESTING]
  // To re-enable OAuth Login Screen with Google/GitHub, uncomment below:
  /*
  const isExtension = typeof chrome !== 'undefined' && !!chrome?.identity;
  if (isExtension) {
  return <LoginScreen onLoginSuccess={(newSession) => setSession(newSession)} />;

  /*
  // [TEMPORARY BYPASS SCREEN - COMMENTED OUT]
  // const [userAuth, setUserAuth] = useState(null);
  // const [inputName, setInputName] = useState("");
  // const [inputRoom, setInputRoom] = useState("general-squad");
  // const handleLoginSubmit = (e) => {
  //   e.preventDefault();
  //   if (!inputName.trim() || !inputRoom.trim()) return;
  //   setUserAuth({ username: inputName.trim(), roomId: inputRoom.trim() });
  // };
  // return (
  //   <Auth
  //     handleLoginSubmit={handleLoginSubmit}
  //     inputName={inputName}
  //     setInputName={setInputName}
  //     inputRoom={inputRoom}
  //     setInputRoom={setInputRoom}
  //   />
  // );
  */
}