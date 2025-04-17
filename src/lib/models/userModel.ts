// Basic User model based on README example
export interface User {
  id: string;
  email: string;
  createdAt: string; // Store as ISO string
  // Add other relevant user fields from your 'user_profiles' table if needed
  // e.g., fullName?: string; avatarUrl?: string; creditsRemaining?: number; subscriptionStatus?: string;
}