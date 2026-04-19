# Social Media Integration Setup Guide (Make.com)

Follow these steps to configure the Kibay blog to auto-post to social channels using Make.com (formerly Integromat).

## 1. Prerequisites
- A [Make.com](https://www.make.com/) account (Free tier is usually sufficient for testing, but Paid plans may be needed for higher volumes).
- Access to Kibay's Facebook Business Manager (for Instagram & Facebook).
- A TikTok Business Account.
- Supabase Project URL and Service Role Key.

## 2. Make.com Workflow Setup
1.  **Create a New Scenario:**
    - Log in to Make.com and click "Create a new scenario".
    - Rename it to "Kibay Blog Social Poster".

2.  **Add Webhook Trigger:**
    - Click the big "+" button.
    - Search for "Webhooks".
    - Select "Custom webhook".
    - Click "Add", name it "Kibay Blog Trigger", and click "Save".
    - **Copy the Webhook URL** provided (e.g., `https://hook.us1.make.com/abcdef...`).
    - You will need this for the `MAKE_WEBHOOK_URL` environment variable.

3.  **Configure Router:**
    - Add a "Router" module after the Webhook to split the flow into three paths (Instagram, Facebook, TikTok).

## 3. Platform Connections

### Instagram & Facebook (Meta)
1.  **Add Facebook Pages Module:**
    - In one branch, add the "Facebook Pages" module -> "Create a Post".
    - Connection: Click "Add" and log in with the Facebook account that manages the Kibay Page.
    - Page: Select the Kibay page.
    - Message: Map the `description` or `title` from the webhook payload.
    - Link: Map the `blog_url`.
2.  **Add Instagram for Business Module:**
    - In another branch, add "Instagram for Business" -> "Create a Photo Post".
    - Connection: Select the same Meta connection or add new.
    - Page: Select the Instagram Business account linked to your page.
    - Photo URL: Map the `featured_image_url`.
    - Caption: Map `title` + `description` + hashtags. Note: Instagram requires an image aspect ratio between 4:5 and 1.91:1.

### TikTok
1.  **Add TikTok for Business Module:**
    - In the third branch, add "TikTok for Business" -> "Create a Post".
    - Connection: Click "Add" and authorize with your TikTok Business account.
    - Post Type: "Video" (Note: TikTok *requires* video content. Make sure your blog post logic handles this, or use an image-to-video converter tool within Make.com before this step if you only have images).

## 4. Environment Variables
1.  **Add Secret to Supabase:**
    - Go to your Supabase Project settings -> Edge Functions -> Secrets.
    - Add a new secret: `MAKE_WEBHOOK_URL`.
    - Value: Paste the URL you copied in Step 2.

## 5. Testing & Verification
1.  **Run Once:**
    - Click "Run once" in Make.com to start listening for data.
2.  **Trigger from Dashboard:**
    - Go to the Kibay Blog Admin Dashboard.
    - Publish a post or click the "Retry Social Posting" button on an existing post.
3.  **Verify Payload:**
    - In Make.com, you should see the data arrive at the Webhook module.
    - Ensure `blog_post_id`, `title`, `description`, `featured_image_url`, and `blog_url` are present.
4.  **Save Scenario:**
    - Once configured and tested, switch the scenario to **"ON"** to run automatically.

## 6. Troubleshooting
-   **"Failed" Status in Dashboard:**
    - This usually means the Edge Function couldn't reach Make.com (check `MAKE_WEBHOOK_URL`).
    - If the status is "sent_to_workflow" but nothing appears on social media, check the Make.com scenario history for errors (e.g., invalid image format, expired tokens).
-   **TikTok Errors:**
    - Ensure your TikTok account is a "Business Account" and you are using the correct module. Personal accounts do not support API posting.