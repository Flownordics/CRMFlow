# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/85df679c-8d46-4d80-8a90-1e1374e0e569

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/85df679c-8d46-4d80-8a90-1e1374e0e569) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev

# OR for Netlify Functions (PDF generation, email sending, etc.):
npm run dev:netlify
```

**Important for Netlify Functions:**

If you're using `npm run dev:netlify` and get 500 errors from functions (like PDF generation), you need to set up environment variables:

1. Create a `.env` file in the project root:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

2. See `docs/NETLIFY_DEV_SETUP.md` for detailed instructions.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/85df679c-8d46-4d80-8a90-1e1374e0e569) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

---

# CRMFlow - Production Ready

## Recent Updates (October 17, 2025)

### ✅ Newly Implemented Features

We've completed implementation of previously incomplete features:

1. **Document Storage Backend** - Upload and manage files with Supabase Storage
2. **Trash Bin Restore** - Restore deleted quotes and orders from Settings
3. **Email Templates** - Customizable email templates with variable replacement
4. **Recurring Events** - Support for recurring calendar events (RRULE format)
5. **Two-Way Calendar Sync** - Bidirectional sync with Google Calendar via webhooks

### 📚 Documentation

- **Implementation Details:** `docs/FEATURES_IMPLEMENTATION_SUMMARY.md`
- **Deployment Guide:** `DEPLOYMENT_STEPS_OCT_2025.md`
- **Document Storage:** `docs/DOCUMENT_STORAGE.md`
- **Calendar Sync:** `docs/TWO_WAY_CALENDAR_SYNC.md`

### 🚀 Deployment Required

Before using new features in production:

```bash
# 1. Deploy Edge Function
supabase functions deploy document-upload

# 2. Create Storage Bucket
# Via Dashboard: Storage → New bucket → Name: "documents" (Private)

# 3. Verify Calendar Webhook
supabase functions list | grep google-calendar-webhook

# 4. Deploy frontend
npm run build
```

See `DEPLOYMENT_STEPS_OCT_2025.md` for complete step-by-step guide.

### ✨ Features Now Available

- **📁 Document Upload:** Attach files to companies, deals, and people
- **♻️ Restore from Trash:** Recover deleted quotes and orders
- **📧 Email Templates:** Use customizable templates for professional emails
- **🔄 Calendar Sync:** Changes in Google Calendar automatically sync to CRMFlow
- **🔁 Recurring Events:** Create repeating calendar events (daily, weekly, monthly)

All features include full error handling, RLS security, and comprehensive tests.
