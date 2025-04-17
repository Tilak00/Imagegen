// src/app/api/generate-image/route.ts
import { NextResponse } from 'next/server';
import { openaiApi } from '../../../lib/api/openaiApi.ts'; // Relative path

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt provided' }, { status: 400 });
    }

    console.log(`API Route: Received request to generate image for prompt: "${prompt.substring(0, 50)}..."`);

    // Build the full prompt (could be moved to API route as well)
    const basePrompt = 'Transform this image into a Studio Ghibli style artwork with ' +
                       'whimsical details, soft pastel colors, and hand-drawn aesthetics. ' +
                       'Include Ghibli-like background elements and magical atmosphere.';
    const fullPrompt = `${basePrompt} ${prompt}`; // Combine base and user prompt

    const result = await openaiApi.generateImage({
      prompt: fullPrompt,
      response_format: 'url', // Request URL format
      size: '1024x1024',
    });

    if (!result.transformedImageUrl) {
      throw new Error('OpenAI API did not return an image URL.');
    }

    console.log(`API Route: OpenAI call successful. URL: ${result.transformedImageUrl}`);
    return NextResponse.json({ imageUrl: result.transformedImageUrl });

  } catch (error: any) {
    console.error('API Route Error (generate-image):', error);
    // Avoid leaking detailed internal errors
    const message = error.message?.includes('OpenAI API Error') ? 'Failed to generate image via OpenAI.' : 'Internal server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}