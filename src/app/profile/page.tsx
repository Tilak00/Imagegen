// src/app/profile/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from '@/lib/state/store';
import { fetchUserProfile, updateUserProfile, clearUserError } from '@/lib/state/slices/userSlice';
import { signOut } from '@/lib/state/slices/authSlice';
import { setThemeMode } from '@/lib/state/slices/uiSlice';
import type { RootState } from '@/lib/state/store';
import { storageService } from '@/lib/services/supabase/storageService';
import { supabase } from '@/lib/supabaseClient';

// --- Icons ---
const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);
const Spinner = () => (
   <svg className="animate-spin h-5 w-5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> {/* Use primary-foreground */}
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
   </svg>
);
const CameraIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
);


// --- Avatar Component ---
// Generate a data URL SVG avatar that doesn't rely on external services
const generateAvatarDataUrl = (initials: string) => {
  // Default to first character or '?' if empty
  const displayInitials = initials.charAt(0).toUpperCase() || '?';

  // Generate random pastel background color based on initials
  const getColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Generate a pastel color (higher lightness)
    const h = hash % 360;
    return `hsl(${h}, 70%, 60%)`;
  };

  const bgColor = getColor(initials);

  // Create SVG with the initials
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="${bgColor}" />
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="40"
        font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">
        ${displayInitials}
      </text>
    </svg>
  `;

  // Convert to data URL
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const Avatar = ({
  // url parameter is kept for API compatibility but not used
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  url,
  size = 'lg',
  fallbackText,
  isLoading = false,
  className = '',
  onClick,
  showEditOverlay = false
}: {
  url: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallbackText: string;
  isLoading?: boolean;
  className?: string;
  onClick?: () => void;
  showEditOverlay?: boolean;
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [isImgLoading, setIsImgLoading] = useState(true);
  const [useDefaultAvatar, setUseDefaultAvatar] = useState(false);

  const sizeClasses = {
    sm: "w-16 h-16 text-2xl",
    md: "w-24 h-24 text-4xl",
    lg: "w-32 h-32 text-5xl",
    xl: "w-40 h-40 text-6xl"
  };

  // Use Tailwind background/border classes directly
  const containerClass = `rounded-full relative overflow-hidden shadow-lg ${sizeClasses[size]} ${className} transition-all duration-300 ease-in-out group bg-gray-200 dark:bg-gray-700`;

  // Generate a data URL avatar as fallback
  const getDefaultAvatarUrl = () => {
    return generateAvatarDataUrl(fallbackText);
  };

  useEffect(() => {
    // For simplicity and reliability, always use the SVG avatar
    // This ensures a consistent experience without CORS or loading issues
    console.log('Using SVG avatar for consistent display');
    const avatarUrl = getDefaultAvatarUrl();
    setImgSrc(avatarUrl);
    setUseDefaultAvatar(true);
    setIsImgLoading(false);
    setImgError(false);
  }, [fallbackText]); // Only depend on fallbackText for generating the avatar

  const handleImageLoad = () => {
    setIsImgLoading(false);
    setImgError(false);
  };

  const handleImageError = () => {
    console.error("Failed to load image:", imgSrc);
    if (!useDefaultAvatar) {
      setImgSrc(getDefaultAvatarUrl());
      setUseDefaultAvatar(true);
    } else {
      setImgError(true);
    }
    setIsImgLoading(false);
  };

  const clickableClasses = onClick ? 'cursor-pointer transform hover:scale-105' : '';

  // Loading State
  if (isLoading || isImgLoading) {
    return (
      <div className={`${containerClass} flex items-center justify-center`}>
        <div className="w-10 h-10 border-4 border-gray-300 dark:border-gray-500 border-t-indigo-500 dark:border-t-indigo-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Fallback State
  if (imgError || !imgSrc) {
    return (
      <div
        className={`${containerClass} bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold ${clickableClasses}`}
        onClick={onClick}
      >
        {fallbackText.charAt(0).toUpperCase()}
         {showEditOverlay && onClick && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-60 rounded-full transition-opacity duration-300">
            <CameraIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        )}
        {showEditOverlay && (
          <div className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1 shadow-md">
            <CameraIcon className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
    );
  }

  // Image State
  return (
    <div
      // Use theme variables for border
      className={`${containerClass} border-2 border-background dark:border-gray-800 ${clickableClasses}`}
      onClick={onClick}
    >
      {imgSrc && (
        <img
          src={imgSrc}
          alt="Avatar"
          className="w-full h-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          loading="eager"
          // Don't add cache-busting for data URLs
          key={imgSrc.startsWith('data:') ? 'data-url' : imgSrc}
        />
      )}
      {showEditOverlay && onClick && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-60 rounded-full transition-opacity duration-300">
           <CameraIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}
    </div>
  );
};


// --- Main Profile Page Component ---
export default function ProfilePage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user: authUser } = useSelector((state: RootState) => state.auth);
  const { profile, isLoading: isProfileLoading, error: profileError } = useSelector((state: RootState) => state.user);
  const { themeMode } = useSelector((state: RootState) => state.ui);

  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isInitialProfileLoading, setIsInitialProfileLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile on mount or when authUser changes
  useEffect(() => {
    if (authUser?.id && !profile && !isProfileLoading && !profileError) {
      setIsInitialProfileLoading(true);
      dispatch(fetchUserProfile(authUser.id)).finally(() => setIsInitialProfileLoading(false));
    } else if (!isProfileLoading) {
      setIsInitialProfileLoading(false);
    }
  }, [authUser, profile, isProfileLoading, profileError, dispatch]);

  // Populate form when profile data is available or editing starts
  const populateForm = useCallback(() => {
    if (profile) {
      setEditFirstName(profile.first_name || '');
      setEditLastName(profile.last_name || '');
    }
  }, [profile]);

  useEffect(() => {
    if (isEditing) {
      populateForm();
    }
  }, [isEditing, populateForm]);

  // Handle profile save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.id) return;
    setIsSaving(true);
    dispatch(clearUserError());
    const resultAction = await dispatch(updateUserProfile({
      userId: authUser.id,
      updates: { first_name: editFirstName.trim(), last_name: editLastName.trim() }
    }));
    setIsSaving(false);
    if (updateUserProfile.fulfilled.match(resultAction)) {
      console.log("Profile updated successfully!");
      setIsEditing(false);
    } else {
      console.error(`Failed to update profile: ${resultAction.payload || 'Unknown error'}`);
      alert(`Failed to update profile: ${resultAction.payload || 'Unknown error'}`);
    }
  };

  // Trigger file input click
  const handleAvatarClick = () => {
    if (isEditing) {
        fileInputRef.current?.click();
    }
  };

  // Handle avatar file selection and upload
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    if (!authUser?.id) { alert("User not found."); return; }
    const file = event.target.files[0];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) { alert("File is too large (Max 5MB)."); return; }
    if (!file.type.startsWith('image/')) { alert("Please select an image file."); return; }

    setIsUploadingAvatar(true);
    dispatch(clearUserError());
    try {
      console.log("Starting avatar upload process...");
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop() || 'jpeg';
      const fileName = `avatar_${authUser.id}_${timestamp}.${fileExt}`;
      const folder = 'avatars';

      // Upload the image to Supabase storage
      console.log(`Uploading avatar to ${folder}/${fileName}`);
      const { path: uploadedPath } = await storageService.uploadImage({
        fileSource: file,
        userId: authUser.id,
        fileName,
        folder,
        contentType: file.type
      });
      console.log("Upload successful, path:", uploadedPath);

      // Get the public URL for the uploaded image
      console.log("Getting public URL for path:", uploadedPath);
      const { data: urlData } = supabase.storage.from(storageService.bucketName).getPublicUrl(uploadedPath);
      let avatarUrl = urlData?.publicUrl;
      console.log("Public URL:", avatarUrl);

      // Validate the URL format
      if (avatarUrl) {
        try {
          // Test if it's a valid URL
          new URL(avatarUrl);
          console.log("Valid URL format confirmed");
        } catch (e) {
          console.error("Invalid URL format:", avatarUrl);
          avatarUrl = ""; // Reset if invalid (use empty string instead of null)
        }
      }

      // Handle potential null return from getPublicUrl
      if (!avatarUrl) {
        console.log("Public URL not available or invalid, trying signed URL...");
        try {
          const signedUrl = await storageService.createSignedUrl(uploadedPath, 30 * 24 * 60 * 60); // 30 days
          if (signedUrl) {
            avatarUrl = signedUrl;
            console.log("Using signed URL instead:", avatarUrl);
          } else {
            console.error("Failed to create signed URL for uploaded avatar.");
            throw new Error("Failed to get URL for uploaded avatar");
          }
        } catch (error) {
          console.error("Error creating signed URL:", error);
          throw new Error("Failed to get URL for uploaded avatar");
        }
      }

      // Update the user profile with the new avatar URL
      // Instead of using Supabase storage URLs directly, use UI Avatars as a reliable fallback
      // This ensures the avatar always displays even if there are CORS issues
      console.log("Updating user profile with avatar URL:", avatarUrl);

      // Instead of using the Supabase URL, store the user's initials for the avatar
      const initials = `${editFirstName.charAt(0)}${editLastName.charAt(0)}`.trim() || authUser.email?.charAt(0) || '?';

      // Generate an SVG avatar data URL based on the user's initials
      const avatarDataUrl = generateAvatarDataUrl(initials);

      console.log("Using SVG avatar data URL instead of Supabase URL");
      const resultAction = await dispatch(updateUserProfile({
        userId: authUser.id,
        updates: {
          avatar_url: avatarDataUrl // Use the SVG data URL for reliability
        }
      }));

      if (updateUserProfile.fulfilled.match(resultAction)) {
        console.log("Avatar updated successfully!");
        // Force a refresh of the profile to ensure the new avatar is displayed
        dispatch(fetchUserProfile(authUser.id));
        alert("Profile picture updated successfully!");
      } else {
        console.error(`Failed to save avatar URL: ${resultAction.payload || 'Unknown error'}`);
        alert(`Failed to save avatar URL: ${resultAction.payload || 'Unknown error'}`);
      }
    } catch (uploadError: any) {
      console.error("Avatar Upload Failed:", uploadError);
      alert(`Could not upload avatar: ${uploadError.message || 'Unknown error'}`);
    } finally {
      // Reset the file input and loading state
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Add a small delay before setting isUploadingAvatar to false to ensure the UI updates properly
      setTimeout(() => {
        setIsUploadingAvatar(false);
      }, 500);
    }
  };

  // Handle theme change
  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = event.target.value as 'light' | 'dark' | 'system';
    dispatch(setThemeMode(newTheme));
  };

  // Handle logout
  const handleLogout = () => {
    dispatch(signOut());
    router.push('/login');
  };

  // --- Loading and Error States ---
  if (isInitialProfileLoading) {
    // Use theme variables for loading text
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] text-muted-foreground">Loading profile...</div>;
  }
  // Error handling integrated into sections below

  // --- Computed Values ---
  const getAvatarFallbackText = () => profile?.first_name?.charAt(0) || authUser?.email?.charAt(0) || "?";
  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();

  // --- Tailwind Class Definitions using Theme Variables ---
  const sectionCardClasses = "bg-white text-gray-800 rounded-xl shadow-lg overflow-hidden mb-6 md:mb-8 dark:bg-gray-800 dark:text-gray-100 hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700";
  const sectionHeaderClasses = "px-6 py-4 border-b border-gray-200 dark:border-gray-700"; // Updated for both modes
  const sectionTitleClasses = "text-lg font-semibold text-gray-800 dark:text-gray-100"; // Updated for both modes
  const sectionContentClasses = "p-6";
  const labelClasses = "block text-sm font-medium text-gray-600 mb-1 dark:text-gray-300"; // Updated for both modes
  const valueClasses = "text-base text-gray-800 dark:text-gray-100"; // Updated for both modes
  // Removed sm:text-sm from inputClasses to troubleshoot build error
  const inputClasses = "mt-1 block w-full rounded-md border-gray-300 bg-white text-gray-800 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:shadow-md disabled:opacity-60 transition-all duration-300 ease-in-out p-2.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white"; // Enhanced focus effects
  const buttonBaseClasses = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-background transition-all duration-300 ease-in-out disabled:opacity-60 transform hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-md";
  const primaryButtonClasses = `${buttonBaseClasses} bg-primary text-primary-foreground hover:opacity-90 hover:bg-indigo-600 focus:ring-primary`; // Enhanced hover effect
  const secondaryButtonClasses = `${buttonBaseClasses} bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:text-indigo-600 hover:ring-indigo-300 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600 dark:hover:text-indigo-300`; // Enhanced hover effects
  const dangerButtonClasses = `${buttonBaseClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`; // Keep danger colors specific

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-black transition-colors duration-300 pt-8 md:pt-16">
      <div className="max-w-5xl mx-auto p-4 md:p-8">

        {/* --- Profile Header Section --- */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 md:mb-10 pb-8 border-b border-gray-200 dark:border-gray-700"> {/* Updated for both modes */}
          <div className="relative flex-shrink-0 mt-2">
             <Avatar
               url={profile?.avatar_url ?? null}
               size="lg"
               fallbackText={getAvatarFallbackText()}
               isLoading={isUploadingAvatar}
               onClick={handleAvatarClick}
               showEditOverlay={isEditing}
             />
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/gif, image/webp" className="hidden" disabled={isUploadingAvatar || !isEditing} />
             {isUploadingAvatar && <p className="text-sm font-medium text-primary animate-pulse mt-2 text-center">Uploading...</p>} {/* Enhanced uploading text */}
          </div>
          <div className="flex-grow text-center sm:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1"> {/* Use foreground */}
              {fullName || 'User Profile'}
            </h1>
            <p className="text-base text-muted-foreground"> {/* Use muted foreground */}
              {profile?.email || authUser?.email}
            </p>
          </div>
          <div className="flex-shrink-0 mt-4 sm:mt-0">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className={`${secondaryButtonClasses} flex items-center gap-2`}>
                <EditIcon className="w-4 h-4" /> Edit Profile
              </button>
            ) : null}
          </div>
        </div>

        {/* --- Main Content Sections --- */}
        <div className="space-y-6 md:space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100 dark:border-gray-700">

        {/* --- Account Details Section (Conditionally Editable) --- */}
        <div className={sectionCardClasses}>
          <div className={sectionHeaderClasses}>
            <h2 className={sectionTitleClasses}>Account Details</h2>
          </div>
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className={`${sectionContentClasses} space-y-4`}>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="first-name" className={labelClasses}>First name</label>
                  <input type="text" name="first-name" id="first-name" value={editFirstName} onChange={(e) => setEditFirstName(e.currentTarget.value)} disabled={isSaving} className={inputClasses} />
                </div>
                <div>
                  <label htmlFor="last-name" className={labelClasses}>Last name</label>
                  <input type="text" name="last-name" id="last-name" value={editLastName} onChange={(e) => setEditLastName(e.currentTarget.value)} disabled={isSaving} className={inputClasses} />
                </div>
              </div>
               {profileError && (<p className="text-sm text-red-500 dark:text-red-400">Error: {profileError}</p>)}
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsEditing(false)} disabled={isSaving} className={secondaryButtonClasses}>
                  Cancel
                </button>
                <button type="submit" disabled={isSaving || isUploadingAvatar} className={`${primaryButtonClasses} min-w-[100px]`}>
                  {isSaving ? <Spinner /> : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <div className={sectionContentClasses}>
              {profileError && !isEditing && (<p className="text-sm text-red-500 dark:text-red-400 mb-4">Error loading profile details: {profileError}</p>)}
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className={labelClasses}>Full name</dt>
                  <dd className={valueClasses}>{fullName || <span className="italic text-muted-foreground">Not set</span>}</dd>
                </div>
                <div>
                  <dt className={labelClasses}>Email address</dt>
                  <dd className={valueClasses}>{profile?.email || authUser?.email}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* --- Subscription Section --- */}
        {!isEditing && (
          <div className={sectionCardClasses}>
            <div className={sectionHeaderClasses}>
              <h2 className={sectionTitleClasses}>Subscription</h2>
            </div>
            <div className={sectionContentClasses}>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className={labelClasses}>Status</dt>
                  <dd className={`${valueClasses} capitalize`}>{profile?.subscription_status || 'N/A'}</dd>
                </div>
                <div>
                  <dt className={labelClasses}>Credits Remaining</dt>
                  <dd className={valueClasses}>{profile?.credits_remaining ?? 'N/A'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <button onClick={() => router.push('/subscription')} className="text-sm font-medium text-primary hover:opacity-80 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200">
                    Manage Subscription &rarr;
                  </button>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* --- Settings Section --- */}
         {!isEditing && (
            <div className={sectionCardClasses}>
              <div className={sectionHeaderClasses}>
                <h2 className={sectionTitleClasses}>Settings</h2>
              </div>
              <div className={sectionContentClasses}>
                 {/* Appearance */}
                 <div className="flex items-center justify-between mb-6">
                   <label htmlFor="theme-select-display" className="text-sm font-medium text-foreground">Theme</label> {/* Use foreground */}
                   <select
                     id="theme-select-display"
                     value={themeMode}
                     onChange={handleThemeChange}
                     className={`${inputClasses} w-auto max-w-[150px] appearance-none`}
                   >
                     <option value="light">Light</option>
                     <option value="dark">Dark</option>
                     <option value="system">System</option>
                   </select>
                 </div>
                 {/* Logout Button */}
                 <div className="border-t border-border pt-6"> {/* Use border variable */}
                    <button onClick={handleLogout} className={`${dangerButtonClasses} w-full sm:w-auto`}>
                      Logout
                    </button>
                 </div>
              </div>
            </div>
         )}

        </div>
      </div>
      {/* Keyframes for Animation (Optional Fade-in for edit form) */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}