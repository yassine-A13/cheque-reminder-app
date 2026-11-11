import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

const CHEQUE_IMAGE_DIRECTORY = `${FileSystem.documentDirectory}cheque-images/`;

function getFileExtension(uri: string) {
  const sanitizedUri = uri.split('?')[0] ?? uri;
  const parts = sanitizedUri.split('.');
  const extension = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';

  return /^[a-z0-9]+$/.test(extension) ? extension : 'jpg';
}

function guessMimeType(uri: string) {
  const extension = getFileExtension(uri);

  switch (extension) {
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'heic':
    case 'heif':
      return 'image/heic';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

async function ensureImageDirectory() {
  const info = await FileSystem.getInfoAsync(CHEQUE_IMAGE_DIRECTORY);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CHEQUE_IMAGE_DIRECTORY, { intermediates: true });
  }
}

async function copyImageToAppStorage(sourceUri: string) {
  await ensureImageDirectory();
  const extension = getFileExtension(sourceUri);
  const destinationUri = `${CHEQUE_IMAGE_DIRECTORY}${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: destinationUri,
  });

  return destinationUri;
}

async function requestCameraAccess() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new Error("L'accès à la caméra est requis pour prendre une photo.");
  }
}

async function requestMediaLibraryAccess() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("L'accès à la galerie est requis pour sélectionner une image.");
  }
}

export async function pickChequeImageFromLibrary() {
  await requestMediaLibraryAccess();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets.length) {
    return null;
  }

  return copyImageToAppStorage(result.assets[0].uri);
}

export async function takeChequePhoto() {
  await requestCameraAccess();

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets.length) {
    return null;
  }

  return copyImageToAppStorage(result.assets[0].uri);
}

export async function deleteChequeImageIfManaged(imagePath?: string | null) {
  if (!imagePath || !imagePath.startsWith(CHEQUE_IMAGE_DIRECTORY)) {
    return;
  }

  const info = await FileSystem.getInfoAsync(imagePath);

  if (!info.exists) {
    return;
  }

  await FileSystem.deleteAsync(imagePath, { idempotent: true });
}

export async function getChequeImageDataUri(imagePath?: string | null) {
  if (!imagePath) {
    return null;
  }

  const info = await FileSystem.getInfoAsync(imagePath);

  if (!info.exists) {
    return null;
  }

  const base64 = await FileSystem.readAsStringAsync(imagePath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return `data:${guessMimeType(imagePath)};base64,${base64}`;
}
