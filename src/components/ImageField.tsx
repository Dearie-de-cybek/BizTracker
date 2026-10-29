import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { pickPersistentImage } from '@/services/images';
import { colors, radius, spacing, type } from '@/theme';
import { Button } from './Button';
import { FieldError } from './fields';

/** Optional image with preview, replace and remove. */
export function ImageField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string | null | undefined;
  onChange: (uri: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async () => {
    setBusy(true);
    setError(null);
    try {
      const uri = await pickPersistentImage();
      if (uri) onChange(uri);
    } catch {
      setError("Couldn't load that image. Try another photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={type.label}>
        {label} <Text style={{ fontWeight: '400', color: colors.inkMuted }}>(optional)</Text>
      </Text>
      <View style={styles.row}>
        <Pressable
          onPress={choose}
          accessibilityRole="button"
          accessibilityLabel={value ? `Replace ${label.toLowerCase()}` : `Choose ${label.toLowerCase()}`}
          style={styles.preview}
        >
          {value ? (
            <Image source={{ uri: value }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Feather name="image" size={26} color={colors.inkMuted} />
          )}
        </Pressable>
        <View style={{ flex: 1, gap: spacing.sm }}>
          {hint && <Text style={type.caption}>{hint}</Text>}
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Button label={value ? 'Replace' : 'Choose image'} size="sm" variant="secondary" icon="upload" onPress={choose} loading={busy} />
            {value && <Button label="Remove" size="sm" variant="ghost" onPress={() => onChange(null)} />}
          </View>
        </View>
      </View>
      {error && <FieldError message={error} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  preview: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
