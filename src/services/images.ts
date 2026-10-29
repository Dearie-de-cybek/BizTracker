import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { generateId } from '@/data/database';

/**
 * Lets the user choose a photo and returns a URI that stays valid after the
 * app restarts. Native: copied out of the picker cache into the app's document
 * directory. Web: stored as a compressed data URL. Returns null if cancelled.
 */
export async function pickPersistentImage(opts: { aspect?: [number, number] } = {}): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: opts.aspect ?? [1, 1],
    quality: 0.6,
    base64: Platform.OS === 'web',
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];

  if (Platform.OS === 'web') {
    return asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri;
  }

  const { Directory, File, Paths } = await import('expo-file-system');
  const dir = new Directory(Paths.document, 'images');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  const ext = (asset.uri.split('.').pop() ?? 'jpg').split('?')[0].slice(0, 4) || 'jpg';
  const dest = new File(dir, `${generateId()}.${ext}`);
  await new File(asset.uri).copy(dest);
  return dest.uri;
}

/** Best-effort removal of an image this app stored. */
export async function deleteStoredImage(uri: string | undefined | null): Promise<void> {
  if (!uri || Platform.OS === 'web' || !uri.includes('/images/')) return;
  try {
    const { File } = await import('expo-file-system');
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Ignore — an orphaned file is harmless
  }
}
