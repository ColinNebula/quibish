// AI Enhancement Panel Component
import React, { useState } from 'react';
import aiService from '../../services/aiService';
import './AIEnhancementPanel.css';

const AIEnhancementPanel = ({
  message,
  onTranslate,
  onEnhance,
  onClose,
  isVisible = false
}) => {
  const [activeTab, setActiveTab] = useState('translate'); // 'translate' or 'enhance'
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const languages = [
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' }
  ];

  const tones = [
    { value: 'professional', label: 'Professional', icon: '💼' },
    { value: 'casual', label: 'Casual', icon: '😊' },
    { value: 'friendly', label: 'Friendly', icon: '🌟' },
    { value: 'formal', label: 'Formal', icon: '🎩' }
  ];

  // Handle translation
  const handleTranslate = async () => {
    if (!message) return;

    setLoading(true);
    try {
      const messageText = message.text || message;
      const translation = await aiService.translateMessage(
        messageText,
        targetLanguage
      );
      setResult(translation);
      
      if (onTranslate) {
        onTranslate(translation);
      }
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle message enhancement
  const handleEnhance = async () => {
    if (!message) return;

    setLoading(true);
    try {
      const messageText = message.text || message;
      const enhanced = await aiService.enhanceMessage(messageText, {
        tone,
        fixGrammar: true,
        addEmoji: true
      });
      setResult(enhanced);
      
      if (onEnhance) {
        onEnhance(enhanced);
      }
    } catch (error) {
      console.error('Enhancement failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="ai-enhancement-panel">
      {/* Header */}
      <div className="enhancement-header">
        <h4>🤖 AI Enhancement</h4>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      {/* Tabs */}
      <div className="enhancement-tabs">
        <button
          className={`tab-btn ${activeTab === 'translate' ? 'active' : ''}`}
          onClick={() => setActiveTab('translate')}
        >
          🌐 Translate
        </button>
        <button
          className={`tab-btn ${activeTab === 'enhance' ? 'active' : ''}`}
          onClick={() => setActiveTab('enhance')}
        >
          ✨ Enhance
        </button>
      </div>

      {/* Original Message */}
      <div className="original-message">
        <div className="message-label">Original:</div>
        <div className="message-text">{message?.text || message}</div>
      </div>

      {/* Translation Tab */}
      {activeTab === 'translate' && (
        <div className="translate-content">
          <div className="language-selector">
            <label>Target Language:</label>
            <div className="language-grid">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={`language-btn ${targetLanguage === lang.code ? 'active' : ''}`}
                  onClick={() => setTargetLanguage(lang.code)}
                >
                  <span className="flag">{lang.flag}</span>
                  <span className="lang-name">{lang.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            className="action-btn translate-btn"
            onClick={handleTranslate}
            disabled={loading}
          >
            {loading ? '⏳ Translating...' : '🌐 Translate Now'}
          </button>
        </div>
      )}

      {/* Enhancement Tab */}
      {activeTab === 'enhance' && (
        <div className="enhance-content">
          <div className="tone-selector">
            <label>Select Tone:</label>
            <div className="tone-grid">
              {tones.map((t) => (
                <button
                  key={t.value}
                  className={`tone-btn ${tone === t.value ? 'active' : ''}`}
                  onClick={() => setTone(t.value)}
                >
                  <span className="tone-icon">{t.icon}</span>
                  <span className="tone-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="enhancement-options">
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              <span>Fix grammar & spelling</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              <span>Add appropriate emoji</span>
            </label>
          </div>

          <button
            className="action-btn enhance-btn"
            onClick={handleEnhance}
            disabled={loading}
          >
            {loading ? '⏳ Enhancing...' : '✨ Enhance Message'}
          </button>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="result-section">
          <div className="result-header">
            <span className="result-label">
              {activeTab === 'translate' ? '🌐 Translation:' : '✨ Enhanced:'}
            </span>
            <button
              className="copy-btn"
              onClick={() => copyToClipboard(
                activeTab === 'translate' ? result.translatedText : result.enhanced
              )}
            >
              📋 Copy
            </button>
          </div>
          <div className="result-text">
            {activeTab === 'translate' ? result.translatedText : result.enhanced}
          </div>
          
          {/* Translation Info */}
          {activeTab === 'translate' && result.confidence && (
            <div className="result-meta">
              <span className="confidence-badge">
                Confidence: {Math.round(result.confidence * 100)}%
              </span>
              <span className="lang-badge">
                {result.sourceLanguage} → {result.targetLanguage}
              </span>
            </div>
          )}
          
          {/* Enhancement Info */}
          {activeTab === 'enhance' && result.changes && result.changes.length > 0 && (
            <div className="result-meta">
              <span className="changes-badge">
                {result.changes.length} change{result.changes.length !== 1 ? 's' : ''} made
              </span>
              <span className="tone-badge">
                Tone: {result.tone}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="enhancement-footer">
        <span className="ai-notice">
          ⚡ Powered by AI • Results may vary
        </span>
      </div>
    </div>
  );
};

export default AIEnhancementPanel;
