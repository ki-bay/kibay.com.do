
# Social Media Automation Setup Guide

This document explains the end-to-end workflow for automating blog post creation and cross-platform social media publishing.

## 1. Database Schema

The automation utilizes two main tables:
*   `blog_posts`: Stores the article title, content, image URL, and SEO keywords.
*   `social_media_posts`: Linked to `blog_posts` via `blog_post_id`. Stores platform specific content (`facebook`, `instagram`, `x`), publishing status (`pending`, `posted`, `failed`), and any error messages.
*   `automation_logs`: A system logging table tracking webhook receipts, edge function executions, success states, and errors for auditing.

## 2. API Credentials Setup

To enable automated posting, you must obtain API keys for each platform and store them securely in Supabase Secrets. They can be managed via the Admin Dashboard > Social Settings (simulated storage).

**Facebook & Instagram:**
1. Go to the Meta for Developers portal.
2. Create an App with "Business" type.
3. Add the Facebook Login and Instagram Graph API products.
4. Generate a Page Access Token with `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, and `instagram_content_publish` permissions.
5. Identify your Facebook Page ID and Instagram Business Account ID via the Graph API Explorer.

**X (Twitter):**
1. Go to the X Developer Portal.
2. Create a Project and an App.
3. Set User authentication settings to Read and Write.
4. Generate Consumer Keys (API Key & Secret) and Authentication Tokens (Access Token & Secret).

## 3. Make.com Integration

1.  Use the `Google Drive - Watch Files in Folder` module.
2.  Route the output to an `HTTP - Make a Request` module.
3.  Target: `https://[PROJECT].supabase.co/functions/v1/webhook-handler`
4.  Payload matches `docs/MAKE_COM_WEBHOOK_CONFIG.json`.

## 4. Testing the Workflow

1.  Upload an image to the designated Google Drive folder.
2.  Make.com triggers the webhook.
3.  Navigate to **Admin Panel > Social Dashboard** (`/admin/social-media`).
4.  Verify a new draft Blog Post is created.
5.  Verify new Social Media Posts are generated and their status indicates `posted`.
6.  If any post shows `failed`, review the `automation_logs` for details, adjust credentials in Settings, and click **Retry**.

## 5. Monitoring and Security

*   **Logs:** Accessible at `/admin/social-media/logs`. Export to CSV for external audits.
*   **Security:** Never expose access tokens to the frontend. Ensure Row Level Security (RLS) is strictly enforced on `automation_logs` and `social_media_posts` to `info@kibay.com.do` (Admin) and Service Role keys only.
