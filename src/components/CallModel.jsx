import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import './CallModel.css';

export default function CallModal({ contact, callType = 'audio', onClose }) {
  const [callStatus, setCallStatus] = useState('Ringing...');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');

  // 3 second baad automatic "Connected" ho jayega aur timer shuru ho jayega
  useEffect(() => {
    const timer = setTimeout(() => {
      setCallStatus('Connected');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Call duration timer
  useEffect(() => {
    let interval;
    if (callStatus === 'Connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="call-modal-overlay">
      <div className="call-modal-container">
        
        {/* Top Header info */}
        <div className="call-header-info">
          <h2>{contact?.name || 'User'}</h2>
          <p>{callStatus === 'Connected' ? formatTime(callDuration) : callStatus}</p>
        </div>

        {/* Center Avatar / Video Screen */}
        <div className="call-avatar-screen">
          {contact?.avatar ? (
            <img src={contact.avatar} alt="Calling" />
          ) : (
            <div className="call-avatar-initials">
              {contact?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
        </div>

        {/* Bottom Control Buttons */}
        <div className="call-controls">
          <button 
            type="button"
            className={`control-btn ${isMuted ? 'active' : ''}`} 
            onClick={() => setIsMuted(!isMuted)} 
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {callType === 'video' && (
            <button 
              type="button"
              className={`control-btn ${!isVideoOn ? 'active' : ''}`} 
              onClick={() => setIsVideoOn(!isVideoOn)} 
              title={isVideoOn ? 'Turn Video Off' : 'Turn Video On'}
            >
              {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
          )}

          <button 
            type="button"
            className="control-btn end-call" 
            onClick={onClose} 
            title="End Call"
          >
            <PhoneOff size={20} />
          </button>
        </div>

      </div>
    </div>
  );
}