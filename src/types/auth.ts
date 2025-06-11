
export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string | null; // Made optional
  phone: string;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string; // Can be empty string for optional
  phone: string;
  country: string;
}

export interface SignInData {
  email: string;
  password: string;
}
