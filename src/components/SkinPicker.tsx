import { ShelfSkin } from '@/types/book';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface SkinPickerProps {
  currentSkin: ShelfSkin;
  onSkinChange: (skin: ShelfSkin) => void;
}

const skins: { id: ShelfSkin; name: string; gradient: string }[] = [
  { 
    id: 'oak', 
    name: 'Oak', 
    gradient: 'bg-gradient-to-br from-amber-600 to-amber-800' 
  },
  { 
    id: 'walnut', 
    name: 'Walnut', 
    gradient: 'bg-gradient-to-br from-amber-900 to-stone-900' 
  },
  { 
    id: 'white', 
    name: 'White Oak', 
    gradient: 'bg-gradient-to-br from-stone-200 to-stone-400' 
  },
  { 
    id: 'dark', 
    name: 'Ebony', 
    gradient: 'bg-gradient-to-br from-slate-700 to-slate-900' 
  },
];

export function SkinPicker({ currentSkin, onSkinChange }: SkinPickerProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-white/60 hidden sm:inline">Wood finish:</span>
      <div className="flex gap-2">
        {skins.map((skin) => (
          <button
            key={skin.id}
            onClick={() => onSkinChange(skin.id)}
            className={cn(
              'w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center shadow-lg',
              skin.gradient,
              currentSkin === skin.id
                ? 'border-white ring-2 ring-white/30 scale-110'
                : 'border-white/20 hover:border-white/50 hover:scale-105'
            )}
            title={skin.name}
          >
            {currentSkin === skin.id && (
              <Check className={cn(
                'w-4 h-4',
                skin.id === 'white' ? 'text-stone-700' : 'text-white'
              )} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
