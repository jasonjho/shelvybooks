import { cn } from '@/lib/utils';
import { NoteColor } from '@/hooks/useBookNotes';

interface PostItNoteProps {
  content: string;
  color?: NoteColor;
  className?: string;
  size?: 'sm' | 'md';
}

const colorClasses: Record<NoteColor, string> = {
  yellow: 'bg-yellow-200 shadow-yellow-300/50',
  pink: 'bg-pink-200 shadow-pink-300/50',
  blue: 'bg-sky-200 shadow-sky-300/50',
  green: 'bg-lime-200 shadow-lime-300/50',
};

const foldColorClasses: Record<NoteColor, string> = {
  yellow: 'border-l-yellow-300 border-b-yellow-300',
  pink: 'border-l-pink-300 border-b-pink-300',
  blue: 'border-l-sky-300 border-b-sky-300',
  green: 'border-l-lime-300 border-b-lime-300',
};

export function PostItNote({ content, color = 'yellow', className, size = 'sm' }: PostItNoteProps) {
  const sizeClasses = size === 'sm' 
    ? 'w-14 h-14 text-[7px] p-1.5' 
    : 'w-24 h-24 text-[10px] p-2';

  return (
    <div
      className={cn(
        'relative rotate-[-4deg] shadow-md transition-transform hover:rotate-0 hover:scale-110',
        colorClasses[color],
        sizeClasses,
        className
      )}
      style={{
        fontFamily: "'Caveat', cursive",
      }}
    >
      {/* Folded corner effect */}
      <div
        className={cn(
          'absolute top-0 right-0 w-3 h-3 bg-white/80',
          'border-l-[6px] border-b-[6px] border-l-transparent border-b-transparent',
          foldColorClasses[color]
        )}
        style={{
          clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
        }}
      />
      
      {/* Note content */}
      <p className="text-gray-700 leading-tight line-clamp-4 break-words">
        {content}
      </p>
    </div>
  );
}
