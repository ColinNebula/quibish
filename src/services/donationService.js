/**
 * Donation Service
 * Handles user donations to support the free app
 */

class DonationService {
  constructor() {
    this.donationHistory = [];
    this.totalDonated = 0;
    this.lastDonationDate = null;
    this.donationGoals = {
      daily: 50,
      weekly: 300,
      monthly: 1200,
      yearly: 15000
    };
    
    // Load donation data from localStorage
    this.loadDonationData();
  }

  /**
   * Predefined donation amounts
   */
  getDonationAmounts() {
    return [
      { amount: 3, label: '$3', description: '☕ Buy us a coffee', popular: false },
      { amount: 5, label: '$5', description: '🍕 Support development', popular: true },
      { amount: 10, label: '$10', description: '🚀 Help us grow', popular: false },
      { amount: 25, label: '$25', description: '💎 Premium supporter', popular: false },
      { amount: 50, label: '$50', description: '🌟 Super supporter', popular: false },
      { amount: 100, label: '$100', description: '🏆 Champion supporter', popular: false }
    ];
  }

  /**
   * Get donation messaging based on user activity
   */
  getDonationMessage(userStats = {}) {
    const { callsMade = 0, messagesSent = 0, daysUsed = 0 } = userStats;
    
    const messages = [
      {
        title: "Keep This App Free! 💝",
        subtitle: "Your donation helps us maintain free calling for everyone",
        condition: () => true
      },
      {
        title: "Love Free Calling? 📞",
        subtitle: `You've made ${callsMade} free calls! Help others enjoy this too`,
        condition: () => callsMade > 5
      },
      {
        title: "Support Our Mission 🌍",
        subtitle: `After ${daysUsed} days of free use, consider supporting our work`,
        condition: () => daysUsed > 7
      },
      {
        title: "Enjoying the App? ❤️",
        subtitle: `${messagesSent} messages sent! A small donation keeps it free for all`,
        condition: () => messagesSent > 50
      }
    ];

    // Return the first message that matches conditions
    return messages.find(msg => msg.condition()) || messages[0];
  }

  /**
   * Process donation (simulate payment processing)
   */
  async processDonation(amount, message = '', paymentMethod = 'card') {
    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const donation = {
        id: `donation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount,
        message,
        paymentMethod,
        timestamp: new Date(),
        status: 'completed',
        transactionId: `txn_${Math.random().toString(36).substr(2, 16)}`
      };

      // Add to history
      this.donationHistory.unshift(donation);
      this.totalDonated += amount;
      this.lastDonationDate = new Date();

      // Save to localStorage
      this.saveDonationData();

      // Simulate success
      console.log('✅ Donation processed successfully:', donation);
      
      return {
        success: true,
        donation,
        message: `Thank you for your $${amount} donation! 🙏`
      };
    } catch (error) {
      console.error('❌ Donation processing failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Donation failed. Please try again.'
      };
    }
  }

  /**
   * Get donation statistics
   */
  getDonationStats() {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;
    const oneYear = 365 * oneDay;

    const dailyDonations = this.donationHistory.filter(d => 
      now - new Date(d.timestamp) < oneDay
    ).reduce((sum, d) => sum + d.amount, 0);

    const weeklyDonations = this.donationHistory.filter(d => 
      now - new Date(d.timestamp) < oneWeek
    ).reduce((sum, d) => sum + d.amount, 0);

    const monthlyDonations = this.donationHistory.filter(d => 
      now - new Date(d.timestamp) < oneMonth
    ).reduce((sum, d) => sum + d.amount, 0);

    const yearlyDonations = this.donationHistory.filter(d => 
      now - new Date(d.timestamp) < oneYear
    ).reduce((sum, d) => sum + d.amount, 0);

    return {
      total: this.totalDonated,
      daily: dailyDonations,
      weekly: weeklyDonations,
      monthly: monthlyDonations,
      yearly: yearlyDonations,
      donationCount: this.donationHistory.length,
      lastDonation: this.lastDonationDate,
      goals: this.donationGoals,
      progress: {
        daily: Math.min((dailyDonations / this.donationGoals.daily) * 100, 100),
        weekly: Math.min((weeklyDonations / this.donationGoals.weekly) * 100, 100),
        monthly: Math.min((monthlyDonations / this.donationGoals.monthly) * 100, 100),
        yearly: Math.min((yearlyDonations / this.donationGoals.yearly) * 100, 100)
      }
    };
  }

  /**
   * Check if user should see donation prompt
   */
  shouldShowDonationPrompt(userStats = {}) {
    const { callsMade = 0, messagesSent = 0, daysUsed = 0 } = userStats;
    const stats = this.getDonationStats();
    
    // Don't show if donated recently (within 7 days)
    if (stats.lastDonation && (new Date() - new Date(stats.lastDonation)) < 7 * 24 * 60 * 60 * 1000) {
      return false;
    }

    // Show based on usage patterns
    return (
      callsMade > 3 ||           // After 3 calls
      messagesSent > 20 ||       // After 20 messages
      daysUsed > 2 ||           // After 2 days of use
      (callsMade > 0 && messagesSent > 5) // Active user
    );
  }

  /**
   * Get thank you message after donation
   */
  getThankYouMessage(amount) {
    if (amount >= 100) {
      return {
        title: "🏆 Champion Supporter!",
        message: "Your incredible generosity helps us serve thousands of users worldwide. You're amazing!",
        badge: "champion"
      };
    } else if (amount >= 50) {
      return {
        title: "🌟 Super Supporter!",
        message: "Your generous donation makes a huge difference in keeping this app free for everyone!",
        badge: "super"
      };
    } else if (amount >= 25) {
      return {
        title: "💎 Premium Supporter!",
        message: "Your wonderful contribution helps us improve and expand our free services!",
        badge: "premium"
      };
    } else if (amount >= 10) {
      return {
        title: "🚀 Growth Supporter!",
        message: "Your donation helps us reach more users and build better features!",
        badge: "growth"
      };
    } else if (amount >= 5) {
      return {
        title: "🍕 Development Supporter!",
        message: "Your support helps us keep the lights on and the code flowing!",
        badge: "development"
      };
    } else {
      return {
        title: "☕ Coffee Supporter!",
        message: "Every dollar counts! Your support helps us maintain this free service!",
        badge: "coffee"
      };
    }
  }

  /**
   * Save donation data to localStorage
   */
  saveDonationData() {
    try {
      const data = {
        donationHistory: this.donationHistory,
        totalDonated: this.totalDonated,
        lastDonationDate: this.lastDonationDate
      };
      localStorage.setItem('quibish_donations', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save donation data:', error);
    }
  }

  /**
   * Load donation data from localStorage
   */
  loadDonationData() {
    try {
      const data = localStorage.getItem('quibish_donations');
      if (data) {
        const parsed = JSON.parse(data);
        this.donationHistory = parsed.donationHistory || [];
        this.totalDonated = parsed.totalDonated || 0;
        this.lastDonationDate = parsed.lastDonationDate ? new Date(parsed.lastDonationDate) : null;
      }
    } catch (error) {
      console.error('Failed to load donation data:', error);
    }
  }

  /**
   * Get recent donations for display
   */
  getRecentDonations(limit = 5) {
    return this.donationHistory.slice(0, limit);
  }

  /**
   * Check if user is eligible for supporter badge
   */
  getSupporterBadge() {
    const stats = this.getDonationStats();
    
    if (stats.total >= 100) return { level: 'champion', icon: '🏆', title: 'Champion Supporter' };
    if (stats.total >= 50) return { level: 'super', icon: '🌟', title: 'Super Supporter' };
    if (stats.total >= 25) return { level: 'premium', icon: '💎', title: 'Premium Supporter' };
    if (stats.total >= 10) return { level: 'growth', icon: '🚀', title: 'Growth Supporter' };
    if (stats.total >= 5) return { level: 'development', icon: '🍕', title: 'Development Supporter' };
    if (stats.total >= 1) return { level: 'coffee', icon: '☕', title: 'Coffee Supporter' };
    
    return null;
  }
}

// Create and export singleton instance
const donationService = new DonationService();
export default donationService;