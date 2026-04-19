import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import BlogPostCard from '@/components/BlogPostCard';
import BlogSubscribeForm from '@/components/BlogSubscribeForm';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const PublicBlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublishedPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPosts(data || []);
      } catch (err) {
        console.error('Error fetching blog posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublishedPosts();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation />
      
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            The <span className="text-mango-500">Ki-BAY</span> Journal
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Stories, updates, and insights from the world of tropical flavors.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
             {/* Skeletons */}
             {[1, 2, 3].map(i => (
               <div key={i} className="bg-slate-800 rounded-xl h-[400px] animate-pulse border border-white/5" />
             ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <BlogPostCard post={post} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-800/50 rounded-2xl border border-white/5 mb-20">
            <h3 className="text-2xl font-bold text-white mb-2">Coming Soon</h3>
            <p className="text-white/60">We haven't published any stories yet. Check back soon!</p>
          </div>
        )}
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <BlogSubscribeForm />
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicBlogPage;