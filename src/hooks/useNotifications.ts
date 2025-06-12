
import { useAuth } from './useAuth';
import { emailService } from '@/services/emailService';
import { useToast } from './use-toast';

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const sendBillingUpdateNotification = async (billingModelName: string, changes: string) => {
    if (!user?.email) {
      console.warn('No user email available for notification');
      return;
    }

    try {
      const result = await emailService.sendBillingUpdate(user.email, billingModelName, changes);
      
      if (result.success) {
        toast({
          title: "Notification Sent",
          description: "Billing update notification has been sent to your email.",
        });
      } else {
        console.error('Failed to send billing update notification:', result.error);
      }
    } catch (error) {
      console.error('Error sending billing update notification:', error);
    }
  };

  const sendSystemMaintenanceNotification = async (maintenanceDetails: string) => {
    if (!user?.email) {
      console.warn('No user email available for notification');
      return;
    }

    try {
      const result = await emailService.sendSystemMaintenance(user.email, maintenanceDetails);
      
      if (result.success) {
        toast({
          title: "Maintenance Alert Sent",
          description: "System maintenance notification has been sent to your email.",
        });
      } else {
        console.error('Failed to send maintenance notification:', result.error);
      }
    } catch (error) {
      console.error('Error sending maintenance notification:', error);
    }
  };

  const sendGeneralAlert = async (subject: string, message: string) => {
    if (!user?.email) {
      console.warn('No user email available for notification');
      return;
    }

    try {
      const result = await emailService.sendGeneralAlert(user.email, subject, message);
      
      if (result.success) {
        toast({
          title: "Alert Sent",
          description: "Notification has been sent to your email.",
        });
      } else {
        console.error('Failed to send general alert:', result.error);
      }
    } catch (error) {
      console.error('Error sending general alert:', error);
    }
  };

  return {
    sendBillingUpdateNotification,
    sendSystemMaintenanceNotification,
    sendGeneralAlert
  };
};
