import { ShelfSettings, DecorDensity } from '@/types/book';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Lamp, Trees, BookmarkMinus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  settings: ShelfSettings;
  onSettingsChange: (settings: Partial<ShelfSettings>) => void;
}

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

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
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
      <PopoverContent className="w-80" align="end">
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
