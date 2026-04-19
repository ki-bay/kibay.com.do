import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Search, Filter, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { useBlogAdmin } from '@/hooks/useBlogAdmin';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatBlogDate } from '@/utils/blogUtils';

const BlogAdminPage = () => {
  const { fetchAllPosts, deletePost, deleteMultiplePosts, publishPost, unpublishPost } = useBlogAdmin();
  const { toast } = useToast();
  
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, published, draft
  const [selectedPosts, setSelectedPosts] = useState([]);

  const loadPosts = async () => {
    setIsLoading(true);
    const { data, error } = await fetchAllPosts();
    if (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load posts" });
    } else {
      setPosts(data || []);
      setFilteredPosts(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    let result = posts;
    
    // Filter by Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.title?.toLowerCase().includes(lowerSearch) || 
        p.author?.full_name?.toLowerCase().includes(lowerSearch)
      );
    }

    // Filter by Status
    if (statusFilter !== 'all') {
      const isPublished = statusFilter === 'published';
      result = result.filter(p => p.published === isPublished);
    }

    setFilteredPosts(result);
  }, [searchTerm, statusFilter, posts]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPosts(filteredPosts.map(p => p.id));
    } else {
      setSelectedPosts([]);
    }
  };

  const handleSelectPost = (id) => {
    setSelectedPosts(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this post? This cannot be undone.")) return;
    
    const { error } = await deletePost(id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Post deleted" });
      loadPosts();
      setSelectedPosts(prev => prev.filter(pId => pId !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedPosts.length} posts? This cannot be undone.`)) return;
    
    const { error } = await deleteMultiplePosts(selectedPosts);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: `${selectedPosts.length} posts deleted` });
      loadPosts();
      setSelectedPosts([]);
    }
  };

  const togglePublishStatus = async (post) => {
    const action = post.published ? unpublishPost : publishPost;
    const { error } = await action(post.id);
    
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: `Post ${post.published ? 'unpublished' : 'published'}` });
      loadPosts();
    }
  };

  return (
    <>
      <Helmet>
        <title>Blog Admin - Kibay Espumante</title>
      </Helmet>
      <Navigation />
      
      <div className="min-h-screen bg-slate-900 pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Blog Dashboard</h1>
              <p className="text-white/60 text-sm">Manage your stories, news, and updates.</p>
            </div>
            <Link to="/admin/blog/create">
              <Button className="bg-mango-500 hover:bg-mango-600 text-white shadow-lg shadow-mango-500/20">
                <Plus className="w-4 h-4 mr-2" /> Create New Post
              </Button>
            </Link>
          </div>

          {/* Controls */}
          <div className="bg-slate-800 rounded-xl border border-white/10 p-4 mb-6 flex flex-col md:flex-row justify-between gap-4">
            <div className="flex gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input 
                  type="text" 
                  placeholder="Search posts..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-mango-500 text-sm"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-mango-500"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
              </select>
            </div>

            {selectedPosts.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in duration-300">
                <span className="text-white/60 text-sm mr-2">{selectedPosts.length} selected</span>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
                </Button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-slate-800 rounded-xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900/50 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 w-12">
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0}
                        className="rounded border-white/20 bg-slate-700 text-mango-500 focus:ring-mango-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-sm font-medium text-white/60">Title</th>
                    <th className="px-6 py-4 text-sm font-medium text-white/60">Author</th>
                    <th className="px-6 py-4 text-sm font-medium text-white/60">Category</th>
                    <th className="px-6 py-4 text-sm font-medium text-white/60">Status</th>
                    <th className="px-6 py-4 text-sm font-medium text-white/60">Date</th>
                    <th className="px-6 py-4 text-sm font-medium text-white/60 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-white/40">Loading posts...</td>
                    </tr>
                  ) : filteredPosts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-white/40">
                        {searchTerm ? 'No posts match your search.' : 'No blog posts found. Start writing!'}
                      </td>
                    </tr>
                  ) : (
                    filteredPosts.map(post => (
                      <tr key={post.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedPosts.includes(post.id)}
                            onChange={() => handleSelectPost(post.id)}
                            className="rounded border-white/20 bg-slate-700 text-mango-500 focus:ring-mango-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-white line-clamp-1">{post.title}</div>
                          <div className="text-xs text-white/40 font-mono mt-1 truncate max-w-[200px]">{post.slug}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
                              {post.author?.full_name?.charAt(0) || 'U'}
                            </div>
                            <span className="text-sm text-white/80">{post.author?.full_name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-700 text-white/80">
                            {post.category?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                             onClick={() => togglePublishStatus(post)}
                             className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                              post.published 
                                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' 
                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20'
                            }`}
                          >
                            {post.published ? (
                              <><CheckCircle className="w-3 h-3" /> Published</>
                            ) : (
                              <><XCircle className="w-3 h-3" /> Draft</>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">
                          {formatBlogDate(post.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Link to={`/blog/${post.slug}`} target="_blank">
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-mango-400" title="View Live">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link to={`/admin/blog/${post.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-400" title="Edit">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(post.id)}
                              className="h-8 w-8 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Footer Pagination (Simple for now) */}
            <div className="px-6 py-4 border-t border-white/10 bg-slate-900/30 text-xs text-white/40 flex justify-between">
              <span>Showing {filteredPosts.length} of {posts.length} posts</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default BlogAdminPage;