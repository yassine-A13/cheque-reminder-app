import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useAppTheme } from '@/providers/ThemeProvider';

type ChequeImagePreviewProps = {
  imagePath?: string | null;
  height?: number;
  emptyLabel?: string;
};

export function ChequeImagePreview({
  imagePath,
  height = 220,
  emptyLabel = 'Aucune image du chèque',
}: ChequeImagePreviewProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          minHeight: height,
        },
      ]}
    >
      {imagePath ? (
        <Image source={{ uri: imagePath }} style={[styles.image, { height }]} resizeMode="cover" />
      ) : (
        <ThemedText type="caption" style={{ color: colors.textMuted }}>
          {emptyLabel}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
  },
});
