import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radius, spacing, typography, useTheme } from '@/theme';

import { Text } from './Text';

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
  prefix?: string;
};

export function TextField({ label, hint, error, prefix, multiline, style, onFocus, onBlur, ...props }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={styles.container}>
      {label ? (
        <Text variant="small" bold>
          {label}
        </Text>
      ) : null}
      <View style={[styles.inputRow, { borderColor, backgroundColor: colors.surface }]}>
        {prefix ? (
          <Text variant="subheading" tone="muted">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          {...props}
          multiline={multiline}
          accessibilityLabel={props.accessibilityLabel ?? label}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            typography.body,
            { color: colors.text },
            multiline && styles.multiline,
            style,
          ]}
        />
      </View>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, minHeight: 48, paddingVertical: spacing.sm },
  multiline: { minHeight: 110, textAlignVertical: 'top', paddingTop: spacing.md },
});
