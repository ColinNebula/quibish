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
      },
      urgent: {
        patterns: [/\b(urgent|asap|immediately|emergency|critical|important)\b/i],
        replies: [
          "On it right away! 🚀",
          "I'll prioritize this immediately.",
          "Got it — handling it now!",
          "I'm on it! ETA soon.",
          "Understood, moving on this ASAP."
        ]
      },
      sharing: {
        patterns: [/\b(check this|look at|have you seen|found this|sharing|sent you)\b/i],
        replies: [
          "Thanks for sharing! 👀",
          "Interesting! I'll take a look.",
          "Checking it out now!",
          "Wow, that's really cool! 🔥",
          "Got it, will review shortly."
        ]
      },
      opinion: {
        patterns: [/\b(what do you think|your opinion|thoughts on|how does that sound|do you agree)\b/i],
        replies: [
          "Sounds great to me! ✅",
          "I think that's a solid idea.",
          "Honestly, I really like it!",
          "Let me think about it 🤔",
          "Good point — I agree!"
        ]
      },
      workTask: {
        patterns: [/\b(task|project|assignment|deadline|deliverable|milestone)\b/i],
        replies: [
          "I'll get that done! 💪",
          "On my list — I'll update you soon.",
          "What's the deadline for this?",
          "Noted! I'll track this.",
          "Can you share more details? 📋"
        ]
      },
      congrats: {
        patterns: [/\b(congratulations|congrats|well done|great job|proud of you|achievement)\b/i],
        replies: [
          "Thank you so much! 🙏",
          "Really appreciate that! 😊",
          "That means a lot, thank you!",
          "Couldn't have done it without the team!",
          "Thanks! 🎉"
        ]
      },
      waiting: {
        patterns: [/\b(waiting|still there|any update|heard back|response|following up)\b/i],
        replies: [
          "Still working on it! Almost there.",
          "I'll have an update for you shortly.",
          "Sorry for the delay — on it now.",
          "Just need a bit more time. 🙏",
          "Following up now!"
        ]
      },
      lateNight: {
        patterns: [/\b(late|night|tired|exhausted|long day)\b/i],
        replies: [
          "Rest up! Talk tomorrow 😴",
          "Take care of yourself! 🌙",
          "Get some sleep — chat later!",
          "It's been a long one, huh? 💙",
          "We'll catch up when you're fresh!"
        ]
      },
      plans: {
        patterns: [/\b(weekend|plans|going to|trip|vacation|holiday|travel)\b/i],
        replies: [
          "Sounds like fun! 🎉",
          "Have a great time! 🌟",
          "That's exciting — enjoy!",
          "Nice! What are you planning?",
          "Jealous! Sounds amazing 😄"
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

  // Translate message using real MyMemory API (free, no key required)
  async translateMessage(text, targetLanguage = 'en', sourceLanguage = 'auto') {
    try {
      const cacheKey = `${text}-${sourceLanguage}-${targetLanguage}`;

      if (this.translationCache.has(cacheKey)) {
        return this.translationCache.get(cacheKey);
      }

      const detectedSource = sourceLanguage === 'auto'
        ? this.detectLanguage(text)
        : sourceLanguage;

      // Same language — skip API call
      if (detectedSource === targetLanguage) {
        const result = { text, sourceLanguage: detectedSource, targetLanguage, confidence: 1.0, translatedText: text };
        this.translationCache.set(cacheKey, result);
        return result;
      }

      const translatedText = await this.callTranslationAPI(text, detectedSource, targetLanguage);

      const translation = {
        text,
        sourceLanguage: detectedSource,
        targetLanguage,
        confidence: 0.92,
        translatedText
      };

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

  // Call MyMemory free translation API (https://mymemory.translated.net)
  async callTranslationAPI(text, sourceLang, targetLang) {
    const langPair = `${sourceLang}|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Translation API error: ${response.status}`);

    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }

    // Fallback to first match
    if (Array.isArray(data.matches) && data.matches.length > 0) {
      return data.matches[0].translation;
    }

    throw new Error('No translation returned from API');
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

  // Enhance message (grammar, tone, shorten, expand, rephrase, etc.)
  async enhanceMessage(text, options = {}) {
    const {
      tone = 'neutral',
      mode = 'tone', // 'tone' | 'shorten' | 'expand' | 'rephrase'
      fixGrammar = true,
      addEmoji = false
    } = options;

    try {
      let enhanced = text;

      if (mode === 'shorten') {
        enhanced = this.shortenMessage(enhanced);
      } else if (mode === 'expand') {
        enhanced = this.expandMessage(enhanced, tone);
      } else if (mode === 'rephrase') {
        enhanced = this.rephraseMessage(enhanced);
      } else {
        // Default tone mode
        if (fixGrammar) enhanced = this.fixCommonGrammar(enhanced);
        enhanced = this.adjustTone(enhanced, tone);
        if (addEmoji) {
          const emoji = this.getSuggestedEmojiForTone(tone);
          if (emoji) enhanced += ` ${emoji}`;
        }
      }

      return {
        original: text,
        enhanced,
        changes: this.getChanges(text, enhanced),
        tone,
        mode
      };
    } catch (error) {
      console.error('Failed to enhance message:', error);
      return { original: text, enhanced: text, changes: [], tone, mode, error: error.message };
    }
  }

  // Shorten a message to key point
  shortenMessage(text) {
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    if (sentences.length <= 1) {
      // Single sentence — trim filler words
      return text
        .replace(/\b(basically|actually|just|really|very|quite|rather|somewhat|kind of|sort of)\b\s*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
    // Multiple sentences — keep first two
    return sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join(' ').trim();
  }

  // Expand a message with more context/detail
  expandMessage(text, tone = 'neutral') {
    const closings = {
      professional: ' Please let me know if you need any further information or clarification.',
      casual: " Just let me know what you think!",
      friendly: " I'd love to hear your thoughts on this! 😊",
      formal: ' I would appreciate your prompt response at your earliest convenience.',
      neutral: ' Feel free to reach out if you have any questions.'
    };
    const openers = {
      professional: 'I wanted to share the following with you: ',
      casual: 'Hey! So, ',
      friendly: 'Hi there! I wanted to mention — ',
      formal: 'I am writing to inform you that ',
      neutral: ''
    };
    const opener = openers[tone] || '';
    const closing = closings[tone] || closings.neutral;
    const body = text.charAt(0).toLowerCase() + text.slice(1).replace(/[.!?]$/, '');
    return `${opener}${body}${closing}`;
  }

  // Rephrase a message while keeping the same meaning
  rephraseMessage(text) {
    return text
      .replace(/\b(can't)\b/gi, 'cannot')
      .replace(/\b(won't)\b/gi, 'will not')
      .replace(/\b(don't)\b/gi, 'do not')
      .replace(/\b(i'm)\b/gi, 'I am')
      .replace(/\b(it's)\b/gi, 'it is')
      .replace(/\b(that's)\b/gi, 'that is')
      .replace(/\b(they're)\b/gi, 'they are')
      .replace(/\b(we're)\b/gi, 'we are')
      .replace(/\b(need to)\b/gi, 'should')
      .replace(/\b(want to)\b/gi, 'would like to')
      .replace(/\b(get)\b/gi, 'receive')
      .replace(/\b(make sure)\b/gi, 'ensure')
      .replace(/\b(find out)\b/gi, 'determine')
      .replace(/\b(look into)\b/gi, 'investigate');
  }

  // Fix common grammar issues
  fixCommonGrammar(text) {
    let fixed = text;

    // Capitalize first letter
    fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);

    // Capitalize 'I'
    fixed = fixed.replace(/\bi\b/g, 'I');

    // Fix common typos
    const typos = {
      'teh': 'the', 'hte': 'the', 'adn': 'and', 'nad': 'and',
      'recieve': 'receive', 'recieved': 'received',
      'definately': 'definitely', 'definitly': 'definitely',
      'seperate': 'separate', 'seperately': 'separately',
      'occured': 'occurred', 'occurance': 'occurrence',
      'untill': 'until', 'wierd': 'weird', 'freind': 'friend',
      'beleive': 'believe', 'accomodate': 'accommodate',
      'embarass': 'embarrass', 'occassion': 'occasion',
      'tommorow': 'tomorrow', 'tommorrow': 'tomorrow',
      'becuase': 'because', 'becasue': 'because',
      'wich': 'which', 'wihch': 'which',
      'u ': 'you ', 'r ': 'are ', 'ur ': 'your '
    };

    Object.entries(typos).forEach(([wrong, right]) => {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      fixed = fixed.replace(regex, right);
    });

    // Fix double spaces
    fixed = fixed.replace(/  +/g, ' ').trim();

    // Ensure sentence ends with punctuation
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
