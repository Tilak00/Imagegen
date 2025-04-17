import { authService } from '../services/supabase/authService'; // Relative path
import { User } from '../models/userModel'; // Relative path
// No need to import SignUpWithPasswordCredentials if we only handle email variant

class AuthRepository {
  // Expect the specific email variant object
  async signUp(credentials: { email: string; password: string; options?: { data?: object } }): Promise<User> {
    console.log(`AuthRepository: Signing up user ${credentials.email}`);
    // Pass the whole credentials object to the service
    return await authService.signUp(credentials);
  }

  async signIn(email: string, password: string): Promise<User> {
    console.log(`AuthRepository: Signing in user ${email}`);
    return await authService.signIn(email, password);
  }

  async signOut(): Promise<void> {
    console.log(`AuthRepository: Signing out`);
    await authService.signOut();
  }

  async resetPassword(email: string): Promise<void> {
    console.log(`AuthRepository: Requesting password reset for ${email}`);
    await authService.resetPassword(email);
  }

  async getCurrentUser(): Promise<User | null> {
    console.log(`AuthRepository: Getting current user`);
    return await authService.getCurrentUser();
  }

  // Example: Add a method to listen to auth changes via the repository
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    console.log(`AuthRepository: Setting up auth state listener`);
    // This requires modifying AuthService or accessing supabase client directly
    // For simplicity, let's assume the listener setup remains in a central place (e.g., Auth Context Provider)
    // Or, modify AuthService to expose a listener method.
    // Example (if AuthService exposed it):
    // return authService.onAuthStateChange(callback);

    // Placeholder implementation - actual listener should be managed centrally
    const unsubscribe = () => {
        console.warn("AuthRepository.onAuthStateChange unsubscribe called, but listener should be managed elsewhere (e.g., Auth Context).");
    };
    return unsubscribe;
  }
}

// Export a singleton instance
export const authRepository = new AuthRepository();