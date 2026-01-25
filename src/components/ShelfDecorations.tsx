import { useMemo } from 'react';

export type DecorationType = 
  | 'trailing-plant' 
  | 'potted-plant' 
  | 'succulent'
  | 'cactus'
  | 'bonsai'
  | 'fern'
  | 'monstera'
  | 'figurine' 
  | 'globe' 
  | 'hourglass' 
  | 'candle' 
  | 'photo' 
  | 'vase'
  | 'clock'
  | 'books-stack'
  | 'lantern';

interface DecorationProps {
  type: DecorationType;
  seed: number;
}

// Pot colors - using cooler tones for contrast with warm wood shelves
const POT_COLORS = {
  rim: 'hsl(200,12%,45%)',      // Cool gray rim
  body: 'hsl(200,10%,55%)',     // Light slate
  bodyDark: 'hsl(200,12%,38%)', // Darker slate
};

// Dense bushy plant - compact and full
function TrailingPlantDecor({ seed }: { seed: number }) {
  const leafColors = [
    { main: 'hsl(130,50%,38%)', dark: 'hsl(140,45%,28%)', light: 'hsl(125,55%,45%)' },
    { main: 'hsl(145,45%,35%)', dark: 'hsl(150,40%,25%)', light: 'hsl(140,50%,42%)' },
    { main: 'hsl(120,40%,32%)', dark: 'hsl(130,35%,22%)', light: 'hsl(115,45%,40%)' },
  ];
  const colors = leafColors[seed % leafColors.length];
  
  return (
    <div className="flex flex-col items-center">
      {/* Foliage sitting in pot */}
      <div className="relative h-6">
        {/* Base connection layer */}
        <div className="absolute w-6 h-3 rounded-t-full bottom-0 left-1/2 -translate-x-1/2"
          style={{ background: colors.dark }} />
        
        {/* Center dome */}
        <div className="absolute w-8 h-6 rounded-full -top-4 left-1/2 -translate-x-1/2"
          style={{ background: `radial-gradient(ellipse at 40% 30%, ${colors.light}, ${colors.main})` }} />
        
        {/* Top layer */}
        <div className="absolute w-4 h-3 rounded-full -top-5 left-1/2 -translate-x-1/2"
          style={{ background: colors.light }} />
        <div className="absolute w-3 h-2.5 rounded-full -top-4 -left-0.5"
          style={{ background: colors.light }} />
        <div className="absolute w-3 h-2.5 rounded-full -top-4 -right-0.5"
          style={{ background: colors.light }} />
        
        {/* Middle layer */}
        <div className="absolute w-5 h-4 rounded-[60%_60%_50%_50%] -top-3 -left-2"
          style={{ background: `linear-gradient(135deg, ${colors.main}, ${colors.dark})` }} />
        <div className="absolute w-5 h-4 rounded-[60%_60%_50%_50%] -top-3 -right-2"
          style={{ background: `linear-gradient(135deg, ${colors.main}, ${colors.dark})` }} />
        
        {/* Bottom layer connecting to pot */}
        <div className="absolute w-4 h-3 rounded-full -top-1 -left-3"
          style={{ background: colors.dark }} />
        <div className="absolute w-4 h-3 rounded-full -top-1 -right-3"
          style={{ background: colors.dark }} />
        
      </div>
      {/* Pot with rim - cool gray for contrast */}
      <div className="relative -mt-2">
        <div className="w-8 h-1.5 rounded-t-sm" style={{ background: POT_COLORS.rim }} />
        <div className="w-7 h-5 rounded-b-lg mx-auto"
          style={{ background: `linear-gradient(180deg, ${POT_COLORS.body}, ${POT_COLORS.bodyDark})` }} />
      </div>
    </div>
  );
}

function PottedPlantDecor({ seed }: { seed: number }) {
  const variants = [
    // Dense bushy shrub
    <div key="shrub" className="flex flex-col items-center">
      <div className="relative h-6">
        {/* Main bush sitting low */}
        <div className="absolute w-10 h-5 rounded-[50%_50%_45%_45%] bottom-0 left-1/2 -translate-x-1/2"
          style={{ background: 'radial-gradient(ellipse at 35% 35%, hsl(130,55%,45%), hsl(140,45%,30%))' }} />
        <div className="absolute w-4 h-3 rounded-full bottom-3 left-1/2 -translate-x-1/2 bg-[hsl(125,55%,48%)]" />
        <div className="absolute w-3 h-2.5 rounded-full bottom-2 -left-0.5 bg-[hsl(130,50%,42%)]" />
        <div className="absolute w-3 h-2.5 rounded-full bottom-2 -right-0.5 bg-[hsl(130,50%,42%)]" />
        <div className="absolute w-4 h-3 rounded-full bottom-1 -left-2 bg-[hsl(135,48%,38%)]" />
        <div className="absolute w-4 h-3 rounded-full bottom-1 -right-2 bg-[hsl(135,48%,38%)]" />
      </div>
      <div className="relative -mt-1">
        <div className="w-7 h-1 rounded-t-sm" style={{ background: POT_COLORS.rim }} />
        <div className="w-6 h-4 rounded-b-lg mx-auto" style={{ background: `linear-gradient(180deg, ${POT_COLORS.body}, ${POT_COLORS.bodyDark})` }} />
      </div>
    </div>,
    // Compact round bush
    <div key="round" className="flex flex-col items-center">
      <div className="relative h-5">
        <div className="absolute w-9 h-4 rounded-full bottom-0 left-1/2 -translate-x-1/2"
          style={{ background: 'radial-gradient(ellipse at 40% 40%, hsl(140,50%,42%), hsl(145,40%,28%))' }} />
        <div className="absolute w-5 h-3 rounded-full bottom-2 left-1/2 -translate-x-1/2 bg-[hsl(135,55%,48%)]" />
        <div className="absolute w-3.5 h-2.5 rounded-full bottom-0.5 -left-2 bg-[hsl(138,45%,35%)]" />
        <div className="absolute w-3.5 h-2.5 rounded-full bottom-0.5 -right-2 bg-[hsl(138,45%,35%)]" />
      </div>
      <div className="relative -mt-0.5">
        <div className="w-6 h-1 rounded-t-sm" style={{ background: POT_COLORS.rim }} />
        <div className="w-5 h-4 rounded-b-md mx-auto" style={{ background: `linear-gradient(180deg, ${POT_COLORS.body}, ${POT_COLORS.bodyDark})` }} />
      </div>
    </div>,
  ];
  return variants[seed % variants.length];
}

function SucculentDecor({ seed }: { seed: number }) {
  const colors = [
    { base: 'hsl(150,40%,35%)', mid: 'hsl(148,45%,42%)', tip: 'hsl(145,50%,48%)' },
    { base: 'hsl(160,35%,40%)', mid: 'hsl(158,40%,46%)', tip: 'hsl(155,45%,52%)' },
    { base: 'hsl(140,45%,32%)', mid: 'hsl(138,50%,38%)', tip: 'hsl(135,55%,45%)' },
  ];
  const c = colors[seed % colors.length];
  
  return (
    <div className="flex flex-col items-center">
      {/* Pot first, then plant sitting in it */}
      <div className="relative">
        {/* Pot rim */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 rounded-t-sm z-0" style={{ background: POT_COLORS.rim }} />
        {/* Pot body */}
        <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-5 h-3.5 rounded-b-md z-0" style={{ background: `linear-gradient(180deg, ${POT_COLORS.body}, ${POT_COLORS.bodyDark})` }} />
        {/* Dense rosette succulent sitting on pot */}
        <div className="relative z-10 w-8 h-4 rounded-full"
          style={{ background: `radial-gradient(ellipse at 50% 40%, ${c.tip}, ${c.base})` }}>
          <div className="absolute w-3 h-2.5 rounded-full top-0 left-1/2 -translate-x-1/2 -translate-y-1" style={{ background: c.tip }} />
          <div className="absolute w-2.5 h-2 rounded-full -top-0.5 left-1" style={{ background: c.mid }} />
          <div className="absolute w-2.5 h-2 rounded-full -top-0.5 right-1" style={{ background: c.mid }} />
          <div className="absolute w-2 h-1.5 rounded-full top-1 -left-1" style={{ background: c.base }} />
          <div className="absolute w-2 h-1.5 rounded-full top-1 -right-1" style={{ background: c.base }} />
        </div>
      </div>
      {/* Spacer for pot height */}
      <div className="h-4" />
    </div>
  );
}

// Cactus decoration
function CactusDecor({ seed }: { seed: number }) {
  const variants = [
    // Round barrel cactus
    <div key="barrel" className="flex flex-col items-center">
      <div className="relative">
        <div className="w-6 h-7 rounded-[45%_45%_40%_40%] relative"
          style={{ background: 'linear-gradient(135deg, hsl(140,45%,42%), hsl(145,40%,32%))' }}>
          {/* Ridges */}
          <div className="absolute w-0.5 h-full bg-[hsl(145,35%,28%)] left-1" />
          <div className="absolute w-0.5 h-full bg-[hsl(145,35%,28%)] left-2.5" />
          <div className="absolute w-0.5 h-full bg-[hsl(145,35%,28%)] right-1" />
          <div className="absolute w-0.5 h-full bg-[hsl(145,35%,28%)] right-2.5" />
          {/* Small flower on top */}
          <div className="absolute w-2 h-2 rounded-full -top-1 left-1/2 -translate-x-1/2 bg-[hsl(340,70%,60%)]" />
        </div>
      </div>
      <div className="relative -mt-0.5">
        <div className="w-7 h-1 rounded-t-sm" style={{ background: POT_COLORS.rim }} />
        <div className="w-6 h-4 rounded-b-lg mx-auto" style={{ background: `linear-gradient(180deg, ${POT_COLORS.body}, ${POT_COLORS.bodyDark})` }} />
      </div>
    </div>,
    // Tall saguaro-style
    <div key="saguaro" className="flex flex-col items-center">
      <div className="relative">
        {/* Main stem */}
        <div className="w-4 h-9 rounded-t-full relative"
          style={{ background: 'linear-gradient(90deg, hsl(140,40%,38%), hsl(145,45%,45%), hsl(140,40%,38%))' }}>
          {/* Arms */}
          <div className="absolute w-2.5 h-4 rounded-t-full -left-2 top-2"
            style={{ background: 'linear-gradient(90deg, hsl(140,40%,36%), hsl(145,45%,42%))' }} />
          <div className="absolute w-2.5 h-5 rounded-t-full -right-2 top-3"
            style={{ background: 'linear-gradient(90deg, hsl(145,45%,42%), hsl(140,40%,36%))' }} />
        </div>
      </div>
      <div className="relative -mt-0.5">
        <div className="w-6 h-1 rounded-t-sm" style={{ background: POT_COLORS.rim }} />
        <div className="w-5 h-3.5 rounded-b-md mx-auto" style={{ background: `linear-gradient(180deg, ${POT_COLORS.body}, ${POT_COLORS.bodyDark})` }} />
      </div>
    </div>,
  ];
  return variants[seed % variants.length];
}

// Bonsai tree decoration
function BonsaiDecor({ seed }: { seed: number }) {
  const leafColors = [
    { canopy: 'hsl(130,45%,35%)', highlight: 'hsl(125,50%,42%)' },
    { canopy: 'hsl(145,40%,32%)', highlight: 'hsl(140,45%,40%)' },
  ];
  const colors = leafColors[seed % leafColors.length];
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Canopy clusters */}
        <div className="absolute w-7 h-4 rounded-[50%_50%_40%_40%] -top-6 left-1/2 -translate-x-1/2"
          style={{ background: `radial-gradient(ellipse at 40% 40%, ${colors.highlight}, ${colors.canopy})` }} />
        <div className="absolute w-4 h-3 rounded-full -top-7 left-1/2 -translate-x-1/2"
          style={{ background: colors.highlight }} />
        <div className="absolute w-4 h-3 rounded-full -top-5 -left-1"
          style={{ background: colors.canopy }} />
        <div className="absolute w-4 h-3 rounded-full -top-5 -right-1"
          style={{ background: colors.canopy }} />
        {/* Trunk */}
        <div className="w-2 h-5 mx-auto rounded-sm"
          style={{ background: 'linear-gradient(90deg, hsl(25,40%,30%), hsl(30,35%,40%), hsl(25,40%,30%))' }} />
      </div>
      <div className="relative -mt-0.5">
        <div className="w-8 h-1.5 rounded-t-sm" style={{ background: POT_COLORS.rim }} />
        <div className="w-7 h-3 rounded-b-md mx-auto" style={{ background: `linear-gradient(180deg, ${POT_COLORS.body}, ${POT_COLORS.bodyDark})` }} />
      </div>
    </div>
  );
}

// Fern decoration
function FernDecor({ seed }: { seed: number }) {
  const colors = [
    { frond: 'hsl(135,50%,38%)', dark: 'hsl(140,45%,28%)' },
    { frond: 'hsl(128,48%,40%)', dark: 'hsl(132,42%,30%)' },
  ];
  const c = colors[seed % colors.length];
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Multiple fronds spreading out */}
        <div className="absolute w-5 h-5 rounded-[60%_60%_50%_50%] -top-5 left-1/2 -translate-x-1/2 rotate-0"
          style={{ background: `radial-gradient(ellipse at 50% 70%, ${c.frond}, ${c.dark})` }} />
        <div className="absolute w-4 h-4 rounded-full -top-4 -left-2 rotate-[-30deg]"
          style={{ background: c.frond }} />
        <div className="absolute w-4 h-4 rounded-full -top-4 -right-2 rotate-[30deg]"
          style={{ background: c.frond }} />
        <div className="absolute w-3.5 h-3 rounded-full -top-2 -left-3 rotate-[-45deg]"
          style={{ background: c.dark }} />
        <div className="absolute w-3.5 h-3 rounded-full -top-2 -right-3 rotate-[45deg]"
          style={{ background: c.dark }} />
        <div className="absolute w-4 h-2 rounded-full bottom-0 left-1/2 -translate-x-1/2"
          style={{ background: c.dark }} />
        <div className="w-5 h-4 opacity-0" />
      </div>
      <div className="relative -mt-0.5">
        <div className="w-6 h-1 rounded-t-sm" style={{ background: POT_COLORS.rim }} />
        <div className="w-5 h-3.5 rounded-b-md mx-auto" style={{ background: `linear-gradient(180deg, ${POT_COLORS.body}, ${POT_COLORS.bodyDark})` }} />
      </div>
    </div>
  );
}

// Monstera decoration
function MonsteraDecor({ seed }: { seed: number }) {
  const colors = [
    { leaf: 'hsl(135,55%,38%)', dark: 'hsl(140,50%,28%)', stem: 'hsl(130,40%,32%)' },
    { leaf: 'hsl(128,50%,40%)', dark: 'hsl(132,45%,30%)', stem: 'hsl(125,38%,34%)' },
  ];
  const c = colors[seed % colors.length];
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Large iconic leaves */}
        <div className="absolute w-6 h-5 rounded-[50%_50%_45%_45%] -top-5 left-1/2 -translate-x-1/2"
          style={{ background: `radial-gradient(ellipse at 40% 35%, ${c.leaf}, ${c.dark})` }}>
          {/* Characteristic holes */}
          <div className="absolute w-1 h-1.5 rounded-full bg-[hsl(130,30%,25%)] top-1 left-1.5" />
          <div className="absolute w-1 h-1 rounded-full bg-[hsl(130,30%,25%)] top-2 right-1.5" />
        </div>
        <div className="absolute w-4 h-4 rounded-[50%_50%_40%_40%] -top-3 -left-2 rotate-[-20deg]"
          style={{ background: c.leaf }} />
        <div className="absolute w-4 h-4 rounded-[50%_50%_40%_40%] -top-3 -right-2 rotate-[20deg]"
          style={{ background: c.leaf }} />
        {/* Stems connecting to pot */}
        <div className="absolute w-1 h-3 bottom-0 left-1/2 -translate-x-1/2"
          style={{ background: c.stem }} />
        <div className="w-5 h-4 opacity-0" />
      </div>
      <div className="relative -mt-0.5">
        <div className="w-6 h-1 rounded-t-sm" style={{ background: POT_COLORS.rim }} />
        <div className="w-5 h-4 rounded-b-md mx-auto" style={{ background: `linear-gradient(180deg, ${POT_COLORS.body}, ${POT_COLORS.bodyDark})` }} />
      </div>
    </div>
  );
}

function FigurineDecor({ seed }: { seed: number }) {
  const colors = [
    { body: 'hsl(35,35%,40%)', accent: 'hsl(35,30%,55%)' },
    { body: 'hsl(220,10%,45%)', accent: 'hsl(220,10%,60%)' },
    { body: 'hsl(45,70%,45%)', accent: 'hsl(45,65%,55%)' },
  ];
  const color = colors[seed % colors.length];
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-5 h-7 rounded-t-full rounded-b-lg"
          style={{ background: `linear-gradient(135deg, ${color.accent}, ${color.body})` }} />
        <div className="absolute w-3 h-3 rounded-full -top-2 left-1/2 -translate-x-1/2"
          style={{ background: color.body }} />
        <div className="absolute w-1.5 h-2 -top-3 left-1 rotate-[-15deg]"
          style={{ background: color.body, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
        <div className="absolute w-1.5 h-2 -top-3 right-1 rotate-[15deg]"
          style={{ background: color.body, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
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
        <div className="w-4 h-5 bg-[hsl(45,20%,85%)]"
          style={{ clipPath: 'polygon(0 0, 100% 0, 60% 50%, 100% 100%, 0 100%, 40% 50%)' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-[hsl(35,70%,55%)]"
          style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
      </div>
      <div className="w-5 h-1 bg-gradient-to-b from-[hsl(35,35%,35%)] to-[hsl(35,30%,45%)] rounded-sm" />
    </div>
  );
}

function CandleDecor({ seed }: { seed: number }) {
  const colors = ['hsl(0,70%,65%)', 'hsl(30,80%,75%)', 'hsl(0,0%,95%)', 'hsl(280,40%,70%)'];
  const color = colors[seed % colors.length];
  
  return (
    <div className="flex flex-col items-center">
      <div className="w-0.5 h-2 bg-[hsl(40,90%,50%)] rounded-t-full relative">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-2 bg-gradient-to-t from-[hsl(25,100%,50%)] via-[hsl(45,100%,60%)] to-transparent rounded-full opacity-90" />
      </div>
      <div className="w-4 h-8 rounded-sm shadow-sm"
        style={{ background: `linear-gradient(to right, ${color}, hsl(0,0%,100%), ${color})` }} />
      <div className="w-5 h-1.5 bg-gradient-to-b from-[hsl(35,30%,50%)] to-[hsl(35,35%,35%)] rounded-sm" />
    </div>
  );
}

function PhotoFrameDecor({ seed }: { seed: number }) {
  const frameColors = ['hsl(35,30%,35%)', 'hsl(220,15%,25%)', 'hsl(45,50%,50%)'];
  const frameColor = frameColors[seed % frameColors.length];
  
  return (
    <div className="w-7 h-9 rounded-sm flex items-center justify-center shadow-md"
      style={{ background: frameColor }}>
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
      <div className="w-5 h-10 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${color.accent}, ${color.body})`,
          borderRadius: '30% 30% 45% 45%'
        }}>
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-white/20 to-transparent" />
      </div>
    </div>
  );
}

function ClockDecor({ seed }: { seed: number }) {
  const frameColors = ['hsl(35,40%,30%)', 'hsl(220,10%,25%)', 'hsl(45,60%,45%)'];
  const frame = frameColors[seed % frameColors.length];
  
  return (
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-md"
        style={{ background: frame }}>
        <div className="w-6 h-6 rounded-full bg-[hsl(45,30%,95%)] relative">
          {/* Clock hands */}
          <div className="absolute w-0.5 h-2 bg-[hsl(0,0%,20%)] top-1/2 left-1/2 -translate-x-1/2 origin-bottom rotate-[30deg]" 
            style={{ marginTop: '-8px' }} />
          <div className="absolute w-0.5 h-1.5 bg-[hsl(0,0%,30%)] top-1/2 left-1/2 -translate-x-1/2 origin-bottom rotate-[-60deg]"
            style={{ marginTop: '-6px' }} />
          <div className="absolute w-1 h-1 rounded-full bg-[hsl(0,0%,20%)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
      <div className="w-3 h-2 bg-gradient-to-b from-[hsl(35,35%,35%)] to-[hsl(35,40%,25%)] rounded-b-sm" />
    </div>
  );
}

function BooksStackDecor({ seed }: { seed: number }) {
  const bookColors = [
    ['hsl(0,60%,40%)', 'hsl(220,50%,35%)', 'hsl(45,70%,45%)'],
    ['hsl(280,40%,35%)', 'hsl(160,45%,30%)', 'hsl(30,60%,40%)'],
    ['hsl(200,50%,35%)', 'hsl(350,45%,40%)', 'hsl(90,40%,35%)'],
  ];
  const colors = bookColors[seed % bookColors.length];
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {colors.map((color, i) => (
          <div key={i} 
            className="w-8 h-2 rounded-sm shadow-sm"
            style={{ 
              background: `linear-gradient(90deg, ${color}, hsl(0,0%,20%))`,
              transform: `rotate(${(i - 1) * 3}deg)`,
              marginTop: i > 0 ? '-1px' : 0
            }} />
        ))}
      </div>
    </div>
  );
}

function LanternDecor({ seed }: { seed: number }) {
  const metalColors = ['hsl(35,30%,25%)', 'hsl(220,10%,30%)', 'hsl(45,50%,40%)'];
  const metal = metalColors[seed % metalColors.length];
  
  return (
    <div className="flex flex-col items-center">
      {/* Top handle */}
      <div className="w-4 h-1.5 rounded-t-full" style={{ background: metal }} />
      {/* Glass body */}
      <div className="w-5 h-7 rounded-sm relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(45,30%,85%), hsl(45,20%,70%))' }}>
        {/* Inner glow */}
        <div className="absolute inset-1 bg-gradient-to-t from-[hsl(35,90%,60%)] via-[hsl(45,80%,70%)] to-transparent opacity-60 rounded-sm" />
        {/* Frame lines */}
        <div className="absolute inset-0 border-2 rounded-sm" style={{ borderColor: metal }} />
      </div>
      {/* Base */}
      <div className="w-6 h-1.5 rounded-b-sm" style={{ background: metal }} />
    </div>
  );
}

function Decoration({ type, seed }: DecorationProps) {
  switch (type) {
    case 'trailing-plant':
      return <TrailingPlantDecor seed={seed} />;
    case 'potted-plant':
      return <PottedPlantDecor seed={seed} />;
    case 'succulent':
      return <SucculentDecor seed={seed} />;
    case 'cactus':
      return <CactusDecor seed={seed} />;
    case 'bonsai':
      return <BonsaiDecor seed={seed} />;
    case 'fern':
      return <FernDecor seed={seed} />;
    case 'monstera':
      return <MonsteraDecor seed={seed} />;
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
    case 'clock':
      return <ClockDecor seed={seed} />;
    case 'books-stack':
      return <BooksStackDecor seed={seed} />;
    case 'lantern':
      return <LanternDecor seed={seed} />;
    default:
      return null;
  }
}

export interface ShelfDecorationItem {
  type: DecorationType;
  seed: number;
  position: number;
}

export const DECORATION_TYPES: DecorationType[] = [
  'trailing-plant',
  'potted-plant', 
  'succulent',
  'cactus',
  'bonsai',
  'fern',
  'monstera',
  'figurine', 
  'globe', 
  'hourglass', 
  'candle', 
  'photo', 
  'vase',
  'clock',
  'books-stack',
  'lantern',
];

export function ShelfDecoration({ type, seed }: { type: DecorationType; seed: number }) {
  return (
    <div className="shelf-decoration flex items-end justify-center animate-fade-in">
      <Decoration type={type} seed={seed} />
    </div>
  );
}
