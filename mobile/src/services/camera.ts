import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export interface CapturedImage {
  uri: string;
  width: number;
  height: number;
}

async function ensurePerm(kind: 'camera' | 'library'): Promise<boolean> {
  const req =
    kind === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return req.status === 'granted';
}

async function compress(uri: string): Promise<CapturedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri, width: result.width, height: result.height };
}

export async function takePhoto(): Promise<CapturedImage | null> {
  if (!(await ensurePerm('camera'))) return null;
  const r = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.9,
    exif: false,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  return compress(r.assets[0].uri);
}

export async function pickPhoto(): Promise<CapturedImage | null> {
  if (!(await ensurePerm('library'))) return null;
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.9,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  return compress(r.assets[0].uri);
}
