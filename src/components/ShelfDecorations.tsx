import { useMemo } from 'react';

type DecorationType = 'plant' | 'figurine' | 'globe' | 'hourglass' | 'candle' | 'photo' | 'vase';

interface DecorationProps {
  type: DecorationType;
  seed: number;
}

function PlantDecor({ seed }: { seed: number }) {
  const variants = [
    // Succulent
    <div key="succulent" className="flex flex-col items-center">
      <div className="w-6 h-6 bg-gradient-to-t from-[hsl(140,40%,35%)] to-[hsl(140,50%,45%)] rounded-full relative">
        <div className="absolute w-3 h-4 bg-[hsl(140,45%,40%)] rounded-full -top-2 left-1/2 -translate-x-1/2" />
        <div className="absolute w-2.5 h-3 bg-[hsl(140,50%,38%)] rounded-full -top-1 left-0 rotate-[-30deg]" />
        <div className="absolute w-2.5 h-3 bg-[hsl(140,50%,38%)] rounded-full -top-1 right-0 rotate-[30deg]" />
      </div>
      <div className="w-5 h-4 bg-gradient-to-b from-[hsl(20,50%,55%)] to-[hsl(20,55%,40%)] rounded-b-md -mt-1" />
    </div>,
    // Tall plant
    <div key="tall" className="flex flex-col items-center">
      <div className="relative">
        <div className="w-1 h-8 bg-[hsl(140,30%,35%)]" />
        <div className="absolute w-4 h-3 bg-[hsl(140,45%,40%)] rounded-full -top-1 left-1/2 -translate-x-1/2" />
        <div className="absolute w-3 h-2.5 bg-[hsl(140,50%,42%)] rounded-full top-1 -left-2 rotate-[-20deg]" />
        <div className="absolute w-3 h-2.5 bg-[hsl(140,50%,42%)] rounded-full top-3 -right-2 rotate-[20deg]" />
      </div>
      <div className="w-6 h-5 bg-gradient-to-b from-[hsl(35,25%,50%)] to-[hsl(35,30%,35%)] rounded-b-lg -mt-1" />
    </div>,
    // Cactus
    <div key="cactus" className="flex flex-col items-center">
      <div className="relative">
        <div className="w-4 h-10 bg-gradient-to-r from-[hsl(140,35%,30%)] via-[hsl(140,40%,40%)] to-[hsl(140,35%,30%)] rounded-full" />
        <div className="absolute w-2 h-4 bg-gradient-to-r from-[hsl(140,35%,32%)] via-[hsl(140,40%,38%)] to-[hsl(140,35%,32%)] rounded-full top-2 -left-2 rotate-[-30deg]" />
        <div className="absolute w-2 h-5 bg-gradient-to-r from-[hsl(140,35%,32%)] via-[hsl(140,40%,38%)] to-[hsl(140,35%,32%)] rounded-full top-4 -right-1.5 rotate-[25deg]" />
      </div>
      <div className="w-5 h-4 bg-gradient-to-b from-[hsl(25,60%,50%)] to-[hsl(25,65%,38%)] rounded-b-md -mt-1" />
    </div>,
  ];
  return variants[seed % variants.length];
}

function FigurineDecor({ seed }: { seed: number }) {
  const colors = [
    { body: 'hsl(35,35%,40%)', accent: 'hsl(35,30%,55%)' }, // Bronze
    { body: 'hsl(220,10%,45%)', accent: 'hsl(220,10%,60%)' }, // Silver
    { body: 'hsl(45,70%,45%)', accent: 'hsl(45,65%,55%)' }, // Gold
  ];
  const color = colors[seed % colors.length];
  
  return (
    <div className="flex flex-col items-center">
      {/* Cat figurine */}
      <div className="relative">
        <div 
          className="w-5 h-7 rounded-t-full rounded-b-lg"
          style={{ background: `linear-gradient(135deg, ${color.accent}, ${color.body})` }}
        />
        <div 
          className="absolute w-3 h-3 rounded-full -top-2 left-1/2 -translate-x-1/2"
          style={{ background: color.body }}
        />
        <div 
          className="absolute w-1.5 h-2 -top-3 left-1 rotate-[-15deg]"
          style={{ 
            background: color.body,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
          }}
        />
        <div 
          className="absolute w-1.5 h-2 -top-3 right-1 rotate-[15deg]"
          style={{ 
            background: color.body,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
          }}
        />
      </div>
    </div>
  );
}

function GlobeDecor() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(200,50%,50%)] via-[hsl(140,30%,45%)] to-[hsl(200,45%,40%)] relative overflow-hidden shadow-inner">
        <div className="absolute inset-0 border-2 border-[hsl(35,30%,40%)] rounded-full" />
        <div className="absolute h-full w-px bg-[hsl(35,30%,45%)] left-1/2" />
        <div className="absolute w-full h-px bg-[hsl(35,30%,45%)] top-1/2" />
      </div>
      <div className="w-1 h-2 bg-[hsl(35,30%,35%)]" />
      <div className="w-4 h-1.5 bg-gradient-to-b from-[hsl(35,35%,40%)] to-[hsl(35,40%,30%)] rounded-sm" />
    </div>
  );
}

function HourglassDecor() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-5 h-1 bg-gradient-to-b from-[hsl(35,30%,45%)] to-[hsl(35,35%,35%)] rounded-sm" />
      <div className="relative">
        <div 
          className="w-4 h-5 bg-[hsl(45,20%,85%)]"
          style={{ clipPath: 'polygon(0 0, 100% 0, 60% 50%, 100% 100%, 0 100%, 40% 50%)' }}
        />
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-[hsl(35,70%,55%)]"
          style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
        />
      </div>
      <div className="w-5 h-1 bg-gradient-to-b from-[hsl(35,35%,35%)] to-[hsl(35,30%,45%)] rounded-sm" />
    </div>
  );
}

function CandleDecor({ seed }: { seed: number }) {
  const colors = ['hsl(0,70%,65%)', 'hsl(30,80%,75%)', 'hsl(0,0%,95%)'];
  const color = colors[seed % colors.length];
  
  return (
    <div className="flex flex-col items-center">
      <div className="w-0.5 h-2 bg-[hsl(40,90%,50%)] rounded-t-full relative">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-2 bg-gradient-to-t from-[hsl(25,100%,50%)] via-[hsl(45,100%,60%)] to-transparent rounded-full opacity-90" />
      </div>
      <div 
        className="w-4 h-8 rounded-sm shadow-sm"
        style={{ background: `linear-gradient(to right, ${color}, hsl(0,0%,100%), ${color})` }}
      />
      <div className="w-5 h-1.5 bg-gradient-to-b from-[hsl(35,30%,50%)] to-[hsl(35,35%,35%)] rounded-sm" />
    </div>
  );
}

function PhotoFrameDecor({ seed }: { seed: number }) {
  const frameColors = ['hsl(35,30%,35%)', 'hsl(220,15%,25%)', 'hsl(45,50%,50%)'];
  const frameColor = frameColors[seed % frameColors.length];
  
  return (
    <div 
      className="w-7 h-9 rounded-sm flex items-center justify-center shadow-md"
      style={{ background: frameColor }}
    >
      <div className="w-5 h-7 bg-gradient-to-br from-[hsl(200,30%,70%)] to-[hsl(200,25%,50%)] rounded-[1px]" />
    </div>
  );
}

function VaseDecor({ seed }: { seed: number }) {
  const colors = [
    { body: 'hsl(200,40%,45%)', accent: 'hsl(200,35%,60%)' },
    { body: 'hsl(350,40%,45%)', accent: 'hsl(350,35%,55%)' },
    { body: 'hsl(45,30%,50%)', accent: 'hsl(45,25%,65%)' },
  ];
  const color = colors[seed % colors.length];
  
  return (
    <div className="flex flex-col items-center">
      <div 
        className="w-5 h-10 rounded-b-lg relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${color.accent}, ${color.body})`,
          borderRadius: '30% 30% 45% 45%'
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-white/20 to-transparent" />
      </div>
    </div>
  );
}

function Decoration({ type, seed }: DecorationProps) {
  switch (type) {
    case 'plant':
      return <PlantDecor seed={seed} />;
    case 'figurine':
      return <FigurineDecor seed={seed} />;
    case 'globe':
      return <GlobeDecor />;
    case 'hourglass':
      return <HourglassDecor />;
    case 'candle':
      return <CandleDecor seed={seed} />;
    case 'photo':
      return <PhotoFrameDecor seed={seed} />;
    case 'vase':
      return <VaseDecor seed={seed} />;
    default:
      return null;
  }
}

export interface ShelfDecorationItem {
  type: DecorationType;
  seed: number;
  position: number; // Position in the items array (between books)
}

const DECORATION_TYPES: DecorationType[] = ['plant', 'figurine', 'globe', 'hourglass', 'candle', 'photo', 'vase'];

export function useShelfDecorations(
  bookCount: number,
  gridColumns: number,
  enabled: boolean
): ShelfDecorationItem[] {
  return useMemo(() => {
    if (!enabled || bookCount === 0) return [];
    
    // Calculate available slots
    const totalSlots = Math.max(gridColumns, bookCount);
    const emptySlots = Math.max(0, totalSlots - bookCount);
    
    // Only add decorations if there's enough space (at least 2 empty slots)
    if (emptySlots < 2) return [];
    
    // Determine how many decorations to add (1 per 3-4 empty slots, max 4)
    const decorationCount = Math.min(Math.floor(emptySlots / 3), 4);
    
    if (decorationCount === 0) return [];
    
    const decorations: ShelfDecorationItem[] = [];
    const usedPositions = new Set<number>();
    
    // Spread decorations across the shelf
    for (let i = 0; i < decorationCount; i++) {
      // Distribute positions evenly
      const segmentSize = Math.floor(totalSlots / (decorationCount + 1));
      let position = segmentSize * (i + 1);
      
      // Avoid placing at the very end
      position = Math.min(position, totalSlots - 1);
      
      // Avoid duplicate positions
      while (usedPositions.has(position) && position < totalSlots) {
        position++;
      }
      
      if (position < totalSlots && !usedPositions.has(position)) {
        usedPositions.add(position);
        decorations.push({
          type: DECORATION_TYPES[(i + position) % DECORATION_TYPES.length],
          seed: i + position,
          position,
        });
      }
    }
    
    return decorations;
  }, [bookCount, gridColumns, enabled]);
}

export function ShelfDecoration({ type, seed }: { type: DecorationType; seed: number }) {
  return (
    <div className="shelf-decoration flex items-end justify-center animate-fade-in">
      <Decoration type={type} seed={seed} />
    </div>
  );
}
