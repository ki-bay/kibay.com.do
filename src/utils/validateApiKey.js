
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Validates an API key by calling the manage-api-keys edge function.
 * Used primarily for validating keys on the frontend or intermediate layers.
 * Edge functions typically invoke the validate action directly.
 */
export const validateApiKey = async (apiKey) => {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  try {
    const { data, error } = await supabase.functions.invoke('manage-api-keys', {
      body: {
        action: 'validate',
        validate_key: apiKey
      }
    });

    if (error) throw error;
    if (!data?.valid) throw new Error('Invalid API key');

    return data.key;
  } catch (error) {
    console.error('API Key validation failed:', error);
    throw new Error('Unauthorized: Invalid or expired API key');
  }
};
