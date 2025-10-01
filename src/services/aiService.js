// AI Service - Smart Features for Modern Chat
// Provides smart replies, translation, sentiment analysis, and message enhancement

class AIService {
  constructor() {
    this.isInitialized = false;
    this.smartReplyCache = new Map();
    this.translationCache = new Map();
    this.sentimentCache = new Map();
    
    // Smart reply patterns
    this.replyPatterns = {
      greetings: {
        patterns: [/\b(hi|hello|hey|good morning|good afternoon|good evening)\b/i],
        replies: [
          "👋 Hello! How are you?",
          "Hey there! 😊",
          "Hi! What's up?",
          "Hello! Nice to hear from you!",
          "Hey! How's it going?"
        ]
      },
      questions: {
        patterns: [/\bhow are you\b/i, /\bhow's it going\b/i, /\bwhat's up\b/i],
        replies: [
          "I'm doing great, thanks! How about you?",
          "Pretty good! What about you?",
          "All good here! How are things with you?",
          "Doing well! How's your day going?",
          "Great! Thanks for asking! 😊"
        ]
      },
      thanks: {
        patterns: [/\b(thank you|thanks|thx|appreciate it)\b/i],
        replies: [
          "You're welcome! 😊",
          "No problem!",
          "Happy to help!",
          "Anytime!",
          "My pleasure! 👍"
        ]
      },
      agreement: {
        patterns: [/\b(yes|yeah|yep|sure|okay|ok|sounds good)\b/i],
        replies: [
          "👍 Perfect!",
          "Great! ✨",
          "Awesome! 🎉",
          "Cool! 😎",
          "Sounds good! 👌"
        ]
      },
      disagreement: {
        patterns: [/\b(no|nope|nah|not really|disagree)\b/i],
        replies: [
          "I understand.",
          "No worries!",
          "That's okay!",
          "Got it. 👍",
          "Fair enough!"
        ]
      },
      help: {
        patterns: [/\b(help|need|problem|issue|stuck)\b/i],
        replies: [
          "I'm here to help! What's the issue?",
          "What do you need help with?",
          "I'd be happy to assist! What's up?",
          "Let me help you with that!",
          "Tell me more about the problem."
        ]
      },
      apology: {
        patterns: [/\b(sorry|apologize|my bad|oops)\b/i],
        replies: [
          "No worries at all! 😊",
          "It's all good!",
          "Don't worry about it!",
          "No problem whatsoever!",
          "All is forgiven! 💙"
        ]
      },
      meeting: {
        patterns: [/\b(meet|meeting|call|schedule|appointment)\b/i],
        replies: [
          "📅 When works best for you?",
          "Sure! What time is good?",
          "Let's schedule it! When are you free?",
          "I'm available. What day works?",
          "Great! Let me know your availability."
        ]
      },
      goodbye: {
        patterns: [/\b(bye|goodbye|see you|talk later|ttyl)\b/i],
        replies: [
          "👋 See you later!",
          "Goodbye! Take care!",
          "Talk to you soon! 😊",
          "Bye! Have a great day!",
          "See ya! 👋"
        ]
      },
      excitement: {
        patterns: [/\b(awesome|amazing|great|fantastic|excellent|wonderful)\b/i],
        replies: [
          "🎉 That's fantastic!",
          "So happy for you! ✨",
          "Awesome! 🙌",
          "That's wonderful news!",
          "Incredible! 😄"
        ]
      }
    };

    // Sentiment keywords
    this.sentimentKeywords = {
      positive: ['happy', 'great', 'good', 'excellent', 'awesome', 'love', 'wonderful', 'fantastic', 'amazing', 'perfect', 'thanks', 'appreciate'],
      negative: ['bad', 'terrible', 'awful', 'hate', 'angry', 'upset', 'disappointed', 'sad', 'sorry', 'problem', 'issue', 'wrong'],
      neutral: ['okay', 'fine', 'alright', 'maybe', 'perhaps', 'think', 'consider', 'understand']
    };

    // Emoji suggestions based on context
    this.emojiSuggestions = {
      happy: ['😊', '😄', '🎉', '✨', '💙', '🌟'],
      sad: ['😢', '😔', '💔', '😞', '🥺'],
      angry: ['😠', '😡', '💢', '🤬'],
      love: ['❤️', '💕', '💖', '😍', '🥰'],
      laugh: ['😂', '🤣', '😆', '😁'],
      thinking: ['🤔', '💭', '🧐'],
      celebration: ['🎉', '🎊', '🥳', '🍾', '✨'],
      work: ['💼', '📊', '💻', '📝', '✅'],
      food: ['🍕', '🍔', '🍰', '☕', '🍜']
    };

    this.initialize();
  }

  // Initialize AI service
  async initialize() {
    try {
      console.log('🤖 Initializing AI Service...');
      
      // Check for browser AI capabilities
      this.capabilities = {
        translation: 'Intl' in window,
        textAnalysis: true, // Local analysis
        speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
      };

      this.isInitialized = true;
      console.log('✅ AI Service initialized', this.capabilities);
    } catch (error) {
      console.error('❌ Failed to initialize AI Service:', error);
    }
  }

  // Generate smart reply suggestions
  async generateSmartReplies(message, conversationHistory = []) {
    try {
      const cacheKey = `${message}-${conversationHistory.length}`;
      
      // Check cache
      if (this.smartReplyCache.has(cacheKey)) {
        return this.smartReplyCache.get(cacheKey);
      }

      const replies = [];
      const messageText = message.text || message;
      const lowerMessage = messageText.toLowerCase();

      // Match against patterns
      for (const [category, config] of Object.entries(this.replyPatterns)) {
        for (const pattern of config.patterns) {
          if (pattern.test(lowerMessage)) {
            // Get random replies from this category (max 2)
            const categoryReplies = this.getRandomReplies(config.replies, 2);
            replies.push(...categoryReplies.map(text => ({
              text,
              category,
              confidence: 0.8 + Math.random() * 0.2
            })));
          }
        }
      }

      // Add context-aware replies based on conversation
      if (conversationHistory.length > 0) {
        const contextReplies = this.generateContextualReplies(messageText, conversationHistory);
        replies.push(...contextReplies);
      }

      // Add emoji suggestions
      const emojiReply = this.suggestEmoji(messageText);
      if (emojiReply) {
        replies.push(emojiReply);
      }

      // Sort by confidence and deduplicate
      const uniqueReplies = this.deduplicateReplies(replies)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 6); // Max 6 suggestions

      // Cache the results
      this.smartReplyCache.set(cacheKey, uniqueReplies);

      return uniqueReplies;
    } catch (error) {
      console.error('Failed to generate smart replies:', error);
      return [];
    }
  }

  // Generate contextual replies based on conversation history
  generateContextualReplies(currentMessage, history) {
    const replies = [];
    
    // Check for questions requiring yes/no
    if (currentMessage.includes('?')) {
      replies.push(
        { text: "Yes, absolutely! ✅", category: 'contextual', confidence: 0.75 },
        { text: "No, not really.", category: 'contextual', confidence: 0.75 },
        { text: "Let me think about it 🤔", category: 'contextual', confidence: 0.7 }
      );
    }

    // Check for scheduling-related messages
    if (/\b(when|time|date|schedule)\b/i.test(currentMessage)) {
      replies.push(
        { text: "How about tomorrow?", category: 'contextual', confidence: 0.8 },
        { text: "I'm free this week!", category: 'contextual', confidence: 0.8 }
      );
    }

    // Check for confirmation requests
    if (/\b(confirm|verify|check|make sure)\b/i.test(currentMessage)) {
      replies.push(
        { text: "Confirmed! ✅", category: 'contextual', confidence: 0.85 },
        { text: "Yes, I can confirm that.", category: 'contextual', confidence: 0.85 }
      );
    }

    return replies;
  }

  // Suggest emoji based on message content
  suggestEmoji(messageText) {
    const lower = messageText.toLowerCase();
    
    if (/\b(happy|joy|great|awesome|love|wonderful)\b/i.test(lower)) {
      const emoji = this.emojiSuggestions.happy[0];
      return { text: emoji, category: 'emoji', confidence: 0.7, isEmoji: true };
    }
    
    if (/\b(haha|lol|funny|hilarious)\b/i.test(lower)) {
      const emoji = this.emojiSuggestions.laugh[0];
      return { text: emoji, category: 'emoji', confidence: 0.7, isEmoji: true };
    }
    
    if (/\b(think|wonder|consider|maybe)\b/i.test(lower)) {
      const emoji = this.emojiSuggestions.thinking[0];
      return { text: emoji, category: 'emoji', confidence: 0.65, isEmoji: true };
    }

    if (/\b(celebrate|party|congrats|yay)\b/i.test(lower)) {
      const emoji = this.emojiSuggestions.celebration[0];
      return { text: emoji, category: 'emoji', confidence: 0.75, isEmoji: true };
    }

    return null;
  }

  // Analyze message sentiment
  async analyzeSentiment(message) {
    try {
      const messageText = message.text || message;
      const lower = messageText.toLowerCase();
      const words = lower.split(/\s+/);

      let positiveScore = 0;
      let negativeScore = 0;
      let neutralScore = 0;

      // Count sentiment words
      words.forEach(word => {
        if (this.sentimentKeywords.positive.some(kw => word.includes(kw))) {
          positiveScore++;
        }
        if (this.sentimentKeywords.negative.some(kw => word.includes(kw))) {
          negativeScore++;
        }
        if (this.sentimentKeywords.neutral.some(kw => word.includes(kw))) {
          neutralScore++;
        }
      });

      // Check for punctuation sentiment
      if (/!+/.test(messageText)) positiveScore += 0.5;
      if (/\?{2,}/.test(messageText)) neutralScore += 0.5;
      if (/\.{3,}/.test(messageText)) neutralScore += 0.5;

      // Check for emojis
      const emojiMatches = messageText.match(/[\u{1F600}-\u{1F64F}]/gu) || [];
      if (emojiMatches.length > 0) positiveScore += emojiMatches.length * 0.3;

      // Calculate overall sentiment
      const total = positiveScore + negativeScore + neutralScore || 1;
      const sentiment = {
        positive: positiveScore / total,
        negative: negativeScore / total,
        neutral: neutralScore / total,
        overall: positiveScore > negativeScore ? 'positive' : 
                 negativeScore > positiveScore ? 'negative' : 'neutral',
        confidence: Math.max(positiveScore, negativeScore, neutralScore) / total,
        score: (positiveScore - negativeScore) / total
      };

      return sentiment;
    } catch (error) {
      console.error('Failed to analyze sentiment:', error);
      return {
        positive: 0.33,
        negative: 0.33,
        neutral: 0.34,
        overall: 'neutral',
        confidence: 0.5,
        score: 0
      };
    }
  }

  // Translate message
  async translateMessage(text, targetLanguage = 'en', sourceLanguage = 'auto') {
    try {
      const cacheKey = `${text}-${sourceLanguage}-${targetLanguage}`;
      
      // Check cache
      if (this.translationCache.has(cacheKey)) {
        return this.translationCache.get(cacheKey);
      }

      // Try to use browser's translation API if available
      // For now, use a simple mock/pattern-based translation
      const translation = {
        text: text, // Original text (would be translated in production)
        sourceLanguage: sourceLanguage === 'auto' ? this.detectLanguage(text) : sourceLanguage,
        targetLanguage,
        confidence: 0.85,
        translatedText: await this.mockTranslate(text, targetLanguage)
      };

      // Cache the result
      this.translationCache.set(cacheKey, translation);

      return translation;
    } catch (error) {
      console.error('Translation failed:', error);
      return {
        text,
        sourceLanguage: 'unknown',
        targetLanguage,
        confidence: 0,
        translatedText: text,
        error: error.message
      };
    }
  }

  // Mock translation (replace with real API in production)
  async mockTranslate(text, targetLang) {
    // This is a placeholder. In production, use:
    // - Google Translate API
    // - Microsoft Translator
    // - DeepL API
    // - Or browser's built-in translation
    
    const greetings = {
      es: { hello: 'hola', goodbye: 'adiós', thanks: 'gracias' },
      fr: { hello: 'bonjour', goodbye: 'au revoir', thanks: 'merci' },
      de: { hello: 'hallo', goodbye: 'auf wiedersehen', thanks: 'danke' },
      it: { hello: 'ciao', goodbye: 'arrivederci', thanks: 'grazie' },
      pt: { hello: 'olá', goodbye: 'tchau', thanks: 'obrigado' },
      ja: { hello: 'こんにちは', goodbye: 'さようなら', thanks: 'ありがとう' },
      zh: { hello: '你好', goodbye: '再见', thanks: '谢谢' }
    };

    const lower = text.toLowerCase();
    const langMap = greetings[targetLang];
    
    if (langMap) {
      if (lower.includes('hello') || lower.includes('hi')) return langMap.hello;
      if (lower.includes('bye') || lower.includes('goodbye')) return langMap.goodbye;
      if (lower.includes('thank')) return langMap.thanks;
    }

    return `[${targetLang}] ${text}`; // Mock translation
  }

  // Detect language
  detectLanguage(text) {
    // Simple language detection based on character patterns
    if (/[\u4e00-\u9fa5]/.test(text)) return 'zh'; // Chinese
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja'; // Japanese
    if (/[\u0600-\u06ff]/.test(text)) return 'ar'; // Arabic
    if (/[\u0400-\u04ff]/.test(text)) return 'ru'; // Russian
    if (/[\u0e00-\u0e7f]/.test(text)) return 'th'; // Thai
    
    // Default to English for Latin-based scripts
    return 'en';
  }

  // Enhance message (grammar, tone, etc.)
  async enhanceMessage(text, options = {}) {
    const {
      tone = 'neutral', // casual, professional, friendly, formal
      fixGrammar = true,
      addEmoji = false
    } = options;

    try {
      let enhanced = text;

      // Fix common grammar issues
      if (fixGrammar) {
        enhanced = this.fixCommonGrammar(enhanced);
      }

      // Adjust tone
      enhanced = this.adjustTone(enhanced, tone);

      // Add emoji if requested
      if (addEmoji) {
        const emoji = this.getSuggestedEmojiForTone(tone);
        if (emoji) enhanced += ` ${emoji}`;
      }

      return {
        original: text,
        enhanced,
        changes: this.getChanges(text, enhanced),
        tone
      };
    } catch (error) {
      console.error('Failed to enhance message:', error);
      return {
        original: text,
        enhanced: text,
        changes: [],
        tone,
        error: error.message
      };
    }
  }

  // Fix common grammar issues
  fixCommonGrammar(text) {
    let fixed = text;

    // Capitalize first letter
    fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);

    // Fix common typos
    const typos = {
      'teh': 'the',
      'recieve': 'receive',
      'definately': 'definitely',
      'seperate': 'separate',
      'occured': 'occurred',
      'untill': 'until',
      'wierd': 'weird'
    };

    Object.entries(typos).forEach(([wrong, right]) => {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      fixed = fixed.replace(regex, right);
    });

    // Ensure period at end (if not question or exclamation)
    if (!/[.!?]$/.test(fixed)) {
      fixed += '.';
    }

    return fixed;
  }

  // Adjust message tone
  adjustTone(text, tone) {
    switch (tone) {
      case 'professional':
        // Remove casual language, add formal alternatives
        return text
          .replace(/\b(hey|hi)\b/gi, 'Hello')
          .replace(/\b(yeah|yep)\b/gi, 'Yes')
          .replace(/\b(nope|nah)\b/gi, 'No')
          .replace(/\b(gonna)\b/gi, 'going to')
          .replace(/\b(wanna)\b/gi, 'want to');
      
      case 'casual':
        // Add casual elements
        return text
          .replace(/\bHello\b/g, 'Hey')
          .replace(/\bYes\b/g, 'Yeah')
          .replace(/\bNo\b/g, 'Nope');
      
      case 'friendly':
        // Add warmth
        if (!text.includes('!')) {
          text = text.replace(/\.$/, '!');
        }
        return text;
      
      case 'formal':
        // Maximum formality
        return text
          .replace(/!/g, '.')
          .replace(/\b(hi|hey)\b/gi, 'Greetings')
          .replace(/\b(thanks)\b/gi, 'Thank you');
      
      default:
        return text;
    }
  }

  // Get emoji suggestion for tone
  getSuggestedEmojiForTone(tone) {
    const toneEmojis = {
      casual: '😊',
      professional: '📧',
      friendly: '🌟',
      formal: '',
      happy: '😄',
      excited: '🎉'
    };
    return toneEmojis[tone] || '';
  }

  // Get changes between original and enhanced text
  getChanges(original, enhanced) {
    const changes = [];
    if (original !== enhanced) {
      changes.push({
        type: 'text',
        from: original,
        to: enhanced
      });
    }
    return changes;
  }

  // Get random replies from array
  getRandomReplies(replies, count) {
    const shuffled = [...replies].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  // Deduplicate replies
  deduplicateReplies(replies) {
    const seen = new Set();
    return replies.filter(reply => {
      const key = reply.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Auto-complete message
  async autoComplete(partialText, context = {}) {
    // Suggest completions based on common phrases
    const completions = [];
    const lower = partialText.toLowerCase();

    if (lower.startsWith('how ')) {
      completions.push('How are you?', 'How can I help?', 'How about tomorrow?');
    } else if (lower.startsWith('what ')) {
      completions.push('What do you think?', 'What time works?', 'What about later?');
    } else if (lower.startsWith('can ')) {
      completions.push('Can we schedule a call?', 'Can you help me?', 'Can we meet?');
    }

    return completions.slice(0, 3);
  }

  // Clear caches
  clearCaches() {
    this.smartReplyCache.clear();
    this.translationCache.clear();
    this.sentimentCache.clear();
  }

  // Get AI statistics
  getStats() {
    return {
      initialized: this.isInitialized,
      capabilities: this.capabilities,
      cacheSize: {
        smartReplies: this.smartReplyCache.size,
        translations: this.translationCache.size,
        sentiment: this.sentimentCache.size
      }
    };
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;
