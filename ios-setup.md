# iOS App Setup Guide - Temwise Daily Planner

## Prerequisites
- macOS with Xcode 15+ installed
- Apple Developer Account ($99/year for App Store submission)
- Node.js and npm installed

## Step 1: Export and Clone Your Project

1. In Lovable, click the **GitHub button** in the top right
2. Export your project to GitHub (or download as ZIP)
3. Clone/download to your local machine:
   ```bash
   git clone [your-repo-url]
   cd [your-project-folder]
   ```

## Step 2: Install Dependencies and Build

```bash
npm install
npm run build
```

## Step 3: Add iOS Platform

```bash
# Add iOS platform (run this only once)
npx cap add ios

# Sync your web app to the native project
npx cap sync ios
```

This creates an `ios/` folder with your Xcode project.

## Step 4: Configure iOS Project in Xcode

1. Open the iOS project:
   ```bash
   npx cap open ios
   ```

2. In Xcode, select your project in the left sidebar, then:

### General Tab:
   - **Display Name**: Temwise Daily Planner
   - **Bundle Identifier**: com.Temwise.dailyplanner
   - **Version**: 1.0.0
   - **Build**: 1
   - **Team**: Select your Apple Developer team
   - **Minimum Deployments**: iOS 13.0 or higher

### Signing & Capabilities Tab:
   - Enable **Automatically manage signing**
   - Select your **Team**
   - Add capability: **Push Notifications**
     - Click "+ Capability"
     - Search for "Push Notifications"
     - Add it

### Info Tab:
   - Add these permissions (Right-click Info.plist → Add Row):
     - **Privacy - Push Notifications Usage Description**: "We'll send you reminders and updates for your tasks and timers"

## Step 5: Add App Icons and Launch Screen

### App Icons:
1. In Xcode, go to **Assets.xcassets** → **AppIcon**
2. You need icons in these sizes (all PNG, no transparency):
   - 20pt: 40x40, 60x60
   - 29pt: 58x58, 87x87
   - 40pt: 80x80, 120x120
   - 60pt: 120x120, 180x180
   - 76pt: 76x76, 152x152
   - 83.5pt: 167x167
   - 1024pt: 1024x1024 (App Store)

**Quick tip**: Use a service like [AppIcon.co](https://appicon.co) to generate all sizes from one image.

### Launch Screen:
1. In Xcode, find **LaunchScreen.storyboard**
2. Customize the launch screen with your logo/branding, or use the default

## Step 6: Test on Simulator

```bash
npx cap run ios
```

Or in Xcode:
1. Select a simulator (e.g., iPhone 15 Pro)
2. Click the ▶️ Play button
3. Test all features, especially push notifications

## Step 7: Test on Physical Device

1. Connect your iPhone via USB
2. In Xcode, select your device from the device dropdown
3. Click ▶️ to run
4. If prompted, trust your developer certificate on the device:
   - Settings → General → VPN & Device Management → Trust

## Step 8: Configure Push Notifications Backend

Your app now has push notification capability, but to **send** notifications you need:

1. **APNs Auth Key** from Apple Developer Portal:
   - Go to https://developer.apple.com/account/resources/authkeys
   - Create a new key with "Apple Push Notifications service (APNs)"
   - Download the `.p8` file (save it securely!)

2. **Update your backend** to send push notifications:
   - Use the token from `getPushToken()` in `src/lib/pushNotifications.ts`
   - Store tokens in your Supabase database
   - Send notifications using APNs HTTP/2 API or a service like Firebase Cloud Messaging

## Step 9: Prepare for App Store Submission

### A. Create App Store Connect Record
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+ New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: Temwise Daily Planner
   - **Primary Language**: English
   - **Bundle ID**: com.Temwise.dailyplanner
   - **SKU**: temwise-daily-planner-001 (unique identifier)
   - **User Access**: Full Access

### B. Prepare App Store Assets
You'll need:
- **App Icon**: 1024x1024 PNG (no transparency)
- **Screenshots**:
  - iPhone 6.7" (1290x2796): 3-10 images
  - iPhone 6.5" (1284x2778): 3-10 images
  - iPhone 5.5" (1242x2208): 3-10 images
  - *Optional*: iPad Pro 12.9" screenshots
- **App Preview Videos** (optional but recommended): 15-30 seconds

**Screenshot Tips**:
- Show key features: Time Tracker, Flora tasks, Objectives
- Use device frames for professional look
- Add captions explaining features

### C. App Store Information
Prepare these details:
- **Name**: Temwise Daily Planner
- **Subtitle**: All in one app to streamline the chaos
- **Description**: 
  ```
  Temwise Daily Planner helps you organize your life with three powerful tools:

  TIME TRACKER
  Track time across leisure, business, and job activities with easy-to-use timers.

  FLORA
  Your mindful task companion. Manage tasks with priority levels, time estimates, and beautiful organization.

  OBJECTIVES
  Set and track lifetime goals and time-based objectives to achieve what matters most.

  At Temwise, we built this app to share the internal tools we use personally to stay organized and productive.

  Features:
  • Multiple timers with categories
  • Task management with priorities
  • Time estimates and tracking
  • Goal setting and tracking
  • Calendar integration
  • Cross-device sync
  • Beautiful, intuitive design
  ```
- **Keywords**: productivity, time tracker, task manager, goals, planner, organizer, timer
- **Support URL**: Your website or support email
- **Marketing URL**: Your marketing website (optional)
- **Privacy Policy URL**: **REQUIRED** - Create one at your domain

### D. Privacy Policy
You **must** provide a privacy policy. Here's a basic template you can customize:

```
Privacy Policy for Temwise Daily Planner

We collect:
- Email address for account creation
- Task and timer data you create
- Usage analytics to improve the app

We use Supabase for secure data storage. Your data is encrypted and never shared with third parties.

For questions: [your-email@example.com]
```

Host this on a public URL (your website, GitHub Pages, etc.)

### E. App Review Information
- **Contact Information**: Your email and phone
- **Demo Account**: If your app requires login, provide test credentials
- **Notes**: "Temwise Daily Planner is a productivity app combining time tracking, task management, and goal setting."

## Step 10: Archive and Upload

1. In Xcode, select **Any iOS Device** (not a simulator)
2. Menu: **Product** → **Archive**
3. Wait for archive to complete
4. In Organizer window:
   - Click **Distribute App**
   - Select **App Store Connect**
   - Click **Upload**
   - Follow the prompts
5. Wait for processing (5-30 minutes)

## Step 11: Submit for Review

1. In App Store Connect, go to your app
2. Click **+ Version** or **Prepare for Submission**
3. Fill in all required information:
   - Screenshots
   - Description
   - Keywords
   - Support URL
   - Privacy Policy
4. Select your uploaded build
5. Set pricing (Free or Paid)
6. Click **Submit for Review**

**Review time**: Usually 24-48 hours

## Step 12: After Approval

Once approved:
- App goes live on App Store
- Users can download via: https://apps.apple.com/app/idXXXXXXXXX

## Updating Your App

When you make changes to your web app in Lovable:

```bash
# Pull latest changes
git pull

# Build
npm run build

# Sync to iOS
npx cap sync ios

# Increment version in Xcode (e.g., 1.0.1, build 2)
# Archive and upload again
```

## Switching from Dev URL to Production

To change from the dev preview URL to your production URL:

1. Open `capacitor.config.ts`
2. Update the `server.url` to your production URL:
   ```typescript
   server: {
     url: 'https://yourdomain.com',
     cleartext: true
   }
   ```
3. Or remove the `server` section entirely to bundle the web app inside the native app

## Troubleshooting

### "No profiles for 'com.Temwise.dailyplanner' were found"
- Go to Xcode → Signing & Capabilities
- Make sure "Automatically manage signing" is checked
- Select your Team
- Xcode will create the profile

### "Could not launch 'App'"
- Clean build folder: Product → Clean Build Folder
- Restart Xcode
- Try a different simulator

### Push notifications not working
- Make sure you've added the Push Notifications capability
- Check that you've requested permissions in code
- For testing, use a real device (simulators can't receive APNs)

### "Unable to install on device"
- Check device iOS version matches minimum deployment target
- Trust developer certificate on device
- Try deleting app and reinstalling

## Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Developer Portal](https://developer.apple.com)
- [App Store Connect](https://appstoreconnect.apple.com)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

## Need Help?

If you encounter issues:
1. Check the [Capacitor Community Forum](https://forum.capacitorjs.com)
2. Review [Apple Developer Forums](https://developer.apple.com/forums/)
3. Search Stack Overflow for specific errors

---

**Important Notes:**
- **Never commit** your Apple Developer credentials or certificates to git
- Keep your `.p8` APNs key file secure
- Test thoroughly before each App Store submission
- Read App Store Review Guidelines to avoid rejection
- Plan for 2-5 day turnaround for each review cycle

Good luck with your App Store submission! 🚀
