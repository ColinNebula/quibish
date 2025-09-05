import React, { useState, useEffect } from 'react';
import './AutoResponse.css';

const AutoResponse = ({ lastMessage, onSendMessage, disabled }) => {
  const [suggestions, setSuggestions] = useState([]);
  
  // Generate suggestions based on the last message
  useEffect(() => {
    if (!lastMessage || disabled) {
      setSuggestions([]);
      return;
    }
    
    // Simple rule-based response suggestions
    const content = lastMessage.content.toLowerCase();
    let newSuggestions = [];
    
    if (content.includes('hello') || content.includes('hi') || content.includes('hey')) {
      newSuggestions.push('Hello! How are you?', 'Hi there!', 'Hey, nice to hear from you!');
    }
    else if (content.includes('how are you')) {
      newSuggestions.push('I\'m doing well, thanks!', 'All good, and you?', 'Great! What about you?');
    }
    else if (content.includes('thanks') || content.includes('thank you')) {
      newSuggestions.push('You\'re welcome!', 'No problem!', 'Happy to help!');
    }
    else if (content.includes('meeting') || content.includes('call')) {
      newSuggestions.push('What time works for you?', 'I\'m available tomorrow', 'Let me check my calendar');
    }
    else if (content.includes('help') || content.includes('support')) {
      newSuggestions.push('How can I help?', 'What do you need assistance with?', 'I\'ll try my best to help!');
    }
    else if (content.includes('bye') || content.includes('goodbye') || content.includes('talk later')) {
      newSuggestions.push('Goodbye!', 'Talk to you later!', 'Have a great day!');
    }
    else {
      // Generic responses for any other message
      newSuggestions.push('Sounds good!', 'Got it', 'Thanks for letting me know');
    }
    
    // Take max 3 suggestions
    setSuggestions(newSuggestions.slice(0, 3));
  }, [lastMessage, disabled]);
  
  // If no suggestions or disabled, don't render
  if (!suggestions.length || disabled) {
    return null;
  }
  
  return (
    <div className="auto-response">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          className="suggestion-button"
          onClick={() => onSendMessage(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};

export default AutoResponse;
