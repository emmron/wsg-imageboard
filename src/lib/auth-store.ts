import { atom } from 'nanostores';
import { supabase, type Profile } from './supabase';
import {
  isLocalMode,
  getLocalCurrentUser,
  localSignUp,
  localSignIn,
  localSignOut,
  localUpdateProfile,
  initializeDemoData,
} from './local-auth';

export const currentUser = atom<any | null>(null);
export const currentProfile = atom<Profile | null>(null);
export const isAuthenticated = atom<boolean>(false);

// Initialize based on mode
if (isLocalMode) {
  console.log('🔧 Running in LOCAL MODE (no Supabase required)');
  console.log('✅ You can sign up and test immediately!');
  console.log('📝 Data is stored in browser localStorage');

  // Initialize demo data
  initializeDemoData();

  // Load local user if exists
  const localUser = getLocalCurrentUser();
  if (localUser) {
    currentUser.set(localUser);
    currentProfile.set(localUser as any);
    isAuthenticated.set(true);
    console.log('✅ Auto-logged in as:', localUser.email);
  }
} else {
  // Supabase mode - Initialize auth state
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      currentUser.set(session.user);
      isAuthenticated.set(true);
      loadProfile(session.user.id);
    }
  });

  // Listen for auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      currentUser.set(session.user);
      isAuthenticated.set(true);
      await loadProfile(session.user.id);
    } else {
      currentUser.set(null);
      currentProfile.set(null);
      isAuthenticated.set(false);
    }
  });
}

async function loadProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    currentProfile.set(data);
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

export async function signUp(email: string, password: string, username: string, displayName: string) {
  if (isLocalMode) {
    const user = await localSignUp(email, password, username, displayName);
    currentUser.set(user);
    currentProfile.set(user as any);
    isAuthenticated.set(true);
    return { user };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  if (isLocalMode) {
    const user = await localSignIn(email, password);
    currentUser.set(user);
    currentProfile.set(user as any);
    isAuthenticated.set(true);
    return { user };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  if (isLocalMode) {
    await localSignOut();
    currentUser.set(null);
    currentProfile.set(null);
    isAuthenticated.set(false);
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signInWithOAuth(provider: 'apple' | 'google' | 'github') {
  if (isLocalMode) {
    throw new Error('OAuth is not available in local mode. Please configure Supabase to use OAuth.');
  }

  const redirectTo = `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      scopes: provider === 'google' ? 'email profile' : undefined,
    },
  });

  if (error) throw error;
  return data;
}

export async function signInWithApple() {
  return signInWithOAuth('apple');
}

export async function signInWithGoogle() {
  return signInWithOAuth('google');
}

export async function updateProfile(updates: Partial<Profile>) {
  if (isLocalMode) {
    const updatedUser = await localUpdateProfile(updates);
    currentUser.set(updatedUser);
    currentProfile.set(updatedUser as any);
    return updatedUser;
  }

  const user = currentUser.get();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  currentProfile.set(data);
  return data;
}
