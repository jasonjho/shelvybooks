import { BookStatus, SortOption } from '@/types/book';
import { BookOpen, BookMarked, CheckCircle, Shuffle, ArrowDownAZ, Clock, Layers, Filter, ChevronDown } from 'lucide-react';
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

interface ShelfControlsProps {
  activeFilters: BookStatus[];
  onFilterChange: (filters: BookStatus[]) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  onShuffle: () => void;
  bookCounts: Record<BookStatus, number>;
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
}: ShelfControlsProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const toggleFilter = (status: BookStatus) => {
    if (activeFilters.includes(status)) {
      onFilterChange(activeFilters.filter((f) => f !== status));
    } else {
      onFilterChange([...activeFilters, status]);
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Filter Popover */}
      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "gap-2",
              !isAllSelected && "border-primary/50 bg-primary/5"
            )}
          >
            <Filter className="w-4 h-4" />
            <span>{getFilterLabel()}</span>
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
                  className="justify-start gap-2"
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

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
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
