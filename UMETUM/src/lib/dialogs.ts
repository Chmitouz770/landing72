import { Alert, Platform } from 'react-native';

import { presentDialog } from '@/ui/DialogHost';

/**
 * Boîtes de dialogue multiplateformes : Alert natif sur iOS / Android,
 * boîte de dialogue intégrée à l'app sur le web (Alert n'y est pas implémenté).
 */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (!presentDialog({ title, message, buttons: [{ label: 'OK', onPress: () => undefined }] })) {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}

export function confirm(
  title: string,
  message: string | undefined,
  options: { confirmLabel: string; cancelLabel: string; destructive?: boolean },
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const shown = presentDialog({
        title,
        message,
        buttons: [
          { label: options.cancelLabel, tone: 'cancel', onPress: () => resolve(false) },
          {
            label: options.confirmLabel,
            tone: options.destructive ? 'destructive' : 'default',
            onPress: () => resolve(true),
          },
        ],
      });
      if (!shown) resolve(window.confirm(message ? `${title}\n\n${message}` : title));
    });
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: options.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: options.confirmLabel,
          style: options.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
