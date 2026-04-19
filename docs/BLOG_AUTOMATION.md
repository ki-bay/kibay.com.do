# Blog Automation & Management System

## Overview
The Kibay blog system is designed for ease of use and powerful automation. It features a complete Admin Dashboard for creating, editing, and managing posts, along with integration points for N8N automation to handle social media distribution and content ingestion.

## Manual Blog Management

### 1. Accessing the Admin Dashboard
- Navigate to `/admin/blog` (or click "Blog Admin" in the footer if enabled for admins).
- You must be logged in to access this area.

### 2. Creating a Post
1. Click the **"Create New Post"** button.
2. **Title:** Enter a catchy title. The "Slug" will generate automatically.
3. **Featured Image:** Upload an image directly or paste a URL.
4. **Content:** Write your post using the editor. HTML is supported.
5. **Tags:** Add comma-separated tags (e.g., *wine, summer, recipe*).
6. **Schedule:** Optionally set a date/time to publish in the future.
7. Click **"Save Draft"** to save without publishing, or **"Publish"** to go live immediately.

### 3. Bulk Actions
- In the dashboard list view, select multiple posts using the checkboxes.
- Use the **"Delete Selected"** button to remove multiple posts at once.

---

## N8N Automation Integration

The system is designed to work with N8N for three key workflows:

### Workflow 1: Google Drive to Blog Draft
*Automatically creates a draft blog post when you upload an image to a specific Google Drive folder.*

**Trigger:** Google Drive (New File in Folder)
**Action:** 
1. Get file content/metadata.
2. Upload image to Supabase Storage (via API).
3. Create new record in `blog_posts` table with status `draft`.
4. Send email notification to Admin.

### Workflow 2: Published Post to Social Media
*Automatically posts to Facebook, Instagram, and TikTok when a blog post is published.*

**Trigger:** Supabase (Database Change: `UPDATE blog_posts WHERE published=true`)
**Action:**
1. Filter: Check if `published` changed from `false` to `true`.
2. Format content for each platform (shorten text, get image URL).
3. **Facebook API:** Create Page Post.
4. **Instagram Business API:** Create Photo Post.
5. **TikTok API:** (Requires specific video content, usually skips or posts link to bio).

### Workflow 3: Scheduled Publishing
*Runs periodically to check for scheduled posts.*

**Trigger:** N8N Cron (Every hour)
**Action:**
1. Query Supabase: `SELECT * FROM blog_posts WHERE published=false AND scheduled_publish_at <= NOW()`
2. Loop through results.
3. Update each: `SET published=true`.
4. Trigger "Workflow 2" logic for social sharing.

---

## Credentials Setup

### Google Drive
1. Create a Project in Google Cloud Console.
2. Enable Google Drive API.
3. Create OAuth Client ID.
4. Add credentials to N8N.

### Social Media
- **Facebook/Instagram:** Create an App in Meta for Developers. Add "Instagram Graph API" and "Facebook Graph API".
- **TikTok:** Apply for TikTok for Developers access.

## Troubleshooting

- **Image Upload Fails:** Check Supabase Storage bucket policies. `blog-images` bucket must be public and writable by authenticated users.
- **Slug Collision:** If you see a slug error, try changing the title slightly or editing the slug field manually.
- **Automation Not Triggering:** Check N8N execution logs. Ensure the Supabase Realtime trigger is active.