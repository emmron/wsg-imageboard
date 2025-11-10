// Local storage fallback for development without Supabase
// This allows the app to work immediately without any setup

interface LocalUser {
  id: string;
  email: string;
  password: string;
  username: string;
  display_name: string;
  is_creator: boolean;
  subscription_price: number;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  created_at: string;
}

const USERS_KEY = 'fanconnect_users';
const CURRENT_USER_KEY = 'fanconnect_current_user';

// Check if we're in local mode (Supabase not configured)
export const isLocalMode = !import.meta.env.PUBLIC_SUPABASE_URL ||
                           import.meta.env.PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co';

// Get all users from localStorage
function getLocalUsers(): LocalUser[] {
  if (typeof window === 'undefined') return [];
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : [];
}

// Save users to localStorage
function saveLocalUsers(users: LocalUser[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Get current user from localStorage
export function getLocalCurrentUser(): LocalUser | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
}

// Save current user to localStorage
function saveLocalCurrentUser(user: LocalUser | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

// Local sign up
export async function localSignUp(
  email: string,
  password: string,
  username: string,
  displayName: string
): Promise<LocalUser> {
  const users = getLocalUsers();

  // Check if user already exists
  if (users.find(u => u.email === email)) {
    throw new Error('User with this email already exists');
  }

  if (users.find(u => u.username === username)) {
    throw new Error('Username already taken');
  }

  // Create new user
  const newUser: LocalUser = {
    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email,
    password, // In real app, this should be hashed
    username,
    display_name: displayName,
    is_creator: false,
    subscription_price: 0,
    bio: null,
    avatar_url: null,
    cover_url: null,
    created_at: new Date().toISOString(),
  };

  // Save user
  users.push(newUser);
  saveLocalUsers(users);

  // Auto login
  saveLocalCurrentUser(newUser);

  console.log('✅ Local signup successful!', { email, username });

  return newUser;
}

// Local sign in
export async function localSignIn(email: string, password: string): Promise<LocalUser> {
  const users = getLocalUsers();

  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  saveLocalCurrentUser(user);

  console.log('✅ Local login successful!', { email });

  return user;
}

// Local sign out
export async function localSignOut() {
  saveLocalCurrentUser(null);
  console.log('✅ Logged out');
}

// Update local profile
export async function localUpdateProfile(updates: Partial<LocalUser>): Promise<LocalUser> {
  const currentUser = getLocalCurrentUser();
  if (!currentUser) throw new Error('Not authenticated');

  const users = getLocalUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);

  if (userIndex === -1) throw new Error('User not found');

  // Update user
  const updatedUser = { ...users[userIndex], ...updates };
  users[userIndex] = updatedUser;

  saveLocalUsers(users);
  saveLocalCurrentUser(updatedUser);

  console.log('✅ Profile updated', updates);

  return updatedUser;
}

// Get all creators (for explore page)
export function getLocalCreators(): LocalUser[] {
  return getLocalUsers().filter(u => u.is_creator);
}

// Get user by username
export function getLocalUserByUsername(username: string): LocalUser | null {
  return getLocalUsers().find(u => u.username === username) || null;
}

// Initialize with demo data if empty
export function initializeDemoData() {
  if (typeof window === 'undefined') return;

  const users = getLocalUsers();
  if (users.length === 0) {
    // Create demo creators
    const demoCreators: LocalUser[] = [
      {
        id: 'demo_1',
        email: 'creator1@demo.com',
        password: 'demo123',
        username: 'sarah_fitness',
        display_name: 'Sarah - Fitness Coach',
        is_creator: true,
        subscription_price: 9.99,
        bio: 'Professional fitness coach helping you reach your goals! 💪',
        avatar_url: null,
        cover_url: null,
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo_2',
        email: 'creator2@demo.com',
        password: 'demo123',
        username: 'mike_photography',
        display_name: 'Mike - Photographer',
        is_creator: true,
        subscription_price: 15.00,
        bio: 'Sharing exclusive photography tips and behind-the-scenes content 📸',
        avatar_url: null,
        cover_url: null,
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'demo_3',
        email: 'creator3@demo.com',
        password: 'demo123',
        username: 'chef_alex',
        display_name: 'Chef Alex',
        is_creator: true,
        subscription_price: 0,
        bio: 'Free cooking tutorials and recipes! 🍳',
        avatar_url: null,
        cover_url: null,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    saveLocalUsers(demoCreators);
    console.log('✅ Demo data initialized!');
  }
}
