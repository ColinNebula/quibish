const fs = require('fs').promises;
const path = require('path');

class FileStorage {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.messagesFile = path.join(this.dataDir, 'messages.json');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Initialize files if they don't exist
      try {
        await fs.access(this.messagesFile);
      } catch {
        await fs.writeFile(this.messagesFile, JSON.stringify([]));
      }

      try {
        await fs.access(this.usersFile);
      } catch {
        // Seed default users
        const bcrypt = require('bcryptjs');
        const defaultUsers = [
          {
            id: '1',
            username: 'demo',
            email: 'demo@quibish.com',
            password: bcrypt.hashSync('demo', 10),
            name: 'Demo User',
            avatar: null,
            status: 'online',
            role: 'user',
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            username: 'john',
            email: 'john@example.com',
            password: bcrypt.hashSync('password', 10),
            name: 'John Doe',
            avatar: null,
            status: 'online',
            role: 'user',
            createdAt: new Date().toISOString()
          }
        ];
        await fs.writeFile(this.usersFile, JSON.stringify(defaultUsers, null, 2));
      }
    } catch (error) {
      console.error('FileStorage init error:', error);
    }
  }

  async getMessages() {
    try {
      const data = await fs.readFile(this.messagesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading messages:', error);
      return [];
    }
  }

  async saveMessages(messages) {
    try {
      await fs.writeFile(this.messagesFile, JSON.stringify(messages, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving messages:', error);
      return false;
    }
  }

  async addMessage(message) {
    try {
      const messages = await this.getMessages();
      message.id = Date.now().toString();
      message.timestamp = new Date().toISOString();
      messages.push(message);
      await this.saveMessages(messages);
      return message;
    } catch (error) {
      console.error('Error adding message:', error);
      return null;
    }
  }

  async getUsers() {
    try {
      const data = await fs.readFile(this.usersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading users:', error);
      return [];
    }
  }

  async saveUsers(users) {
    try {
      await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving users:', error);
      return false;
    }
  }

  async findUserByEmail(email) {
    const users = await this.getUsers();
    return users.find(user => user.email === email);
  }

  async findUserById(id) {
    const users = await this.getUsers();
    return users.find(user => user.id === id);
  }
}

module.exports = new FileStorage();