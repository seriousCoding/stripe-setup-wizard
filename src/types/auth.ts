
export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  phone: string;
  country: string;
  username?: string; // Added username field
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  country: string;
  username?: string; // Added username field
}

export interface SignInData {
  email: string;
  password: string;
}

export interface SignInWithEmailOrUsernameData {
  emailOrUsername: string;
  password: string;
}
