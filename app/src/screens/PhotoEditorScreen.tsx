import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  FlipType,
  ImageManipulator,
  type ImageManipulatorContext,
  SaveFormat,
} from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { prepareImage, saveToGallery } from '../media/images';
import type { RootStackParamList } from '../navigation/types';
import { useChat } from '../state/ChatContext';
import { colors, radius, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoEditor'>;

interface EditedImage {
  uri: string;
  width: number;
  height: number;
}

type Transform = (ctx: ImageManipulatorContext, image: EditedImage) => ImageManipulatorContext;

// Crops the largest centred rectangle with the given aspect ratio (width / height).
const cropTo =
  (ratio: number): Transform =>
  (ctx, { width, height }) => {
    const cropWidth = Math.min(width, Math.round(height * ratio));
    const cropHeight = Math.min(height, Math.round(width / ratio));
    return ctx.crop({
      originX: Math.round((width - cropWidth) / 2),
      originY: Math.round((height - cropHeight) / 2),
      width: cropWidth,
      height: cropHeight,
    });
  };

const TOOLS: { label: string; icon: keyof typeof Ionicons.glyphMap; transform: Transform }[] = [
  { label: 'Left', icon: 'arrow-undo-outline', transform: (ctx) => ctx.rotate(-90) },
  { label: 'Right', icon: 'arrow-redo-outline', transform: (ctx) => ctx.rotate(90) },
  { label: 'Mirror', icon: 'swap-horizontal', transform: (ctx) => ctx.flip(FlipType.Horizontal) },
  { label: 'Ulta', icon: 'swap-vertical', transform: (ctx) => ctx.flip(FlipType.Vertical) },
  { label: '1:1', icon: 'square-outline', transform: cropTo(1) },
  { label: '4:5', icon: 'phone-portrait-outline', transform: cropTo(4 / 5) },
  { label: '16:9', icon: 'tv-outline', transform: cropTo(16 / 9) },
  {
    label: 'Chhota',
    icon: 'contract-outline',
    transform: (ctx, { width }) => ctx.resize({ width: Math.round(width / 2), height: null }),
  },
];

async function render(ctx: ImageManipulatorContext): Promise<EditedImage> {
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}

export default function PhotoEditorScreen({ navigation, route }: Props) {
  const { setDraftImage } = useChat();
  const [history, setHistory] = useState<EditedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const current = history.at(-1);

  const run = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    setStatus(null);
    try {
      await task();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const load = useCallback(
    (uri: string) => run(async () => setHistory([await render(ImageManipulator.manipulate(uri))])),
    [run],
  );

  useEffect(() => {
    if (route.params?.uri) load(route.params.uri);
  }, [route.params?.uri, load]);

  const pick = (source: 'camera' | 'library') =>
    run(async () => {
      if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
        throw new Error('Camera ki permission nahi mili.');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) {
        setHistory([await render(ImageManipulator.manipulate(result.assets[0].uri))]);
      }
    });

  const apply = (transform: Transform) =>
    current &&
    run(async () => {
      const edited = await render(transform(ImageManipulator.manipulate(current.uri), current));
      setHistory((prev) => [...prev, edited]);
    });

  const save = () =>
    current &&
    run(async () => {
      await saveToGallery(current.uri);
      setStatus('Gallery me save ho gaya ✓');
    });

  const sendToChat = () =>
    current &&
    run(async () => {
      setDraftImage(await prepareImage(current.uri));
      navigation.popTo('Chat');
    });

  if (!current) {
    return (
      <View style={[styles.container, styles.center]}>
        {busy ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <>
            <Ionicons name="color-wand-outline" size={48} color={colors.accent} />
            <Text style={styles.title}>Photo Editor</Text>
            <Text style={styles.subtitle}>Edit karne ke liye photo chuniye</Text>
            <View style={styles.row}>
              <Pressable style={styles.secondary} onPress={() => pick('library')}>
                <Ionicons name="image-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.secondaryText}>Gallery</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={() => pick('camera')}>
                <Ionicons name="camera-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.secondaryText}>Camera</Text>
              </Pressable>
            </View>
            {status ? <Text style={styles.status}>{status}</Text> : null}
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.canvas}>
        <Image source={{ uri: current.uri }} style={styles.image} resizeMode="contain" />
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.textPrimary} />
          </View>
        ) : null}
      </View>

      <Text style={styles.size}>
        {current.width} × {current.height}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.toolStrip}
        contentContainerStyle={styles.tools}
      >
        <Pressable
          style={[styles.tool, history.length < 2 && styles.disabled]}
          disabled={history.length < 2 || busy}
          onPress={() => setHistory((prev) => prev.slice(0, -1))}
        >
          <Ionicons name="return-up-back" size={22} color={colors.textPrimary} />
          <Text style={styles.toolLabel}>Undo</Text>
        </Pressable>
        {TOOLS.map((tool) => (
          <Pressable key={tool.label} style={styles.tool} disabled={busy} onPress={() => apply(tool.transform)}>
            <Ionicons name={tool.icon} size={22} color={colors.textPrimary} />
            <Text style={styles.toolLabel}>{tool.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {status ? <Text style={styles.status}>{status}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={[styles.secondary, styles.flex]} disabled={busy} onPress={save}>
          <Ionicons name="download-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.secondaryText}>Save</Text>
        </Pressable>
        <Pressable style={[styles.primary, styles.flex]} disabled={busy} onPress={sendToChat}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.primaryText}>AI se poochho</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: spacing.xl,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  flex: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.xl,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  canvas: {
    flex: 1,
    margin: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.codeBackground,
    overflow: 'hidden',
  },
  image: {
    flex: 1,
  },
  busy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  size: {
    color: colors.textMuted,
    fontSize: typography.xs,
    textAlign: 'center',
  },
  toolStrip: {
    flexGrow: 0,
  },
  tools: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  tool: {
    width: 64,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  toolLabel: {
    color: colors.textSecondary,
    fontSize: typography.xs,
  },
  disabled: {
    opacity: 0.35,
  },
  status: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  primaryText: {
    color: colors.textPrimary,
    fontSize: typography.md,
    fontWeight: '600',
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  secondaryText: {
    color: colors.textPrimary,
    fontSize: typography.md,
  },
});
