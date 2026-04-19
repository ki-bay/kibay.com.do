import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { calculateReadingTime } from '@/utils/blogUtils';

export const useBlogAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:users(full_name, email),
          category:blog_categories(name, slug)
        `)
        .order('created_at', { ascending: false });

      if (err) throw err;
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const createPost = useCallback(async (postData) => {
    setLoading(true);
    setError(null);
    try {
      // Calculate reading time before save
      const reading_time = calculateReadingTime(postData.content);
      
      const { data, error: err } = await supabase
        .from('blog_posts')
        .insert({ ...postData, reading_time })
        .select()
        .single();

      if (err) throw err;
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePost = useCallback(async (id, postData) => {
    setLoading(true);
    setError(null);
    try {
      // Recalculate reading time if content changed
      const reading_time = postData.content ? calculateReadingTime(postData.content) : undefined;
      const updatePayload = { ...postData };
      if (reading_time) updatePayload.reading_time = reading_time;
      
      // Update updated_at timestamp
      updatePayload.updated_at = new Date().toISOString();

      const { data, error: err } = await supabase
        .from('blog_posts')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (err) throw err;
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePost = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (err) throw err;
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteMultiplePosts = useCallback(async (ids) => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('blog_posts')
        .delete()
        .in('id', ids);

      if (err) throw err;
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const publishPost = useCallback(async (id) => {
    return updatePost(id, { published: true });
  }, [updatePost]);

  const unpublishPost = useCallback(async (id) => {
    return updatePost(id, { published: false });
  }, [updatePost]);

  const publishMultiplePosts = useCallback(async (ids) => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('blog_posts')
        .update({ published: true })
        .in('id', ids);

      if (err) throw err;
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  }, []);
  
  const unpublishMultiplePosts = useCallback(async (ids) => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('blog_posts')
        .update({ published: false })
        .in('id', ids);

      if (err) throw err;
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  const checkSlugExists = useCallback(async (slug, excludeId = null) => {
    try {
      let query = supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', slug);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data.length > 0;
    } catch (err) {
      console.error('Error checking slug:', err);
      return false;
    }
  }, []);

  return {
    loading,
    error,
    fetchAllPosts,
    createPost,
    updatePost,
    deletePost,
    deleteMultiplePosts,
    publishPost,
    unpublishPost,
    publishMultiplePosts,
    unpublishMultiplePosts,
    checkSlugExists
  };
};