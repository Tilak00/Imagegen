import { supabase } from '@/lib/supabaseClient';
// Import User model if needed for profile data structure consistency
// import { User } from '@/data/models/userModel';

// Define a type for the user profile data stored in the DB
// Adjust fields based on your actual 'user_profiles' table structure
interface UserProfile {
  user_id: string;
  email?: string; // Optional, might be useful
  credits_remaining?: number;
  subscription_status?: 'free' | 'active' | 'halted' | 'cancelled' | 'refunded' | 'payment_failed' | 'unknown_plan'; // Match UserProfileData
  plan_type?: 'basic' | 'premium' | 'unknown'; // Add plan_type
  plan_interval?: 'monthly' | 'yearly' | 'unknown'; // Add plan_interval
  first_name?: string; // Keep these
  last_name?: string; // Keep these
  // full_name?: string; // Remove if table doesn't have it / prefer separate names
  avatar_url?: string;
  // Add other profile fields as needed
}

class DatabaseService {

  // Corresponds to the private method in the README's AuthService example
  async createUserProfile(userId: string, email: string, fullName?: string): Promise<void> { // Revert to fullName
    console.log(`DatabaseService: Attempting to create profile for user: ${userId}, email: ${email}, fullName: ${fullName}`); // Log fullName
    console.log(`Attempting to create profile for user: ${userId}`);
    const { error } = await supabase
      .from('user_profiles') // Ensure this table name matches your Supabase setup
      .insert([
        {
          user_id: userId,
          email: email, // Store email in profile table
          credits_remaining: 3, // Default free credits from README
          subscription_status: 'free', // Default status
          full_name: fullName, // Insert full_name
        }
      ]);

    if (error) {
      console.error(`DatabaseService: Failed to insert user profile for ${userId}:`, error); // Log the full error object
      console.error(`Failed to create user profile for ${userId}:`, error.message);
      // Decide if this error should be thrown or just logged
      // Throwing might prevent signup completion if profile is critical
      throw new Error(`Failed to create user profile: ${error.message}`);
    }
    console.log(`Successfully created profile for user: ${userId}`);
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single(); // Use single() if user_id is unique and you expect one row

    if (error) {
      // It's common for a profile to not exist initially, don't treat 'No rows found' as a critical error
      if (error.code === 'PGRST116') { // Code for 'No rows found'
         console.log(`No profile found for user: ${userId}`);
         return null;
      }
      console.error(`Failed to get user profile for ${userId}:`, error.message);
      throw new Error(`Failed to get user profile: ${error.message}`);
    }

    return data as UserProfile;
  }

  async deductUserCredit(userId: string): Promise<void> {
    const profile = await this.getUserProfile(userId);

    if (!profile) {
      throw new Error('User profile not found, cannot deduct credit.');
    }

    // Check if user can make a transformation
    // Check if user is NOT active and has no credits
    if (profile.subscription_status !== 'active' && (profile.credits_remaining ?? 0) <= 0) {
      throw new Error('No credits remaining. Please purchase more or subscribe.');
    }

    // Only deduct if not premium and credits exist
    // Only deduct if status is not 'active'
    if (profile.subscription_status !== 'active') {
      const currentCredits = profile.credits_remaining ?? 0;
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ credits_remaining: Math.max(0, currentCredits - 1) }) // Ensure credits don't go below 0
        .eq('user_id', userId);

      if (updateError) {
        console.error(`Failed to update user credits for ${userId}:`, updateError.message);
        throw new Error(`Failed to update user credits: ${updateError.message}`);
      }
       console.log(`Credit deducted for user: ${userId}. Remaining: ${Math.max(0, currentCredits - 1)}`);
    } else {
        console.log(`User ${userId} is premium, no credit deducted.`);
    }
  }

  async addUserCredits(userId: string, creditsToAdd: number): Promise<void> {
     if (creditsToAdd <= 0) return; // Do nothing if adding zero or negative credits

     const profile = await this.getUserProfile(userId);
     const currentCredits = profile?.credits_remaining ?? 0; // Default to 0 if no profile/credits

     const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ credits_remaining: currentCredits + creditsToAdd })
        .eq('user_id', userId);

     if (updateError) {
        console.error(`Failed to add credits for ${userId}:`, updateError.message);
        throw new Error(`Failed to add credits: ${updateError.message}`);
     }
     console.log(`${creditsToAdd} credits added for user: ${userId}. New total: ${currentCredits + creditsToAdd}`);
  }

  // This function might need adjustment or removal if status is now handled by webhooks
  async updateSubscriptionStatus(userId: string, status: UserProfile['subscription_status']): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ subscription_status: status })
      .eq('user_id', userId);

    if (error) {
      console.error(`Failed to update subscription for ${userId}:`, error.message);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
    console.log(`Subscription status updated to ${status} for user: ${userId}`);
  }

  // --- Transformation History --- (from README)
  async saveTransformation(details: {
    userId: string;
    originalUrl: string;
    transformedUrl: string;
    prompt: string;
  }): Promise<string> {
    // Optional: Deduct credit before saving (already handled in README example)
    // await this.deductUserCredit(details.userId); // Consider if this should be called here or in ImageService

    const { data, error } = await supabase
      .from('transformations') // Ensure this table name matches your Supabase setup
      .insert([
        {
          user_id: details.userId,
          original_url: details.originalUrl,
          transformed_url: details.transformedUrl,
          prompt: details.prompt,
          // created_at defaults to now() in Supabase typically
        }
      ])
      .select('id') // Select only the ID of the newly inserted row
      .single(); // Expect only one row to be inserted and returned

    if (error) {
      console.error(`Failed to save transformation for user ${details.userId}:`, error.message);
      throw new Error(`Failed to save transformation: ${error.message}`);
    }

    if (!data?.id) {
        throw new Error('Failed to save transformation: No ID returned.');
    }

    console.log(`Transformation saved with ID: ${data.id} for user: ${details.userId}`);
    return data.id;
  }

  async getUserTransformations(userId: string, limit = 10) {
    const { data, error } = await supabase
      .from('transformations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`Failed to get transformations for user ${userId}:`, error.message);
      throw new Error(`Failed to get transformations: ${error.message}`);
    }

    return data || []; // Return empty array if data is null
  }
}

// Export a singleton instance
export const databaseService = new DatabaseService();