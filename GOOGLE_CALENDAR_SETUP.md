# Google Calendar Integration Setup

This document provides step-by-step instructions for setting up Google Calendar integration with the Scherbring Family Recipe app.

## Overview

The Google Calendar integration allows users to:
- Sync meal plan events directly to their Google Calendar
- Choose which calendar to sync to
- Check for conflicts and handle them appropriately
- Maintain the existing .ics download functionality

## Prerequisites

1. A Google Cloud Console project
2. Google Calendar API enabled
3. OAuth2 Web Application credentials configured

## Google Cloud Console Setup

### Step 1: Create or Select a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Either create a new project or select an existing one
3. Note your project ID for later use

### Step 2: Enable Google Calendar API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on "Google Calendar API" and click "Enable"

### Step 3: Create OAuth2 Web Application Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" for user type
   - Fill in the required app information
   - Add your email to test users during development
4. Choose "Web application" as the application type
5. Configure the following:
   - **Name**: "Scherbring Family Recipe - Web Client"
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (for development - where your frontend dev server runs)
     - `https://yourdomain.com` (for production - your actual website domain)
   - **Authorized redirect URIs**: 
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production - your actual website domain)
6. Click "Create"
7. Copy the **Client ID** - you'll need this for configuration

**Important Notes:**
- Replace `yourdomain.com` with your actual production frontend domain
- The production URLs must use HTTPS (Google OAuth2 requirement)
- If you're using a subdomain like `app.yourdomain.com`, use that exact subdomain
- If you're using a service like Netlify, Vercel, or Azure Static Web Apps, use their provided domain (e.g., `https://yourapp.netlify.app`)

**Examples of production domains:**
- `https://recipes.yourdomain.com`
- `https://yourapp.netlify.app`
- `https://yourapp.vercel.app`
- `https://proud-beach-123abc.azurestaticapps.net`

## Environment Configuration

### Frontend Configuration

Add the following variable to your frontend `.env` file:

```bash
# Google OAuth Configuration for Calendar Integration
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.googleusercontent.com
```

### Backend Configuration (Optional)

If you want to validate tokens server-side, add to your backend `.env` file:

```bash
# Google OAuth Client ID for token validation (optional)
GOOGLE_CLIENT_ID=your-google-oauth-client-id.googleusercontent.com
```

## Installation

### Backend Dependencies

The required Python packages are already added to `requirements.txt`:

```bash
google-auth==2.29.0
google-auth-oauthlib==1.2.0
google-auth-httplib2==0.2.0
google-api-python-client==2.120.0
```

Install them with:

```bash
cd backend
pip install -r requirements.txt
```

### Frontend Dependencies

The Google Identity Services library is loaded via script tag in `index.html`. No additional npm packages are required.

## Testing the Integration

### Development Testing

1. Start the backend server: `cd backend && uvicorn main:app --reload`
2. Start the frontend server: `cd frontend && npm run dev`
3. Create a meal plan with some recipes
4. Click the "Calendar" button on the meal plan detail page
5. Test both the Google Calendar sync and .ics download options

### Summary

You only need:
1. ✅ OAuth2 Web Application credentials
2. ✅ Google Calendar API enabled  
3. ✅ Frontend environment variable with Client ID

You do NOT need:
- ❌ Service Account
- ❌ Service Account JSON file
- ❌ Complex backend configuration

## Packages Required

### Backend (Already Installed)
- `google-auth==2.29.0`
- `google-auth-oauthlib==1.2.0`
- `google-auth-httplib2==0.2.0`
- `google-api-python-client==2.120.0`

### Frontend
- No additional packages needed (uses Google Identity Services script)
