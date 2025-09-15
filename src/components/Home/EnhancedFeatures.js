import React, { useState, useEffect } from 'react';

/**
 * Enhanced features component for voice messages, presence tracking, and other advanced features
 */
const EnhancedFeatures = ({ 
  setMessages, 
  messages, 
  currentUser, 
  fileInputRef, 
  onSendMessage 
}) => {
  // Voice message recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);

  // User presence tracking
  const [userPresence, setUserPresence] = useState({});
  
  // Start recording voice message
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        setAudioBlob(audioBlob);
        
        // Release microphone access
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      startRecordingTimer();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
    }
  };
  
  // Track recording time
  const startRecordingTimer = () => {
    let seconds = 0;
    const timerInterval = setInterval(() => {
      seconds++;
      setRecordingTime(seconds);
      
      // Auto-stop after 2 minutes (120 seconds)
      if (seconds >= 120) {
        stopRecording();
        clearInterval(timerInterval);
      }
      
      if (!isRecording) {
        clearInterval(timerInterval);
      }
    }, 1000);
  };
  
  // Send voice message
  const sendVoiceMessage = () => {
    if (audioBlob) {
      const voiceMessageUrl = URL.createObjectURL(audioBlob);
      const attachment = {
        id: `voice-${Date.now()}`,
        name: `Voice Message (${formatTime(recordingTime)})`,
        size: `${(audioBlob.size / (1024 * 1024)).toFixed(2)} MB`,
        type: 'audio',
        url: voiceMessageUrl
      };
      
      onSendMessage('', [attachment]);
      setAudioBlob(null);
    }
  };
  
  // Format time display (mm:ss)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Simulate user presence
  useEffect(() => {
    // Simulate other users' presence
    const simulatePresence = setInterval(() => {
      const users = {
        "other-user-1": {
          status: Math.random() > 0.3 ? "online" : "away", 
          lastActive: new Date()
        },
        "other-user-2": {
          status: Math.random() > 0.6 ? "online" : "offline", 
          lastActive: new Date(Date.now() - 15 * 60 * 1000)
        }
      };
      
      setUserPresence(users);
    }, 30000);
    
    return () => clearInterval(simulatePresence);
  }, []);
  
  // Add read receipts to messages
  useEffect(() => {
    if (messages.length > 0) {
      // Mark received messages as read after a delay
      const timer = setTimeout(() => {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.sender.id !== "current-user" && msg.status !== "read"
              ? { ...msg, status: "read" }
              : msg
          )
        );
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [messages, setMessages]);
  
  return (
    <div className="enhanced-features">
      {/* Voice message recording UI */}
      {isRecording && (
        <div className="voice-recording-indicator">
          <div className="recording-pulse"></div>
          <span className="recording-time">{formatTime(recordingTime)}</span>
          <button 
            className="stop-recording-btn"
            onClick={stopRecording}
            aria-label="Stop recording"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="none" d="M0 0h24v24H0z"/>
              <path d="M6 19h12V5H6v14zm1-13h10v12H7V6z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      )}
      
      {/* Voice message actions */}
      {audioBlob && !isRecording && (
        <div className="voice-message-preview">
          <audio controls src={URL.createObjectURL(audioBlob)} />
          <div className="voice-actions">
            <button 
              className="send-voice-btn"
              onClick={sendVoiceMessage}
              aria-label="Send voice message"
            >
              Send
            </button>
            <button 
              className="discard-voice-btn"
              onClick={() => setAudioBlob(null)}
              aria-label="Discard voice message"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedFeatures;
