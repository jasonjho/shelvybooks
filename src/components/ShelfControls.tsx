import { BookStatus, SortOption } from '@/types/book';
import { BookOpen, BookMarked, CheckCircle, Shuffle, ArrowDownAZ, Clock, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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
  const toggleFilter = (status: BookStatus) => {
    if (activeFilters.includes(status)) {
      // Remove filter
      onFilterChange(activeFilters.filter((f) => f !== status));
    } else {
      // Add filter
      onFilterChange([...activeFilters, status]);
    }
  };

  const isAllSelected = activeFilters.length === 0;
  const totalBooks = bookCounts.reading + bookCounts['want-to-read'] + bookCounts.read;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant={isAllSelected ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange([])}
          className="gap-1.5"
        >
          All
          <span className="text-xs opacity-70">({totalBooks})</span>
        </Button>
        
        {statusFilters.map((filter) => {
          const isActive = activeFilters.includes(filter.status);
          return (
            <Button
              key={filter.status}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFilter(filter.status)}
              className={cn(
                'gap-1.5 transition-all',
                !isActive && !isAllSelected && 'opacity-60'
              )}
            >
              {filter.icon}
              <span className="hidden sm:inline">{filter.label}</span>
              <span className="text-xs opacity-70">({bookCounts[filter.status]})</span>
            </Button>
          );
        })}
      </div>

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
