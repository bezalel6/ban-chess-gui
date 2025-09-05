import { useEffect } from 'preact/hooks';
import type { EngineState } from '../hooks/useEngine';

interface EnginePanelProps {
  engine: EngineState & {
    findBestMove: (fen: string, timeLimit?: number) => void;
    analyzePosition: (fen: string) => void;
    getStats: () => void;
  };
  fen: string;
  isEngineMove: boolean;
  onEngineMove?: (move: any) => void;
}

export function EnginePanel({ engine, fen, isEngineMove, onEngineMove }: EnginePanelProps) {
  // Auto-play engine moves
  useEffect(() => {
    if (isEngineMove && engine.isReady && !engine.isThinking) {
      engine.findBestMove(fen);
    }
  }, [isEngineMove, fen, engine.isReady]);
  
  // Handle engine move
  useEffect(() => {
    if (engine.bestMove && isEngineMove && onEngineMove) {
      onEngineMove(engine.bestMove);
    }
  }, [engine.bestMove]);
  
  // Update analysis
  useEffect(() => {
    if (engine.isReady && !engine.isThinking) {
      engine.analyzePosition(fen);
      engine.getStats();
    }
  }, [fen, engine.isReady, engine.isThinking]);
  
  const formatEval = (score: number): string => {
    if (Math.abs(score) >= 10000) {
      return score > 0 ? 'M' + Math.ceil((20000 - score) / 2) : '-M' + Math.ceil((20000 + score) / 2);
    }
    return (score / 100).toFixed(2);
  };
  
  const getEvalBarWidth = (score: number): number => {
    // Clamp between -1000 and 1000 for display
    const clamped = Math.max(-1000, Math.min(1000, score));
    // Convert to 0-100% range
    return ((clamped + 1000) / 2000) * 100;
  };
  
  return (
    <div className="engine-panel">
      <h3 className="engine-title">
        🤖 Ban Chess Engine
        {engine.isThinking && (
          <span className="thinking-indicator">
            <span className="thinking-dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
            Depth {engine.depth}
          </span>
        )}
      </h3>
      
      {/* Evaluation Bar */}
      <div className="eval-container">
        <div className="eval-bar">
          <div 
            className="eval-bar-fill"
            style={{ width: `${getEvalBarWidth(engine.evaluation)}%` }}
          />
          <div className="eval-score">
            {formatEval(engine.evaluation)}
          </div>
        </div>
      </div>
      
      {/* Engine Stats */}
      <div className="engine-stats">
        <div className="stat">
          <span className="stat-label">Depth:</span>
          <span className="stat-value">{engine.depth}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Nodes:</span>
          <span className="stat-value">{engine.nodes.toLocaleString()}</span>
        </div>
        {engine.ttStats && (
          <div className="stat">
            <span className="stat-label">TT Hit:</span>
            <span className="stat-value">{(engine.ttStats.hitRate * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      {/* Position Analysis */}
      {engine.analysis && (
        <div className="position-analysis">
          <h4 className="analysis-title">Position Breakdown</h4>
          <div className="analysis-grid">
            <div className="analysis-item">
              <span className="analysis-label">Material:</span>
              <span className="analysis-value">{(engine.analysis.material / 100).toFixed(1)}</span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">Mobility:</span>
              <span className="analysis-value">{engine.analysis.mobility}</span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">King Safety:</span>
              <span className="analysis-value">{engine.analysis.kingBanSafety}</span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">Center:</span>
              <span className="analysis-value">{engine.analysis.centerControl}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Principal Variation */}
      {engine.pv && engine.pv.length > 0 && (
        <div className="pv-display">
          <h4 className="pv-title">Best Line</h4>
          <div className="pv-moves">
            {engine.pv.map((move: any, i: number) => (
              <span key={i} className="pv-move">
                {i + 1}. {('move' in move) ? 
                  `${move.move.from}→${move.move.to}` : 
                  `🚫${move.ban.from}→${move.ban.to}`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}