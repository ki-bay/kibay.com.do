import React from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';

const OrderFiltersBar = ({
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
  sortOption,
  setSortOption
}) => {
  const { t } = useTranslation('orderFilters');

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6 bg-foreground/5 p-4 rounded-xl border border-foreground/10">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/40 w-4 h-4" />
        <Input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-background/50 border-foreground/10 text-foreground placeholder:text-foreground/30"
        />
      </div>

      <div className="flex gap-4">
        {/* Status Filter */}
        <div className="relative min-w-[140px]">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/40 w-4 h-4" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full pl-9 h-10 bg-background/50 border border-foreground/10 rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-mango-500 appearance-none cursor-pointer"
          >
            <option value="All">{t('status.all')}</option>
            <option value="awaiting_payment">{t('status.awaiting_payment')}</option>
            <option value="paid">{t('status.paid')}</option>
            <option value="Pending">{t('status.Pending')}</option>
            <option value="Processing">{t('status.Processing')}</option>
            <option value="processing">{t('status.processing')}</option>
            <option value="Shipped">{t('status.Shipped')}</option>
            <option value="shipped">{t('status.shipped')}</option>
            <option value="Delivered">{t('status.Delivered')}</option>
            <option value="Cancelled">{t('status.Cancelled')}</option>
          </select>
        </div>

        {/* Sort Options */}
        <div className="relative min-w-[160px]">
          <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/40 w-4 h-4" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="w-full pl-9 h-10 bg-background/50 border border-foreground/10 rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-mango-500 appearance-none cursor-pointer"
          >
            <option value="newest">{t('sort.newest')}</option>
            <option value="oldest">{t('sort.oldest')}</option>
            <option value="highest_amount">{t('sort.highest_amount')}</option>
            <option value="lowest_amount">{t('sort.lowest_amount')}</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default OrderFiltersBar;