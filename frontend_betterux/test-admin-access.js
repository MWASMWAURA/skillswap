// Test script to simulate admin user for testing role-based access
// Run this in the browser console to test admin functionality

// Function to set admin user in localStorage
function setAdminUser() {
  const adminUser = {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@skillswap.com',
    role: 'admin',
    permissions: [
      'profile:read', 'profile:update', 'profile:delete',
      'skills:create', 'skills:read', 'skills:update:any', 'skills:delete',
      'exchanges:create', 'exchanges:read', 'exchanges:update:any', 'exchanges:delete',
      'messages:create', 'messages:read', 'messages:moderate', 'messages:delete',
      'users:read', 'users:update', 'users:delete', 'users:ban', 'users:role',
      'reports:read', 'reports:update', 'reports:delete',
      'system:settings', 'system:logs', 'system:backup'
    ]
  };
  
  // Set in localStorage for RoleBasedAccess component
  localStorage.setItem('currentUser', JSON.stringify(adminUser));
  
  // Also set a fake auth token
  localStorage.setItem('authToken', 'fake-admin-token');
  
  console.log('Admin user set in localStorage:', adminUser);
  console.log('You can now test admin features by refreshing the page');
  
  return adminUser;
}

// Function to set regular user for testing access denial
function setRegularUser() {
  const regularUser = {
    id: 'user-123',
    name: 'Regular User',
    email: 'user@skillswap.com',
    role: 'user',
    permissions: [
      'profile:read', 'profile:update',
      'skills:create', 'skills:read', 'skills:update:own',
      'exchanges:create', 'exchanges:read', 'exchanges:update:own',
      'messages:create', 'messages:read'
    ]
  };
  
  localStorage.setItem('currentUser', JSON.stringify(regularUser));
  localStorage.setItem('authToken', 'fake-user-token');
  
  console.log('Regular user set in localStorage:', regularUser);
  console.log('You can now test access denial by refreshing the page');
  
  return regularUser;
}

// Function to clear user data
function clearUser() {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('authToken');
  console.log('User data cleared from localStorage');
}

// Export functions for easy access
window.testAdminAccess = {
  setAdminUser,
  setRegularUser,
  clearUser
};

console.log(' Use:Test functions loaded.');
console.log('- testAdminAccess.setAdminUser() to test admin access');
console.log('- testAdminAccess.setRegularUser() to test access denial');
console.log('- testAdminAccess.clearUser() to clear user data');