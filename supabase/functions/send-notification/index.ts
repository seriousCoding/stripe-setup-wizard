
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notification: EmailNotification = await req.json();
    
    // Get SMTP configuration from Supabase secrets
    const smtpConfig = {
      hostname: Deno.env.get("SMTP_HOST") || "mail.firsttolaunch.com",
      port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
      username: Deno.env.get("SMTP_USER") || "admin@firsttolaunch.com",
      password: Deno.env.get("SMTP_PASS"),
    };

    console.log("Using SMTP Config:", { 
      hostname: smtpConfig.hostname, 
      port: smtpConfig.port, 
      username: smtpConfig.username
    });

    if (!smtpConfig.password) {
      throw new Error("SMTP password not configured in Supabase secrets");
    }

    // Create enhanced email content
    const emailContent = createEmailContent(notification);

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtpConfig.hostname,
        port: smtpConfig.port,
        tls: true,
        auth: {
          username: smtpConfig.username,
          password: smtpConfig.password,
        },
      },
    });

    // Send email
    await client.send({
      from: `"Stripe Setup Pilot" <${smtpConfig.username}>`,
      to: notification.to,
      subject: notification.subject,
      content: emailContent,
      html: emailContent,
    });

    await client.close();

    console.log("Email sent successfully to:", notification.to);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email sent successfully" 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
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
    .alert { padding: 15px; margin: 15px 0; border-radius: 4px; }
    .alert-billing { background: #e3f2fd; border-left: 4px solid #2196f3; color: #1565c0; }
    .alert-maintenance { background: #fff3e0; border-left: 4px solid #ff9800; color: #e65100; }
    .alert-general { background: #f3e5f5; border-left: 4px solid #9c27b0; color: #6a1b9a; }
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
              <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; font-size: 12px;">${JSON.stringify(notification.metadata, null, 2)}</pre>
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

serve(handler);
