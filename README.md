# 🌟 Quibish - The Ultimate Free Communication Platform

<div align="center">

![Quibish Logo](https://via.placeholder.com/200x100/6366f1/ffffff?text=Quibish)

**🌍 Connect with Anyone, Anywhere - Completely FREE!**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Available-brightgreen?style=for-the-badge)](https://colinnebula.github.io/quibish/)
[![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge)](https://github.com/ColinNebula/quibish)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Donate](https://img.shields.io/badge/💝_Support_Development-Donate-red?style=for-the-badge)](#-support-development)

*A product of **Nebula Media3D** | Created by **Colin Nebula***

</div>

---

## 🚀 What Makes Quibish Special?

Quibish isn't just another chat app - it's a **revolutionary communication platform** that brings the world together through:

### 📞 **FREE International Calling**
- Call **80+ countries** completely FREE
- Crystal-clear voice quality
- No hidden fees or subscriptions
- Traditional phone number support (PSTN)

### 💬 **Advanced Messaging**
- Real-time messaging with encryption
- File sharing (photos, videos, documents)
- Voice messages and media gallery
- Smart emoji support

### 🔐 **Enterprise-Grade Security**
- End-to-end encryption for all communications
- Secure file transfer
- Privacy-first architecture
- No data selling or tracking

### 📱 **Universal Compatibility**
- Progressive Web App (PWA)
- Works on any device (mobile, tablet, desktop)
- Installable like a native app
- Offline capability

---

## 🌟 Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| 🌍 **Global Calling** | Free calls to 80+ countries | ✅ Live |
| 💬 **Real-time Chat** | Instant messaging with encryption | ✅ Live |
| 🎥 **Voice Calls** | WebRTC peer-to-peer calling | ✅ Live |
| 📁 **File Sharing** | Images, videos, documents | ✅ Live |
| 🔐 **Encryption** | End-to-end message encryption | ✅ Live |
| 📱 **PWA Support** | Install as mobile app | ✅ Live |
| 🌙 **Dark Mode** | Beautiful dark/light themes | ✅ Live |
| 💝 **Donation System** | Support development | ✅ Live |

---

## 🚀 Quick Start

### 🌐 **Try It Now (Recommended)**
**No installation required!** Visit our live demo:
👉 **[https://colinnebula.github.io/quibish/](https://colinnebula.github.io/quibish/)**

### 💻 **Local Development Setup**

#### Prerequisites
- Node.js 16+ 
- Git

#### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/ColinNebula/quibish.git
cd quibish

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend
npm install
cd ..

# 4. Set up environment variables
cp .env.example .env
cp backend/.env.example backend/.env

# 5. Start the backend server (Terminal 1)
cd backend
npm start
# Backend runs on http://localhost:5001

# 6. Start the frontend (Terminal 2)
npm start
# Frontend runs on http://localhost:3000
```

#### 🔧 **Environment Configuration**
Edit `.env` and `backend/.env` files:
```env
# Frontend (.env)
REACT_APP_API_URL=http://localhost:5001
REACT_APP_WS_URL=ws://localhost:5001

# Backend (backend/.env)
PORT=5001
JWT_SECRET=your_jwt_secret_here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=quibish
```

---

## 📱 Mobile Installation

### iOS (iPhone/iPad)
1. Open Safari and visit the live demo
2. Tap the Share button 📤
3. Select "Add to Home Screen"
4. Enjoy native-like experience!

### Android
1. Open Chrome and visit the live demo
2. Tap the menu (⋮) button
3. Select "Add to Home screen" or "Install app"
4. Launch from home screen like any app!

---

## 🛠️ Technical Architecture

### **Frontend Stack**
- **React 19** - Latest React with concurrent features
- **CSS Grid/Flexbox** - Responsive design system
- **WebRTC** - Peer-to-peer communication
- **Service Workers** - Offline functionality
- **PWA** - Native app experience

### **Backend Stack**
- **Node.js + Express** - High-performance server
- **WebSocket** - Real-time communication
- **MySQL** - Reliable data storage
- **JWT** - Secure authentication
- **Encryption** - Data protection

### **Communication Features**
- **PSTN Integration** - Traditional phone support
- **International Calling** - 80+ countries
- **WebRTC** - Browser-to-browser calls
- **Encryption** - RSA-OAEP + AES
- **Real-time Messaging** - Sub-second delivery

---

## 🌍 Supported Countries for FREE Calling

<details>
<summary>Click to see all 80+ supported countries</summary>

| Region | Countries |
|--------|-----------|
| **North America** | United States, Canada, Mexico |
| **Europe** | United Kingdom, Germany, France, Italy, Spain, Netherlands, Belgium, Switzerland, Austria, Sweden, Norway, Denmark, Finland, Poland, Czech Republic, Hungary, Portugal, Greece, Ireland, Luxembourg |
| **Asia-Pacific** | Japan, Australia, New Zealand, Singapore, Hong Kong, South Korea, Taiwan, Thailand, Malaysia, Philippines, Indonesia, India, China, Vietnam |
| **Latin America** | Brazil, Argentina, Chile, Colombia, Peru, Venezuela, Ecuador, Uruguay, Paraguay, Bolivia |
| **Middle East** | Israel, UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman, Turkey, Jordan, Lebanon |
| **Africa** | South Africa, Egypt, Morocco, Tunisia, Ghana, Kenya, Nigeria, Ethiopia |

*And many more! Full list available in the app.*
</details>

---

## 📊 API Documentation

### **Authentication Endpoints**
```javascript
POST /api/auth/register    // User registration
POST /api/auth/login       // User authentication
POST /api/auth/logout      // Session termination
GET  /api/auth/verify      // Token verification
```

### **Communication Endpoints**
```javascript
GET  /api/conversations    // Fetch conversations
POST /api/messages         // Send message
GET  /api/messages/:id     // Get conversation messages
POST /api/upload           // File upload
```

### **User Management**
```javascript
GET  /api/users/profile    // User profile
PUT  /api/users/profile    // Update profile
POST /api/users/avatar     // Avatar upload
```

### **Calling Features**
```javascript
POST /api/calls/initiate   // Start PSTN call
GET  /api/calls/history    // Call history
POST /api/calls/webrtc     // WebRTC signaling
```

---

## 💝 Support Development

**Quibish is FREE forever** - but development costs money! Help us:

### 🎯 **Why Donate?**
- 💰 **Server Costs** - Keep the service running 24/7
- 🌍 **Global Expansion** - Add more countries for free calling
- 🚀 **New Features** - Video calling, group chats, AI features
- 🛡️ **Security** - Enhanced encryption and privacy features
- 📱 **Mobile Apps** - Native iOS and Android versions

### 💳 **How to Donate**
1. **In-App Donations** - Use the donation feature in Quibish
2. **PayPal** - [paypal.me/NebulaMedia3D](https://paypal.me/NebulaMedia3D)
3. **GitHub Sponsors** - Sponsor the project on GitHub
4. **Crypto** - Contact us for wallet addresses

### 🏆 **Supporter Benefits**
- 🌟 **Supporter Badge** - Special recognition in app
- 📊 **Impact Stats** - See how your donation helps
- 🎁 **Early Access** - Try new features first
- 💬 **Direct Line** - Priority support from developers

---

## 🤝 Contributing

We welcome contributions! Here's how to get involved:

### 🐛 **Report Issues**
Found a bug? [Open an issue](https://github.com/ColinNebula/quibish/issues)

### 💡 **Suggest Features**
Have an idea? [Start a discussion](https://github.com/ColinNebula/quibish/discussions)

### 🔧 **Code Contributions**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### 📋 **Development Guidelines**
- Follow React best practices
- Write clean, documented code
- Test your changes thoroughly
- Update documentation as needed

---

## 📈 Roadmap

### 🎯 **Coming Soon**
- [ ] 🎥 Video calling support
- [ ] 👥 Group voice calls
- [ ] 🤖 AI-powered features
- [ ] 📱 Native mobile apps
- [ ] 🌐 More language support
- [ ] 🔔 Push notifications
- [ ] 📊 Advanced analytics

### 🚀 **Future Vision**
- Global communication platform
- AI-powered translation
- Business team features
- Integration marketplace
- Voice-controlled interface

---

## 📞 Support & Contact

### 🆘 **Need Help?**
- 📖 **Documentation** - Check this README first
- 🐛 **Bug Reports** - [GitHub Issues](https://github.com/ColinNebula/quibish/issues)
- 💬 **Discussions** - [GitHub Discussions](https://github.com/ColinNebula/quibish/discussions)
- 📧 **Email** - support@nebulamedia3d.com

### 🌐 **Connect With Us**
- **Website**: [NebulaMedia3D.com](https://nebulamedia3d.com)
- **GitHub**: [@ColinNebula](https://github.com/ColinNebula)
- **Twitter**: [@NebulaMedia3D](https://twitter.com/NebulaMedia3D)
- **LinkedIn**: [Nebula Media3D](https://linkedin.com/company/nebulamedia3d)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### 📋 **License Summary**
- ✅ **Commercial use allowed**
- ✅ **Modification allowed**
- ✅ **Distribution allowed**
- ✅ **Private use allowed**
- ⚠️ **License and copyright notice required**

---

## 🏢 About Nebula Media3D

**Quibish** is proudly developed by **Nebula Media3D**, a cutting-edge technology company specializing in:

- 🌐 **Web Applications** - Modern, scalable web solutions
- 📱 **Mobile Development** - iOS and Android applications
- 🎮 **3D & Gaming** - Interactive 3D experiences
- 🤖 **AI Integration** - Smart, automated solutions
- ☁️ **Cloud Services** - Scalable infrastructure

### 👨‍💻 **Created by Colin Nebula**
Lead Developer and Founder of Nebula Media3D, passionate about creating technology that connects people and makes communication accessible to everyone, everywhere.

---

<div align="center">

**⭐ Star this repository if Quibish helped you connect with someone special! ⭐**

**Made with ❤️ by [Nebula Media3D](https://nebulamedia3d.com) | © 2025 Colin Nebula**

*Connecting the world, one conversation at a time* 🌍

</div>
