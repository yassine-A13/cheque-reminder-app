import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useAppTheme } from '@/providers/ThemeProvider';

type ChequeImagePreviewProps = {
  imagePath?: string | null;
  height?: number;
  emptyLabel?: string;
};

export function ChequeImagePreview({ imagePath, height = 220, emptyLabel = 'Aucune image du chèque' }: ChequeImagePreviewProps) {
  const { colors } = useAppTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const availableWidth = Math.max(1, windowWidth - 40);

  useEffect(() => {
    setDimensions(null);
    if (imagePath) {
      Image.getSize(imagePath, (width, imageHeight) => setDimensions({ width, height: imageHeight }), () => setDimensions(null));
    }
  }, [imagePath]);

  const ratio = dimensions ? dimensions.width / dimensions.height : 1;
  const previewHeight = dimensions ? Math.min(height, availableWidth / ratio) : height;
  const previewWidth = dimensions ? Math.min(availableWidth, previewHeight * ratio) : availableWidth;
  const sourceWidth = dimensions?.width ?? availableWidth;
  const sourceHeight = dimensions?.height ?? height;
  const viewerScale = Math.min((windowWidth - 24) / sourceWidth, (windowHeight - 120) / sourceHeight);

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, minHeight: height }]}>
        {imagePath ? (
          <Pressable onPress={() => { setZoom(1); setViewerOpen(true); }} accessibilityRole="button" accessibilityLabel="Agrandir l’image du chèque">
            <Image source={{ uri: imagePath }} style={{ width: previewWidth, height: previewHeight }} resizeMode="contain" />
          </Pressable>
        ) : <ThemedText type="caption" style={{ color: colors.textMuted }}>{emptyLabel}</ThemedText>}
      </View>
      <Modal visible={viewerOpen} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setViewerOpen(false)}>
        <View style={[styles.viewer, { backgroundColor: '#101114' }]}>
          <Pressable style={styles.close} onPress={() => setViewerOpen(false)} accessibilityRole="button" accessibilityLabel="Fermer">
            <ThemedText style={styles.buttonText}>Fermer</ThemedText>
          </Pressable>
          <View style={styles.zoomControls}>
            <Pressable style={styles.zoomButton} onPress={() => setZoom((value) => Math.max(1, value / 1.5))}><ThemedText style={styles.buttonText}>−</ThemedText></Pressable>
            <Pressable style={styles.zoomButton} onPress={() => setZoom((value) => Math.min(4, value * 1.5))}><ThemedText style={styles.buttonText}>+</ThemedText></Pressable>
          </View>
          {imagePath ? <ScrollView horizontal style={styles.viewerScroll} contentContainerStyle={styles.viewerContent} centerContent>
            <ScrollView style={styles.viewerScroll} contentContainerStyle={styles.viewerContent} centerContent>
              <Image source={{ uri: imagePath }} style={{ width: sourceWidth * viewerScale * zoom, height: sourceHeight * viewerScale * zoom }} resizeMode="contain" />
            </ScrollView>
          </ScrollView> : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  viewer: { flex: 1, justifyContent: 'center' },
  viewerScroll: { flex: 1 },
  viewerContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', zIndex: 2, top: 48, right: 18, padding: 12, backgroundColor: '#292a2e', borderRadius: 12 },
  zoomControls: { position: 'absolute', zIndex: 2, bottom: 28, right: 18, gap: 10 },
  zoomButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#292a2e', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 18 },
});
