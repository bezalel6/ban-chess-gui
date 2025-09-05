import { useEffect, useRef } from "preact/hooks";

interface VerticalEvalBarProps {
  evaluation: number; // in centipawns
  depth: number;
  isWhiteTurn: boolean;
  isMate?: number; // moves to mate (positive for white, negative for black)
}

export function VerticalEvalBar({ evaluation, depth, isWhiteTurn, isMate }: VerticalEvalBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  
  // Convert evaluation to percentage (clamped between -1000 and 1000 centipawns = -10 to +10)
  const getPercentage = () => {
    if (isMate !== undefined) {
      // Mate scores get full bar
      return isMate > 0 ? 100 : 0;
    }
    
    // Clamp evaluation between -1000 and 1000 centipawns
    const clamped = Math.max(-1000, Math.min(1000, evaluation));
    
    // Convert to percentage (50% is equal, 100% is winning for white, 0% is winning for black)
    return ((clamped + 1000) / 2000) * 100;
  };
  
  const formatEval = () => {
    if (isMate !== undefined) {
      return `M${Math.abs(isMate)}`;
    }
    
    // Convert centipawns to pawns with one decimal
    const pawns = Math.abs(evaluation / 100);
    const formatted = pawns.toFixed(1);
    
    // Add + for white advantage
    return evaluation >= 0 ? `+${formatted}` : formatted;
  };
  
  useEffect(() => {
    if (fillRef.current) {
      const percentage = getPercentage();
      fillRef.current.style.height = `${percentage}%`;
    }
  }, [evaluation, isMate]);
  
  const getEvalClass = () => {
    if (isMate !== undefined) {
      return isMate > 0 ? 'mate-white' : 'mate-black';
    }
    
    const absEval = Math.abs(evaluation);
    if (absEval >= 500) return evaluation > 0 ? 'winning-white' : 'winning-black';
    if (absEval >= 200) return evaluation > 0 ? 'advantage-white' : 'advantage-black';
    return 'equal';
  };

  return (
    <div className="vertical-eval-bar" ref={barRef}>
      <div className="eval-bar-container">
        <div className="eval-bar-background">
          <div 
            className={`eval-bar-fill ${getEvalClass()}`}
            ref={fillRef}
            style={{ height: `${getPercentage()}%` }}
          />
        </div>
        <div className="eval-bar-labels">
          <div className="eval-label eval-label-white">+10</div>
          <div className="eval-label eval-label-center">0.0</div>
          <div className="eval-label eval-label-black">-10</div>
        </div>
      </div>
      <div className="eval-display">
        <div className={`eval-score ${getEvalClass()}`}>
          {formatEval()}
        </div>
        {depth > 0 && (
          <div className="eval-depth">
            D{depth}
          </div>
        )}
        <div className="eval-turn">
          <div className={`turn-indicator ${isWhiteTurn ? 'white-turn' : 'black-turn'}`}>
            {isWhiteTurn ? '◉' : '◉'}
          </div>
        </div>
      </div>
    </div>
  );
}