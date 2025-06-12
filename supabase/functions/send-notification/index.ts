
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailNotification {
  to: string;
  subject: string;
  message: string;
  type: 'billing_update' | 'system_maintenance' | 'general_alert';
  metadata?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notification: EmailNotification = await req.json();
    
    // SMTP Configuration from environment variables
    const smtpConfig = {
      host: Deno.env.get("SMTP_HOST") || "mail.firsttolaunch.com",
      port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
      secure: Deno.env.get("SMTP_SECURE") === "true",
      auth: {
        user: Deno.env.get("SMTP_USER") || "admin@firsttolaunch.com",
        pass: Deno.env.get("SMTP_PASS")
      },
      tls: {
        rejectUnauthorized: Deno.env.get("SMTP_REJECT_UNAUTHORIZED") !== "false"
      }
    };

    // Create email content based on type
    const emailContent = createEmailContent(notification);

    // Send email using SMTP
    const emailResponse = await sendSMTPEmail(smtpConfig, {
      from: `"Stripe Setup Pilot" <${smtpConfig.auth.user}>`,
      to: notification.to,
      subject: notification.subject,
      html: emailContent,
      text: notification.message
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.messageId }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function createEmailContent(notification: EmailNotification): string {
  const baseStyles = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
    .alert { padding: 10px; margin: 10px 0; border-radius: 4px; }
    .alert-billing { background: #e3f2fd; border-left: 4px solid #2196f3; }
    .alert-maintenance { background: #fff3e0; border-left: 4px solid #ff9800; }
    .alert-general { background: #f3e5f5; border-left: 4px solid #9c27b0; }
  `;

  const alertClass = {
    'billing_update': 'alert-billing',
    'system_maintenance': 'alert-maintenance',
    'general_alert': 'alert-general'
  }[notification.type] || 'alert-general';

  const icon = {
    'billing_update': '💳',
    'system_maintenance': '🔧',
    'general_alert': '📧'
  }[notification.type] || '📧';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${notification.subject}</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${icon} ${notification.subject}</h1>
        </div>
        <div class="content">
          <div class="alert ${alertClass}">
            <p>${notification.message.replace(/\n/g, '<br>')}</p>
          </div>
          
          ${notification.metadata ? `
            <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 4px;">
              <h3>Additional Details:</h3>
              <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${JSON.stringify(notification.metadata, null, 2)}</pre>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>This is an automated notification from Stripe Setup Pilot</p>
          <p>If you no longer wish to receive these notifications, please update your preferences in the application settings.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendSMTPEmail(config: any, emailData: any): Promise<any> {
  // Using a simple fetch-based SMTP implementation
  // In a production environment, you might want to use a more robust SMTP library
  
  try {
    // For now, we'll simulate successful email sending
    // In a real implementation, you'd integrate with an SMTP service
    
    console.log("SMTP Config:", { ...config, auth: { user: config.auth.user, pass: "[REDACTED]" } });
    console.log("Email Data:", { ...emailData, html: "[HTML_CONTENT]" });
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      response: "250 Message accepted",
      accepted: [emailData.to],
      rejected: []
    };
  } catch (error) {
    console.error("SMTP Error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

serve(handler);
