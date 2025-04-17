// src/app/api/gemini-generate-fallback/route.ts
// This is a fallback implementation that uses direct API calls instead of the SDK
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

    console.log(`Generating with Gemini (fallback): Prompt: "${prompt}", Mode: ${mode}, Image: ${imageFile ? 'Yes' : 'No'}`);

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

    // Prepare the request to Gemini
    // Format for gemini-2.0-flash-exp-image-generation model
    let requestBody: any = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `Generate an image of: ${prompt}. Make it in a cinematic Ghibli style.` }
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
      
      // Add the image to the parts array
      requestBody.contents[0].parts.push({
        inlineData: {
          mimeType: imageFile.type,
          data: base64Image
        }
      });
    }

    // Call the Gemini API directly
    console.log('Calling Gemini API directly with request body:', JSON.stringify(requestBody));
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

      // For testing purposes, use a placeholder image instead of returning an error
      console.warn("Using placeholder image due to Gemini API error");
      const placeholderText = encodeURIComponent(prompt.substring(0, 30));
      const imageUrl = `https://via.placeholder.com/512x512.png?text=${placeholderText}`;
      const responseText = `Gemini API error (${geminiResponse.status}): Please check your API key and ensure you have access to the gemini-2.0-flash-exp-image-generation model.`;

      return NextResponse.json({
        imageUrl,
        responseText,
        error: `Gemini API error: ${geminiResponse.status} ${errorText}`
      });
    }

    const geminiData = await geminiResponse.json();
    console.log("Gemini API response:", JSON.stringify(geminiData));

    // Extract the generated image and text
    let imageUrl = '';
    let responseText = '';

    console.log('Gemini response structure:', JSON.stringify(geminiData, null, 2));

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

  } catch (error: any) {
    console.error("Error in gemini-generate-fallback API route:", error);
    return NextResponse.json(
      { error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
