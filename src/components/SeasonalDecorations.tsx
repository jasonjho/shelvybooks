import { SeasonalTheme } from '@/types/book';
import { useMemo } from 'react';

interface SeasonalDecorationsProps {
  theme: SeasonalTheme;
}

function getCurrentSeason(): 'winter' | 'spring' | 'summer' | 'autumn' {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

function WinterDecorations() {
  // String lights across the top
  const lights = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${5 + i * 4.8}%`,
      delay: `${i * 0.15}s`,
      color: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'][i % 5],
    }));
  }, []);

  return (
    <div className="seasonal-decorations winter-theme pointer-events-none">
      {/* String lights wire */}
      <svg 
        className="absolute top-4 left-0 right-0 w-full h-12 z-30"
        preserveAspectRatio="none"
      >
        <path
          d="M 0,20 Q 25,35 50,20 T 100,20"
          fill="none"
          stroke="hsl(var(--foreground) / 0.3)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      
      {/* Light bulbs */}
      <div className="absolute top-6 left-0 right-0 flex justify-between px-4 z-30">
        {lights.map((light) => (
          <div
            key={light.id}
            className="string-light"
            style={{
              '--light-color': light.color,
              animationDelay: light.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Snowflakes */}
      <div className="snowflakes-container">
        {Array.from({ length: 15 }, (_, i) => (
          <div
            key={i}
            className="snowflake"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${8 + Math.random() * 4}s`,
            }}
          >
            ❄
          </div>
        ))}
      </div>
    </div>
  );
}

function SpringDecorations() {
  const flowers = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${6 + Math.random() * 4}s`,
      emoji: ['🌸', '🌷', '🌼', '🌺', '💐'][i % 5],
      size: 12 + Math.random() * 8,
    }));
  }, []);

  return (
    <div className="seasonal-decorations spring-theme pointer-events-none">
      {/* Floating flower petals */}
      <div className="petals-container">
        {flowers.map((flower) => (
          <div
            key={flower.id}
            className="floating-petal"
            style={{
              left: flower.left,
              animationDelay: flower.delay,
              animationDuration: flower.duration,
              fontSize: `${flower.size}px`,
            }}
          >
            {flower.emoji}
          </div>
        ))}
      </div>

      {/* Butterflies */}
      <div className="butterfly" style={{ top: '15%', left: '10%', animationDelay: '0s' }}>🦋</div>
      <div className="butterfly" style={{ top: '25%', right: '15%', animationDelay: '2s' }}>🦋</div>
    </div>
  );
}

function SummerDecorations() {
  return (
    <div className="seasonal-decorations summer-theme pointer-events-none">
      {/* Sun rays */}
      <div className="summer-sun">
        <div className="sun-core">☀️</div>
        <div className="sun-rays" />
      </div>

      {/* Fireflies at dusk */}
      <div className="fireflies-container">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="firefly"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${30 + Math.random() * 50}%`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AutumnDecorations() {
  const leaves = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${8 + Math.random() * 6}s`,
      emoji: ['🍂', '🍁', '🍃'][i % 3],
      rotation: Math.random() * 360,
    }));
  }, []);

  return (
    <div className="seasonal-decorations autumn-theme pointer-events-none">
      {/* Falling leaves */}
      <div className="leaves-container">
        {leaves.map((leaf) => (
          <div
            key={leaf.id}
            className="falling-leaf"
            style={{
              left: leaf.left,
              animationDelay: leaf.delay,
              animationDuration: leaf.duration,
              '--initial-rotation': `${leaf.rotation}deg`,
            } as React.CSSProperties}
          >
            {leaf.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeasonalDecorations({ theme }: SeasonalDecorationsProps) {
  const activeSeason = theme === 'auto' ? getCurrentSeason() : theme;

  if (theme === 'none') return null;

  switch (activeSeason) {
    case 'winter':
      return <WinterDecorations />;
    case 'spring':
      return <SpringDecorations />;
    case 'summer':
      return <SummerDecorations />;
    case 'autumn':
      return <AutumnDecorations />;
    default:
      return null;
  }
}
