import React, { useState } from 'react';
import './LoadingAnimations.css';

const VoiceMessage = ({ duration = "0:45", sender = "user" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackTime, setPlaybackTime] = useState("0:00");
  
  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      // In a real implementation, we would pause the audio here
    } else {
      setIsPlaying(true);
      
      // Simulate playback with progress updates
      const totalSeconds = convertTimeToSeconds(duration);
      let currentSecond = progress * totalSeconds;
      const interval = setInterval(() => {
        currentSecond++;
        const newProgress = currentSecond / totalSeconds;
        
        if (newProgress >= 1) {
          setProgress(1);
          setPlaybackTime(duration);
          setIsPlaying(false);
          clearInterval(interval);
        } else {
          setProgress(newProgress);
          setPlaybackTime(formatTime(currentSecond));
        }
      }, 1000);
      
      // Clean up interval when component unmounts or when stopped
      return () => clearInterval(interval);
    }
  };
  
  // Helper to convert time string (0:45) to seconds
  const convertTimeToSeconds = (timeStr) => {
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  };
  
  // Helper to format seconds to time string
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Create dynamic gradient for waveform progress
  const waveformStyle = {
    background: `linear-gradient(90deg, 
      var(--pro-primary) 0%, 
      var(--pro-primary) ${progress * 100}%, 
      var(--pro-border) ${progress * 100}%, 
      var(--pro-border) 100%
    )`
  };
  
  return (
    <div className="pro-voice-message">
      <button 
        className="pro-voice-play" 
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
      >
        {isPlaying ? "⏸️" : "▶️"}
      </button>
      
      <div className="pro-voice-waveform" style={waveformStyle}></div>
      
      <span className="pro-voice-time">
        {isPlaying ? playbackTime : duration}
      </span>
    </div>
  );
};

export default VoiceMessage;
