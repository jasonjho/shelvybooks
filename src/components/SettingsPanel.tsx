import { ShelfSettings, DecorDensity, ShelfSkin, BackgroundTheme } from '@/types/book';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Lamp, Trees, BookmarkMinus, Sparkles, Check, Image, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBackfillMetadata } from '@/hooks/useBackfillMetadata';
import { useAuth } from '@/contexts/AuthContext';

interface SettingsPanelProps {
  settings: ShelfSettings;
  onSettingsChange: (settings: Partial<ShelfSettings>) => void;
  currentSkin?: ShelfSkin;
  onSkinChange?: (skin: ShelfSkin) => void;
}

const skins: { id: ShelfSkin; name: string; gradient: string }[] = [
  { id: 'oak', name: 'Oak', gradient: 'bg-gradient-to-br from-amber-600 to-amber-800' },
  { id: 'walnut', name: 'Walnut', gradient: 'bg-gradient-to-br from-amber-900 to-stone-900' },
  { id: 'white', name: 'White Oak', gradient: 'bg-gradient-to-br from-stone-200 to-stone-400' },
  { id: 'dark', name: 'Ebony', gradient: 'bg-gradient-to-br from-slate-700 to-slate-900' },
];

const toggleSettings = [
  {
    key: 'showAmbientLight' as const,
    label: 'Ambient Lighting',
    description: 'Warm overhead glow',
    icon: Lamp,
  },
  {
    key: 'showWoodGrain' as const,
    label: 'Wood Grain',
    description: 'Detailed shelf texture',
    icon: Sparkles,
  },
  {
    key: 'showBookends' as const,
    label: 'Bookends',
    description: 'Decorative book holders',
    icon: BookmarkMinus,
  },
  {
    key: 'showPlant' as const,
    label: 'Decor',
    description: 'Plants and decorative items',
    icon: Trees,
  },
];

const densityOptions: { value: DecorDensity; label: string; description: string }[] = [
  { value: 'minimal', label: 'Minimal', description: 'Sparse, clean look' },
  { value: 'balanced', label: 'Balanced', description: 'Natural arrangement' },
  { value: 'cozy', label: 'Cozy', description: 'Lush, lived-in feel' },
];

const backgroundOptions: { value: BackgroundTheme; label: string; emoji: string }[] = [
  { value: 'office', label: 'Office', emoji: '🏢' },
  { value: 'library', label: 'Library', emoji: '📚' },
  { value: 'cozy', label: 'Cozy', emoji: '🏠' },
  { value: 'forest', label: 'Forest', emoji: '🌲' },
  { value: 'ocean', label: 'Ocean', emoji: '🌊' },
  { value: 'sunset', label: 'Sunset', emoji: '🌅' },
  { value: 'lavender', label: 'Lavender', emoji: '💜' },
  { value: 'space', label: 'Space', emoji: '🚀' },
];

export function SettingsPanel({ settings, onSettingsChange, currentSkin, onSkinChange }: SettingsPanelProps) {
  const { user } = useAuth();
  const { backfillMetadata, isBackfilling } = useBackfillMetadata();

  const handleBackfill = async () => {
    const result = await backfillMetadata();
    if (result && result.updated > 0) {
      // Reload the page to fetch updated books
      window.location.reload();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="bg-background/80 border-border text-foreground hover:bg-muted hover:text-foreground"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[80vh] overflow-y-auto" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-display font-medium text-sm">Shelf Customization</h4>
            <p className="text-xs text-muted-foreground">
              Toggle decorative elements
            </p>
          </div>
          
          <div className="space-y-3">
            {toggleSettings.map((setting) => (
              <div
                key={setting.key}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-secondary">
                    <setting.icon className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div className="space-y-0.5">
                    <Label 
                      htmlFor={setting.key}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {setting.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {setting.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={setting.key}
                  checked={settings[setting.key]}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ [setting.key]: checked })
                  }
                />
              </div>
            ))}
          </div>

          {/* Decor Density */}
          {settings.showPlant && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Trees className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Decor Density</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {densityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onSettingsChange({ decorDensity: option.value })}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors",
                      settings.decorDensity === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 hover:bg-secondary text-secondary-foreground"
                    )}
                  >
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Background Theme */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Background</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {backgroundOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onSettingsChange({ backgroundTheme: option.value })}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors",
                    settings.backgroundTheme === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 hover:bg-secondary text-secondary-foreground"
                  )}
                  title={option.label}
                >
                  <span className="text-base">{option.emoji}</span>
                  <span className="font-medium text-[10px]">{option.label}</span>
                </button>
              ))}
            </div>
          </div>


          {/* Wood Finish */}
          {currentSkin && onSkinChange && (
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-sm font-medium">Wood Finish</span>
              <div className="flex gap-2">
                {skins.map((skin) => (
                  <button
                    key={skin.id}
                    onClick={() => onSkinChange(skin.id)}
                    className={cn(
                      'w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center shadow-lg',
                      skin.gradient,
                      currentSkin === skin.id
                        ? 'border-primary ring-2 ring-primary/30 scale-110'
                        : 'border-border hover:border-primary/50 hover:scale-105'
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
          )}

          {/* Backfill Metadata - only show for logged in users */}
          {user && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="space-y-1">
                <span className="text-sm font-medium">Book Metadata</span>
                <p className="text-xs text-muted-foreground">
                  Fetch page counts, ISBNs, and descriptions for existing books
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackfill}
                disabled={isBackfilling}
                className="w-full gap-2"
              >
                {isBackfilling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Fetching metadata...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Update Book Metadata
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
