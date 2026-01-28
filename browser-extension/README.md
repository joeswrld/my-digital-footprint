# FixSense Browser Extension

A companion browser extension that detects when you sign up for new services and automatically syncs them to your FixSense dashboard.

## Features

- **Real-time Signup Detection**: Monitors page URLs and content for signup patterns
- **Automatic Confirmation**: Detects when a signup is successfully completed
- **Dashboard Sync**: Automatically sends detected signups to your FixSense account
- **Visual Notifications**: Shows a notification when a new signup is detected

## Installation

### Chrome / Edge / Brave

1. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/` for Edge)
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `browser-extension` folder from this project
5. The FixSense icon should appear in your browser toolbar

### Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in the `browser-extension` folder

## Usage

1. **Sign in to FixSense**: Click the extension icon and sign in to connect your account
2. **Browse normally**: The extension will automatically detect when you sign up for new services
3. **View detections**: Click the extension icon to see pending signups
4. **Sync to dashboard**: Detected signups are automatically synced, or you can manually sync them

## How It Works

1. The extension monitors navigation events for URLs containing signup-related keywords
2. When a potential signup is detected, it activates the content script to watch for confirmation
3. The content script looks for success messages like "Welcome", "Account created", etc.
4. Once confirmed, the signup is synced to your FixSense dashboard via the API

## Privacy

- The extension only monitors URL patterns, not page content (except when confirming signups)
- No passwords or sensitive form data is ever captured
- All data is synced securely to your FixSense account using your authentication token
- You can view and manage all detected accounts in your dashboard

## Creating Extension Icons

You'll need to create icon files for the extension. Create these files in an `icons` folder:

- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

Use the FixSense shield logo for consistency.

## Development

The extension consists of:

- `manifest.json` - Extension configuration
- `background.js` - Service worker for URL monitoring and API communication
- `content.js` - Content script for detecting signup confirmations
- `popup.html/js` - Extension popup UI

## Troubleshooting

**Extension not detecting signups:**
- Make sure you're on a signup/registration page
- Check that the page URL contains signup-related keywords

**Syncing not working:**
- Click the extension icon and verify you're connected
- Make sure you're signed in to FixSense in your browser

**Icons not showing:**
- Create the required icon files as described above
