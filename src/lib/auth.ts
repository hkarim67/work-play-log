import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Track logout state globally to prevent duplicate calls
let isLoggingOut = false;

/**
 * Canonical logout function that handles all cleanup and redirection
 * This is the single source of truth for logout operations
 */
export async function logout(): Promise<void> {
  // Prevent duplicate logout calls
  if (isLoggingOut) {
    console.log("Logout already in progress, ignoring duplicate call");
    return;
  }

  isLoggingOut = true;

  try {
    // Step 1: Attempt to sign out from Supabase (best effort)
    // We don't block on this - if it fails, we still clear local state
    const signOutPromise = supabase.auth.signOut().catch((error) => {
      // Log error but don't throw - we want to clear local state regardless
      console.warn("Server sign out failed (may be already signed out):", error);
      return { error };
    });

    // Step 2: Immediately clear all local auth state
    // This ensures the user is logged out client-side even if server call fails
    clearLocalAuthState();

    // Step 3: Wait for server sign out with timeout
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
    const result = await Promise.race([signOutPromise, timeoutPromise]);

    // Step 4: Broadcast logout to other tabs
    broadcastLogout();

    // Step 5: Show success message
    toast.success("You've been signed out");

    // Step 6: Hard redirect to auth page with cache busting
    // Using window.location ensures complete state reset
    window.location.href = "/auth";
  } catch (error) {
    console.error("Unexpected error during logout:", error);
    // Still redirect even on error
    window.location.href = "/auth";
  } finally {
    // Reset flag after a delay to handle any race conditions
    setTimeout(() => {
      isLoggingOut = false;
    }, 1000);
  }
}

/**
 * Clear all client-side authentication artifacts
 */
function clearLocalAuthState(): void {
  try {
    // Clear localStorage items (Supabase stores tokens here)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("supabase") || key.startsWith("sb-"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Clear sessionStorage
    sessionStorage.clear();
  } catch (error) {
    console.error("Error clearing local auth state:", error);
  }
}

/**
 * Broadcast logout event to other tabs
 */
function broadcastLogout(): void {
  try {
    // Use BroadcastChannel if available
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("auth_channel");
      channel.postMessage({ type: "LOGOUT" });
      channel.close();
    }

    // Fallback: use localStorage event
    localStorage.setItem("logout_event", Date.now().toString());
    setTimeout(() => localStorage.removeItem("logout_event"), 100);
  } catch (error) {
    console.error("Error broadcasting logout:", error);
  }
}

/**
 * Listen for logout events from other tabs
 */
export function setupLogoutListener(onLogout: () => void): () => void {
  // BroadcastChannel listener
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel("auth_channel");
    channel.onmessage = (event) => {
      if (event.data.type === "LOGOUT") {
        onLogout();
      }
    };
  }

  // localStorage event listener (fallback for older browsers)
  const storageHandler = (e: StorageEvent) => {
    if (e.key === "logout_event") {
      onLogout();
    }
  };
  window.addEventListener("storage", storageHandler);

  // Return cleanup function
  return () => {
    channel?.close();
    window.removeEventListener("storage", storageHandler);
  };
}
