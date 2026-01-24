import { ShelfSkin } from '@/types/book';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface SkinPickerProps {
  currentSkin: ShelfSkin;
  onSkinChange: (skin: ShelfSkin) => void;
}

const skins: { id: ShelfSkin; name: string; color: string }[] = [
  { id: 'oak', name: 'Oak', color: 'bg-shelf-oak' },
  { id: 'walnut', name: 'Walnut', color: 'bg-shelf-walnut' },
  { id: 'white', name: 'White', color: 'bg-shelf-white' },
  { id: 'dark', name: 'Dark', color: 'bg-shelf-dark' },
];

export function SkinPicker({ currentSkin, onSkinChange }: SkinPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Shelf:</span>
      <div className="flex gap-1.5">
        {skins.map((skin) => (
          <button
            key={skin.id}
            onClick={() => onSkinChange(skin.id)}
            className={cn(
              'w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center',
              skin.color,
              currentSkin === skin.id
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-transparent hover:border-muted-foreground/30'
            )}
            title={skin.name}
          >
            {currentSkin === skin.id && (
              <Check className={cn(
                'w-4 h-4',
                skin.id === 'dark' ? 'text-white' : 'text-foreground'
              )} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
