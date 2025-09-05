import React, { useState, useRef, useEffect } from 'react';
import './EditableMessage.css';

const EditableMessage = ({ 
  message, 
  isEditing, 
  onSaveEdit, 
  onCancelEdit, 
  currentUser 
}) => {
  const [editText, setEditText] = useState(message.content);
  const textareaRef = useRef(null);
  
  // Focus the textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at the end of the text
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      textareaRef.current.selectionEnd = textareaRef.current.value.length;
    }
  }, [isEditing]);
  
  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [editText]);
  
  const handleSave = () => {
    if (editText.trim() !== '') {
      onSaveEdit(message.id, editText);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };
  
  if (!isEditing) {
    return null;
  }
  
  return (
    <div className="editable-message-container">
      <textarea
        ref={textareaRef}
        className="editable-message-textarea"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Edit your message..."
      />
      
      <div className="editable-message-actions">
        <div className="editable-message-tip">
          Press <span className="keyboard-key">Enter</span> to save, <span className="keyboard-key">Esc</span> to cancel
        </div>
        <div className="editable-message-buttons">
          <button 
            className="editable-message-button cancel" 
            onClick={onCancelEdit}
            aria-label="Cancel editing"
          >
            Cancel
          </button>
          <button 
            className="editable-message-button save" 
            onClick={handleSave}
            disabled={editText.trim() === '' || editText.trim() === message.content}
            aria-label="Save edited message"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditableMessage;
