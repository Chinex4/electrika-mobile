import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { apiLanguage } from '@/api/client';
import { translate, useT } from '@/i18n';
import { notify } from '@/lib/toast';

import { brandColors, Icon, icons } from './Icon';
import { cx } from './layout';

/** Take a photo or choose one. Returns the local uri, or null if cancelled. */
export async function pickPhoto(source: 'camera' | 'library' = 'library', square = false): Promise<string | null> {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    notify.warning(source === 'camera' ? 'Camera is off for ElectriKa.' : 'Photos are off for ElectriKa.', 'You can turn it on in Settings.');
    return null;
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
    // iPhones keep photos as HEIC, which the server can't read: ask iOS for a
    // JPEG copy (it converts as it hands the photo over).
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return null;
  if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) {
    notify.error(translate(apiLanguage(), 'me.photoTooBig'));
    return null;
  }
  return asset.uri;
}

/** The server's limit (apps/accounts/avatars.py: 5 MB). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** A row of photos with "Take" and "Choose" tiles; used for job reports and problem photos. */
export function PhotoStrip({ photos, onChange, max = 6, label }: { photos: string[]; onChange: (uris: string[]) => void; max?: number; label?: string }) {
  const t = useT();
  const add = async (source: 'camera' | 'library') => {
    const uri = await pickPhoto(source);
    if (uri) onChange([...photos, uri].slice(0, max));
  };
  return (
    <View className="gap-2">
      {label ? <Text className="text-sm font-semibold text-navy">{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {photos.map((uri) => (
          <View key={uri}>
            <Image source={uri} style={{ width: 88, height: 88, borderRadius: 14 }} contentFit="cover" />
            <Pressable
              accessibilityLabel={t('common.remove')}
              onPress={() => onChange(photos.filter((p) => p !== uri))}
              className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60">
              <Icon name={icons.close} size={10} color={brandColors.white} />
            </Pressable>
          </View>
        ))}
        {photos.length < max ? (
          <>
            <Tile label={t('common.takePhoto')} onPress={() => add('camera')} icon="camera" />
            <Tile label={t('common.choosePhoto')} onPress={() => add('library')} icon="photo" />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Tile({ label, onPress, icon }: { label: string; onPress: () => void; icon: 'camera' | 'photo' }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cx('h-[88px] w-[88px] items-center justify-center gap-1 rounded-2xl border-[1.5px] border-dashed border-edge bg-white active:opacity-70')}>
      <Icon name={icons[icon]} size={20} />
      <Text className="text-center text-[11px] font-semibold text-brand">{label}</Text>
    </Pressable>
  );
}
