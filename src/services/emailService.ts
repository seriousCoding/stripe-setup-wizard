
import { supabase } from '@/integrations/supabase/client';

export interface EmailNotification {
  to: string;
  subject: string;
  message: string;
  type: 'billing_update' | 'system_maintenance' | 'general_alert';
  metadata?: Record<string, any>;
}

class EmailService {
  async sendNotification(notification: EmailNotification): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Sending email notification:', notification);
      
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: notification
      });

      if (error) {
        console.error('Error sending notification:', error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        console.error('Email sending failed:', data);
        return { success: false, error: data?.error || 'Email sending failed' };
      }

      console.log('Email notification sent successfully:', data);
      return { success: true };
    } catch (error: any) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }

  async sendBillingUpdate(userEmail: string, billingModelName: string, changes: string): Promise<{ success: boolean; error?: string }> {
    return this.sendNotification({
      to: userEmail,
      subject: `Billing Model Update: ${billingModelName}`,
      message: `Your billing model "${billingModelName}" has been updated.\n\nChanges:\n${changes}\n\nPlease review these changes in your dashboard.`,
      type: 'billing_update',
      metadata: { billingModelName, changes }
    });
  }

  async sendSystemMaintenance(userEmail: string, maintenanceDetails: string): Promise<{ success: boolean; error?: string }> {
    return this.sendNotification({
      to: userEmail,
      subject: 'Scheduled System Maintenance',
      message: `We have scheduled system maintenance that may affect your service.\n\nDetails:\n${maintenanceDetails}\n\nWe apologize for any inconvenience.`,
      type: 'system_maintenance',
      metadata: { maintenanceDetails }
    });
  }

  async sendGeneralAlert(userEmail: string, subject: string, message: string): Promise<{ success: boolean; error?: string }> {
    return this.sendNotification({
      to: userEmail,
      subject,
      message,
      type: 'general_alert'
    });
  }
}

export const emailService = new EmailService();
