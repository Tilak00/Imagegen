// src/app/api/generate-combined/route.ts
import { NextResponse } from 'next/server';
import { openaiApi } from '../../../lib/api/openaiApi.ts';

export async function POST(request: Request) {
  try {
    // Parse the FormData from the request
    const formData = await request.formData();
    const prompt = formData.get('prompt') as string || '';
    const mode = formData.get('mode') as string || 'image-gen';
    const enhance = formData.get('enhance') === 'true';
    const imageFile = formData.get('image') as File | null;

    console.log(`API Route: Received request to generate ${mode} with prompt: "${prompt.substring(0, 50)}..."`);
    console.log(`API Route: Image file: ${imageFile?.name || 'None'}, Enhance: ${enhance}`);

    // Build the full prompt
    const basePrompt = 'Transform this into a Studio Ghibli style artwork with ' +
                     'whimsical details, soft pastel colors, and hand-drawn aesthetics. ' +
                     'Include Ghibli-like background elements and magical atmosphere.';
    const fullPrompt = `${basePrompt} ${prompt}`.trim();

    // For now, we'll just use the text-to-image API since we don't have image-to-image yet
    // In a real implementation, you would handle the image file and use it with the API
    const result = await openaiApi.generateImage({
      prompt: fullPrompt,
      response_format: 'url',
      size: '1024x1024',
    });

    if (!result.transformedImageUrl) {
      throw new Error('OpenAI API did not return an image URL.');
    }

    console.log(`API Route: OpenAI call successful. URL: ${result.transformedImageUrl}`);
    return NextResponse.json({ imageUrl: result.transformedImageUrl });

  } catch (error: any) {
    console.error('API Route Error (generate-combined):', error);
    // Avoid leaking detailed internal errors
    const message = error.message?.includes('OpenAI API Error') ? 'Failed to generate image via OpenAI.' : 'Internal server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
