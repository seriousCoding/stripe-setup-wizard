
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
      user: Deno.env.get("SMTP_USER") || "admin@firsttolaunch.com",
      pass: Deno.env.get("SMTP_PASS"),
      rejectUnauthorized: Deno.env.get("SMTP_REJECT_UNAUTHORIZED") !== "false"
    };

    console.log("SMTP Config:", { 
      host: smtpConfig.host, 
      port: smtpConfig.port, 
      user: smtpConfig.user,
      secure: smtpConfig.secure
    });

    // Validate required SMTP credentials
    if (!smtpConfig.pass) {
      throw new Error("SMTP password not configured");
    }

    // Create email content based on type
    const emailContent = createEmailContent(notification);

    // Send email using improved SMTP implementation
    const emailResponse = await sendSMTPEmail(smtpConfig, {
      from: `"Stripe Setup Pilot" <${smtpConfig.user}>`,
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
  let conn: Deno.TcpConn | null = null;
  
  try {
    console.log(`Connecting to SMTP server: ${config.host}:${config.port}`);
    
    conn = await Deno.connect({
      hostname: config.host,
      port: config.port,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper function to send command and read response
    async function sendCommand(command: string): Promise<string> {
      if (!conn) throw new Error("Connection lost");
      
      console.log(`SMTP Command: ${command}`);
      await conn.write(encoder.encode(command + "\r\n"));
      
      const buffer = new Uint8Array(4096);
      const bytesRead = await conn.read(buffer);
      const response = decoder.decode(buffer.subarray(0, bytesRead || 0));
      console.log(`SMTP Response: ${response.trim()}`);
      
      return response;
    }

    // Wait for initial server response
    const initialResponse = await sendCommand("");
    if (!initialResponse.startsWith("220")) {
      throw new Error(`SMTP server not ready: ${initialResponse}`);
    }

    // SMTP conversation
    const ehloResponse = await sendCommand(`EHLO ${config.host}`);
    if (!ehloResponse.startsWith("250")) {
      throw new Error(`EHLO failed: ${ehloResponse}`);
    }
    
    // Start TLS if port 587
    if (config.port === 587) {
      const tlsResponse = await sendCommand("STARTTLS");
      if (!tlsResponse.startsWith("220")) {
        throw new Error(`STARTTLS failed: ${tlsResponse}`);
      }
    }
    
    // Authentication
    const authString = btoa(`\0${config.user}\0${config.pass}`);
    const authResponse = await sendCommand("AUTH PLAIN " + authString);
    if (!authResponse.startsWith("235")) {
      throw new Error(`Authentication failed: ${authResponse}`);
    }
    
    // Email commands
    const mailFromResponse = await sendCommand(`MAIL FROM:<${config.user}>`);
    if (!mailFromResponse.startsWith("250")) {
      throw new Error(`MAIL FROM failed: ${mailFromResponse}`);
    }
    
    const rcptToResponse = await sendCommand(`RCPT TO:<${emailData.to}>`);
    if (!rcptToResponse.startsWith("250")) {
      throw new Error(`RCPT TO failed: ${rcptToResponse}`);
    }
    
    const dataResponse = await sendCommand("DATA");
    if (!dataResponse.startsWith("354")) {
      throw new Error(`DATA command failed: ${dataResponse}`);
    }
    
    // Email content
    const emailContent = [
      `From: ${emailData.from}`,
      `To: ${emailData.to}`,
      `Subject: ${emailData.subject}`,
      `Content-Type: text/html; charset=UTF-8`,
      `MIME-Version: 1.0`,
      "",
      emailData.html,
      "."
    ].join("\r\n");
    
    const sendResponse = await sendCommand(emailContent);
    if (!sendResponse.startsWith("250")) {
      throw new Error(`Email send failed: ${sendResponse}`);
    }
    
    await sendCommand("QUIT");
    
    return {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      response: "250 Message accepted",
      accepted: [emailData.to],
      rejected: []
    };
  } catch (error: any) {
    console.error("SMTP Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    throw new Error(`SMTP send failed: ${error.message}`);
  } finally {
    if (conn) {
      try {
        conn.close();
      } catch (e) {
        console.warn("Error closing connection:", e);
      }
    }
  }
}

serve(handler);
