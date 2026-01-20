# Deploying Life Tracker to Digital Ocean

This guide walks you through deploying the Life Tracker application to Digital Ocean App Platform.

## Prerequisites

- Digital Ocean account
- Git repository (GitHub, GitLab, or Bitbucket)
- Docker installed locally (for testing)

## Deployment Options

### Option 1: Digital Ocean App Platform (Recommended)

App Platform is a Platform-as-a-Service (PaaS) that automatically builds and deploys your application.

#### Step 1: Push Code to Git Repository

```bash
git add .
git commit -m "Add Digital Ocean deployment configuration"
git push origin main
```

#### Step 2: Create App in Digital Ocean

1. Log in to [Digital Ocean](https://cloud.digitalocean.com/)
2. Click **Create** → **Apps**
3. Choose your Git provider and connect your repository
4. Select the `Life_Tracker` repository and `main` branch
5. Digital Ocean will auto-detect the Dockerfile

#### Step 3: Configure the App

The `.do/app.yaml` file contains the configuration, but you can also configure via the UI:

- **Name**: `life-tracker`
- **Region**: Choose closest to your users (e.g., `NYC`, `SFO`, `AMS`)
- **Instance Size**: `Basic (512 MB RAM, 1 vCPU)` - Costs ~$5/month
- **Environment Variables**: Already configured in app.yaml

#### Step 4: Review and Deploy

1. Review the configuration
2. Click **Create Resources**
3. Wait for the build and deployment (3-5 minutes)
4. Access your app at the provided URL (e.g., `https://life-tracker-xxxxx.ondigitalocean.app`)

---

### Option 2: Digital Ocean Droplet (Advanced)

For more control, deploy on a Droplet (virtual private server).

#### Step 1: Create Droplet

1. Create a new Droplet with Docker pre-installed
2. SSH into your droplet

#### Step 2: Clone and Build

```bash
git clone <your-repo-url>
cd Life_Tracker
docker build -t life-tracker .
docker run -d -p 80:3000 --name life-tracker-app life-tracker
```

#### Step 3: Set Up Nginx (Optional)

Configure Nginx as a reverse proxy for better performance and SSL support.

---

## Environment Variables

In production, the following environment variables are automatically configured:

- `NODE_ENV=production`
- `PORT=3000` (or whatever Digital Ocean assigns)

No additional configuration needed for the basic setup.

---

## Important Notes

> **⚠️ Data Persistence Warning**
> 
> The current application uses JSON file storage (`server/db.json`). This means:
> - **Data will be lost** when the container restarts
> - **Not suitable** for production use with important data
> 
> **Recommended:** Migrate to a proper database (PostgreSQL, MongoDB, or SQLite with volume mounting) before deploying to production.

---

## Updating Your Deployment

After making changes to your code:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

Digital Ocean App Platform will automatically rebuild and redeploy your application.

---

## Costs

### App Platform Pricing
- **Basic Plan**: ~$5/month (512 MB RAM, 1 vCPU)
- **Professional Plan**: ~$12/month (1 GB RAM, 1 vCPU)

### Droplet Pricing
- **Basic Droplet**: Starting at $4/month

---

## Testing Before Deployment

### Test Production Build Locally

```bash
# Build production bundle
npm run build

# Test with Docker
docker build -t life-tracker-test .
docker run -p 3000:3000 life-tracker-test
```

Open `http://localhost:3000` in your browser to verify everything works.

---

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure `npm run build` works locally

### App Not Loading
- Check the Digital Ocean logs in the App Platform dashboard
- Verify environment variables are set correctly

### API Calls Failing
- In production, the API is served from the same origin
- Ensure CORS is configured correctly in `server/index.js`

---

## Next Steps

After deployment:
1. Test all features on the live site
2. Set up a custom domain (optional)
3. Consider adding SSL certificate (automatic with App Platform)
4. Migrate to a real database for data persistence
5. Set up monitoring and alerts
