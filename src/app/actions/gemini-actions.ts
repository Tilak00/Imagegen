'use server';

import { createClient } from '@/lib/supabase/server';

export async function generateImageWithGemini(
  prompt: string,
  mode: string,
  imageBase64?: string,
  imageMimeType?: string
) {
  try {
    console.log(`Server Action: Generating with Gemini: Prompt: "${prompt}", Mode: ${mode}, Image: ${imageBase64 ? 'Yes' : 'No'}`);

    // Get the Gemini API key
    const supabase = await createClient(); // Await the client creation
    let geminiApiKey = process.env.GEMINI_API_KEY || '';

    // If not in environment variables, try to get from Supabase
    if (!geminiApiKey) {
      console.log("Gemini API key not found in environment variables, trying Supabase...");
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('api_keys')
        .select('key')
        .eq('name', 'gemini')
        .single();

      if (apiKeyError || !apiKeyData) {
        console.error("Error fetching Gemini API key:", apiKeyError);
        throw new Error("Failed to retrieve API key. Please add your Gemini API key to the environment variables or Supabase.");
      }

      geminiApiKey = apiKeyData.key;
    }

    if (!geminiApiKey) {
      throw new Error("Gemini API key is not set. Please add your Gemini API key to the environment variables or Supabase.");
    }

    // Prepare the request to Gemini
    let requestBody: any = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `Transform the provided image into a cinematic Studio Ghibli style. Maintain the core elements and composition of the original image, but apply the distinctive Ghibli aesthetic with vibrant colors, soft lighting, detailed backgrounds, and the characteristic Ghibli animation style. Additional context: ${prompt}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.9,  // Increased for more creative results
        topK: 64,          // Increased from 32
        topP: 0.95,        // Slightly reduced from 1
        maxOutputTokens: 2048,
        // IMPORTANT: This model requires both TEXT and IMAGE in responseModalities
        responseModalities: ["TEXT", "IMAGE"],
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    // If an image was uploaded, include it in the request with clear instructions
    if (imageBase64 && imageMimeType) {
      // Clear any existing parts and start fresh
      requestBody.contents[0].parts = [
        {
          text: "IMPORTANT: This is an image transformation task. You MUST transform the provided image into Studio Ghibli style while preserving the original scene, subjects, and composition. DO NOT create a new image from scratch."
        },
        {
          inlineData: {
            mimeType: imageMimeType,
            data: imageBase64
          }
        },
        {
          text: `Transform this exact image into Studio Ghibli animation style. Keep the same scene, subjects, and composition, but apply Ghibli's distinctive artistic style with hand-drawn animation quality, soft lighting, vibrant colors, and detailed backgrounds. Additional context from user: ${prompt || 'Make it look like a scene from a Studio Ghibli film'}`
        }
      ];

      // Adjust generation parameters for image transformation
      requestBody.generationConfig.temperature = 0.2; // Lower temperature for more faithful transformation
      requestBody.generationConfig.topP = 0.8; // More focused sampling
      requestBody.generationConfig.topK = 40; // More focused token selection
    } else {
      // If no image was uploaded, adjust the prompt for text-to-image generation
      requestBody.contents[0].parts = [{
        text: `Generate an image of: ${prompt}. Make it in a cinematic Studio Ghibli style with vibrant colors, soft lighting, detailed backgrounds, and the characteristic Ghibli animation style.`
      }];
    }

    // Call the Gemini API directly with a timeout
    console.log('Server Action: Calling Gemini API directly');

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API request timed out after 15 seconds')), 15000);
    });

    // Create the fetch promise
    const fetchPromise = fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Race the fetch against the timeout
    const geminiResponse = await Promise.race([fetchPromise, timeoutPromise]) as Response;
    console.log(`Server Action: Gemini API responded with status: ${geminiResponse.status}`);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Server Action: Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log("Server Action: Gemini API response received");

    // Extract the generated image and text
    let imageUrl = '';
    let responseText = '';

    if (geminiData.candidates && geminiData.candidates.length > 0) {
      const parts = geminiData.candidates[0].content.parts;

      if (parts && Array.isArray(parts)) {
        for (const part of parts) {
          if (part.text) {
            responseText += part.text;
          } else if (part.inlineData) {
            // For simplicity, we'll just use the first image
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    if (!imageUrl) {
      console.warn("Server Action: No image was generated by Gemini");
      throw new Error("No image was generated by Gemini");
    }

    return {
      success: true,
      imageUrl,
      responseText
    };

  } catch (error: any) {
    console.error("Server Action: Error generating image with Gemini:", error);

    // Create a placeholder image
    const placeholderText = encodeURIComponent(prompt.substring(0, 30));
    const imageUrl = `https://via.placeholder.com/512x512.png?text=${placeholderText}`;
    const responseText = `Error: ${error.message}. Using a placeholder image instead.`;

    return {
      success: false,
      imageUrl,
      responseText,
      error: error.message
    };
  }
}
