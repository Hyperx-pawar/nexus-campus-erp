/**
 * Utility to upload a file to a Supabase storage bucket,
 * with an automatic fallback to client-side Base64 encoding
 * if the upload fails (e.g. due to database RLS policy restrictions in sandbox mode).
 * 
 * @param {object} supabase - Supabase client instance
 * @param {string} bucket - Target bucket name ('avatars' or 'documents')
 * @param {string} path - Storage path (e.g., 'tenant-1/student/avatar.png')
 * @param {File} file - The HTML File object to upload
 * @returns {Promise<string>} The public URL or Base64 data URL
 */
export async function uploadFileToBucket(supabase, bucket, path, file) {
  if (!file) return null;
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
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
      reader.readAsDataURL(file);
    });
  }
}
