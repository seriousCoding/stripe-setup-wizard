
import { createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (data: any) => Promise<{ error: any }>;
  signIn: (data: any) => Promise<{ error: any }>;
  signInWithEmailOrUsername: (data: any) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  fetchProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
