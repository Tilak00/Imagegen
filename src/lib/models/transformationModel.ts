// Based on README example
export interface TransformationResult {
  transformationId: string; // ID from the 'transformations' table
  originalUrl: string;
  transformedUrl: string;
}

// Optional: Interface for the input parameters
export interface TransformImageParams {
    // imagePath?: string; // Removed for text-to-image focus
    prompt: string;    // The user's prompt
    userId: string;
    videoDetails?: string; // Added for video generation details
    // chatId?: string;   // Optional: ID of the chat session this belongs to - Keep if needed later
}