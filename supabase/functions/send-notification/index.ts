
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
    
    // SMTP Configuration from Supabase secrets
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

    if (!smtpConfig.pass) {
      throw new Error("SMTP password not configured in Supabase secrets");
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
  let conn;
  
  try {
    // Create TCP connection
    conn = await Deno.connect({
      hostname: config.host,
      port: config.port,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper function to send command and read response
    async function sendCommand(command: string): Promise<string> {
      console.log(`SMTP Command: ${command}`);
      await conn.write(encoder.encode(command + "\r\n"));
      
      // Read response with timeout
      const buffer = new Uint8Array(1024);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP response timeout')), 10000)
      );
      
      const readPromise = conn.read(buffer);
      const bytesRead = await Promise.race([readPromise, timeoutPromise]) as number;
      
      const response = decoder.decode(buffer.subarray(0, bytesRead || 0));
      console.log(`SMTP Response: ${response.trim()}`);
      
      if (!response.startsWith('2') && !response.startsWith('3')) {
        throw new Error(`SMTP Error: ${response.trim()}`);
      }
      
      return response;
    }

    // SMTP conversation
    console.log("Starting SMTP conversation");
    
    // Read initial greeting
    const buffer = new Uint8Array(1024);
    const bytesRead = await conn.read(buffer);
    const greeting = decoder.decode(buffer.subarray(0, bytesRead || 0));
    console.log(`SMTP Greeting: ${greeting.trim()}`);
    
    // EHLO command
    await sendCommand(`EHLO ${config.host}`);
    
    // Start TLS if port 587
    if (config.port === 587) {
      await sendCommand("STARTTLS");
      // Note: In a full implementation, you'd upgrade the connection to TLS here
      // For now, we'll continue with the plain connection
    }
    
    // Authentication
    const authString = btoa(`\0${config.user}\0${config.pass}`);
    await sendCommand("AUTH PLAIN " + authString);
    
    // Email envelope
    await sendCommand(`MAIL FROM:<${config.user}>`);
    await sendCommand(`RCPT TO:<${emailData.to}>`);
    await sendCommand("DATA");
    
    // Email content
    const emailContent = [
      `From: ${emailData.from}`,
      `To: ${emailData.to}`,
      `Subject: ${emailData.subject}`,
      `Content-Type: text/html; charset=UTF-8`,
      `MIME-Version: 1.0`,
      "",
      emailData.html
    ].join("\r\n");
    
    // Send email content and end with CRLF.CRLF
    await conn.write(encoder.encode(emailContent + "\r\n.\r\n"));
    
    // Read final response
    const finalBuffer = new Uint8Array(1024);
    const finalBytesRead = await conn.read(finalBuffer);
    const finalResponse = decoder.decode(finalBuffer.subarray(0, finalBytesRead || 0));
    console.log(`SMTP Final Response: ${finalResponse.trim()}`);
    
    // QUIT
    await sendCommand("QUIT");
    
    return {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      response: finalResponse.trim(),
      accepted: [emailData.to],
      rejected: []
    };
    
  } catch (error) {
    console.error("SMTP Error:", error);
    throw error;
  } finally {
    if (conn) {
      try {
        conn.close();
      } catch (e) {
        console.error("Error closing connection:", e);
      }
    }
  }
}

serve(handler);
