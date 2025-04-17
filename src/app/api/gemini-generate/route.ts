// src/app/api/gemini-generate/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
      // Prepare the request to Gemini
      let requestBody: any = {
        contents: [
          {
            role: "user",
            parts: [
              { text: `Generate an image of: ${prompt}. Make it in a cinematic Studio Ghibli style with vibrant colors, soft lighting, detailed backgrounds, and the characteristic Ghibli animation style.` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 32,
          topP: 1,
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

      // If an image was uploaded, include it in the request
      if (imageFile) {
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        const base64Image = imageBuffer.toString('base64');

        // Clear any existing parts and start fresh
        requestBody.contents[0].parts = [
          {
            text: "IMPORTANT: This is an image transformation task. You MUST transform the provided image into Studio Ghibli style while preserving the original scene, subjects, and composition. DO NOT create a new image from scratch."
          },
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Image
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
      }

      // Call the Gemini API directly
      console.log('Calling Gemini API directly');
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("Gemini API error:", errorText);
        throw new Error(`Gemini API error: ${geminiResponse.status} ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      console.log("Gemini API response received");

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
      if (errorDetails.includes('API key')) {
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
