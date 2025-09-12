import React, { useState, useCallback, useMemo } from 'react';
import './SmartTextContent.css';

const SmartTextContent = ({ 
  text, 
  maxLength = 300, 
  className = '', 
  showWordCount = false,
  enableSmartBreaks = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Smart truncation that respects sentence and word boundaries
  const smartTruncate = useCallback((text, length) => {
    if (text.length <= length) return text;
    
    const truncated = text.substring(0, length);
    
    if (enableSmartBreaks) {
      // Try to break at sentence end first
      const lastSentence = truncated.lastIndexOf('. ');
      const lastQuestion = truncated.lastIndexOf('? ');
      const lastExclamation = truncated.lastIndexOf('! ');
      const lastPunctuation = Math.max(lastSentence, lastQuestion, lastExclamation);
      
      // If we found a good sentence break point (not too short)
      if (lastPunctuation > length * 0.6) {
        return truncated.substring(0, lastPunctuation + 1);
      }
      
      // Otherwise, break at word boundary
      const lastWord = truncated.lastIndexOf(' ');
      if (lastWord > length * 0.8) {
        return truncated.substring(0, lastWord);
      }
    }
    
    return truncated;
  }, [enableSmartBreaks]);
  
  // Calculate display metrics
  const metrics = useMemo(() => {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length - 1;
    const readTime = Math.ceil(words / 200); // Average reading speed
    
    return { words, sentences, readTime };
  }, [text]);
  
  const shouldTruncate = text.length > maxLength;
  const displayText = isExpanded ? text : smartTruncate(text, maxLength);
  const hiddenLength = text.length - displayText.length;
  
  // Handle expand/collapse
  const toggleExpansion = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);
  
  // Detect content type for styling
  const contentType = useMemo(() => {
    if (text.includes('```')) return 'code';
    if (text.match(/https?:\/\/[^\s]+/)) return 'links';
    if (text.includes('@')) return 'mentions';
    return 'text';
  }, [text]);
  
  return (
    <div className={`smart-text-content ${className} content-type-${contentType}`}>
      <div className="text-display">
        {contentType === 'code' ? (
          <pre className="code-block">
            <code>{displayText}</code>
          </pre>
        ) : (
          <div className="text-content">
            {displayText.split(/(@\w+|https?:\/\/[^\s]+)/g).map((part, index) => {
              if (part.startsWith('@')) {
                return (
                  <span key={index} className="mention">
                    {part}
                  </span>
                );
              }
              if (part.match(/https?:\/\/[^\s]+/)) {
                return (
                  <a 
                    key={index} 
                    href={part} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {part.length > 30 ? part.substring(0, 30) + '...' : part}
                  </a>
                );
              }
              return part;
            })}
          </div>
        )}
      </div>
      
      {shouldTruncate && (
        <div className="text-controls">
          <button 
            className="expand-button"
            onClick={toggleExpansion}
            type="button"
          >
            {isExpanded ? (
              <>
                <span className="icon">⌃</span>
                Show less
              </>
            ) : (
              <>
                <span className="icon">⌄</span>
                Show more ({hiddenLength} more characters)
              </>
            )}
          </button>
          
          {showWordCount && (
            <div className="text-metrics">
              📖 {metrics.readTime} min read • {metrics.words} words • {metrics.sentences} sentences
            </div>
          )}
        </div>
      )}
      
      {contentType === 'code' && (
        <div className="content-actions">
          <button 
            className="action-button copy-code"
            onClick={() => navigator.clipboard?.writeText(text)}
            title="Copy code"
          >
            📋 Copy
          </button>
        </div>
      )}
      
      {contentType === 'links' && !isExpanded && (
        <div className="content-actions">
          <button 
            className="action-button preview-links"
            onClick={toggleExpansion}
            title="Preview links"
          >
            🔗 Preview Links
          </button>
        </div>
      )}
    </div>
  );
};

export default SmartTextContent;