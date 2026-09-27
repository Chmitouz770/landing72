import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

export type DialogButton = { label: string; tone?: 'default' | 'cancel' | 'destructive'; onPress: () => void };
export type DialogRequest = { title: string; message?: string; buttons: DialogButton[] };

let present: ((request: DialogRequest) => void) | null = null;

/** Affiche une boîte de dialogue dans l'app. Renvoie false si aucun hôte n'est monté. */
export function presentDialog(request: DialogRequest): boolean {
  if (!present) return false;
  present(request);
  return true;
}

/**
 * Boîte de dialogue intégrée à l'app (web) : plus cohérente que window.alert,
 * et fonctionne là où les dialogues du navigateur sont bloqués.
 */
export function DialogHost() {
  const { colors } = useTheme();
  const [dialog, setDialog] = useState<DialogRequest | null>(null);

  useEffect(() => {
    present = setDialog;
    return () => {
      present = null;
    };
  }, []);

  const close = (button?: DialogButton) => {
    setDialog(null);
    button?.onPress();
  };
  const cancel = dialog?.buttons.find((b) => b.tone === 'cancel');

  return (
    <Modal transparent visible={!!dialog} animationType="fade" onRequestClose={() => close(cancel)}>
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={() => close(cancel)}>
        <Pressable
          accessibilityRole="alert"
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text variant="subheading">{dialog?.title}</Text>
          {dialog?.message ? <Text tone="muted">{dialog.message}</Text> : null}
          <View style={styles.buttons}>
            {dialog?.buttons.map((b) => (
              <Button
                key={b.label}
                title={b.label}
                variant={b.tone === 'destructive' ? 'danger' : b.tone === 'cancel' ? 'outline' : 'primary'}
                style={styles.button}
                onPress={() => close(b)}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.md,
  },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  button: { flexGrow: 1 },
});
