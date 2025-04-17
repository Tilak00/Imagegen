import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to proxy image requests to avoid CORS issues
 * This allows us to fetch images from Supabase storage without CORS problems
 */
export async function GET(request: NextRequest) {
  try {
    // Get the URL to proxy from the query parameter
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'Missing URL parameter' },
        { status: 400 }
      );
    }

    // Only allow proxying from Supabase domains for security
    if (!url.includes('supabase.co')) {
      return NextResponse.json(
        { error: 'Only Supabase URLs are allowed' },
        { status: 403 }
      );
    }

    console.log('Proxying image from:', url);

    // Fetch the image from the original URL
    const response = await fetch(url, {
      headers: {
        // Add any necessary headers here
        'Accept': 'image/*',
      },
      // Add cache: 'no-store' to avoid caching issues
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    console.log('Successfully proxied image, content-type:', contentType);

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*', // Allow CORS
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}
