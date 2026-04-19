import { supabase } from '@/lib/customSupabaseClient';

export const subscribeToNewsletter = async ({ firstName, email, source, tags = [] }) => {
  try {
    // 1. Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('Please enter a valid email address.');
    }

    // 2. Prepare data
    const subscriberData = {
      email,
      first_name: firstName,
      source,
      tags: JSON.stringify(tags),
    };

    // 3. Insert into newsletter_subscribers table
    // We use upsert to handle potential duplicates (if email is unique) or just insert
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .upsert(subscriberData, { onConflict: 'email' });

    if (insertError) {
      console.error('Newsletter insert error:', insertError);
      throw new Error('Could not subscribe. Please try again.');
    }

    // 4. If user is logged in, also update their user_preferences (optional but requested)
    // We try to get current session silently
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('user_preferences').upsert(
        {
          user_id: session.user.id,
          newsletter_signup: true,
          preferences_json: { tags, source },
        },
        { onConflict: 'user_id' },
      );
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};