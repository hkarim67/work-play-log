# Authentication & Logout Documentation

## Overview
This document describes the authentication and logout system implemented for the TimeTracker application.

## Core Concepts

### Centralized Logout
All logout operations go through a single `logout()` function in `src/lib/auth.ts`. This ensures consistent behavior across the application.

### Multi-Tab Synchronization
When a user logs out in one browser tab, all other tabs are automatically logged out using:
- **BroadcastChannel API** (modern browsers)
- **localStorage events** (fallback for older browsers)

### Fail-Safe Design
The logout process is designed to succeed even when:
- Network is offline
- Server session is already invalid
- Multiple logout calls happen simultaneously

## Implementation Details

### Files Modified
- `src/lib/auth.ts` - Core authentication utilities (NEW)
- `src/pages/Index.tsx` - Main page with logout button
- `src/pages/CustomEntry.tsx` - Custom entry page with multi-tab support

### Logout Flow

1. **Prevent Duplicate Calls**: Global flag prevents simultaneous logout calls
2. **Server Sign Out**: Attempts to sign out from Supabase (best effort, 3s timeout)
3. **Clear Local State**: Immediately removes all Supabase tokens from localStorage/sessionStorage
4. **Multi-Tab Broadcast**: Notifies other tabs to log out
5. **User Feedback**: Shows success toast message
6. **Hard Redirect**: Uses `window.location.href` to force complete page reload

### Security Features

- ✅ Clears all Supabase auth tokens from storage
- ✅ Prevents double-submit with loading state
- ✅ Handles network failures gracefully
- ✅ Synchronizes logout across all browser tabs
- ✅ Cache-busting redirect prevents back-button issues
- ✅ Server session invalidation (when online)

## Usage

### Logging Out
```typescript
import { logout } from "@/lib/auth";

// In your component
const handleLogout = async () => {
  await logout();
  // No need to navigate - logout() handles it
};
```

### Multi-Tab Listener
```typescript
import { setupLogoutListener } from "@/lib/auth";

useEffect(() => {
  const cleanup = setupLogoutListener(() => {
    // This runs when another tab logs out
    window.location.href = "/auth";
  });
  
  return cleanup; // Cleanup on unmount
}, []);
```

## Configuration

### Auth Routes
- Login/Signup: `/auth`
- Protected pages redirect to `/auth` when not authenticated

### Supabase Storage Keys
The logout clears all localStorage keys starting with:
- `supabase`
- `sb-`

### Cookies & CORS
- Lovable Cloud handles cookie configuration automatically
- `SameSite=Lax`, `Secure` in production, `HttpOnly` for refresh tokens

## Testing

### Manual Tests
1. **Single logout**: Click logout button → redirects to /auth
2. **Double-click prevention**: Rapidly click logout → only processes once
3. **Multi-tab**: Open two tabs → logout in one → both redirect to /auth
4. **Offline logout**: Disconnect network → click logout → clears local state, redirects
5. **Back button**: After logout → press back → redirects to /auth (not authenticated)

### Edge Cases Handled
- Session already invalid on server
- Network offline during logout
- Multiple simultaneous logout calls
- Logout from multiple tabs at once
- Browser back button after logout

## Rollback Instructions

If issues occur, revert these files to previous version:
1. Delete `src/lib/auth.ts` and `src/lib/auth.md`
2. Revert `src/pages/Index.tsx` to previous version
3. Revert `src/pages/CustomEntry.tsx` to previous version

Previous logout implementation was simpler but had these issues:
- No multi-tab support
- No duplicate call prevention
- Failed when session was already invalid
- No loading state / double-click protection

## Environment Variables

No additional environment variables required. Uses existing:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Browser Support

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ BroadcastChannel API for multi-tab (fallback to localStorage events)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
