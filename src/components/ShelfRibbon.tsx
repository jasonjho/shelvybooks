import { cn } from '@/lib/utils';

interface ShelfRibbonProps {
  username: string;
  className?: string;
}

/**
 * A decorative ribbon that hangs from the top of the bookshelf
 * to indicate whose shelf is being viewed.
 */
export function ShelfRibbon({ username, className }: ShelfRibbonProps) {
  return (
    <div className={cn(
      "absolute top-0 left-1/2 -translate-x-1/2 z-10 pointer-events-none",
      "animate-in fade-in slide-in-from-top-2 duration-300",
      className
    )}>
      {/* Ribbon body */}
      <div className="relative">
        {/* Ribbon top fold (appears tucked behind shelf crown) */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-amber-700 dark:bg-amber-800 rounded-t-sm" />
        
        {/* Main ribbon */}
        <div className="relative bg-gradient-to-b from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-800 px-4 py-2 shadow-lg">
          {/* Ribbon texture overlay */}
          <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,transparent,transparent_1px,rgba(0,0,0,0.1)_1px,rgba(0,0,0,0.1)_2px)]" />
          
          {/* Content */}
          <div className="relative text-center">
            <span className="text-amber-100 text-xs font-medium tracking-wide drop-shadow-sm">
              Viewing
            </span>
            <div className="text-white text-sm font-semibold tracking-wide drop-shadow-md -mt-0.5">
              @{username}
            </div>
          </div>
          
          {/* Side shadows for 3D effect */}
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-r from-black/20 to-transparent" />
          <div className="absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-l from-black/20 to-transparent" />
        </div>
        
        {/* Ribbon tail (pointed bottom) */}
        <div className="relative flex justify-center">
          <div 
            className="w-0 h-0 border-l-[28px] border-r-[28px] border-t-[16px] border-l-transparent border-r-transparent border-t-amber-700 dark:border-t-amber-800"
            style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}
          />
        </div>
      </div>
    </div>
  );
}
