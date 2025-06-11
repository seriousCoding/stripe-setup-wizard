
import { supabase } from '@/integrations/supabase/client';
import { SignUpData, SignInData, SignInWithEmailOrUsernameData } from '@/types/auth';

export const handleSignUp = async (data: SignUpData) => {
  console.log('Signing up with data:', data);
  const redirectUrl = `${window.location.origin}/`;
  
  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        company_name: data.companyName || null,
        phone: data.phone,
        country: data.country,
        username: data.username || null,
      },
    },
  });
  
  if (error) {
    console.error('Sign up error:', error);
  } else {
    console.log('Sign up successful - check email for confirmation');
  }
  
  return { error };
};

export const handleSignIn = async (data: SignInData) => {
  console.log('Signing in with email:', data.email);
  
  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });
  
  if (error) {
    console.error('Sign in error:', error);
  } else {
    console.log('Sign in successful');
  }
  
  return { error };
};

export const handleSignInWithEmailOrUsername = async (data: SignInWithEmailOrUsernameData) => {
  console.log('Signing in with email or username:', data.emailOrUsername);
  
  const isEmail = data.emailOrUsername.includes('@');
  
  if (isEmail) {
    // If it's an email, use regular email sign in
    console.log('Signing in with email:', data.emailOrUsername);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: data.emailOrUsername,
      password: data.password,
    });
    
    if (error) {
      console.error('Sign in error:', error);
      return { error };
    } else {
      console.log('Sign in successful');
      return { error: null };
    }
  } else {
    // If it's a username, we need to look up the email first
    console.log('Looking up email for username:', data.emailOrUsername);
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', data.emailOrUsername)
      .single();
    
    if (profileError || !profileData) {
      console.error('Username not found:', profileError);
      const customError = { message: 'Invalid login credentials' };
      return { error: customError };
    }
    
    console.log('Found email for username:', profileData.email);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: profileData.email,
      password: data.password,
    });
    
    if (error) {
      console.error('Sign in error:', error);
      return { error };
    } else {
      console.log('Sign in successful');
      return { error: null };
    }
  }
};

export const handleSignOut = async () => {
  console.log('Signing out');
  const { error } = await supabase.auth.signOut();
  return { error };
};
