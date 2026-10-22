export interface DetectedFileType {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  extension: 'jpg' | 'png' | 'webp' | 'pdf';
  category: 'image' | 'document';
}

/**
 * Inspects binary magic numbers (header bytes) to accurately determine file type,
 * preventing spoofed MIME types and forged file extensions.
 */
export function detectMagicBytes(buffer: Buffer): DetectedFileType | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg', category: 'image' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', extension: 'png', category: 'image' };
  }

  // WebP: RIFF (bytes 0-3) ... WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mimeType: 'image/webp', extension: 'webp', category: 'image' };
  }

  // PDF: %PDF- (25 50 44 46 2D)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { mimeType: 'application/pdf', extension: 'pdf', category: 'document' };
  }

  return null;
}

export const MAX_IMAGE_FILE_SIZE = 15 * 1024 * 1024; // 15MB
export const MAX_PDF_FILE_SIZE = 25 * 1024 * 1024;   // 25MB
export const SUPPORTED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
