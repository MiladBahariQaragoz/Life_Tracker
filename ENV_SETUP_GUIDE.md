# Environment Setup Guide

This guide explains how to configure the environment variables and credentials for the Life Tracker project.

## 1. Environment Variables (`.env`)

Create a file named `.env` in the root directory of the project (copy from `.env.example`).

### `PORT`
- **Description**: The port number on which the backend server will run.
- **Default value**: `3001`
- **Where to get**: You can modify this if port 3001 is pending in your system, otherwise `3001` is standard for this project's configuration.

### `DATABASE_URL`
- **Description**: Connection string for the database used by Prisma.
- **Default value (SQLite)**: `"file:./dev.db"`
- **Where to get**:
    - **SQLite**: No action needed. The database file will be created locally.
    - **PostgreSQL**: If you choose to use PostgreSQL, create a local database or use a hosted service (like Supabase, Neon, or generic Cloud SQL). The string format is: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`.

### `VITE_API_URL`
- **Description**: The URL the frontend uses to communicate with the backend.
- **Default value**: `"http://localhost:3001"`
- **Note**: Ensure this matches `http://localhost:<PORT>` from above.

## 2. Google Calendar Credentials (`service-account.json`)

The backend requires a Google Service Account to sync with Google Calendar. This file must be placed in the `server/` directory and named `service-account.json`.

### How to get `service-account.json`:

1.  **Go to Google Cloud Console**:
    -   Visit [https://console.cloud.google.com/](https://console.cloud.google.com/).
2.  **Create a Project**:
    -   Click the project dropdown (top left) and "New Project". Give it a name (e.g., "LifeTracker").
3.  **Enable Calendar API**:
    -   In the search bar, type "Google Calendar API" and select it.
    -   Click **Enable**.
4.  **Create Service Account**:
    -   Go to **IAM & Admin** > **Service Accounts**.
    -   Click **Create Service Account**.
    -   Name it (e.g., "calendar-sync").
    -   Grant it the **Owner** or **Editor** role (or specific Calendar API roles).
    -   Finish creation.
5.  **Generate Keys**:
    -   Click on the newly created service account email.
    -   Go to the **Keys** tab.
    -   Click **Add Key** > **Create new key**.
    -   Select **JSON**.
    -   This will download a JSON file to your computer.
6.  **Install**:
    -   Rename the downloaded file to `service-account.json`.
    -   Move it to the `server/` directory of this project (`c:\Users\milaa\Documents\Life_Tracker\server\service-account.json`).

### Important: Share Calendar with Service Account
For the integration to work, your personal Google Calendar must allow the service account to edit it.
1.  Open [Google Calendar](https://calendar.google.com/).
2.  Find your "Primary" calendar (usually your name) in the left sidebar.
3.  Click the three dots > **Settings and sharing**.
4.  Scroll to **Share with specific people or groups**.
5.  Click **Add people and groups**.
6.  Paste the **Service Account Email** (found in the JSON file or Google Cloud Console, e.g., `calendar-sync@project-id.iam.gserviceaccount.com`).
7.  Set permissions to **Make changes to events**.
8.  Send.

## Summary Checklist
- [ ] `.env` file created in root.
- [ ] `PORT` set (default 3001).
- [ ] `DATABASE_URL` set.
- [ ] `service-account.json` placed in `server/` directory.
- [ ] Google Calendar shared with Service Account email.
