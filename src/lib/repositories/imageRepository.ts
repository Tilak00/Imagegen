import { databaseService } from '../services/supabase/databaseService'; // Relative path
// Import a model for transformation data if needed, or use 'any'/'unknown' for now
// import { TransformationData } from '@/lib/models/transformationModel'; // Assuming this exists

class ImageRepository {

  // Method to save transformation details (delegates to DatabaseService)
  async saveTransformationRecord(details: {
    userId: string;
    originalUrl: string;
    transformedUrl: string;
    prompt: string;
  }): Promise<string> {
    try {
      console.log(`ImageRepository: Saving transformation record for user ${details.userId}`);
      const transformationId = await databaseService.saveTransformation(details);
      return transformationId;
    } catch (error: any) {
      console.error(`ImageRepository: Error saving transformation record:`, error.message);
      throw error; // Re-throw for service/UI layer to handle
    }
  }

  // Method to get transformation history (delegates to DatabaseService)
  async getTransformations(userId: string, limit = 10): Promise<any[]> { // Use a specific type later
     try {
        console.log(`ImageRepository: Fetching transformations for user ${userId}`);
        const transformations = await databaseService.getUserTransformations(userId, limit);
        // Add any data mapping/shaping here if needed
        return transformations;
     } catch (error: any) {
        console.error(`ImageRepository: Error fetching transformations:`, error.message);
        throw error;
     }
  }

  // Add other methods related to image data if necessary
  // e.g., deleteTransformationRecord(transformationId: string)
}

// Export a singleton instance
export const imageRepository = new ImageRepository();