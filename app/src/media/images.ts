import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import type { ChatImage } from '../types';

// Big enough for a vision model to read text in a photo, small enough to upload fast.
const MAX_SIDE = 1280;

/** Shrinks and re-encodes a photo to JPEG, returning the base64 the model needs. */
export async function prepareImage(uri: string): Promise<ChatImage> {
  const context = ImageManipulator.manipulate(uri);
  const original = await context.renderAsync();
  const scale = MAX_SIDE / Math.max(original.width, original.height);
  const image =
    scale < 1
      ? await context
          .resize({ width: Math.round(original.width * scale), height: null })
          .renderAsync()
      : original;
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  return { uri: saved.uri, width: saved.width, height: saved.height, base64: saved.base64 };
}

/** Opens the camera or gallery. Returns null if the user cancels or denies access. */
export async function pickImage(source: 'camera' | 'library'): Promise<ChatImage | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Camera ki permission nahi mili.');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  return prepareImage(result.assets[0].uri);
}

/**
 * Copies a picked/edited photo out of the cache so it still shows in the chat
 * after the app restarts. On web the browser keeps the data URI as is.
 */
export async function keepImage(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  const dir = new Directory(Paths.document, 'chat-images');
  dir.create({ idempotent: true, intermediates: true });
  const target = new File(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`);
  await new File(uri).copy(target);
  return target.uri;
}

export async function saveToGallery(uri: string) {
  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    link.href = uri;
    link.download = `nova-ai-${Date.now()}.jpg`;
    link.click();
    return;
  }
  // Loaded here because expo-media-library has no web implementation and throws on import there.
  const MediaLibrary: typeof import('expo-media-library') = require('expo-media-library');
  const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
  if (!permission.granted) throw new Error('Gallery ki permission nahi mili.');
  await MediaLibrary.Asset.create(uri);
}
