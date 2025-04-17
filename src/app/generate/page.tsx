// src/app/generate/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { generateImageWithGemini } from '../actions/gemini-actions';
import { generatePlaceholderImage } from '../actions/placeholder-actions';

// --- Icons ---
const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
);
const Spinner = () => (
   <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
   </svg>
);
const EnhanceIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L24.995 5.25l-.813 2.846a4.5 4.5 0 003.09 3.09L29.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09L21.005 18.75l.813-2.846a4.5 4.5 0 00-3.09-3.09zM18.25 12l-.813 2.846a4.5 4.5 0 00-3.09 3.09L11.005 18.75l.813-2.846a4.5 4.5 0 003.09-3.09L18.25 12z" />
    </svg>
);
const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);
const VideoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
    </svg>
);
const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);


// --- Types ---
interface ChatMessage {
    id: number | string;
    type: 'prompt' | 'image' | 'info' | 'error';
    content: string;
    isLoading?: boolean;
    error?: string | null;
    imageUrl?: string | null; // For storing uploaded image URL with prompt
}
type PrimaryMode = 'image-gen' | 'video-gen';
type ModifierMode = 'enhance';

export default function GeneratePage() {
  // Initialize state from localStorage or use defaults
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [primaryMode, setPrimaryMode] = useState<PrimaryMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ghibliPrimaryMode') as PrimaryMode) || 'image-gen';
    }
    return 'image-gen';
  });
  const [activeModifiers, setActiveModifiers] = useState<Set<ModifierMode>>(() => {
    if (typeof window !== 'undefined') {
      const savedModifiers = localStorage.getItem('ghibliActiveModifiers');
      return savedModifiers ? new Set(JSON.parse(savedModifiers)) : new Set();
    }
    return new Set();
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ghibliUploadedImagePreview');
    }
    return null;
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for current chat ID in Supabase
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Save chat history to Supabase whenever it changes
  useEffect(() => {
    const saveChatHistoryToSupabase = async () => {
      if (chatHistory.length > 0) {
        try {
          // Get the current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.error('No user found when saving chat history');
            return;
          }

          // Check if we have a current chat ID in state
          if (currentChatId) {
            // Update existing chat
            const { error } = await supabase
              .from('chat_histories')
              .update({
                content: chatHistory,
                updated_at: new Date().toISOString(),
                // Update preview with first prompt if available
                preview: chatHistory.find(msg => msg.type === 'prompt')?.content.substring(0, 30) + '...' || 'Chat session'
              })
              .eq('id', currentChatId);

            if (error) {
              console.error('Error updating chat history:', error);
            }
          } else {
            // Only create a new chat history if there's actual content
            // First prompt message for the preview
            const firstPrompt = chatHistory.find(msg => msg.type === 'prompt');
            const previewText = firstPrompt ? firstPrompt.content.substring(0, 30) + '...' : 'Chat session';

            // Create new chat history
            const { data, error } = await supabase
              .from('chat_histories')
              .insert([
                {
                  user_id: user.id,
                  title: 'Chat ' + new Date().toLocaleString(),
                  preview: previewText,
                  content: chatHistory
                }
              ])
              .select('id')
              .single();

            if (error) {
              console.error('Error creating chat history:', error);
            } else if (data) {
              // Save the chat ID for future updates
              setCurrentChatId(data.id);
            }
          }
        } catch (err) {
          console.error('Unexpected error saving chat history:', err);
        }
      }
    };

    // Debounce the save operation to avoid too many database calls
    const timeoutId = setTimeout(() => {
      saveChatHistoryToSupabase();
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [chatHistory, currentChatId]);

  // Save primary mode to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ghibliPrimaryMode', primaryMode);
    }
  }, [primaryMode]);

  // Save active modifiers to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Saving active modifiers to localStorage:', Array.from(activeModifiers));
      localStorage.setItem('ghibliActiveModifiers', JSON.stringify(Array.from(activeModifiers)));
    }
  }, [activeModifiers]);

  // Save uploaded image preview to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (uploadedImagePreview) {
        localStorage.setItem('ghibliUploadedImagePreview', uploadedImagePreview);
      } else {
        localStorage.removeItem('ghibliUploadedImagePreview');
      }
    }
  }, [uploadedImagePreview]);

  // Restore uploaded image from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedImagePreview = localStorage.getItem('ghibliUploadedImagePreview');
      if (savedImagePreview && !uploadedImagePreview) {
        setUploadedImagePreview(savedImagePreview);
        // Create a dummy file object from the saved image URL
        // This is a simplified approach - in a real app, you might want to fetch the actual file
        fetch(savedImagePreview)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'restored-image.jpg', { type: 'image/jpeg' });
            setUploadedFile(file);
          })
          .catch(err => console.error('Error restoring image file:', err));
      }
    }
  }, []);

  // Scroll to bottom when chat history changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  // No longer need to clear uploaded file based on mode changes since upload is now an icon in the input box

  // Function to enhance the prompt without generating an image
  const handleEnhancePrompt = async () => {
    const promptToSend = currentPrompt.trim();
    if (!promptToSend || isGenerating) {
      alert("Please enter a prompt to enhance.");
      return;
    }

    console.log(`Enhancing prompt: ${promptToSend}`);
    setIsGenerating(true);

    try {
      // Add info message to chat history about enhancing
      const enhancingInfoId = `info-${Date.now()}`;
      setChatHistory(prev => [...prev, {
        id: enhancingInfoId,
        type: 'info',
        content: 'Enhancing your prompt with AI to add more details while preserving your intent...'
      }]);

      // Call the enhance-prompt Supabase function
      console.log('Calling enhance-prompt Supabase function with:', {
        original_prompt: promptToSend,
        style: '', // No forced style, let the user's intent be preserved
        target_type: primaryMode
      });

      const { data: enhanceData, error: enhanceError } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          original_prompt: promptToSend,
          style: '', // No forced style, let the user's intent be preserved
          target_type: primaryMode
        }
      });

      console.log('Enhance function response:', { data: enhanceData, error: enhanceError });

      if (enhanceError) {
        throw new Error(`Enhance prompt function failed: ${enhanceError.message}`);
      }

      if (enhanceData?.enhanced_prompt) {
        console.log("Enhanced prompt received:", enhanceData.enhanced_prompt);

        // Update the info message with success
        setChatHistory(prev => prev.map(msg =>
          msg.id === enhancingInfoId
            ? { ...msg, content: `Prompt enhanced with more details and clarity!` }
            : msg
        ));

        // Set the enhanced prompt in the input box
        setCurrentPrompt(enhanceData.enhanced_prompt);
      } else {
        console.warn("Enhance prompt function returned success but no enhanced_prompt data.");
        // Remove the enhancing info message
        setChatHistory(prev => prev.filter(msg => msg.id !== enhancingInfoId));
      }
    } catch (error: any) {
      console.error("Error calling enhance-prompt Supabase function:", error);
      // Add error message to chat history
      setChatHistory(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Prompt enhancement failed: ${error.message}.`
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Mode Button Clicks
  const handleModeClick = (modeId: string) => {
      if (modeId === 'image-gen' || modeId === 'video-gen') {
          setPrimaryMode(modeId as PrimaryMode);
      } else if (modeId === 'enhance') {
          // For enhance button, if it's not active, toggle it on
          setActiveModifiers(prev => {
              const newModifiers = new Set(prev);
              if (newModifiers.has('enhance')) {
                  console.log('Disabling enhance modifier');
                  newModifiers.delete('enhance');
              } else {
                  console.log('Enabling enhance modifier');
                  newModifiers.add('enhance');

                  // If there's text in the prompt box, enhance it immediately
                  if (currentPrompt.trim()) {
                      // Use setTimeout to ensure the state update completes first
                      setTimeout(() => handleEnhancePrompt(), 0);
                  }
              }
              return newModifiers;
          });
      }
  };

  // Handle file selection from the input (triggered by Upload icon)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          if (!file.type.startsWith('image/')) {
              alert('Please select an image file.');
              event.target.value = '';
              return;
          }
          const maxSize = 10 * 1024 * 1024; // 10MB limit example
          if (file.size > maxSize) {
              alert(`File is too large (Max ${maxSize / 1024 / 1024}MB).`);
              event.target.value = '';
              return;
          }
          setUploadedFile(file);

          // Create a preview URL for the uploaded image
          const previewUrl = URL.createObjectURL(file);
          setUploadedImagePreview(previewUrl);
      } else {
           setUploadedImagePreview(null);
           setUploadedFile(null);
      }
      event.target.value = '';
  };


  const handleGenerate = async () => {
    const promptToSend = currentPrompt.trim();
    if ((!promptToSend && !uploadedFile) || isGenerating) {
      alert("Please enter a prompt or upload an image.");
      return;
    }

    // Check if user has enough credits
    if (creditBalance !== null && creditBalance <= 0) {
      alert("You don't have enough credits to generate an image. Please purchase more credits.");
      return;
    }

    console.log(`Generating with mode: ${primaryMode}, Modifiers: ${Array.from(activeModifiers).join(', ')}, File: ${uploadedFile?.name}`);

    // Set a timeout to ensure we don't get stuck in generating state
    const generationTimeout = setTimeout(() => {
      console.log('Generation timeout reached (30 seconds). Resetting state...');
      setIsGenerating(false);

      // Add error message to chat history
      setChatHistory(prev => prev.map(msg =>
        msg.id === messageId + 1 ? {
          ...msg,
          isLoading: false,
          content: '',
          error: 'Generation timed out after 30 seconds. Please try again.'
        } : msg
      ));
    }, 30000);

    setIsGenerating(true);
    const messageId = Date.now();
    console.log(`Starting generation with message ID: ${messageId}`);

    // Add prompt message (or file indicator)
    let promptContent = promptToSend;
    let imageUrl = null;
    if (uploadedFile) {
        promptContent = promptToSend || `Transform this image`;
        imageUrl = uploadedImagePreview;
    }
    setChatHistory(prev => [...prev, {
      id: messageId,
      type: 'prompt',
      content: promptContent,
      imageUrl: imageUrl
    }]);

    // Add loading state for the image response
    setChatHistory(prev => [...prev, { id: messageId + 1, type: 'image', content: 'Loading...', isLoading: true }]);

    // Clear prompt, uploaded image, and reset enhance button after sending
    setCurrentPrompt('');
    setUploadedFile(null);
    setUploadedImagePreview(null);

    // Reset the enhance modifier
    if (activeModifiers.has('enhance')) {
      setActiveModifiers(prev => {
        const newModifiers = new Set(prev);
        newModifiers.delete('enhance');
        return newModifiers;
      });
    }

    // Use the prompt as is - enhancement is now done separately
    let finalPrompt = promptToSend;
    console.log('Active modifiers:', Array.from(activeModifiers));
    console.log('Is enhance active?', activeModifiers.has('enhance'));

    // --- API Call ---
    try {
       console.log('Generating image with prompt:', finalPrompt);

       const formData = new FormData();
       formData.append('prompt', finalPrompt); // Use the enhanced prompt if available
       if (uploadedFile) {
           formData.append('image', uploadedFile);
       }
       formData.append('mode', primaryMode);
       formData.append('enhance', 'false'); // We've already enhanced the prompt if needed

       // Call the Gemini API for image generation using server action
       console.log('Calling Gemini API for image generation via server action');

       // Convert the uploaded file to base64 if it exists
       let imageBase64: string | undefined = undefined;
       let imageMimeType: string | undefined = undefined;
       if (uploadedFile) {
         const arrayBuffer = await uploadedFile.arrayBuffer();
         imageBase64 = Buffer.from(arrayBuffer).toString('base64');
         imageMimeType = uploadedFile.type;
       }

       // Call the server action
       console.log('Calling server action with prompt:', finalPrompt);
       console.time('serverActionDuration');

       let responseData;
       let usedPlaceholder = false;

       try {
         // First try with Gemini
         try {
           responseData = await generateImageWithGemini(
             finalPrompt,
             primaryMode,
             imageBase64,
             imageMimeType
           );

           console.timeEnd('serverActionDuration');
           console.log('Gemini API response data from server action:', responseData);

           // Add a note if server action was used
           if (responseData.responseText) {
             responseData.responseText = `[Using Gemini API] ${responseData.responseText}`;
           }
         } catch (geminiError) {
           console.timeEnd('serverActionDuration');
           console.error('Gemini API failed, falling back to placeholder:', geminiError);

           // If Gemini fails, use the placeholder
           console.time('placeholderDuration');
           responseData = await generatePlaceholderImage(finalPrompt);
           console.timeEnd('placeholderDuration');

           usedPlaceholder = true;
           console.log('Using placeholder image instead:', responseData);

           if (responseData.responseText) {
             responseData.responseText = `[Using Placeholder] ${responseData.responseText}`;
           }
         }
       } catch (allError) {
         console.timeEnd('serverActionDuration');
         console.error('All image generation attempts failed:', allError);
         throw allError;
       }

       if (!responseData || !responseData.imageUrl) {
           throw new Error("Invalid response from image generation.");
       }

       // Add a note to the chat history if we used the placeholder
       if (usedPlaceholder) {
         setChatHistory(prev => [...prev, {
           id: Date.now() - 1,
           type: 'info',
           content: 'Gemini API is currently unavailable. Using a placeholder image instead.'
         }]);
       }
       const imageUrl = responseData.imageUrl;

       setTimeout(() => {
           // Update the image message
           setChatHistory(prev => prev.map(msg =>
               msg.id === messageId + 1 ? { ...msg, isLoading: false, content: imageUrl, error: null } : msg
           ));

           // If there's response text from Gemini, add it as a separate message
           if (responseData.responseText) {
               setChatHistory(prev => [...prev, {
                   id: Date.now(),
                   type: 'info',
                   content: responseData.responseText
               }]);
           }

           // Deduct 1 credit for successful image generation
           if (creditBalance !== null) {
               const newBalance = creditBalance - 1;
               updateCreditBalance(newBalance);
           }
       }, 0);

    } catch (err: any) {
        console.error("Generation failed:", err);
        // Handle different error formats
        let errorMessage = err.message || 'An unknown error occurred.';
        if (err?.response?.data?.error) {
            errorMessage = err.response.data.error;
        }
         setTimeout(() => {
             setChatHistory(prev => prev.map(msg =>
               msg.id === messageId + 1 ? { ...msg, isLoading: false, content: '', error: errorMessage } : msg
             ));
         }, 0);
    } finally {
        // Clear the timeout and reset the generating state
        clearTimeout(generationTimeout);
        setTimeout(() => setIsGenerating(false), 0);
        console.log('Generation completed or failed. Cleared timeout and reset state.');
    }
    // --- End API Call ---
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleGenerate();
    }
  };

  // Function to start a new chat
  const startNewChat = async () => {
    // Only save the current chat if it has at least one image generation
    const hasImageGeneration = chatHistory.some(msg => msg.type === 'image');

    if (chatHistory.length > 0 && hasImageGeneration) {
      if (window.confirm('Start a new chat? This will save your current conversation and start a fresh one.')) {
        try {
          // Get the current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.error('No user found when starting new chat');
            return;
          }

          // If we have a current chat ID, it's already saved in Supabase
          if (!currentChatId) {
            // First prompt message for the preview
            const firstPrompt = chatHistory.find(msg => msg.type === 'prompt');
            const previewText = firstPrompt
              ? firstPrompt.content.substring(0, 30) + '...'
              : 'Image generation';

            // Save the current chat to Supabase
            const { error } = await supabase
              .from('chat_histories')
              .insert([
                {
                  user_id: user.id,
                  title: 'Chat ' + new Date().toLocaleString(),
                  preview: previewText,
                  content: chatHistory
                }
              ]);

            if (error) {
              console.error('Error saving chat history:', error);
              alert('Failed to save chat history. Please try again.');
              return;
            }
          }

          // Clear current chat state
          setChatHistory([]);
          setCurrentChatId(null);
          setCurrentPrompt('');
          setUploadedFile(null);

          // Show success message
          alert('New chat started! Your previous conversation has been saved.');
        } catch (err) {
          console.error('Error starting new chat:', err);
          alert('An error occurred while starting a new chat. Please try again.');
        }
      }
    } else if (chatHistory.length > 0) {
      // If there's chat history but no image generation, ask if user wants to discard it
      if (window.confirm('Start a new chat? Your current conversation has no images and will not be saved.')) {
        setChatHistory([]);
        setCurrentChatId(null);
        setCurrentPrompt('');
        setUploadedFile(null);
      }
    } else {
      // If there's no chat history, just reset everything without confirmation
      setChatHistory([]);
      setCurrentChatId(null);
      setCurrentPrompt('');
      setUploadedFile(null);
    }
  };

  // State for saved chats modal
  const [showSavedChats, setShowSavedChats] = useState(false);
  const [savedChats, setSavedChats] = useState<Array<{id: string, timestamp: string, preview: string}>>([]);

  // State for credit balance
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);

  // Fetch credit balance from Supabase user_profiles table
  const fetchCreditBalance = async () => {
    try {
      setIsLoadingCredits(true);
      console.log('Fetching credit balance...');

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found when fetching credit balance');
        setIsLoadingCredits(false);
        return;
      }
      console.log('User found:', user.id);

      // Debug: Check if user_profiles table exists and has the expected structure
      const { data: tableInfo, error: tableError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);

      console.log('Table info check:', tableInfo, tableError);

      // Fetch the user's profile with credits_remaining
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*') // Select all columns for debugging
        .eq('user_id', user.id)
        .single();

      console.log('Profile query result:', data, error);

      if (error) {
        console.error('Error fetching credit balance:', error);

        // If the profile doesn't exist, create one with default credits
        if (error.code === 'PGRST116') { // No rows returned
          console.log('No profile found, creating one with default credits');
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert([{
              user_id: user.id,
              credits_remaining: 100, // Default credits
              email: user.email
            }])
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
          } else if (newProfile) {
            console.log('New profile created with credits:', newProfile.credits_remaining);
            setCreditBalance(newProfile.credits_remaining);
          }
        }
      } else if (data) {
        console.log('Credit balance fetched:', data.credits_remaining);
        setCreditBalance(data.credits_remaining);
      } else {
        console.warn('No data returned but no error either');
      }
    } catch (err) {
      console.error('Unexpected error fetching credit balance:', err);
    } finally {
      setIsLoadingCredits(false);
    }
  };

  // Update credit balance in Supabase
  const updateCreditBalance = async (newBalance: number) => {
    try {
      console.log('Updating credit balance to:', newBalance);

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found when updating credit balance');
        return;
      }
      console.log('User found for credit update:', user.id);

      // First, check if the user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('Profile check result:', profile, profileError);

      if (profileError) {
        // If profile doesn't exist, create one
        if (profileError.code === 'PGRST116') { // No rows returned
          console.log('Creating new profile with credits:', newBalance);
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert([{
              user_id: user.id,
              credits_remaining: newBalance,
              email: user.email
            }])
            .select();

          if (createError) {
            console.error('Error creating profile:', createError);
            return;
          }
          console.log('New profile created:', newProfile);
          setCreditBalance(newBalance);
          return;
        } else {
          console.error('Error checking profile:', profileError);
          return;
        }
      }

      // Update the user's profile with new credits_remaining
      console.log('Updating existing profile with credits:', newBalance);
      const { data: updatedProfile, error } = await supabase
        .from('user_profiles')
        .update({ credits_remaining: newBalance })
        .eq('user_id', user.id)
        .select();

      console.log('Update result:', updatedProfile, error);

      if (error) {
        console.error('Error updating credit balance:', error);
      } else {
        console.log('Credit balance updated to:', newBalance);
        setCreditBalance(newBalance);
      }
    } catch (err) {
      console.error('Unexpected error updating credit balance:', err);
    }
  };

  // Function to check and fix database structure if needed
  const checkAndFixDatabaseStructure = async () => {
    try {
      console.log('Checking database structure...');

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found when checking database structure');
        return;
      }

      // Check if the user_profiles table exists and has the expected structure
      const { data: tableInfo, error: tableError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);

      console.log('Table structure check:', tableInfo, tableError);

      // If there's an error, the table might not exist or we don't have access
      if (tableError) {
        console.error('Error checking table structure:', tableError);
        alert('There might be an issue with the database structure. Please contact support.');
        return;
      }

      // Check if the current user has a profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // If the profile doesn't exist, create one
      if (profileError && profileError.code === 'PGRST116') {
        console.log('Creating profile for user:', user.id);

        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert([{
            user_id: user.id,
            credits_remaining: 100, // Default credits
            email: user.email
          }])
          .select();

        if (createError) {
          console.error('Error creating profile:', createError);
          alert('Could not create user profile. Please contact support.');
        } else {
          console.log('Profile created successfully:', newProfile);
          fetchCreditBalance(); // Refresh credit balance
        }
      } else if (profile) {
        console.log('User profile exists:', profile);
      }
    } catch (err) {
      console.error('Error checking database structure:', err);
    }
  };

  // Fetch credit balance on component mount
  useEffect(() => {
    checkAndFixDatabaseStructure();
    fetchCreditBalance();
  }, []);



  // Function to load saved chats from Supabase
  const loadSavedChats = async () => {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found when loading saved chats');
        return;
      }

      // Fetch all chat histories for this user
      const { data, error } = await supabase
        .from('chat_histories')
        .select('id, title, preview, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading saved chats:', error);
        alert('Failed to load chat history. Please try again.');
        return;
      }

      // Transform the data to match our expected format
      const formattedChats = data.map(chat => ({
        id: chat.id,
        timestamp: chat.updated_at || chat.created_at,
        preview: chat.preview || chat.title || 'Chat session'
      }));

      setSavedChats(formattedChats);
      setShowSavedChats(true);
    } catch (err) {
      console.error('Error loading saved chats:', err);
      alert('An error occurred while loading saved chats. Please try again.');
    }
  };

  // Function to load a specific chat from Supabase
  const loadChat = async (chatId: string) => {
    try {
      // Ask for confirmation if there's current chat history
      if (chatHistory.length > 0) {
        if (!window.confirm('Loading this chat will replace your current conversation. Continue?')) {
          return;
        }
      }

      // Fetch the chat from Supabase
      const { data, error } = await supabase
        .from('chat_histories')
        .select('content')
        .eq('id', chatId)
        .single();

      if (error) {
        console.error('Error loading chat:', error);
        alert('Failed to load chat. Please try again.');
        return;
      }

      if (data && data.content) {
        // Load the selected chat
        setChatHistory(data.content);
        setCurrentChatId(chatId);
        setShowSavedChats(false);

        // Show success message
        alert('Chat loaded successfully!');
      } else {
        alert('Chat data not found or is empty.');
      }
    } catch (err) {
      console.error('Error loading chat:', err);
      alert('An error occurred while loading the chat. Please try again.');
    }
  };

  // Function to delete a saved chat from Supabase
  const deleteChat = async (chatId: string, event: React.MouseEvent) => {
    // Stop the click from propagating to the parent (which would load the chat)
    event.stopPropagation();

    if (window.confirm('Are you sure you want to delete this saved chat?')) {
      try {
        // Delete the chat from Supabase
        const { error } = await supabase
          .from('chat_histories')
          .delete()
          .eq('id', chatId);

        if (error) {
          console.error('Error deleting chat:', error);
          alert('Failed to delete chat. Please try again.');
          return;
        }

        // Update the saved chats list in state
        const updatedChats = savedChats.filter(chat => chat.id !== chatId);
        setSavedChats(updatedChats);

        // If we're deleting the current chat, reset the current chat ID
        if (currentChatId === chatId) {
          setCurrentChatId(null);
        }

        // Show success message
        alert('Chat deleted successfully!');
      } catch (err) {
        console.error('Error deleting chat:', err);
        alert('An error occurred while deleting the chat. Please try again.');
      }
    }
  };

  // Function to clear all chat history (current and saved) from Supabase
  const clearAllChatHistory = async () => {
    if (window.confirm('Are you sure you want to clear ALL chat history? This will delete your current conversation and all saved chats.')) {
      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No user found when clearing chat history');
          return;
        }

        // Delete all chat histories for this user
        const { error } = await supabase
          .from('chat_histories')
          .delete()
          .eq('user_id', user.id);

        if (error) {
          console.error('Error clearing chat history:', error);
          alert('Failed to clear chat history. Please try again.');
          return;
        }

        // Clear current chat state
        setChatHistory([]);
        setCurrentChatId(null);

        // Clear the saved chats list
        setSavedChats([]);

        // Close the modal
        setShowSavedChats(false);

        // Show success message
        alert('All chat history has been cleared!');
      } catch (err) {
        console.error('Error clearing chat history:', err);
        alert('An error occurred while clearing chat history. Please try again.');
      }
    }
  };

  // Function to download the image
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

  // Function to save the image to the gallery
  const handleSaveToGallery = async (imageUrl: string) => {
    try {
      // First, convert the data URL to a blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Create a File object from the blob
      const timestamp = Date.now();
      const filename = `ghibli-generation-${timestamp}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to save to gallery');
        return;
      }

      // Try to upload to different buckets in case 'gallery' doesn't exist
      let uploadResult;
      let bucketName = 'gallery';
      let filePath = `${user.id}/${filename}`;

      try {
        // First try the 'gallery' bucket
        uploadResult = await supabase.storage
          .from('gallery')
          .upload(filePath, file);

        if (uploadResult.error) {
          // If gallery bucket doesn't exist, try 'images' bucket
          console.log('Gallery bucket not found, trying images bucket...');
          bucketName = 'images';
          uploadResult = await supabase.storage
            .from('images')
            .upload(filePath, file);

          if (uploadResult.error) {
            // If images bucket doesn't exist, try 'avatars' bucket
            console.log('Images bucket not found, trying avatars bucket...');
            bucketName = 'avatars';
            uploadResult = await supabase.storage
              .from('avatars')
              .upload(filePath, file);
          }
        }
      } catch (uploadError) {
        console.error('All upload attempts failed:', uploadError);
        throw new Error('Failed to upload image. Storage buckets may not be configured properly.');
      }

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      // Get the public URL of the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // Check if gallery table exists by trying to select from it
      const { error: tableCheckError } = await supabase
        .from('gallery')
        .select('id')
        .limit(1);

      if (tableCheckError) {
        // If gallery table doesn't exist, just save locally and show success
        console.warn('Gallery table not found:', tableCheckError.message);
        alert(`Image uploaded successfully to ${bucketName} bucket! Note: Gallery table doesn't exist, so metadata wasn't saved.`);
        return;
      }

      // Save the image metadata to the gallery table
      const { error: insertError } = await supabase
        .from('gallery')
        .insert([
          {
            user_id: user.id,
            image_url: publicUrl,
            title: 'Ghibli Generation',
            description: 'Generated with Ghibli AI',
            created_at: new Date().toISOString()
          }
        ]);

      if (insertError) {
        throw insertError;
      }

      // Show a success message
      alert(`Image saved to gallery successfully! (Stored in ${bucketName} bucket)`);

    } catch (error: any) {
      console.error('Error saving to gallery:', error);
      alert(`Failed to save to gallery: ${error.message}\n\nPlease run the setup-gallery.sql script in your Supabase SQL Editor to create the necessary tables and buckets.`);
    }
  };

  // --- Mode Options (Removed Upload) ---
  const generationModes = [
      { id: 'enhance', label: 'Enhance', icon: EnhanceIcon, type: 'modifier' },
      { id: 'image-gen', label: 'Image Gen', icon: ImageIcon, type: 'primary' },
      { id: 'video-gen', label: 'Video Gen', icon: VideoIcon, type: 'primary' },
      // Upload button removed - now in input box
  ];

  // --- Tailwind Classes ---
  const inputWrapperClasses = "w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col flex-grow";
  const textareaClasses = "block w-full bg-transparent text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none resize-none py-3 px-4 text-sm";
  const sendButtonClasses = "flex-shrink-0 p-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const sendButtonEnabledClasses = "bg-indigo-600 hover:bg-indigo-700 text-white";
  const sendButtonDisabledClasses = "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400";
  const promptMessageClasses = "bg-indigo-100 dark:bg-gray-700 p-3 rounded-lg max-w-xl self-end mr-2 ml-auto my-2 shadow text-gray-800 dark:text-white text-sm";
  const modeButtonBase = "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800";
  const modeButtonInactive = "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600";
  const modeButtonActive = "bg-indigo-600 text-white";

  return (
    // Main container: Full height, flex column.
    // Apply items-center always for horizontal centering.
    // Apply justify-center ONLY when history is empty for vertical centering.
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black relative">
      {/* Saved Chats Modal */}
      {showSavedChats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Chat History</h2>
              <button
                onClick={() => setShowSavedChats(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-4">
              {savedChats.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No saved chats found.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {savedChats.map((chat) => (
                    <li
                      key={chat.id}
                      onClick={() => loadChat(chat.id)}
                      className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 relative group"
                    >
                      <div className="pr-8"> {/* Add padding to make room for delete button */}
                        <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{chat.preview}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(chat.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="Delete chat"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <button
                onClick={() => setShowSavedChats(false)}
                className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>

              {savedChats.length > 0 && (
                <button
                  onClick={clearAllChatHistory}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear All History
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Main Content Area with Chat Controls */}
      <div className="flex-grow overflow-y-auto relative">
        {/* Chat Controls - Moved to left side with icons */}
        <div className="absolute top-2 left-2 z-10 flex space-x-2">
          {/* Credit Balance Display */}
          <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-2 rounded-full shadow-md flex items-center justify-center mr-2">
            <span className="font-medium text-xs">
              {isLoadingCredits ? (
                <span className="animate-pulse">Loading...</span>
              ) : creditBalance !== null ? (
                `${creditBalance} Credits`
              ) : (
                <span onClick={checkAndFixDatabaseStructure} className="cursor-pointer underline">Check Credits</span>
              )}
            </span>
          </div>
          <button
            onClick={startNewChat}
            className="bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/50 text-indigo-600 dark:text-indigo-400 p-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transform hover:scale-105"
            title="New Chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button
            onClick={loadSavedChats}
            className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-400 p-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transform hover:scale-105"
            title="Chat History"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        {chatHistory.length > 0 ? (
          <div className="space-y-6 p-4">
            {/* Display messages in chronological order */}
            {chatHistory.map((msg) => {
              if (msg.type === 'prompt') {
                return (
                  <div key={msg.id} className="flex flex-col w-full mb-6 animate-slideInRight">
                    {/* Prompt on the right */}
                    <div className="flex justify-end w-full">
                      <div className="max-w-xl">
                        <div className={`${promptMessageClasses} hover-lift`}>
                          <p>{msg.content}</p>
                          {/* If this prompt had an image, show it with the prompt */}
                          {msg.imageUrl && (
                            <div className="mt-2 p-2 bg-indigo-50 dark:bg-gray-800 rounded animate-fadeIn">
                              <img
                                src={msg.imageUrl}
                                alt="Uploaded with prompt"
                                className="max-h-[120px] rounded object-contain mx-auto hover-scale"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else if (msg.type === 'image') {
                return (
                  <div key={msg.id} className="flex flex-col w-full mb-6 animate-slideInLeft">
                    {/* Output on the left */}
                    <div className="flex justify-start w-full">
                      <div className="max-w-xl">
                        {msg.isLoading ? (
                          <div className="flex items-center justify-center p-4 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow animate-pulse-custom">
                            <Spinner />
                            <span className="ml-2 text-sm">Generating...</span>
                          </div>
                        ) : msg.error ? (
                          <p className="text-red-400 text-sm p-4 bg-white dark:bg-gray-800 rounded-lg shadow animate-fadeIn">Error: {msg.error}</p>
                        ) : (
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover-lift card-modern">
                            <div className="relative group">
                              <img
                                src={msg.content}
                                alt="Generated Ghibli style image"
                                className="max-w-full max-h-[400px] rounded-md object-contain animate-scaleUp hover-scale"
                              />
                              <div className="absolute bottom-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                  onClick={() => handleDownloadImage(msg.content)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-lg transition-colors duration-200"
                                  title="Download image"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleSaveToGallery(msg.content)}
                                  className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full shadow-lg transition-colors duration-200"
                                  title="Save to gallery"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              } else if (msg.type === 'info') {
                return (
                  <div key={msg.id} className="flex flex-col w-full mb-4 animate-fadeIn">
                    {/* Info message in the center */}
                    <div className="flex justify-center w-full">
                      <div className="max-w-xl">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 p-3 rounded-lg shadow-sm text-sm text-center">
                          <p>{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else if (msg.type === 'error') {
                return (
                  <div key={msg.id} className="flex flex-col w-full mb-4 animate-fadeIn">
                    {/* Error message in the center */}
                    <div className="flex justify-center w-full">
                      <div className="max-w-xl">
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg shadow-sm text-sm text-center">
                          <p>{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })}
            <div ref={chatEndRef} />
          </div>
        ) : null}
      </div>

      {/* Main Ghibli Generation Section with Input */}
      {chatHistory.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center w-full">
          <div className="text-center text-gray-500 mb-8 max-w-2xl animate-scaleUp w-full px-4">
            <h2 className="text-2xl font-semibold mb-4">
              {'Ghibli Generation'.split('').map((letter, index) => (
                <span
                  key={index}
                  className="animate-letter"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {letter === ' ' ? '\u00A0' : letter}
                </span>
              ))}
            </h2>
            <p className="mb-6 animate-fadeIn delay-200">Enter a prompt below to start creating!</p>

            {/* Input Box Container */}
            <div className={`${inputWrapperClasses} card-modern animate-fadeIn delay-300`}>
              {/* Textarea with Upload Icon, Enhance Button and Send Button */}
              <div className="flex items-end gap-3 p-3 w-full">
                {/* Upload Icon Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="flex-shrink-0 p-2 rounded-lg transition-colors duration-200 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 mb-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  aria-label="Upload image"
                  title="Upload image"
                >
                  <UploadIcon className="w-5 h-5" />
                </button>

                {/* Textarea */}
                <textarea
                  rows={2}
                  className={`${textareaClasses} text-base`}
                  placeholder={`Enter a prompt for ${generationModes.find(m => m.id === primaryMode)?.label || 'generation'}...`}
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isGenerating}
                  style={{ height: 'auto', minHeight: '60px', width: '100%' }}
                />

                {/* Enhance Button */}
                <button
                  onClick={handleEnhancePrompt}
                  disabled={isGenerating || !currentPrompt.trim()}
                  className={`flex-shrink-0 p-2 rounded-lg transition-colors duration-200 ${activeModifiers.has('enhance') ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'} hover:bg-indigo-500 hover:text-white mb-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                  aria-label="Enhance prompt"
                  title="Enhance prompt with AI to add more details while preserving your intent"
                >
                  <EnhanceIcon className="w-5 h-5" />
                </button>

                {/* Send Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || (!currentPrompt.trim() && !uploadedFile)}
                  className={`${sendButtonClasses} ${isGenerating || (!currentPrompt.trim() && !uploadedFile) ? sendButtonDisabledClasses : sendButtonEnabledClasses} mb-1 p-2`}
                  aria-label="Send prompt"
                >
                  <SendIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Selection Buttons (Below Input) */}
              <div className="px-4 pt-1 pb-2 flex flex-wrap justify-center gap-2 border-t border-gray-700">
                {generationModes.map((mode) => {
                  const Icon = mode.icon;
                  const isActive = mode.type === 'primary'
                    ? primaryMode === mode.id
                    : activeModifiers.has(mode.id as ModifierMode);

                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleModeClick(mode.id)}
                      className={`${modeButtonBase} ${isActive ? modeButtonActive : modeButtonInactive} btn-modern hover-scale`}
                      disabled={isGenerating}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>

              {/* Uploaded Image Preview (Below Input) */}
              {uploadedImagePreview && (
                <div className="px-4 pt-2 pb-1">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Uploaded Image:</p>
                    <img
                      src={uploadedImagePreview}
                      alt="Uploaded image"
                      className="max-h-[120px] rounded object-contain mx-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input Area (Bottom) - Only shown when there's chat history - No border */}
      {chatHistory.length > 0 && (
        <div className="p-4 flex justify-center w-full">
          <div className="w-full max-w-2xl">
            {/* Input Box Container */}
            <div className={inputWrapperClasses}>
              {/* Textarea with Upload Icon, Enhance Button and Send Button */}
              <div className="flex items-end gap-3 p-3 w-full">
                {/* Upload Icon Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="flex-shrink-0 p-2 rounded-lg transition-colors duration-200 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 mb-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  aria-label="Upload image"
                  title="Upload image"
                >
                  <UploadIcon className="w-5 h-5" />
                </button>

                {/* Textarea */}
                <textarea
                  rows={2}
                  className={`${textareaClasses} text-base`}
                  placeholder={`Enter a prompt for ${generationModes.find(m => m.id === primaryMode)?.label || 'generation'}...`}
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isGenerating}
                  style={{ height: 'auto', minHeight: '60px', width: '100%' }}
                />

                {/* Enhance Button */}
                <button
                  onClick={handleEnhancePrompt}
                  disabled={isGenerating || !currentPrompt.trim()}
                  className={`flex-shrink-0 p-2 rounded-lg transition-colors duration-200 ${activeModifiers.has('enhance') ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'} hover:bg-indigo-500 hover:text-white mb-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                  aria-label="Enhance prompt"
                  title="Enhance prompt with AI to add more details while preserving your intent"
                >
                  <EnhanceIcon className="w-5 h-5" />
                </button>

                {/* Send Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || (!currentPrompt.trim() && !uploadedFile)}
                  className={`${sendButtonClasses} ${isGenerating || (!currentPrompt.trim() && !uploadedFile) ? sendButtonDisabledClasses : sendButtonEnabledClasses} mb-1 p-2`}
                  aria-label="Send prompt"
                >
                  <SendIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Selection Buttons (Below Input) */}
              <div className="px-4 pt-1 pb-2 flex flex-wrap justify-center gap-2 border-t border-gray-700">
                {generationModes.map((mode) => {
                  const Icon = mode.icon;
                  const isActive = mode.type === 'primary'
                    ? primaryMode === mode.id
                    : activeModifiers.has(mode.id as ModifierMode);

                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleModeClick(mode.id)}
                      className={`${modeButtonBase} ${isActive ? modeButtonActive : modeButtonInactive}`}
                      disabled={isGenerating}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>

              {/* Uploaded Image Preview (Below Input) */}
              {uploadedImagePreview && (
                <div className="px-4 pt-2 pb-1">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Uploaded Image:</p>
                    <img
                      src={uploadedImagePreview}
                      alt="Uploaded image"
                      className="max-h-[120px] rounded object-contain mx-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}