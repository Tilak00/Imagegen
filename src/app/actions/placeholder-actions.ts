'use server';

// This is a simple fallback that just returns a placeholder image
// Use this for testing when Gemini API is not working

export async function generatePlaceholderImage(prompt: string) {
  console.log('Server Action: Generating placeholder image for prompt:', prompt);
  
  // Create a placeholder image URL
  const placeholderText = encodeURIComponent(prompt.substring(0, 30));
  const imageUrl = `https://via.placeholder.com/512x512.png?text=${placeholderText}`;
  
  // Add a delay to simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    imageUrl,
    responseText: 'This is a placeholder image. Gemini API integration is disabled for testing.'
  };
}
