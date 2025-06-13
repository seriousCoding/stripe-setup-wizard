
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailNotification {
  to: string;
  subject: string;
  message: string;
  type: 'billing_update' | 'system_maintenance' | 'general_alert';
  metadata?: Record<string, any>;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-NOTIFICATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const notification: EmailNotification = await req.json();
    
    if (!notification.to || !notification.subject || !notification.message) {
      throw new Error('Missing required email fields');
    }

    logStep("Email notification request received", {
      to: notification.to,
      subject: notification.subject,
      type: notification.type
    });

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    logStep("Using Resend email service");
    
    const resend = new Resend(resendApiKey);
    
    const emailResponse = await resend.emails.send({
      from: "Stripe Setup Pilot <noreply@yourdomain.com>",
      to: [notification.to],
      subject: notification.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${notification.subject}</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="white-space: pre-line; color: #555;">${notification.message}</p>
          </div>
          <p style="color: #888; font-size: 12px;">
            This email was sent from your Stripe Setup Pilot application.
          </p>
        </div>
      `,
    });

    logStep("Email sent successfully", { messageId: emailResponse.data?.id });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email notification sent successfully',
        messageId: emailResponse.data?.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("ERROR in send-notification", { message: error.message });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
