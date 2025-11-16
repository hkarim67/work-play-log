# Temwise Daily Planner

All in one app to streamline the chaos. At Temwise we wanted to share the internal apps we use on a personal level, to keep ourselves organised.

## Features

### Time Tracker
Track your time across leisure, business, and job activities with easy-to-use timers.

### Flora
Your mindful task companion. Manage tasks with priority levels (high/medium/low), time estimates, and beautiful organization.

### Objectives
Set and track your lifetime and time-based goals to achieve what matters most.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Backend**: Supabase (via Lovable Cloud)
- **Mobile**: Capacitor for iOS and Android
- **State Management**: TanStack Query

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- For iOS development: macOS with Xcode 15+
- For Android development: Android Studio

### Installation


```bash
# Install dependencies
npm i

# Run development server
npm run dev

# Build for production
npm run build
```

### Mobile App Development

#### iOS Setup
See the complete [iOS Setup Guide](./ios-setup.md) for detailed App Store submission instructions.

Quick start:
```bash
npm install
npm run build
npx cap add ios      # First time only
npx cap sync ios
npx cap open ios
```

#### Android Setup
```bash
npx cap add android  # First time only
npx cap sync android
npx cap open android
```

## Configuration

### App Details
- **App Name**: Temwise Daily Planner
- **Bundle ID**: com.Temwise.dailyplanner
- **Description**: All in one app to streamline the chaos
- **Features**: Push notifications enabled

### Push Notifications
Push notifications are configured for native mobile apps. Implementation in `src/lib/pushNotifications.ts`.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── flora/          # Flora task management components
│   ├── objectives/     # Objectives components
│   └── ui/             # Base UI components (shadcn)
├── pages/              # Page components
│   ├── flora/          # Flora pages
│   └── objectives/     # Objectives pages
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and services
└── integrations/       # Third-party integrations
    └── supabase/       # Supabase client and types
```

## Development with Lovable

**URL**: https://lovable.dev/projects/b29fefc5-ce5e-4160-9f39-c30ba0397ffa

Simply visit the Lovable Project and start prompting. Changes made via Lovable will be committed automatically to this repo.

## Deployment

### Web App
Click the **Publish** button in Lovable to deploy updates.


### iOS/Android App Store
Follow the [iOS Setup Guide](./ios-setup.md) for complete submission instructions.

## Custom Domain

You can connect a custom domain in Project > Settings > Domains.

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Support

For support: [Contact Temwise]

---

Built with ❤️ by Temwise using [Lovable](https://lovable.dev)
