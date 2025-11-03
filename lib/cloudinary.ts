import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure from CLOUDINARY_URL (cloudinary://key:secret@cloud)
if (!process.env.CLOUDINARY_URL) {
  console.warn('CLOUDINARY_URL not set. Media uploads will be disabled.');
} else {
  cloudinary.config({
    secure: true,
    cloudinary_url: process.env.CLOUDINARY_URL,
  } as any);
}

export async function uploadToCloudinary(file: Buffer | string, options?: { folder?: string; publicId?: string; resourceType?: 'image' | 'video' | 'raw' }) {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL not configured');
  }

  const uploadOptions: any = {
    folder: options?.folder || 'unified-inbox',
    public_id: options?.publicId,
    resource_type: options?.resourceType || 'auto',
  };

  // Accept base64 data URL or Buffer
  const uploadSource = typeof file === 'string' ? file : `data:application/octet-stream;base64,${file.toString('base64')}`;

  return new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader.upload(uploadSource, uploadOptions, (err, result) => {
      if (err || !result) return reject(err || new Error('Cloudinary upload failed'));
      resolve(result);
    });
  });
}
