// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dbirds from './components/Dbirds';
import ChatWindow from './components/ChatWindow';
import InputBox from './components/InputBox';
import Message from './components/Message';
import QRLogin from './components/QRLogin';
import Login from './components/Login';
import ProfileSetup from "./components/Profile/ProfileSetup";
import './App.css';
import CallModal from './components/CallModel';
import Settings from "./components/settings/Settings"
// import Sidebar from './components/Sidebar';

const ProtectedRoute = ({ element }) => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  return token && userId ? element : <Navigate to="/" replace />;
};

const PublicRoute = ({ element }) => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  return token && userId ? <Navigate to="/dashboard" replace /> : element;
};

function App() {
  return (
    <BrowserRouter> 
      <Routes>
        {/* Public Routes (Redirect to dashboard if already logged in) */}
        <Route path="/" element={<PublicRoute element={<Login />} />} />
        <Route path="/qrlogin" element={<PublicRoute element={<QRLogin />} />} />
        
        {/* Protected Routes (WhatsApp-like session persistence) */}
        <Route path="/dashboard" element={<ProtectedRoute element={<Dbirds />} />} />
        <Route path="/chat" element={<ProtectedRoute element={<ChatWindow />} />} />
        <Route path="/input" element={<ProtectedRoute element={<InputBox />} />} />
        <Route path="/message" element={<ProtectedRoute element={<Message />} />} />
        <Route path="/profile-setup" element={<ProtectedRoute element={<ProfileSetup />} />} />
       <Route path='/CallModel' element={<ProtectedRoute element={<CallModal />}/>}/>
       {/* <Route path='/sidebar' element={<ProtectedRoute element={ <Sidebar />}/>} */}
       <Route path='/Settings' element={<ProtectedRoute element={<Settings />}/>}/>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;