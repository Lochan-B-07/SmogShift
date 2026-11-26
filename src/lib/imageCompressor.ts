export async function compressImageToBase64(
  file: File | Blob,
  maxWidth = 800,
  quality = 0.7,
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Image compression runs in the browser only.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Unable to decode selected image.'));
      element.src = objectUrl;
    });

    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
    const targetWidth = Math.max(1, Math.round(img.width * scale));
    const targetHeight = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is unavailable.');
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const commaIdx = dataUrl.indexOf(',');
    return commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
