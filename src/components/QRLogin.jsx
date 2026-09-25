// frontend/src/components/QRLogin.jsx
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import './QRLogin.css';

const QRLogin = ({ onConnect }) => {
  const [qrData, setQrData] = useState('');
  const [status, setStatus] = useState('loading');
  const socketRef = useRef(null);

  useEffect(() => {
  console.log("📱 QRLogin mounted");

const socket = io("https://dtalkbackend.designerbrids.com", {
    transports: ["websocket", "polling"],
  });

  socketRef.current = socket;

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
    socket.emit("generate-qr");
  });

  socket.on("qr-generated", (data) => {
    console.log("📱 QR Generated:", data);

    if (!data?.sessionId) {
      console.error("❌ No sessionId received from backend");
      return;
    }

    setQrData(data.sessionId);
    setStatus("ready");

    console.log("💾 QR Session ID:", data.sessionId);
  });

  socket.on("qr-scanned", (data) => {
    console.log("✅ QR Scanned:", data);

    if (!data?.sessionId) {
      console.error("❌ QR scanned but sessionId is missing");
      return;
    }

    setStatus("connected");

    onConnect?.(data.sessionId);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Socket connection error:", err.message);
    setStatus("error");
  });

  return () => {
    socket.disconnect();
    socketRef.current = null;
  };
}, []);
  if (status === 'connected') {
    return (
      <div className="qr-connected">
        <span className="check">✅</span>
        <h3>Connected!</h3>
        <p>Your phone is connected to Kuickli Chat.</p>
      </div>
    );
  }

  return (
    <div className="qr-container">
      <div className="qr-code-wrapper">
        {qrData ? (
          <QRCodeSVG value={qrData} size={200} level="H" includeMargin={true} />
        ) : (
          <div className="qr-placeholder">⏳</div>
        )}
      </div>
      <p className="qr-hint">
        {status === 'loading' ? '⏳ Generating QR Code...' : 'Scan this QR code with your phone'}
      </p>
      <button 
        className="qr-refresh" 
        onClick={() => {
          setStatus('loading');
          if (socketRef.current?.connected) {
            socketRef.current.emit('generate-qr');
          }
        }}
      >
        🔄 Refresh QR Code
      </button>
      <span className="qr-status">
        {status === 'loading' ? '⏳ Loading...' : '🟢 Ready to scan'}
      </span>
    </div>
  );
};

export default QRLogin;