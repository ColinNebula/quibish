// AI Enhancement Panel Component
import React, { useState, useCallback } from 'react';
import aiService from '../../services/aiService';
import './AIEnhancementPanel.css';

const LANG_NAMES = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', ja: 'Japanese', zh: 'Chinese', ko: 'Korean', ar: 'Arabic',
  ru: 'Russian', hi: 'Hindi', tr: 'Turkish', nl: 'Dutch', pl: 'Polish',
  sv: 'Swedish', vi: 'Vietnamese', th: 'Thai', el: 'Greek', id: 'Indonesian'
};

const AIEnhancementPanel = ({
  message,
  onTranslate,
  onEnhance,
  onUseInChat,   // new: inserts result text directly into the chat input
  onClose,
  isVisible = false
}) => {
  const [activeTab, setActiveTab] = useState('translate');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [tone, setTone] = useState('professional');
  const [enhanceMode, setEnhanceMode] = useState('tone'); // 'tone' | 'shorten' | 'expand' | 'rephrase'
  const [fixGrammar, setFixGrammar] = useState(true);
  const [addEmoji, setAddEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const languages = [
    { code: 'es', name: 'Spanish',    flag: '🇪🇸' },
    { code: 'fr', name: 'French',     flag: '🇫🇷' },
    { code: 'de', name: 'German',     flag: '🇩🇪' },
    { code: 'it', name: 'Italian',    flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'ja', name: 'Japanese',   flag: '🇯🇵' },
    { code: 'zh', name: 'Chinese',    flag: '🇨🇳' },
    { code: 'ko', name: 'Korean',     flag: '🇰🇷' },
    { code: 'ar', name: 'Arabic',     flag: '🇸🇦' },
    { code: 'ru', name: 'Russian',    flag: '🇷🇺' },
    { code: 'hi', name: 'Hindi',      flag: '🇮🇳' },
    { code: 'tr', name: 'Turkish',    flag: '🇹🇷' },
    { code: 'nl', name: 'Dutch',      flag: '🇳🇱' },
    { code: 'pl', name: 'Polish',     flag: '🇵🇱' },
    { code: 'sv', name: 'Swedish',    flag: '🇸🇪' },
    { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
    { code: 'th', name: 'Thai',       flag: '🇹🇭' },
    { code: 'el', name: 'Greek',      flag: '🇬🇷' },
    { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  ];

  const tones = [
    { value: 'professional', label: 'Professional', icon: '💼' },
    { value: 'casual',       label: 'Casual',       icon: '😎' },
    { value: 'friendly',     label: 'Friendly',     icon: '🌟' },
    { value: 'formal',       label: 'Formal',       icon: '🎩' },
  ];

  const enhanceModes = [
    { value: 'tone',     label: 'Change Tone', icon: '🎭' },
    { value: 'shorten',  label: 'Shorten',     icon: '✂️' },
    { value: 'expand',   label: 'Expand',      icon: '📝' },
    { value: 'rephrase', label: 'Rephrase',    icon: '🔄' },
  ];

  const switchTab = (tab) => {
    setActiveTab(tab);
    setResult(null);
  };

  // Handle translation
  const handleTranslate = useCallback(async () => {
    if (!message) return;
    setLoading(true);
    setResult(null);
    try {
      const messageText = message.text || message;
      const translation = await aiService.translateMessage(messageText, targetLanguage);
      setResult(translation);
      if (onTranslate) onTranslate(translation);
    } catch (error) {
      console.error('Translation failed:', error);
      setResult({ error: 'Translation failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [message, targetLanguage, onTranslate]);

  // Handle message enhancement
  const handleEnhance = useCallback(async () => {
    if (!message) return;
    setLoading(true);
    setResult(null);
    try {
      const messageText = message.text || message;
      const enhanced = await aiService.enhanceMessage(messageText, {
        tone,
        mode: enhanceMode,
        fixGrammar: enhanceMode === 'tone' ? fixGrammar : false,
        addEmoji:   enhanceMode === 'tone' ? addEmoji   : false,
      });
      setResult(enhanced);
      if (onEnhance) onEnhance(enhanced);
    } catch (error) {
      console.error('Enhancement failed:', error);
      setResult({ error: 'Enhancement failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [message, tone, enhanceMode, fixGrammar, addEmoji, onEnhance]);

  // Get result text for current tab
  const getResultText = () => {
    if (!result) return '';
    return activeTab === 'translate' ? result.translatedText : result.enhanced;
  };

  // Copy to clipboard with feedback
  const copyToClipboard = async () => {
    const text = getResultText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Insert into chat input
  const handleUseInChat = () => {
    const text = getResultText();
    if (text && onUseInChat) onUseInChat(text);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="ai-enhancement-panel">
      {/* Header */}
      <div className="enhancement-header">
        <h4>🤖 AI Assistant</h4>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      {/* Tabs */}
      <div className="enhancement-tabs">
        <button
          className={`tab-btn ${activeTab === 'translate' ? 'active' : ''}`}
          onClick={() => switchTab('translate')}
        >
          🌐 Translate
        </button>
        <button
          className={`tab-btn ${activeTab === 'enhance' ? 'active' : ''}`}
          onClick={() => switchTab('enhance')}
        >
          ✨ Enhance
        </button>
      </div>

      {/* Original Message */}
      <div className="original-message">
        <div className="message-label">Original:</div>
        <div className="message-text">{message?.text || message}</div>
      </div>

      {/* ── TRANSLATE TAB ── */}
      {activeTab === 'translate' && (
        <div className="translate-content">
          <div className="language-selector">
            <label>Translate to:</label>
            <div className="language-grid">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={`language-btn ${targetLanguage === lang.code ? 'active' : ''}`}
                  onClick={() => { setTargetLanguage(lang.code); setResult(null); }}
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
            {loading ? <><span className="btn-spinner" /> Translating via MyMemory…</> : '🌐 Translate Now'}
          </button>
        </div>
      )}

      {/* ── ENHANCE TAB ── */}
      {activeTab === 'enhance' && (
        <div className="enhance-content">
          {/* Mode selector */}
          <div className="mode-selector">
            <label>Mode:</label>
            <div className="mode-grid">
              {enhanceModes.map((m) => (
                <button
                  key={m.value}
                  className={`mode-btn ${enhanceMode === m.value ? 'active' : ''}`}
                  onClick={() => { setEnhanceMode(m.value); setResult(null); }}
                >
                  <span className="mode-icon">{m.icon}</span>
                  <span className="mode-label">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tone selector — only shown in tone mode */}
          {enhanceMode === 'tone' && (
            <>
              <div className="tone-selector">
                <label>Tone:</label>
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
                  <input
                    type="checkbox"
                    checked={fixGrammar}
                    onChange={e => setFixGrammar(e.target.checked)}
                  />
                  <span>Fix grammar &amp; spelling</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addEmoji}
                    onChange={e => setAddEmoji(e.target.checked)}
                  />
                  <span>Add appropriate emoji</span>
                </label>
              </div>
            </>
          )}

          {(enhanceMode === 'shorten' || enhanceMode === 'expand' || enhanceMode === 'rephrase') && (
            <p className="mode-description">
              {enhanceMode === 'shorten'  && 'Trims the message to its core meaning.'}
              {enhanceMode === 'expand'   && 'Adds context and detail to your message.'}
              {enhanceMode === 'rephrase' && 'Rewrites the message while keeping the same meaning.'}
            </p>
          )}

          <button
            className="action-btn enhance-btn"
            onClick={handleEnhance}
            disabled={loading}
          >
            {loading ? <><span className="btn-spinner" /> Processing…</> : '✨ Apply Enhancement'}
          </button>
        </div>
      )}

      {/* ── RESULT ── */}
      {result && (
        <div className={`result-section ${result.error ? 'result-error' : ''}`}>
          {result.error ? (
            <div className="result-err-msg">⚠️ {result.error}</div>
          ) : (
            <>
              <div className="result-header">
                <span className="result-label">
                  {activeTab === 'translate' ? '🌐 Translation:' : '✨ Enhanced:'}
                </span>
                <div className="result-actions">
                  <button className="copy-btn" onClick={copyToClipboard}>
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                  {onUseInChat && (
                    <button className="use-btn" onClick={handleUseInChat}>
                      💬 Use in Chat
                    </button>
                  )}
                </div>
              </div>

              <div className="result-text">{getResultText()}</div>

              <div className="result-meta">
                {activeTab === 'translate' && (
                  <>
                    <span className="lang-badge">
                      {LANG_NAMES[result.sourceLanguage] || result.sourceLanguage} → {LANG_NAMES[result.targetLanguage] || result.targetLanguage}
                    </span>
                    <span className="confidence-badge">
                      {Math.round((result.confidence || 0) * 100)}% confidence
                    </span>
                  </>
                )}
                {activeTab === 'enhance' && (
                  <>
                    <span className="tone-badge">
                      {enhanceModes.find(m => m.value === result.mode)?.icon} {enhanceModes.find(m => m.value === result.mode)?.label}
                    </span>
                    {result.tone && result.mode === 'tone' && (
                      <span className="changes-badge">Tone: {result.tone}</span>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="enhancement-footer">
        <span className="ai-notice">
          ⚡ Translation via <a href="https://mymemory.translated.net" target="_blank" rel="noreferrer">MyMemory</a> • AI-powered enhancement
        </span>
      </div>
    </div>
  );
};

export default AIEnhancementPanel;
