import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { MAX_CONTENT_WIDTH, spacing, useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  /** Contenu défilant (par défaut) ou fixe (listes, chat). */
  scroll?: boolean;
  padded?: boolean;
  /** Bords protégés : 'top' pour les écrans sans en-tête (onglets). */
  edges?: Edge[];
  /** Zone fixée en bas d'écran (bouton d'action principal). */
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['bottom'],
  footer,
  refreshing,
  onRefresh,
  contentStyle,
}: Props) {
  const { colors } = useTheme();
  const inner = [styles.inner, padded && styles.padded, contentStyle];

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={inner}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, inner]}>{children}</View>
        )}
        {footer ? (
          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <View style={styles.footerInner}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    gap: spacing.lg,
  },
  padded: { padding: spacing.lg, paddingBottom: spacing.xxl },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  footerInner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', gap: spacing.sm },
});
