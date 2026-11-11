import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { useAppTheme } from '@/providers/ThemeProvider';
import { typeScale } from '@/constants/design';

type TextProps = PropsWithChildren<{
  style?: StyleProp<TextStyle>;
  type?: 'body' | 'title' | 'subtitle' | 'caption';
  numberOfLines?: number;
}>;

export function ThemedText({ children, style, type = 'body', numberOfLines }: TextProps) {
  const { colors } = useAppTheme();

  return (
    <Text numberOfLines={numberOfLines} style={[styles.base, styles[type], { color: colors.text }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: typeScale.body,
  },
  body: {
    fontSize: typeScale.body,
  },
  title: {
    fontSize: typeScale.title,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: typeScale.subtitle,
    fontWeight: '600',
  },
  caption: {
    fontSize: typeScale.caption,
  },
});
