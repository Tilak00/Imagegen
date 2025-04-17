import { supabase } from '../../supabaseClient.ts'; // Relative path with extension

class StorageService {
  public bucketName = 'ghibli-images'; // Ensure this matches your Supabase bucket name

  async uploadImage({
    fileSource, userId, fileName, folder, contentType, // Default content type removed here, rely on File object's type
  }: {
    fileSource: File; // Expect a File object for web
    userId: string;
    fileName: string;
    folder: string;
    contentType?: string; // Keep optional content type override
  }): Promise<{ path: string }> {
    try {
      const storagePath = `${userId}/${folder}/${fileName}`;
      console.log(`Attempting web upload to bucket: "${this.bucketName}" at path: ${storagePath}`);

      // Web: Upload File object directly
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from(this.bucketName)
        .upload(storagePath, fileSource, {
          // Use file's type, or provided content type, or fallback to a generic default if needed
          contentType: fileSource.type || contentType || 'application/octet-stream',
          upsert: false, // Consider if upsert should be true/false based on requirements
        });

      if (uploadError) {
        console.error(`Storage Upload Error (${storagePath}):`, uploadError.message);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      console.log(`Upload successful, returning path: ${storagePath}`);
      // Return only the path object
      return { path: storagePath }; // Supabase v2 returns { path: string } not the full object

    } catch (error: any) {
      console.error('Storage service upload error:', error.message || error);
      throw error;
    }
  }

  // New method to create a signed URL for viewing private files
  async createSignedUrl(path: string, expiresIn = 60 * 60): Promise<string | null> {
      console.log(`Creating signed URL for path: ${path}`);
      try {
          const { data, error } = await supabase
              .storage
              .from(this.bucketName)
              .createSignedUrl(path, expiresIn);

          if (error) {
              console.error(`Error creating signed URL for ${path}:`, error.message);
              throw error;
          }
          console.log(`Signed URL created for ${path}:`, data?.signedUrl);
          return data?.signedUrl || null;
      } catch (error: any) {
          console.error('Storage service createSignedUrl error:', error.message || error);
          throw error;
      }
  }


  async deleteImage(imagePath: string): Promise<void> {
    console.log(`Attempting to delete image from storage: ${imagePath}`);
    try {
      const { data, error } = await supabase // Capture data for potential logging if needed
        .storage
        .from(this.bucketName)
        .remove([imagePath]);

      if (error) {
        console.error(`Storage Delete Error (${imagePath}):`, error.message);
        throw new Error(`Delete failed: ${error.message}`);
      }
      console.log(`Successfully deleted image: ${imagePath}`, data); // Log success and response data
    } catch (error: any) {
      console.error('Storage service delete error:', error.message || error);
      throw error;
    }
  }
}

export const storageService = new StorageService();