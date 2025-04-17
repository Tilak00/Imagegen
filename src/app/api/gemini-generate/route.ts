// src/app/api/gemini-generate/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Import the Gemini library directly
import * as genai from '@google/genai';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    // Parse the request body
    const formData = await request.formData();
    const prompt = formData.get('prompt') as string;
    const mode = formData.get('mode') as string;
    const imageFile = formData.get('image') as File | null;

    if (!prompt && !imageFile) {
      return NextResponse.json(
        { error: "A prompt or image is required" },
        { status: 400 }
      );
    }

    console.log(`Generating with Gemini: Prompt: "${prompt}", Mode: ${mode}, Image: ${imageFile ? 'Yes' : 'No'}`);

    // Try to get the Gemini API key from environment variables or Supabase
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
        return NextResponse.json(
          { error: "Failed to retrieve API key. Please add your Gemini API key to the environment variables or Supabase." },
          { status: 500 }
        );
      }

      geminiApiKey = apiKeyData.key;
    }

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not set. Please add your Gemini API key to the environment variables or Supabase." },
        { status: 500 }
      );
    }

    try {
      // Initialize the Gemini API client
      const genAI = new genai.GoogleGenerativeAI(geminiApiKey);

      // For image generation, use the gemini-2.0-flash-exp-image-generation model
      // Note: This model requires both TEXT and IMAGE in responseModalities
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp-image-generation",
      });

      // Prepare the content parts
      const promptText = `Generate an image of: ${prompt}. Make it in a cinematic Ghibli style.`;
      let contentParts: any[] = [{ text: promptText }];

      // If an image was uploaded, include it in the request
      if (imageFile) {
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        const base64Image = imageBuffer.toString('base64');

        contentParts.push({
          inlineData: {
            mimeType: imageFile.type,
            data: base64Image
          }
        });
      }

      // Set up safety settings
      const safetySettings = [
        {
          category: genai.HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: genai.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: genai.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: genai.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: genai.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: genai.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: genai.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: genai.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ];

      // Generate content with the model
      console.log('Calling Gemini API with content parts:', contentParts);
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: contentParts }],
        // Generation config parameters
        generationConfig: {
          temperature: 0.7,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
          // IMPORTANT: This model requires both TEXT and IMAGE in responseModalities
          responseModalities: ["TEXT", "IMAGE"],
        },
        safetySettings,
      });

      const response = result.response;
      console.log('Gemini API response:', response);

      // Extract text and image from the response
      let imageUrl = '';
      let responseText = '';

      if (response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0].content.parts;

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
        console.warn("No image was generated by Gemini, using placeholder image");
        // Use a placeholder image instead of returning an error
        const placeholderText = encodeURIComponent(prompt.substring(0, 30));
        imageUrl = `https://via.placeholder.com/512x512.png?text=${placeholderText}`;
        responseText = "Gemini couldn't generate an image. Using a placeholder instead. Please check your API key and ensure you have access to the gemini-2.0-flash-exp-image-generation model.";
      }

      return NextResponse.json({
        imageUrl,
        responseText
      });

    } catch (geminiError: any) {
      console.error("Gemini API error:", geminiError);

      // Get detailed error information
      let errorDetails = geminiError.message || 'Unknown error';
      if (geminiError.stack) {
        console.error("Error stack:", geminiError.stack);
      }

      // Check for specific error types
      let errorMessage = `Gemini API error: ${errorDetails}.`;
      if (errorDetails.includes('not a constructor')) {
        errorMessage = 'There was an issue initializing the Gemini API client. This might be due to compatibility issues with Next.js.';
      } else if (errorDetails.includes('API key')) {
        errorMessage = 'Invalid or missing API key. Please check your Gemini API key.';
      } else if (errorDetails.includes('permission') || errorDetails.includes('access')) {
        errorMessage = 'You may not have access to the gemini-2.0-flash-exp-image-generation model. Please check your Gemini API permissions.';
      }

      // For testing purposes, use a placeholder image instead of returning an error
      const placeholderText = encodeURIComponent(prompt.substring(0, 30));
      const imageUrl = `https://via.placeholder.com/512x512.png?text=${placeholderText}`;
      const responseText = errorMessage + ' Using a placeholder image instead.';

      return NextResponse.json({
        imageUrl,
        responseText,
        error: errorDetails
      });
    }

  } catch (error: any) {
    console.error("Error in gemini-generate API route:", error);
    return NextResponse.json(
      { error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
