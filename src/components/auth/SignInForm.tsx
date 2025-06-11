
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, Eye, EyeOff, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SignInForm = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [showResendOption, setShowResendOption] = useState(false);
  const { signInWithEmailOrUsername } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleResendConfirmation = async () => {
    if (!emailOrUsername) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }

    // For resending confirmation, we need an email. If they entered a username, we can't resend.
    const isEmail = emailOrUsername.includes('@');
    if (!isEmail) {
      toast({
        title: "Email required for resend",
        description: "Please enter your email address to resend confirmation.",
        variant: "destructive",
      });
      return;
    }

    setResendingConfirmation(true);
    console.log('Resending confirmation email to:', emailOrUsername);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: emailOrUsername.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (error) {
      console.error('Resend confirmation error:', error);
      toast({
        title: "Failed to resend",
        description: "Could not resend confirmation email. Please try again.",
        variant: "destructive",
      });
    } else {
      console.log('Confirmation email resent successfully');
      toast({
        title: "Email sent!",
        description: "Please check your email for the confirmation link.",
      });
    }

    setResendingConfirmation(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResendOption(false);

    console.log('Attempting sign in with email or username:', emailOrUsername);
    
    const { error } = await signInWithEmailOrUsername({ emailOrUsername: emailOrUsername.trim(), password });

    if (error) {
      console.error('Sign in error:', error);
      
      let errorMessage = "Sign in failed. Please check your credentials.";
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = "Invalid email/username or password. Please check your credentials and try again.";
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = "Please check your email and click the confirmation link before signing in.";
        setShowResendOption(true);
      } else if (error.message.includes('Too many requests')) {
        errorMessage = "Too many attempts. Please wait a moment before trying again.";
      }
      
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      console.log('Sign in successful');
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      navigate('/');
    }

    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <LogIn className="h-5 w-5" />
          <span>Sign In</span>
        </CardTitle>
        <CardDescription>
          Enter your email or username and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailOrUsername">Email or Username</Label>
            <Input
              id="emailOrUsername"
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="Enter your email or username"
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {showResendOption && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    Email confirmation required
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Didn't receive the confirmation email?
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={handleResendConfirmation}
                    disabled={resendingConfirmation}
                  >
                    {resendingConfirmation ? "Sending..." : "Resend confirmation email"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SignInForm;
