import axios from 'axios';

// Access server-side environment variable
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Define expected response structure (adjust based on actual API)
interface OpenAIImageGenerationResponse {
    created: number;
    data: Array<{
        url?: string; // If response_format is 'url'
        b64_json?: string; // If response_format is 'b64_json'
        // Add other potential fields like revised_prompt if needed
    }>;
}

class OpenAIApi {
  private apiClient;

  constructor() {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_PLACEHOLDER') { // Check for placeholder too
      console.warn('OpenAI API Key is missing or using placeholder in environment variables. API calls will fail.');
      // Optionally throw an error if the key is absolutely required at instantiation
      // throw new Error('OpenAI API Key is not configured.');
    }
    this.apiClient = axios.create({
      baseURL: 'https://api.openai.com', // Base URL for OpenAI API
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      timeout: 60000, // Set a timeout (e.g., 60 seconds) for image generation
    });
  }

  // Method based on README example (likely for DALL-E 2/3, verify for GPT-4o image editing)
  async generateImage({
    prompt,
    // base64Image, // Parameter name and format depend on the specific API endpoint used
    size = '1024x1024',
    n = 1,
    response_format = 'url',
  }: {
    prompt: string;
    // base64Image?: string; // Make optional or adjust based on API
    size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792'; // Add valid DALL-E 3 sizes
    n?: number;
    response_format?: 'url' | 'b64_json';
  }): Promise<{ transformedImageUrl?: string; transformedImageB64?: string }> { // Return URL or base64
    console.log(`Calling OpenAI API with prompt: "${prompt.substring(0, 100)}..."`);

    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_PLACEHOLDER') {
        throw new Error('OpenAI API Key is not configured.');
    }

    try {
      // **IMPORTANT**: Verify endpoint and request body structure for GPT-4o image generation/editing
      const response = await this.apiClient.post<OpenAIImageGenerationResponse>(
        '/v1/images/generations', // Example: DALL-E generation endpoint
        {
          model: 'dall-e-3', // Example: Specify DALL-E 3 or appropriate model
          prompt: prompt,
          // image: base64Image ? `data:image/jpeg;base64,${base64Image}` : undefined, // Adjust image parameter as needed
          n: n,
          size: size,
          response_format: response_format,
        }
      );

      console.log('OpenAI API Response Status:', response.status);

      if (response.data?.data?.[0]) {
        const result = response.data.data[0];
        console.log('OpenAI API Success. Result URL/B64 received.');
        return {
          transformedImageUrl: result.url,
          transformedImageB64: result.b64_json,
        };
      } else {
        console.error('Invalid response structure from OpenAI API:', response.data);
        throw new Error('Invalid response format from OpenAI API.');
      }
    } catch (error: any) {
      // Log more detailed error information
      if (axios.isAxiosError(error)) {
        console.error('OpenAI API Axios Error:', error.response?.status, error.response?.data || error.message);
        throw new Error(`OpenAI API Error (${error.response?.status}): ${error.response?.data?.error?.message || error.message}`);
      } else {
        console.error('OpenAI API Non-Axios Error:', error);
        throw new Error(`Error generating image: ${error.message || 'Unknown error'}`);
      }
    }
  }
}

// Export a singleton instance - **USE ONLY ON SERVER-SIDE**
export const openaiApi = new OpenAIApi();