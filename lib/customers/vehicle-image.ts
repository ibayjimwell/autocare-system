import { createHash, randomUUID } from 'node:crypto';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function getConfiguration() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !secret || !/^[a-zA-Z0-9_-]+$/.test(cloudName)) {
    throw new Error('Cloudinary is not configured.');
  }
  return { cloudName, apiKey, secret };
}

function sign(params: Record<string, string>, secret: string) {
  const payload = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  return createHash('sha1').update(`${payload}${secret}`).digest('hex');
}

function detectFormat(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n)) return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') return 'image/webp';
  return null;
}

export async function uploadVehicleImage(file: File): Promise<{ imageUrl: string; imagePublicId: string }> {
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error('Choose a JPG, PNG or WebP photo smaller than 3 MB.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = detectFormat(bytes);
  if (!mediaType) throw new Error('Unsupported photo format. Use JPG, PNG or WebP.');

  const { cloudName, apiKey, secret } = getConfiguration();
  const parameters = {
    folder: 'autocare/vehicles',
    public_id: randomUUID(),
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mediaType }), `vehicle.${mediaType.split('/')[1] === 'jpeg' ? 'jpg' : mediaType.split('/')[1]}`);
  for (const [key, value] of Object.entries(parameters)) form.append(key, value);
  form.append('api_key', apiKey);
  form.append('signature', sign(parameters, secret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST', body: form, cache: 'no-store',
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.secure_url !== 'string' || typeof result.public_id !== 'string') {
    console.error('[VehicleImage] Cloudinary upload error:', response.status, result?.error?.message);
    throw new Error('Photo upload failed. Please try again.');
  }
  const url = new URL(result.secure_url);
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith(`/${cloudName}/image/upload/`) || !result.public_id.startsWith('autocare/vehicles/')) {
    throw new Error('Unexpected Cloudinary upload response.');
  }
  return { imageUrl: result.secure_url, imagePublicId: result.public_id };
}

/** Cleanup failures must not undo a successful vehicle update. */
export async function deleteVehicleImage(publicId: string | null | undefined): Promise<void> {
  if (!publicId?.startsWith('autocare/vehicles/')) return;
  const { cloudName, apiKey, secret } = getConfiguration();
  const parameters = { public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)) };
  const form = new FormData();
  for (const [key, value] of Object.entries(parameters)) form.append(key, value);
  form.append('api_key', apiKey);
  form.append('signature', sign(parameters, secret));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST', body: form, signal: AbortSignal.timeout(15000), cache: 'no-store',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !['ok','not found'].includes(result.result)) {
    throw new Error('Cloudinary image cleanup failed.');
  }
}
