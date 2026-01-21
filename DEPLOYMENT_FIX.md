# Fixing Google Service Account Credentials

## Problem
Your application is failing on deployment because it can't find the service account credentials. The error shows:
```
❌ Service account file not found at: /app/server/service-account.json
```

This is because we removed the credentials file from git for security reasons, and your deployment platform needs these credentials set as environment variables.

## Solution

### Step 1: Generate New Service Account Credentials

> **IMPORTANT:** Since your old credentials were exposed in git history, you should create new ones.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Find your service account or create a new one with these permissions:
   - Google Sheets API access
   - Google Calendar API access (if used)
5. Click on the service account → **Keys** tab
6. Click **Add Key** → **Create New Key**
7. Choose **JSON** format
8. Download the file and save it as `server/service-account.json` in your project

### Step 2: Convert to Environment Variable Format

Run the helper script to convert your JSON to a single-line string:

```bash
cd server
node convert-service-account.js
```

This will output the properly formatted environment variable.

### Step 3: Update Local .env File

Copy the output from the script and add it to your `.env` file:

```env
PORT=3001
GOOGLE_SHEET_ID=1CsQnXAA2xGby5vRIQuryo8C5YP1jdyxj_JkLR4rWAWI
GEMINI_API_KEY=AIzaSyBkHWrH4tMtVXsIHrV3Sg7MFuL3Crlumpc
GOOGLE_CALENDAR_ID=miladb19999@gmail.com
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

### Step 4: Add to Deployment Platform

Based on your error logs, it looks like you're deploying to DigitalOcean App Platform. Here's how to add the environment variable:

#### DigitalOcean App Platform:
1. Go to your app in the [DigitalOcean Dashboard](https://cloud.digitalocean.com/apps)
2. Click on your app → **Settings** → **App-Level Environment Variables** (or component-level)
3. Click **Edit**
4. Add new variable:
   - **Key:** `GOOGLE_SERVICE_ACCOUNT_JSON`
   - **Value:** (paste the single-line JSON from the script - WITHOUT the surrounding quotes)
5. Check **Encrypt** to keep it secure
6. Click **Save**
7. Redeploy your app

> [!CAUTION]
> **Common Mistake:** The value must be valid JSON starting with `{"type":"service_account"...}`. 
> 
> **DO NOT** paste:
> - A commit hash (e.g., `7adcb077a1a3d6c4c74eac684276d489c03b59ad`)
> - A file path (e.g., `/app/server/service-account.json`)
> - Multi-line JSON with line breaks
> 
> **DO** paste the complete single-line JSON string that looks like:
> ```
> {"type":"service_account","project_id":"your-project","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"..."}
> ```

#### Other Platforms:

**Heroku:**
```bash
heroku config:set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

**Vercel:**
```bash
vercel env add GOOGLE_SERVICE_ACCOUNT_JSON
# Then paste the value when prompted
```

Or add via dashboard: Settings → Environment Variables

### Step 5: Verify

After redeploying, check your application logs. You should see:
```
🔑 Using credentials from GOOGLE_SERVICE_ACCOUNT_JSON environment variable
🔄 Initializing Google Sheets DB...
✅ Google Sheets DB Initialized Successfully
```

## Additional Notes

- The `service-account.json` file is in `.gitignore` so it won't be committed
- Never commit credentials to git
- Always use environment variables for sensitive data
- Consider rotating credentials periodically for security
