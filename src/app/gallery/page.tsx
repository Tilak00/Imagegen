// src/app/gallery/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSelector } from '../../lib/state/store';
import type { RootState } from '../../lib/state/store';
import { supabase } from '@/lib/supabaseClient';

// Define the gallery item type
type GalleryItem = {
  id: string;
  user_id: string;
  image_url: string;
  title: string;
  description: string;
  created_at: string;
};

export default function GalleryPage() {
  // State for gallery images
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video state from Redux
  const {
    videoId,
    videoKeyframes
  } = useSelector((state: RootState) => state.image);

  // Function to fetch gallery items
  const fetchGalleryItems = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to view your gallery');
        setIsLoading(false);
        return;
      }

      // Fetch gallery items from Supabase
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setGalleryItems(data || []);
    } catch (err: any) {
      console.error('Error fetching gallery items:', err);
      setError(err.message || 'Failed to fetch gallery items');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch gallery items on component mount
  useEffect(() => {
    fetchGalleryItems();
  }, []);

  // Function to handle image download
  const handleDownloadImage = (imageUrl: string) => {
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = imageUrl;

    // Set the download attribute with a filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `ghibli-generation-${timestamp}.png`;

    // Append to the document, click it, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show a success message
    alert('Image downloaded successfully!');
  };

  // Function to delete an image from the gallery
  const handleDeleteImage = async (itemId: string, imageUrl: string) => {
    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this image from your gallery?')) {
      return;
    }

    try {
      setIsLoading(true);

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to delete images');
        return;
      }

      // Extract the file path from the URL
      // The URL format is typically like: https://xxx.supabase.co/storage/v1/object/public/gallery/user_id/filename.png
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${user.id}/${fileName}`;

      // Delete the record from the gallery table
      const { error: deleteRecordError } = await supabase
        .from('gallery')
        .delete()
        .eq('id', itemId);

      if (deleteRecordError) {
        throw new Error(`Failed to delete gallery record: ${deleteRecordError.message}`);
      }

      // Try to delete the file from storage
      // Note: This might fail if the bucket structure is different, but we'll continue anyway
      try {
        const { error: deleteFileError } = await supabase.storage
          .from('gallery')
          .remove([filePath]);

        if (deleteFileError) {
          console.warn(`Could not delete file from storage: ${deleteFileError.message}`);
        }
      } catch (storageError) {
        console.warn('Error deleting file from storage:', storageError);
        // Continue anyway since we've already deleted the database record
      }

      // Refresh the gallery
      await fetchGalleryItems();

      // Show success message
      alert('Image deleted successfully!');

    } catch (err: any) {
      console.error('Error deleting image:', err);
      setError(err.message || 'Failed to delete image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 sm:p-12 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-black transition-colors duration-300">
      <div className="w-full max-w-5xl p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl hover:shadow-2xl transition-shadow duration-300 card-modern animate-fadeIn">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-6 animate-slideUp">
          My Gallery
        </h1>

        {/* Gallery Section */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-center text-gray-700 dark:text-gray-300 mb-6 animate-slideUp">
            Saved Images
          </h2>

          {isLoading && (
            <div className="text-center py-10 animate-pulse-custom">
              <p className="text-gray-600 dark:text-gray-400">Loading gallery...</p>
              <div className="mt-4 flex justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="my-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-center animate-fadeIn">
              <p className="text-sm font-medium text-red-800 dark:text-red-400">Error: {error}</p>
            </div>
          )}

          {!isLoading && !error && galleryItems.length === 0 && (
            <div className="text-center py-10 animate-fadeIn">
              <p className="text-gray-600 dark:text-gray-400">No images in your gallery yet. Generate and save some images!</p>
              <div className="mt-6 animate-pulse-custom">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          )}

          {!isLoading && !error && galleryItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {galleryItems.map((item, index) => (
                <div
                  key={item.id}
                  className="card-modern border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-white dark:bg-gray-800 hover-lift animate-fadeIn"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-200 dark:bg-gray-700 group">
                    <Image
                      src={item.image_url}
                      alt={item.title || 'Gallery image'}
                      width={300}
                      height={300}
                      className="object-cover w-full h-full"
                      unoptimized={true}
                    />
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                      <button
                        onClick={() => handleDownloadImage(item.image_url)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-lg transition-colors duration-200"
                        title="Download image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteImage(item.id, item.image_url)}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition-colors duration-200"
                        title="Delete image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{item.title || 'Untitled'}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description || 'No description'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video Section */}
        {videoId && videoKeyframes && videoKeyframes.length > 0 && (
          <div className="animate-fadeIn mt-10">
            <h2 className="text-2xl font-semibold text-center text-gray-700 dark:text-gray-300 mb-4 animate-slideUp delay-200">
              Video Keyframes
            </h2>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
              Job ID: {videoId.substring(0, 10)}...
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {videoKeyframes.map((frame: { angle: string; url: string }, index: number) => (
                <div
                  key={`${frame.angle}-${index}`}
                  className="card-modern border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-center shadow hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-white dark:bg-gray-800 hover-lift animate-fadeIn"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="relative w-full aspect-square mb-2 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                    <Image
                      src={frame.url}
                      alt={`Keyframe ${frame.angle}`}
                      width={200}
                      height={200}
                      className="object-contain w-full h-full"
                      unoptimized={true}
                    />
                  </div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{frame.angle}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6 italic">
              Final video generation is processing. Check back later or implement polling/webhooks.
            </p>
          </div>
        )}

        <div className="mt-8 text-center animate-fadeIn delay-500 flex justify-center space-x-4">
          <Link href="/generate" className="btn-modern inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-md text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800">
            Generate New Image
          </Link>
          <button
            onClick={fetchGalleryItems}
            className="btn-modern inline-flex items-center px-6 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          >
            Refresh Gallery
          </button>
        </div>
      </div>
    </main>
  );
}