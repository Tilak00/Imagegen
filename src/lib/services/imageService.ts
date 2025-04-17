import { storageService } from './supabase/storageService';
import { databaseService } from './supabase/databaseService';
import { imageRepository } from '../repositories/imageRepository'; // Relative path
import { TransformationResult, TransformImageParams } from '../models/transformationModel'; // Relative path
import { supabase } from '../supabaseClient'; // Relative path

class ImageService {

  // Adapted for text-to-image generation in a web environment
  async transformImage({
    prompt,
    userId,
  }: TransformImageParams): Promise<TransformationResult> {
    console.log(`Starting text-to-image transformation for user ${userId}`);
    let transformedFile: File | null = null; // To hold the generated image file

    try {
      // --- 1. Call the internal API route to generate image via OpenAI ---
      console.log(`Calling internal API route /api/generate-image`);
      const apiResponse = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }), // Send only the user prompt
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(`API route failed (${apiResponse.status}): ${errorData.error || 'Unknown API error'}`);
      }

      const { imageUrl: generatedImageUrl } = await apiResponse.json();
      if (!generatedImageUrl || typeof generatedImageUrl !== 'string') {
        throw new Error('Internal API did not return a valid image URL.');
      }
      console.log(`Internal API successful. Generated Image URL: ${generatedImageUrl}`);


      // --- 2. Fetch the generated image URL as a Blob ---
      console.log(`Fetching generated image blob from URL...`);
      const imageResponse = await fetch(generatedImageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch generated image. Status: ${imageResponse.status}`);
      }
      const imageBlob = await imageResponse.blob();
      console.log(`Generated image blob fetched successfully. Type: ${imageBlob.type}`);

      // --- 3. Create a File object from the Blob ---
      const transformedFileName = `transformed_${Date.now()}.${imageBlob.type.split('/')[1] || 'jpg'}`;
      transformedFile = new File([imageBlob], transformedFileName, { type: imageBlob.type });


      // --- 4. Upload Transformed Image File ---
      console.log(`Uploading transformed image file: ${transformedFile.name}`);
      const { path: transformedStoragePath } = await storageService.uploadImage({
        fileSource: transformedFile, // Pass the File object
        userId,
        fileName: transformedFile.name,
        folder: 'transformed', // Or 'generated'
        contentType: transformedFile.type, // Pass the correct content type
      });

      // Generate public URL (assuming bucket is public or using signed URLs later)
      const { data: transformedUrlData } = supabase.storage.from('ghibli-images').getPublicUrl(transformedStoragePath);
      const transformedPublicUrl = transformedUrlData.publicUrl;
      if (!transformedPublicUrl) throw new Error("Failed to get public URL for transformed image.");
      console.log(`Transformed image uploaded to: ${transformedPublicUrl}`);


      // --- 5. Save Record (No original URL for text-to-image) ---
      await databaseService.deductUserCredit(userId); // Deduct credit first

      const transformationId = await imageRepository.saveTransformationRecord({
        userId,
        originalUrl: '', // No original image for text-to-image
        transformedUrl: transformedPublicUrl, // Save public URL
        prompt: prompt, // Save the user's prompt
      });
      console.log(`Transformation record saved with ID: ${transformationId}`);


      // --- 6. Return Result ---
      return {
        transformationId,
        originalUrl: '', // Add empty string for originalUrl
        transformedUrl: transformedPublicUrl,
      };

    } catch (error: any) {
      console.error('Image transformation service failed:', error.message || error);
      // No local files to clean up in this web version
      throw error;
    } finally {
      console.log('Image transformation service process finished.');
    }
  }

  // buildPrompt might be better placed in the API route now, but keep for reference if needed elsewhere
  private buildPrompt(userPrompt: string): string {
    const basePrompt = 'Transform this image into a Studio Ghibli style artwork with ' +
                       'whimsical details, soft pastel colors, and hand-drawn aesthetics. ' +
                       'Include Ghibli-like background elements and magical atmosphere.';
    return userPrompt ? `${basePrompt} ${userPrompt}` : basePrompt;
  }
}

export const imageService = new ImageService();