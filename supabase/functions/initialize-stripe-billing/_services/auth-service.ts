
import { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logStep } from "../../_shared/logger.ts"; // Corrected path

export async function authenticateUser(req: Request, supabaseClient: SupabaseClient): Promise<User> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Authorization header missing');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: authUserData, error: authError } = await supabaseClient.auth.getUser(token);

  if (authError || !authUserData.user) {
    logStep("Auth error", { error: authError });
    throw new Error('User not authenticated');
  }

  logStep("User authenticated", { email: authUserData.user.email });
  return authUserData.user;
}

