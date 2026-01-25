import { ShelfDecoration, DecorationType } from './ShelfDecorations';

const PLANT_TYPES: DecorationType[] = [
  'trailing-plant',
  'potted-plant', 
  'succulent',
  'cactus',
  'bonsai',
  'fern',
  'monstera',
];

export function PlantPreview() {
  return (
    <div className="p-8 bg-muted rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Plant Types Preview</h2>
      <div className="flex items-end gap-6 p-4 bg-[hsl(28,55%,42%)] rounded-lg min-h-[120px]">
        {PLANT_TYPES.map((type, i) => (
          <div key={type} className="flex flex-col items-center gap-2">
            <ShelfDecoration type={type} seed={i} />
            <span className="text-xs text-white/80 mt-2">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
