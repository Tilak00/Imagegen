import { supabase } from '../../supabaseClient'; // Relative path
import { User } from '../../models/userModel'; // Relative path
import { databaseService } from './databaseService'; // Keep relative path

export class AuthService {

  // Explicitly type credentials for email sign up
  async signUp(credentials: { email: string; password: string; options?: { data?: { [key: string]: any } } }): Promise<User> { // Allow generic data in options
    console.log("AuthService: Attempting sign up for", credentials.email);
    const { data, error } = await supabase.auth.signUp(credentials);

    if (error) {
      console.error("AuthService SignUp Error:", error.message);
      throw new Error(error.message);
    }

    if (!data.user) {
      console.warn("AuthService SignUp: No user data returned immediately (possibly requires email confirmation).");
      throw new Error('User registration pending or failed');
    }
    console.log(`AuthService: Sign up successful for ${data.user.id}. Attempting profile creation...`);

    // Create user profile after successful auth signup
    try {
      // Assuming createUserProfile expects fullName, pass it if available in options.data
      const fullName = credentials.options?.data?.fullName as string | undefined;
      await databaseService.createUserProfile(data.user.id, data.user.email!, fullName);
    } catch (profileError: any) {
      // Check if the error is the specific duplicate key violation (PostgreSQL code 23505)
      // or if the message indicates the constraint violation
      const isDuplicateKeyError = profileError?.code === '23505' ||
                                  profileError?.message?.includes('duplicate key value violates unique constraint "user_profiles_pkey"');

      if (isDuplicateKeyError) {
         // Log it as a warning, but don't stop the signup process
         console.warn(`Profile already existed for user ${data.user.id}. Signup process continuing.`);
      } else {
         // For any other profile creation error, log critically and re-throw
         console.error("CRITICAL: Failed to create user profile during signup:", profileError.message, `Auth User ID: ${data.user.id}`);
         // This will cause the Redux thunk to be rejected
         throw new Error(`Signup succeeded but profile creation failed: ${profileError.message}`);
      }
    }

    // Return our User model structure even if profile creation was skipped due to conflict
    return {
      id: data.user.id,
      email: data.user.email!,
      createdAt: data.user.created_at!, // Keep as string
    };
  }

  // --- Other methods remain as class methods ---

  async signIn(email: string, password: string): Promise<User> {
    console.log(`AuthService: Attempting sign in for ${email}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("AuthService SignIn Error:", error.message);

      // Provide more user-friendly error messages
      if (error.message === 'Invalid login credentials') {
        throw new Error('The email or password you entered is incorrect. Please try again.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please verify your email address before logging in. Check your inbox for a confirmation email.');
      } else if (error.message.includes('rate limit')) {
        throw new Error('Too many login attempts. Please try again later.');
      } else {
        throw new Error(error.message);
      }
    }

    if (!data.user) {
      throw new Error('Login failed: No user data returned');
    }
    console.log(`AuthService: Sign in successful for ${data.user.id}`);

    return {
      id: data.user.id,
      email: data.user.email!,
      createdAt: data.user.created_at!, // Keep as string
    };
  }

  async signInWithGoogle(): Promise<void> { // Returns void as Supabase handles redirect
    console.log("AuthService: Attempting Google sign in");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Explicitly set redirectTo for web flow to ensure correct return URL processing
        redirectTo: window.location.origin, // Use current origin
        // For native apps, you would use a deep link scheme here instead
        // redirectTo: 'myapp://callback',
        queryParams: {
          access_type: 'offline', // Optional: Request refresh token
          prompt: 'consent', // Optional: Force consent screen
        },
      },
    });

    if (error) {
      console.error("AuthService Google SignIn Error:", error.message);
      throw new Error(`Google Sign-In failed: ${error.message}`);
    }

    // For OAuth, Supabase handles the redirect. If successful, the user will be
    // redirected back to your app, and the onAuthStateChange listener in
    // AuthContext should pick up the new session.
    // `data.url` contains the URL the user should be redirected to.
    // In a web environment, this redirect happens automatically.
    // In native apps, you might need expo-web-browser to open this URL.
    console.log("AuthService: Redirecting to Google for authentication...");
    // No user object is returned directly here.
  }

  async signOut(): Promise<void> {
    console.log("AuthService: Signing out");
    try {
      // First check if there's an active session
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        console.log("AuthService: No active session found, already signed out");
        return; // Already signed out, no need to throw an error
      }

      // Proceed with sign out
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthService SignOut Error:", error.message);
        throw new Error(error.message);
      }
      console.log("AuthService: Sign out successful");
    } catch (error: any) {
      console.error("AuthService SignOut Error:", error.message);
      throw error; // Re-throw the error for handling in the repository/slice
    }
  }

  async resetPassword(email: string): Promise<void> {
    console.log(`AuthService: Requesting password reset for ${email}`);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Optional: redirectTo: 'your-app://reset-password'
        // For web, ensure this matches your site's reset password page URL
        redirectTo: `${window.location.origin}/reset-password`, // Example web redirect
    });
    if (error) {
      console.error("AuthService ResetPassword Error:", error.message);
      throw new Error(error.message);
    }
     console.log(`AuthService: Password reset email sent successfully to ${email}`);
  }

  async getCurrentUser(): Promise<User | null> {
    // console.log("AuthService: Getting current user session/data");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("AuthService GetCurrentUser (getSession):", sessionError.message);
      return null;
    }

    if (!sessionData.session) {
      // console.log("AuthService GetCurrentUser: No active session found.");
      return null;
    }

    // If session exists, get user details
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error("AuthService GetCurrentUser (getUser):", userError.message);
      return null;
    }

    if (!userData.user) {
       console.warn("AuthService GetCurrentUser: Session exists but no user data returned.");
       return null;
    }
    // console.log(`AuthService: Current user found: ${userData.user.id}`);

    return {
      id: userData.user.id,
      email: userData.user.email!,
      createdAt: userData.user.created_at!, // Keep as string
    };
  }
}

// Export a singleton instance
export const authService = new AuthService();