import { apiClient } from '../lib/api';

export interface PasswordStrengthResult {
  isStrong: boolean;
  score: number; // 0-4 scale
  feedback: string[];
  suggestions: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSymbols: boolean;
    noSequential: boolean;
    noCommonPatterns: boolean;
  };
}

class PasswordService {
  // Client-side password strength validation
  validatePasswordStrength(password: string): PasswordStrengthResult {
    const feedback: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Check requirements
    const requirements = {
      minLength: password.length >= 12,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSymbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noSequential: !this.hasSequentialChars(password),
      noCommonPatterns: !this.hasCommonPatterns(password),
    };

    // Calculate score
    if (requirements.minLength) score++;
    if (requirements.hasUppercase) score++;
    if (requirements.hasLowercase) score++;
    if (requirements.hasNumbers) score++;
    if (requirements.hasSymbols) score++;
    if (requirements.noSequential && requirements.noCommonPatterns) score++;

    // Provide feedback
    if (!requirements.minLength) {
      feedback.push('Password should be at least 12 characters long');
      suggestions.push('Add more characters to make it stronger');
    }

    if (!requirements.hasUppercase) {
      feedback.push('Add uppercase letters');
      suggestions.push('Include at least one uppercase letter (A-Z)');
    }

    if (!requirements.hasLowercase) {
      feedback.push('Add lowercase letters');
      suggestions.push('Include at least one lowercase letter (a-z)');
    }

    if (!requirements.hasNumbers) {
      feedback.push('Add numbers');
      suggestions.push('Include at least one number (0-9)');
    }

    if (!requirements.hasSymbols) {
      feedback.push('Add symbols');
      suggestions.push('Include at least one special character (!@#$%^&*())');
    }

    if (!requirements.noSequential) {
      feedback.push('Avoid sequential characters');
      suggestions.push('Don\'t use sequences like "123" or "abc"');
    }

    if (!requirements.noCommonPatterns) {
      feedback.push('Avoid common patterns');
      suggestions.push('Avoid patterns like "qwerty" or "password"');
    }

    return {
      isStrong: score >= 4,
      score,
      feedback,
      suggestions,
      requirements,
    };
  }

  // Check for sequential characters
  private hasSequentialChars(password: string): boolean {
    const sequences = ['abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '0123456789'];
    const lowerPassword = password.toLowerCase();

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const substr = sequence.substring(i, i + 3);
        if (lowerPassword.includes(substr) || lowerPassword.includes(substr.split('').reverse().join(''))) {
          return true;
        }
      }
    }
    return false;
  }

  // Check for common patterns
  private hasCommonPatterns(password: string): boolean {
    const commonPatterns = [
      'password', '123456', '123456789', 'qwerty', 'abc123', 'letmein', 'welcome',
      'admin', 'iloveyou', 'monkey', 'dragon', 'master', 'hello', 'freedom',
      'whatever', 'qazwsx', 'trustno1', 'password1', 'p@ssw0rd'
    ];
    
    const lowerPassword = password.toLowerCase();
    return commonPatterns.some(pattern => lowerPassword.includes(pattern));
  }

  // Generate a strong password
  generateStrongPassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    let password = '';

    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // Server-side password validation (for additional security)
  async validatePasswordOnServer(password: string): Promise<PasswordStrengthResult> {
    try {
      const response = await apiClient.validatePasswordStrength(password);
      if (response.error) {
        // Fallback to client-side validation
        return this.validatePasswordStrength(password);
      }
      
      const serverResult = response.data!;
      // Merge server result with client-side requirements check
      const clientRequirements = this.validatePasswordStrength(password).requirements;
      
      return {
        ...serverResult,
        requirements: clientRequirements,
      };
    } catch (error) {
      // Fallback to client-side validation
      return this.validatePasswordStrength(password);
    }
  }

  // Check password history (to prevent reusing recent passwords)
  async checkPasswordHistory(newPassword: string, userId: string): Promise<{
    isAllowed: boolean;
    reason?: string;
  }> {
    try {
      // This would typically call an API endpoint to check password history
      // For now, we'll just do client-side checks
      const recentPasswords = this.getRecentPasswords(userId);
      
      for (const oldPassword of recentPasswords) {
        if (newPassword === oldPassword) {
          return {
            isAllowed: false,
            reason: 'Cannot use a password you\'ve used recently'
          };
        }
      }

      return { isAllowed: true };
    } catch (error) {
      return { isAllowed: true }; // Allow if check fails
    }
  }

  // Get recent passwords from localStorage (for demo purposes)
  private getRecentPasswords(userId: string): string[] {
    try {
      const history = localStorage.getItem(`password_history_${userId}`);
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }

  // Save password to history
  savePasswordToHistory(password: string, userId: string): void {
    try {
      const history = this.getRecentPasswords(userId);
      history.unshift(password);
      
      // Keep only last 5 passwords
      const trimmedHistory = history.slice(0, 5);
      
      localStorage.setItem(`password_history_${userId}`, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.warn('Failed to save password history:', error);
    }
  }
}

export const passwordService = new PasswordService();