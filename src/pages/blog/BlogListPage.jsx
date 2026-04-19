import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Calendar, Clock, User, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Card from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatBlogDate, calculateReadingTime } from '@/utils/blogUtils';

const BlogListPage = () => {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: catData } = await supabase.from('blog_categories').select('*');
      if (catData) setCategories(catData);

      const { data: postData, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          author:users(full_name),
          category:blog_categories(name, slug)
        `)
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) console.error(error);
      if (postData) setPosts(postData);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || post.category?.slug === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Helmet>
        <title>Blog - Kibay Espumante - Premium Sparkling Wine</title>
        <meta name="description" content="Read the latest news, stories, and updates from Kibay Espumante." />
      </Helmet>
      
      <Navigation />
      
      <main className="min-h-screen bg-stone-50 pt-24 pb-16 font-lato">
        <div className="container mx-auto px-4">
          
          {/* Header Section */}
          <div className="text-center mb-16 mt-8">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-stone-900 mb-4"
            >
              The Kibay Journal
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-stone-600 max-w-2xl mx-auto font-light"
            >
              Stories about our journey, winemaking, and the sparkling lifestyle.
            </motion.p>
          </div>

          {/* Search and Filter Section */}
          <div className="sticky top-20 z-30 bg-stone-50/95 backdrop-blur-sm py-4 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-5xl mx-auto p-4 bg-white rounded-2xl shadow-sm border border-stone-200">
              <div className="relative w-full md:w-1/3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
                <input 
                  type="text" 
                  placeholder="Search articles..." 
                  className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-mango-500 transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto no-scrollbar items-center">
                <span className="text-sm text-stone-400 flex items-center gap-1 mr-2"><Filter className="w-3 h-3" /> Filters:</span>
                <Button 
                  variant={selectedCategory === 'All' ? "default" : "outline"}
                  onClick={() => setSelectedCategory('All')}
                  className={`whitespace-nowrap rounded-full px-4 h-8 text-xs ${selectedCategory === 'All' ? 'bg-mango-500 hover:bg-mango-600' : 'text-stone-600'}`}
                >
                  All
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.slug ? "default" : "outline"}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`whitespace-nowrap rounded-full px-4 h-8 text-xs ${selectedCategory === cat.slug ? 'bg-mango-500 hover:bg-mango-600' : 'text-stone-600'}`}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Blog Grid */}
          <div className="max-w-7xl mx-auto">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-96 bg-stone-200 animate-pulse rounded-2xl"></div>
                ))}
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.map((post, index) => {
                  const readTime = post.reading_time || calculateReadingTime(post.content);
                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link to={`/blog/${post.slug}`} className="group h-full block">
                        <Card className="h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col border-stone-200 bg-white rounded-2xl">
                          <div className="h-56 overflow-hidden bg-stone-100 relative">
                            {post.featured_image_url ? (
                              <img 
                                src={post.featured_image_url} 
                                alt={post.title} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-300">
                                <span className="text-4xl font-serif opacity-50">K</span>
                              </div>
                            )}
                            {post.category && (
                              <Badge className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm text-stone-900 shadow-sm font-normal">
                                {post.category.name}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="p-6 flex flex-col flex-grow">
                            <div className="flex items-center gap-4 text-xs text-stone-500 mb-3 font-medium uppercase tracking-wide">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-mango-500" />
                                {formatBlogDate(post.created_at)}
                              </span>
                              <span className="w-1 h-1 bg-stone-300 rounded-full"></span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-mango-500" />
                                {readTime} min read
                              </span>
                            </div>
                            
                            <h3 className="text-xl font-bold text-stone-900 mb-3 group-hover:text-mango-600 transition-colors line-clamp-2">
                              {post.title}
                            </h3>
                            
                            <p className="text-stone-600 text-sm line-clamp-3 mb-6 font-light leading-relaxed">
                              {post.excerpt}
                            </p>
                            
                            <div className="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-600">
                                  {post.author?.full_name?.charAt(0) || 'K'}
                                </div>
                                <span className="text-xs font-medium text-stone-500">
                                  {post.author?.full_name || 'Kibay Team'}
                                </span>
                              </div>
                              <span className="text-mango-600 text-sm font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                Read Story <ChevronRight className="h-3 w-3" />
                              </span>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 shadow-sm">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Search className="w-6 h-6 text-stone-400" />
                </div>
                <h3 className="text-xl font-medium text-stone-900 mb-2">No stories found</h3>
                <p className="text-stone-500 max-w-sm mx-auto">
                  We couldn't find any articles matching your search. Try different keywords or clear your filters.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-6 border-mango-500 text-mango-600 hover:bg-mango-50"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('All');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default BlogListPage;