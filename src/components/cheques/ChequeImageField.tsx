import { Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { ChequeImagePreview } from '@/components/cheques/ChequeImagePreview';
import { ThemedText } from '@/components/ThemedText';
import { deleteChequeImageIfManaged, pickChequeImageFromLibrary, takeChequePhoto } from '@/features/cheques/image-service';
import { useAppTheme } from '@/providers/ThemeProvider';

type ChequeImageFieldProps = {
  value?: string | null;
  originalValue?: string | null;
  onChange: (nextImagePath: string | null) => void;
};

export function ChequeImageField({ value, originalValue, onChange }: ChequeImageFieldProps) {
  const { colors } = useAppTheme();

  const replaceImage = async (factory: () => Promise<string | null>) => {
    try {
      const nextImagePath = await factory();

      if (!nextImagePath) {
        return;
      }

      if (value && value !== originalValue) {
        await deleteChequeImageIfManaged(value);
      }

      onChange(nextImagePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'ajouter l'image.";
      Alert.alert('Image', message);
    }
  };

  const clearImage = async () => {
    if (!value) {
      return;
    }

    if (value !== originalValue) {
      await deleteChequeImageIfManaged(value);
    }

    onChange(null);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="caption" style={{ color: colors.textMuted }}>
        Image du chèque
      </ThemedText>
      <ChequeImagePreview imagePath={value} />
      <View style={styles.actions}>
        <AppButton compact variant="secondary" label="Galerie" onPress={() => void replaceImage(pickChequeImageFromLibrary)} />
        <AppButton compact variant="secondary" label="Photo" onPress={() => void replaceImage(takeChequePhoto)} />
        {value ? <AppButton compact variant="ghost" label="Retirer" onPress={() => void clearImage()} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
