import { BookStatus, SortOption } from '@/types/book';
import { BookOpen, BookMarked, CheckCircle, Shuffle, ArrowDownAZ, Clock, Layers, Filter, ChevronDown, Tag, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  /** Spread buttons to fill available width */
  spread?: boolean;
  /** Search query for filtering books */
  searchQuery?: string;
  /** Callback when search query changes */
  onSearchChange?: (query: string) => void;
}

const statusFilters: { status: BookStatus; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { status: 'reading', label: 'Reading', shortLabel: 'Reading', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { status: 'want-to-read', label: 'Want to Read', shortLabel: 'Want', icon: <BookMarked className="w-3.5 h-3.5" /> },
  { status: 'read', label: 'Read', shortLabel: 'Read', icon: <CheckCircle className="w-3.5 h-3.5" /> },
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
  spread = false,
  searchQuery = '',
  onSearchChange,
}: ShelfControlsProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Auto-focus mobile search when expanded
  useEffect(() => {
    if (mobileSearchExpanded && mobileSearchRef.current) {
      mobileSearchRef.current.focus();
    }
  }, [mobileSearchExpanded]);

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
    if (activeCategoryFilters.length === 0) return 'Tags';
    if (activeCategoryFilters.length === 1) {
      const cat = activeCategoryFilters[0];
      return cat.length > 12 ? cat.slice(0, 12) + '…' : cat;
    }
    return `${activeCategoryFilters.length} tags`;
  };

  // Show category filter only if there are categories available
  const showCategoryFilter = availableCategories.length > 0 && onCategoryFilterChange;

  return compact ? (
    /* ── Mobile: stacked layout ── */
    <div className={cn("flex flex-col gap-2 w-full", spread && "w-full")}>
      {/* Row 1: Search + Shelf dropdown + Sort */}
      <div className="flex items-center gap-1.5">
        {onSearchChange && (
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={mobileSearchRef}
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 pl-8 pr-8 text-sm bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Shelf filter dropdown */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-2.5 gap-1 shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0 touch-manipulation",
                !isAllSelected && "border-primary/50 bg-primary/5"
              )}
            >
              <Filter className="w-4 h-4" />
              <span className="text-xs">{getFilterLabel()}</span>
              <ChevronDown className={cn(
                "w-3 h-3 transition-transform",
                filterOpen && "rotate-180"
              )} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 bg-popover" align="end" side="bottom" collisionPadding={16}>
            <div className="flex flex-col gap-1">
              <Button
                variant={isAllSelected ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { onFilterChange([]); setFilterOpen(false); }}
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

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-2.5 gap-1 shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0 touch-manipulation">
              {sortOptions.find((o) => o.value === sortOption)?.icon}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" className="bg-popover">
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
      </div>

      {/* Row 2: Tags (only shown when tags are available) */}
      {showCategoryFilter && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
          {/* Tags popover */}
          <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors touch-manipulation",
                  activeCategoryFilters.length > 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                <Tag className="w-3.5 h-3.5" />
                {activeCategoryFilters.length > 0
                  ? `${activeCategoryFilters.length} tag${activeCategoryFilters.length > 1 ? 's' : ''}`
                  : 'Tags'}
                <ChevronDown className={cn(
                  "w-3 h-3 transition-transform",
                  categoryOpen && "rotate-180"
                )} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[calc(100vw-2rem)] max-w-[280px] p-2 bg-popover"
              align="start"
              side="bottom"
              collisionPadding={16}
            >
              <div className="flex flex-col gap-1">
                <Button
                  variant={activeCategoryFilters.length === 0 ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onCategoryFilterChange?.([])}
                  className="justify-start gap-2"
                >
                  All Tags
                </Button>

                <ScrollArea className="max-h-[200px]">
                  <div className="flex flex-col gap-0.5 pr-2">
                    {availableCategories.map((category) => {
                      const isActive = activeCategoryFilters.includes(category);
                      return (
                        <Button
                          key={category}
                          variant={isActive ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => toggleCategoryFilter(category)}
                          className="justify-start gap-2 text-left h-8"
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

          {/* Active tag chips (dismissible) */}
          {activeCategoryFilters.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategoryFilter(cat)}
              className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors touch-manipulation"
            >
              <span className="max-w-[80px] truncate">{cat}</span>
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  ) : (
    /* ── Desktop: original separate controls ── */
    <div className={cn("flex items-center gap-1.5 flex-nowrap", spread && "w-full")}>
      {/* Search Dialog */}
      {onSearchChange && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchDialogOpen(true)}
            className={cn(
              "gap-1.5",
              searchQuery && "border-primary/50 bg-primary/5",
              spread && "flex-1"
            )}
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">{searchQuery || 'Search'}</span>
            {searchQuery && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSearchChange('');
                }}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </Button>

          <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Search your shelf</DialogTitle>
              </DialogHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by title or author..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 pr-10"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? `Filtering books matching "${searchQuery}"` : 'Type to filter your books'}
              </p>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Filter Popover */}
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-1.5 sm:gap-2 focus-visible:ring-0 focus-visible:ring-offset-0",
              !isAllSelected && "border-primary/50 bg-primary/5",
              spread && "flex-1"
            )}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">{getFilterLabel()}</span>
            <span className="text-xs opacity-70">({getFilterCount()})</span>
            <ChevronDown className={cn(
              "w-3 h-3 transition-transform",
              filterOpen && "rotate-180"
            )} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 bg-popover" align="start" side="bottom" collisionPadding={16}>
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
                "gap-1.5 sm:gap-2 focus-visible:ring-0 focus-visible:ring-offset-0",
                activeCategoryFilters.length > 0 && "border-primary/50 bg-primary/5",
                spread && "flex-1"
              )}
            >
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">{getCategoryLabel()}</span>
              {activeCategoryFilters.length > 0 && (
                <span className="text-xs opacity-70">({activeCategoryFilters.length})</span>
              )}
              <ChevronDown className={cn(
                "w-3 h-3 transition-transform",
                categoryOpen && "rotate-180"
              )} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 bg-popover" align="start" side="bottom" collisionPadding={16}>
            <div className="flex flex-col gap-1">
              <Button
                variant={activeCategoryFilters.length === 0 ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onCategoryFilterChange?.([])}
                className="justify-start gap-2"
              >
                All Tags
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
          <Button variant="outline" size="sm" className={cn("gap-2 focus-visible:ring-0 focus-visible:ring-offset-0", spread && "flex-1")}>
            {sortOptions.find((o) => o.value === sortOption)?.icon}
            <span className="hidden sm:inline">
              {sortOptions.find((o) => o.value === sortOption)?.label}
            </span>
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
    </div>
  );
}
