import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Text } from './Text';

type Option<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.container, { backgroundColor: colors.surfaceMuted }]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[
              styles.segment,
              selected && [styles.selected, { backgroundColor: colors.surface, shadowColor: '#000' }],
            ]}
          >
            <Text variant="small" bold={selected} tone={selected ? 'default' : 'muted'} center>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm + 2,
  },
  selected: { shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});
