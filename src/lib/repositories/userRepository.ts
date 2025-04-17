import { databaseService } from '../services/supabase/databaseService'; // Relative path
import { supabase } from '../supabaseClient'; // Relative path
import { User } from '../models/userModel'; // Relative path

// Define and export the structure of the profile data
export interface UserProfileData {
  user_id: string;
  email?: string;
  credits_remaining?: number;
  subscription_status?: 'free' | 'active' | 'halted' | 'cancelled' | 'refunded' | 'payment_failed' | 'unknown_plan'; // Expand possible statuses
  first_name?: string; // Keep these
  last_name?: string; // Keep these
  // full_name?: string; // Remove if table doesn't have it / prefer separate names
  avatar_url?: string;
  plan_type?: 'basic' | 'premium' | 'unknown'; // Add plan_type
  plan_interval?: 'monthly' | 'yearly' | 'unknown'; // Add plan_interval
  // Add other fields from your 'user_profiles' table
}


class UserRepository {
  async getUserProfile(userId: string): Promise<UserProfileData | null> {
    try {
      console.log(`UserRepository: Fetching profile for user ${userId}`);
      const profile = await databaseService.getUserProfile(userId);
      // No mapping needed if UserProfileData matches DatabaseService return type
      // Ensure the type returned by databaseService matches UserProfileData
      return profile as UserProfileData | null;
    } catch (error: any) {
      console.error(`UserRepository: Error fetching profile for ${userId}:`, error.message);
      // Depending on desired error handling, could return null or re-throw
      // Returning null might be better for UI handling
      return null;
    }
  }

  // Example: Update user profile data (add more fields as needed)
  // Update signature to allow updating first/last name
  async updateUserProfile(userId: string, updates: Partial<Pick<UserProfileData, 'first_name' | 'last_name' | 'avatar_url'>>): Promise<UserProfileData | null> {
     try {
        console.log(`UserRepository: Updating profile for user ${userId} with`, updates);
        const { data, error } = await supabase // Use imported supabase client
            .from('user_profiles')
            .update(updates)
            .eq('user_id', userId)
            .select() // Select the updated row(s) - remove .single()
            .single(); // Use single() if you expect only one row to be updated/returned

        if (error) {
            throw error; // Throw if the update itself failed
        }
        // Check if any rows were returned (i.e., if the update affected a row)
        // With .single(), data will be null if no row found, or the object if found
        if (!data) {
            console.warn(`UserRepository: Update profile for ${userId} affected 0 rows. Profile might not exist.`);
            // Decide whether to throw an error or return null
            // throw new Error("Profile update affected 0 rows.");
            return null; // Return null if no profile was updated
        }
        console.log(`UserRepository: Profile updated successfully for ${userId}`);
        // If a row was returned, data is the updated profile object
        return data as UserProfileData;

     } catch (error: any) {
        console.error(`UserRepository: Error updating profile for ${userId}:`, error.message);
        throw error; // Re-throw to be handled by caller
     }
  }

  // Add other methods as needed, e.g.,
  // - checkUsernameAvailability(username: string): Promise<boolean>
  // - etc.
}

// Export a singleton instance
export const userRepository = new UserRepository();