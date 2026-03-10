/**
 * Authentication Service for Nyaya AI
 * Simple localStorage-based authentication for demo purposes
 */

const AUTH_KEY = 'nyaya_ai_auth';
const USER_KEY = 'nyaya_ai_user';

// Demo users for testing
const DEMO_USERS = [
  { email: 'demo@nyaya.ai', password: 'demo123', name: 'Demo User', role: 'admin' },
  { email: 'officer@nyaya.ai', password: 'officer123', name: 'Police Officer', role: 'officer' },
  { email: 'analyst@nyaya.ai', password: 'analyst123', name: 'Legal Analyst', role: 'analyst' },
];

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  const auth = localStorage.getItem(AUTH_KEY);
  return auth === 'true';
}

/**
 * Get current user info
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Login user
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function login(email, password) {
  try {
    const response = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    if (response.ok && data.success) {
      localStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.detail || 'Invalid email or password' };
    }
  } catch (error) {
    return { success: false, error: 'Connection to server failed.' };
  }
}

/**
 * Register new user
 * @param {string} name 
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function register(name, email, password) {
  try {
    // Validate inputs
    if (!name || name.length < 2) {
      return { success: false, error: 'Name must be at least 2 characters' };
    }
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid email' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    
    const response = await fetch('http://localhost:8000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    
    const data = await response.json();
    if (response.ok && data.success) {
      localStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.detail || 'Registration failed' };
    }
  } catch (error) {
    return { success: false, error: 'Connection to server failed.' };
  }
}

/**
 * Logout user
 */
export function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Get registered users from localStorage
 */
function getRegisteredUsers() {
  const usersStr = localStorage.getItem('nyaya_registered_users');
  if (usersStr) {
    try {
      return JSON.parse(usersStr);
    } catch {
      return [];
    }
  }
  return [];
}

export default {
  isAuthenticated,
  getCurrentUser,
  login,
  register,
  logout,
};
