import React from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

const OrderFiltersBar = ({ 
  filterStatus, 
  setFilterStatus, 
  searchQuery, 
  setSearchQuery, 
  sortOption, 
  setSortOption 
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
        <Input 
          type="text" 
          placeholder="Search by Order # or Amount..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-slate-900/50 border-white/10 text-white placeholder:text-white/30"
        />
      </div>

      <div className="flex gap-4">
        {/* Status Filter */}
        <div className="relative min-w-[140px]">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full pl-9 h-10 bg-slate-900/50 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-mango-500 appearance-none cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Sort Options */}
        <div className="relative min-w-[160px]">
          <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="w-full pl-9 h-10 bg-slate-900/50 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-mango-500 appearance-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest_amount">Highest Amount</option>
            <option value="lowest_amount">Lowest Amount</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default OrderFiltersBar;