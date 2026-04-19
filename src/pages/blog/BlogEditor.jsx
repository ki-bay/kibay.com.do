import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import Navigation from '@/components/Navigation';
import BlogPostForm from '@/components/BlogPostForm';

const BlogEditor = () => {
  const { id } = useParams();
  const [initialData, setInitialData] = useState(null);
  const [isLoading, setIsLoading] = useState(!!id);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const fetchPost = async () => {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error("Error fetching post:", error);
          navigate('/admin/blog');
        } else {
          setInitialData(data);
        }
        setIsLoading(false);
      };
      fetchPost();
    }
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-mango-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{id ? 'Edit Post' : 'New Post'} - Kibay Admin</title>
      </Helmet>
      <Navigation />
      <div className="min-h-screen bg-slate-900 pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <BlogPostForm 
            initialData={initialData} 
            isEditMode={!!id} 
          />
        </div>
      </div>
    </>
  );
};

export default BlogEditor;