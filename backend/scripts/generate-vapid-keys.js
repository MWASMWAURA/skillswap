#!/usr/bin/env node

/**
 * VAPID Key Generator for SkillSwap Push Notifications
 * 
 * Run this script to generate VAPID keys for web push notifications:
 * node scripts/generate-vapid-keys.js
 * 
 * Then add the generated keys to your .env file:
 * VAPID_PUBLIC_KEY=<public_key>
 * VAPID_PRIVATE_KEY=<private_key>
 * VAPID_SUBJECT=mailto:admin@skillswap.com
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating VAPID keys for SkillSwap Push Notifications...\n');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID Keys Generated Successfully!\n');
console.log('━'.repeat(60));
console.log('\n📋 Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@skillswap.com`);
console.log('\n' + '━'.repeat(60));

// Also add to frontend .env
console.log('\n📋 Add this to your frontend .env file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log('\n' + '━'.repeat(60));

// Option to automatically append to .env files
const args = process.argv.slice(2);
if (args.includes('--write') || args.includes('-w')) {
  const backendEnvPath = path.join(__dirname, '..', '.env');
  const frontendEnvPath = path.join(__dirname, '..', '..', 'frontend', '.env.local');

  // Append to backend .env
  try {
    const backendEnvContent = `
# VAPID Keys for Push Notifications (Generated ${new Date().toISOString()})
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_SUBJECT=mailto:admin@skillswap.com
`;
    
    if (fs.existsSync(backendEnvPath)) {
      fs.appendFileSync(backendEnvPath, backendEnvContent);
      console.log('\n✅ Added VAPID keys to backend/.env');
    } else {
      fs.writeFileSync(backendEnvPath, backendEnvContent);
      console.log('\n✅ Created backend/.env with VAPID keys');
    }
  } catch (error) {
    console.error('\n❌ Failed to write to backend/.env:', error.message);
  }

  // Append to frontend .env.local
  try {
    const frontendEnvContent = `
# VAPID Public Key for Push Notifications (Generated ${new Date().toISOString()})
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
`;
    
    if (fs.existsSync(frontendEnvPath)) {
      fs.appendFileSync(frontendEnvPath, frontendEnvContent);
      console.log('✅ Added VAPID public key to frontend/.env.local');
    } else {
      fs.writeFileSync(frontendEnvPath, frontendEnvContent);
      console.log('✅ Created frontend/.env.local with VAPID public key');
    }
  } catch (error) {
    console.error('❌ Failed to write to frontend/.env.local:', error.message);
  }
}

console.log('\n📖 Usage:');
console.log('  node scripts/generate-vapid-keys.js        # Display keys only');
console.log('  node scripts/generate-vapid-keys.js -w     # Write keys to .env files');
console.log('\n🔒 Keep your VAPID_PRIVATE_KEY secret and never commit it to version control!');
console.log('\n');
