import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useOrderHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id) // Security: Ensure we only get current user's orders
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to load order history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();

    // Optional: Realtime subscription for order status updates
    const subscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `user_id=eq.${user?.id}`
      }, (payload) => {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === payload.new.id ? payload.new : order
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, fetchOrders]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Filter by Status
    if (filterStatus !== 'All') {
      result = result.filter(order => order.status === filterStatus);
    }

    // Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order => 
        order.order_number.toLowerCase().includes(query) ||
        order.total_amount.toString().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'highest_amount':
          return b.total_amount - a.total_amount;
        case 'lowest_amount':
          return a.total_amount - b.total_amount;
        default:
          return 0;
      }
    });

    return result;
  }, [orders, filterStatus, searchQuery, sortOption]);

  const getOrderItems = async (orderId) => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
        
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching order items:', err);
      throw err;
    }
  };

  return {
    orders: filteredOrders,
    loading,
    error,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    refreshOrders: fetchOrders,
    getOrderItems
  };
};