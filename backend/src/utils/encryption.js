const crypto = require('crypto');
const { createCipheriv, createDecipheriv, randomBytes } = crypto;

/**
 * Message encryption utilities for SkillSwap
 * Uses AES-256-GCM for secure message encryption
 */

class MessageEncryption {
  constructor() {
    // In production, you would get this from environment variables
    // For demo purposes, we'll generate a secure key
    this.encryptionKey = process.env.MESSAGE_ENCRYPTION_KEY || 
      crypto.scryptSync('SkillSwap-Secret-Key-2024', 'salt', 32);
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encrypt message text
   * @param {string} text - Plain text message
   * @param {string} userId - User ID for additional data
   * @param {string} exchangeId - Exchange ID for additional data
   * @returns {Object} Encrypted message data
   */
  encryptMessage(text, userId, exchangeId) {
    try {
      // Create a unique initialization vector for each message
      const iv = randomBytes(16);
      
      // Create cipher
      const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      // Add additional authenticated data for extra security
      const additionalData = Buffer.from(`${userId}:${exchangeId}`, 'utf8');
      
      // Encrypt the message
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag();
      
      return {
        encryptedMessage: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt message text
   * @param {Object} encryptedData - Encrypted message data
   * @param {string} userId - User ID for additional data validation
   * @param {string} exchangeId - Exchange ID for additional data validation
   * @returns {string} Decrypted message
   */
  decryptMessage(encryptedData, userId, exchangeId) {
    try {
      const { encryptedMessage, iv, authTag } = encryptedData;
      
      // Validate required fields
      if (!encryptedMessage || !iv || !authTag) {
        throw new Error('Invalid encrypted data structure');
      }
      
      // Create decipher
      const decipher = createDecipheriv(
        this.algorithm, 
        this.encryptionKey, 
        Buffer.from(iv, 'hex')
      );
      
      // Set the authentication tag
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      // Additional authenticated data for validation
      const additionalData = Buffer.from(`${userId}:${exchangeId}`, 'utf8');
      
      // Decrypt the message
      let decrypted = decipher.update(encryptedMessage, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Generate a secure hash for message integrity
   * @param {string} message - Message content
   * @param {string} userId - User ID
   * @param {string} timestamp - Message timestamp
   * @returns {string} Message hash
   */
  generateMessageHash(message, userId, timestamp) {
    return crypto
      .createHash('sha256')
      .update(`${message}:${userId}:${timestamp}`)
      .digest('hex');
  }

  /**
   * Validate message integrity
   * @param {string} message - Decrypted message
   * @param {string} userId - User ID
   * @param {string} timestamp - Message timestamp
   * @param {string} hash - Stored hash
   * @returns {boolean} Is valid
   */
  validateMessageIntegrity(message, userId, timestamp, hash) {
    const calculatedHash = this.generateMessageHash(message, userId, timestamp);
    return calculatedHash === hash;
  }

  /**
   * Encrypt file attachment metadata
   * @param {Object} fileMetadata - File metadata object
   * @param {string} userId - User ID
   * @returns {Object} Encrypted metadata
   */
  encryptFileMetadata(fileMetadata, userId) {
    try {
      const metadataString = JSON.stringify(fileMetadata);
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      let encrypted = cipher.update(metadataString, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encryptedMetadata: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        filenameHash: crypto.createHash('sha256').update(fileMetadata.originalName).digest('hex')
      };
    } catch (error) {
      console.error('File metadata encryption error:', error);
      throw new Error('Failed to encrypt file metadata');
    }
  }

  /**
   * Decrypt file attachment metadata
   * @param {Object} encryptedMetadata - Encrypted metadata object
   * @param {string} userId - User ID
   * @returns {Object} Decrypted metadata
   */
  decryptFileMetadata(encryptedMetadata, userId) {
    try {
      const { encryptedMetadata: encrypted, iv, authTag } = encryptedMetadata;
      
      const decipher = createDecipheriv(
        this.algorithm, 
        this.encryptionKey, 
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('File metadata decryption error:', error);
      throw new Error('Failed to decrypt file metadata');
    }
  }
}

// Create singleton instance
const messageEncryption = new MessageEncryption();

module.exports = messageEncryption;