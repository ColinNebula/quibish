// Enhanced file storage management
const fs = require('fs').promises;
const path = require('path');

class EnhancedFileStorage {
  constructor(baseDir = 'uploads') {
    this.baseDir = baseDir;
  }

  async saveFile(filePath, data) {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(fullPath, data);
      return fullPath;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  async readFile(filePath) {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      return await fs.readFile(fullPath);
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  async deleteFile(filePath) {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  async fileExists(filePath) {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(directory = '') {
    try {
      const fullPath = path.join(this.baseDir, directory);
      return await fs.readdir(fullPath);
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }
}

module.exports = { EnhancedFileStorage };
