import { BookStatus, SortOption } from '@/types/book';
import { BookOpen, BookMarked, CheckCircle, Shuffle, ArrowDownAZ, Clock, Layers, Filter, ChevronDown, Tag, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface ShelfControlsProps {
  activeFilters: BookStatus[];
  onFilterChange: (filters: BookStatus[]) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  onShuffle: () => void;
  bookCounts: Record<BookStatus, number>;
  /** All unique categories from the books */
  availableCategories?: string[];
  /** Currently selected category filters */
  activeCategoryFilters?: string[];
  /** Callback when category filters change */
  onCategoryFilterChange?: (categories: string[]) => void;
  /** Compact mode - hides labels, shows only icons */
  compact?: boolean;
  /** Show share button (only on own shelf) */
  showShare?: boolean;
  /** The share URL to copy (defaults to current URL if not provided) */
  shareUrl?: string;
}

const statusFilters: { status: BookStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'reading', label: 'Reading', icon: <BookOpen className="w-4 h-4" /> },
  { status: 'want-to-read', label: 'Want to Read', icon: <BookMarked className="w-4 h-4" /> },
  { status: 'read', label: 'Read', icon: <CheckCircle className="w-4 h-4" /> },
];

const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'random', label: 'Random', icon: <Shuffle className="w-4 h-4" /> },
  { value: 'recent', label: 'Recently Added', icon: <Clock className="w-4 h-4" /> },
  { value: 'status-author', label: 'Status + Author', icon: <Layers className="w-4 h-4" /> },
  { value: 'author-title', label: 'Author + Title', icon: <ArrowDownAZ className="w-4 h-4" /> },
];

export function ShelfControls({
  activeFilters,
  onFilterChange,
  sortOption,
  onSortChange,
  onShuffle,
  bookCounts,
  availableCategories = [],
  activeCategoryFilters = [],
  onCategoryFilterChange,
  compact = false,
  showShare = false,
  shareUrl,
}: ShelfControlsProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const urlToCopy = shareUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const toggleFilter = (status: BookStatus) => {
    if (activeFilters.includes(status)) {
      onFilterChange(activeFilters.filter((f) => f !== status));
    } else {
      onFilterChange([...activeFilters, status]);
    }
  };

  const toggleCategoryFilter = (category: string) => {
    if (!onCategoryFilterChange) return;
    if (activeCategoryFilters.includes(category)) {
      onCategoryFilterChange(activeCategoryFilters.filter((c) => c !== category));
    } else {
      onCategoryFilterChange([...activeCategoryFilters, category]);
    }
  };

  const isAllSelected = activeFilters.length === 0;
  const totalBooks = bookCounts.reading + bookCounts['want-to-read'] + bookCounts.read;

  // Get label for filter button
  const getFilterLabel = () => {
    if (isAllSelected) return 'All';
    if (activeFilters.length === 1) {
      return statusFilters.find(f => f.status === activeFilters[0])?.label || 'Filter';
    }
    return `${activeFilters.length} filters`;
  };

  // Get count for filter button
  const getFilterCount = () => {
    if (isAllSelected) return totalBooks;
    return activeFilters.reduce((sum, status) => sum + bookCounts[status], 0);
  };

  // Get label for category filter button
  const getCategoryLabel = () => {
    if (activeCategoryFilters.length === 0) return 'Genre';
    if (activeCategoryFilters.length === 1) {
      const cat = activeCategoryFilters[0];
      return cat.length > 12 ? cat.slice(0, 12) + '…' : cat;
    }
    return `${activeCategoryFilters.length} genres`;
  };

  // Show category filter only if there are categories available
  const showCategoryFilter = availableCategories.length > 0 && onCategoryFilterChange;

  return (
    <div className="flex items-center gap-1.5 flex-nowrap">
      {/* Filter Popover */}
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "gap-1.5 sm:gap-2",
              !isAllSelected && "border-primary/50 bg-primary/5"
            )}
          >
            <Filter className="w-4 h-4" />
            {!compact && <span className="hidden sm:inline">{getFilterLabel()}</span>}
            <span className="text-xs opacity-70">({getFilterCount()})</span>
            <ChevronDown className={cn(
              "w-3 h-3 transition-transform",
              filterOpen && "rotate-180"
            )} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 bg-popover" align="start">
          <div className="flex flex-col gap-1">
            <Button
              variant={isAllSelected ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onFilterChange([])}
              className="justify-start gap-2"
            >
              All
              <span className="text-xs opacity-70 ml-auto">({totalBooks})</span>
            </Button>
            
            {statusFilters.map((filter) => {
              const isActive = activeFilters.includes(filter.status);
              return (
                <Button
                  key={filter.status}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => toggleFilter(filter.status)}
                  className={cn("justify-start gap-2", !isActive && "hover:bg-accent hover:text-accent-foreground")}
                >
                  {filter.icon}
                  {filter.label}
                  <span className="text-xs opacity-70 ml-auto">({bookCounts[filter.status]})</span>
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Category/Genre Filter Popover */}
      {showCategoryFilter && (
        <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "gap-1.5 sm:gap-2",
                activeCategoryFilters.length > 0 && "border-primary/50 bg-primary/5"
              )}
            >
              <Tag className="w-4 h-4" />
              {!compact && <span className="hidden sm:inline">{getCategoryLabel()}</span>}
              {activeCategoryFilters.length > 0 && (
                <span className="text-xs opacity-70">({activeCategoryFilters.length})</span>
              )}
              <ChevronDown className={cn(
                "w-3 h-3 transition-transform",
                categoryOpen && "rotate-180"
              )} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 bg-popover" align="start">
            <div className="flex flex-col gap-1">
              <Button
                variant={activeCategoryFilters.length === 0 ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onCategoryFilterChange?.([])}
                className="justify-start gap-2"
              >
                All Genres
              </Button>
              
              <ScrollArea className="max-h-[240px]">
                <div className="flex flex-col gap-1 pr-2">
                  {availableCategories.map((category) => {
                    const isActive = activeCategoryFilters.includes(category);
                    return (
                      <Button
                        key={category}
                        variant={isActive ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => toggleCategoryFilter(category)}
                        className="justify-start gap-2 text-left"
                      >
                        <span className="truncate">
                          {category.length > 25 ? category.slice(0, 25) + '…' : category}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {sortOptions.find((o) => o.value === sortOption)?.icon}
            {!compact && (
              <span className="hidden sm:inline">
                {sortOptions.find((o) => o.value === sortOption)?.label}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover">
          {sortOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => option.value === 'random' ? onShuffle() : onSortChange(option.value)}
              className="gap-2"
            >
              {option.icon}
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share Button */}
      {showShare && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="gap-1.5"
          title="Copy shelf link"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
          {!compact && <span className="hidden sm:inline">Share</span>}
        </Button>
      )}
    </div>
  );
}
