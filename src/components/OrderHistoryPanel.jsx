import React, { useEffect, useState } from 'react';
import { useOrderHistory } from '@/hooks/useOrderHistory';
import OrderFiltersBar from './OrderFiltersBar';
import OrderCard from './OrderCard';
import { ShoppingBag, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const OrderHistoryPanel = () => {
  const { 
    orders, 
    loading, 
    error,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    refreshOrders
  } = useOrderHistory();

  const [missingOrderWarning, setMissingOrderWarning] = useState(false);

  // Task 6: Data sync verification
  useEffect(() => {
    if (!loading && orders) {
      const lastOrderId = localStorage.getItem('last_order_id');
      if (lastOrderId) {
        const found = orders.some(o => o.id === lastOrderId);
        // If we have a last order ID but it's not in the list, show warning
        // Clear flag if found to stop checking
        if (found) {
          localStorage.removeItem('last_order_id');
          setMissingOrderWarning(false);
        } else {
           // Only show warning if list is loaded and we actually expected an order
           setMissingOrderWarning(true);
        }
      }
    }
  }, [orders, loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/40">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-mango-500" />
        <p className="font-light">Loading your order history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 px-4 rounded-xl bg-red-500/5 border border-red-500/10">
        <p className="text-red-400 mb-4">Unable to load orders.</p>
        <Button onClick={refreshOrders} variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/10">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-normal text-white">Order History</h2>
        <span className="text-sm text-white/40 font-light">
          {orders.length} Order{orders.length !== 1 && 's'} Found
        </span>
      </div>

      {missingOrderWarning && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-yellow-500 font-medium text-sm">Recent Order Processing</h4>
            <p className="text-yellow-500/80 text-sm font-light">
              We detected a recent purchase that isn't showing up yet. It might still be processing. 
              Please refresh in a few moments.
            </p>
            <Button 
              variant="link" 
              className="text-yellow-500 p-0 h-auto mt-1 underline"
              onClick={refreshOrders}
            >
              Refresh List
            </Button>
          </div>
        </div>
      )}

      <OrderFiltersBar 
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOption={sortOption}
        setSortOption={setSortOption}
      />

      <div className="space-y-4">
        {orders.length > 0 ? (
          orders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))
        ) : (
          <div className="text-center py-16 px-4 bg-white/5 rounded-xl border border-white/5 border-dashed">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-white font-medium mb-2">No orders found</h3>
            <p className="text-white/40 text-sm font-light mb-6 max-w-xs mx-auto">
              {searchQuery || filterStatus !== 'All' 
                ? "Try adjusting your filters to see more results." 
                : "Looks like you haven't placed any orders yet."}
            </p>
            {!searchQuery && filterStatus === 'All' && (
              <Link to="/shop">
                <Button className="bg-mango-500 hover:bg-mango-600 text-white font-normal">
                  Start Shopping
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistoryPanel;