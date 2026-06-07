import { toast } from 'sonner';

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Rescales to maxWidth/maxHeight and outputs as JPEG with quality factor.
 */
export function compressImage(file, maxWidth = 1000, maxHeight = 1000, quality = 0.7) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize down if too large
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const attemptCompress = (q) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              // If still over 1MB and quality is > 0.25, compress more
              if (compressedFile.size > 1 * 1024 * 1024 && q > 0.25) {
                attemptCompress(q - 0.1);
              } else {
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            q
          );
        };
        attemptCompress(quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

/**
 * Safely compresses a PDF file by stripping trailing padding,
 * metadata wrappers and comments appended after the last %%EOF marker.
 */
function optimizePdfBuffer(file) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => {
      try {
        const uint8Array = new Uint8Array(reader.result);
        
        // Find last %%EOF (%, %, E, O, F) -> [37, 37, 69, 79, 70]
        let eofIndex = -1;
        for (let i = uint8Array.length - 5; i >= 0; i--) {
          if (
            uint8Array[i] === 37 &&
            uint8Array[i + 1] === 37 &&
            uint8Array[i + 2] === 69 &&
            uint8Array[i + 3] === 79 &&
            uint8Array[i + 4] === 70
          ) {
            eofIndex = i;
            break;
          }
        }
        
        if (eofIndex !== -1) {
          const endPosition = eofIndex + 5;
          if (endPosition < uint8Array.length) {
            const truncatedArray = uint8Array.subarray(0, endPosition);
            const optimizedFile = new File([truncatedArray], file.name, {
              type: 'application/pdf',
              lastModified: Date.now()
            });
            resolve(optimizedFile);
            return;
          }
        }
        resolve(file);
      } catch (err) {
        console.warn('PDF optimization failed, returning original:', err);
        resolve(file);
      }
    };
    reader.onerror = () => resolve(file);
  });
}

/**
 * Utility to upload a file to a Supabase storage bucket,
 * with an automatic fallback to client-side Base64 encoding
 * if the upload fails. Automatically compresses images and PDFs.
 * Shows a comparison toast comparison to verify performance.
 */
export async function uploadFileToBucket(supabase, bucket, path, file) {
  if (!file) return null;
  
  let uploadTarget = file;
  const originalSize = file.size;
  let compressed = false;
  
  try {
    if (file.type.startsWith('image/')) {
      const compressedImage = await compressImage(file);
      if (compressedImage.size < file.size) {
        uploadTarget = compressedImage;
        compressed = true;
      }
    } else if (file.type === 'application/pdf') {
      const optimizedPdf = await optimizePdfBuffer(file);
      if (optimizedPdf.size < file.size) {
        uploadTarget = optimizedPdf;
        compressed = true;
      }
    }
  } catch (err) {
    console.warn('File pre-compression failed, uploading original:', err);
  }
  
  if (typeof window !== 'undefined') {
    const isImage = file.type.startsWith('image/');
    const limitMB = isImage ? 1 : 10;
    const finalSizeMB = uploadTarget.size / (1024 * 1024);
    const originalSizeMB = originalSize / (1024 * 1024);
    const savings = Math.round((1 - uploadTarget.size / originalSize) * 100);
    const fileIcon = isImage ? '📷' : '📄';
    const typeLabel = isImage ? 'Image' : 'PDF';
    
    if (finalSizeMB > limitMB) {
      toast.warning(
        `${fileIcon} Warning: Upload size (${finalSizeMB.toFixed(2)} MB) exceeds target size limit (${limitMB} MB).`
      );
    } else if (compressed && savings > 0) {
      toast.success(
        `${fileIcon} ${typeLabel} Optimized: ${originalSizeMB.toFixed(2)} MB ➔ ${finalSizeMB.toFixed(2)} MB (Saved ${savings}%, Target: ${limitMB} MB)`
      );
    } else {
      toast.success(
        `${fileIcon} ${typeLabel} Selected: ${finalSizeMB.toFixed(2)} MB / ${limitMB} MB limit`
      );
    }
  }
  
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, uploadTarget, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.warn('Supabase storage upload error, falling back to Base64:', error);
      throw error;
    }
    
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
      
    return urlData.publicUrl;
  } catch (err) {
    console.warn(`Storage upload failed for ${file.name}. Converting to local Base64 URL. Reason:`, err.message || err);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(uploadTarget);
    });
  }
}
