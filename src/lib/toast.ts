/**
 * Success and error messages, as toasts (sonner-native) with a matching
 * haptic. The server's own `detail` text is shown as is: it is already in
 * the person's language.
 */
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';

const buzz = (kind: Haptics.NotificationFeedbackType) => {
  Haptics.notificationAsync(kind).catch(() => undefined);
};

export const notify = {
  success(message: string, description?: string) {
    buzz(Haptics.NotificationFeedbackType.Success);
    toast.success(message, description ? { description } : undefined);
  },
  error(message: string, description?: string) {
    buzz(Haptics.NotificationFeedbackType.Error);
    toast.error(message, description ? { description } : undefined);
  },
  info(message: string, description?: string) {
    toast.info(message, description ? { description } : undefined);
  },
  warning(message: string, description?: string) {
    buzz(Haptics.NotificationFeedbackType.Warning);
    toast.warning(message, description ? { description } : undefined);
  },
};
