import { ShelfSettings, DecorDensity, ShelfSkin, BackgroundTheme } from '@/types/book';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lamp, Trees, BookmarkMinus, Sparkles, Check, Image, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { useBooks } from '@/hooks/useBooks';

interface SettingsPanelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const themeOptions: { value: string; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function SettingsPanelDialog({ open, onOpenChange }: SettingsPanelDialogProps) {
  const { theme, setTheme } = useTheme();
  const { shelfSkin, setShelfSkin, settings, updateSettings } = useBooks();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 max-h-[85dvh] flex flex-col overflow-hidden">
        <DialogHeader className="px-4 pt-3 pb-2 flex-shrink-0">
          <DialogTitle>Shelf Settings</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 px-4 pb-4">
          <div className="space-y-3">
            {/* Wood Finish */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium">Wood Finish</span>
              <div className="flex gap-3 px-1">
                {skins.map((skin) => (
                  <button
                    key={skin.id}
                    onClick={() => setShelfSkin(skin.id)}
                    className={cn(
                      'w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center shadow-lg',
                      skin.gradient,
                      shelfSkin === skin.id
                        ? 'border-primary ring-2 ring-primary/30 scale-110'
                        : 'border-border hover:border-primary/50 hover:scale-105'
                    )}
                    title={skin.name}
                  >
                    {shelfSkin === skin.id && (
                      <Check className={cn(
                        'w-4 h-4',
                        skin.id === 'white' ? 'text-stone-700' : 'text-white'
                      )} />
                    )}
                  </button>
                ))}
              </div>
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
                      updateSettings({ [setting.key]: checked })
                    }
                  />
                </div>
              ))}
            </div>

            {/* Decor Density */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Trees className={cn("w-4 h-4", settings.showPlant ? "text-muted-foreground" : "text-muted-foreground/40")} />
                <span className={cn("text-sm font-medium", !settings.showPlant && "text-muted-foreground/60")}>Decor Density</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {densityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateSettings({ decorDensity: option.value })}
                    disabled={!settings.showPlant}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors",
                      settings.decorDensity === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 hover:bg-secondary text-secondary-foreground",
                      !settings.showPlant && "opacity-40 cursor-not-allowed hover:bg-secondary/50"
                    )}
                  >
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

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
                    onClick={() => updateSettings({ backgroundTheme: option.value })}
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

            {/* Theme Mode */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Theme</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors",
                      theme === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 hover:bg-secondary text-secondary-foreground"
                    )}
                  >
                    <option.icon className="w-4 h-4" />
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
