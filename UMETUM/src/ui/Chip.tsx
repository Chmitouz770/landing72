import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
};

export function Chip({ label, selected, onPress, icon }: ChipProps) {
  const { colors } = useTheme();
  const fg = selected ? colors.onPrimary : colors.text;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <Text variant="small" style={{ color: fg, fontWeight: selected ? '600' : '400' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export type ChoiceOption<T extends string> = { value: T; label: string; icon?: IconName };

/** Choix unique parmi des puces (retour à la ligne automatique). */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  scroll,
}: {
  options: ChoiceOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  scroll?: boolean;
}) {
  const chips = options.map((o) => (
    <Chip
      key={o.value}
      label={o.label}
      icon={o.icon}
      selected={o.value === value}
      onPress={() => onChange(o.value)}
    />
  ));
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {chips}
      </ScrollView>
    );
  }
  return <View style={styles.wrap}>{chips}</View>;
}

/** Choix multiple parmi des puces. */
export function MultiChoiceChips<T extends string>({
  options,
  values,
  onChange,
}: {
  options: ChoiceOption<T>[];
  values: T[];
  onChange: (values: T[]) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const selected = values.includes(o.value);
        return (
          <Chip
            key={o.value}
            label={o.label}
            icon={o.icon}
            selected={selected}
            onPress={() =>
              onChange(selected ? values.filter((v) => v !== o.value) : [...values, o.value])
            }
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
});
