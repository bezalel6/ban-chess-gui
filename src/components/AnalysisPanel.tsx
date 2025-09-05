import { useState, useEffect, useMemo } from 'preact/hooks';
import type { Action } from 'ban-chess.ts';
import type { EngineLine, StockfishManager, EngineEvent } from './MultiEngineManager';

interface AnalysisPanelProps {
  /** Current FEN position */
  fen: string;
  /** Move history for navigation */
  moveHistory: Action[];
  /** Current move index in history */
  currentMoveIndex: number;
  /** Stockfish engine manager instance */
  engineManager: StockfishManager;
  /** Callback when user navigates to a move */
  onMoveSelect?: (index: number) => void;
  /** Callback when user selects an engine line */
  onLineSelect?: (line: EngineLine) => void;
}

interface TabType {
  id: string;
  name: string;
  icon: string;
}

const TABS: TabType[] = [
  { id: 'computer', name: 'Computer', icon: '🤖' },
  { id: 'opening', name: 'Opening', icon: '📚' },
  { id: 'settings', name: 'Settings', icon: '⚙️' }
];

/**
 * Right-side analysis panel that mimics Lichess design
 * Shows computer analysis, opening book, move list, and settings
 */
export function AnalysisPanel({
  fen,
  moveHistory,
  currentMoveIndex,
  engineManager,
  onMoveSelect,
  onLineSelect
}: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('computer');
  const [engineLines, setEngineLines] = useState<EngineLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string>('1');
  const [engineSettings, setEngineSettings] = useState({
    multiPV: 3,
    depth: 18,
    enabled: true
  });
  const [openingInfo, setOpeningInfo] = useState<{
    name: string;
    eco: string;
    moves: string;
  } | null>(null);

  // Simple opening database
  const openingDatabase: Record<string, { name: string; eco: string }> = {
    // King's pawn openings
    "e4": { name: "King's Pawn", eco: "B00" },
    "e4 e5": { name: "King's Pawn Game", eco: "C20" },
    "e4 e5 Nf3": { name: "King's Knight Opening", eco: "C20" },
    "e4 e5 Nf3 Nc6": { name: "King's Knight Opening", eco: "C20" },
    "e4 e5 Nf3 Nc6 Bb5": { name: "Ruy Lopez", eco: "C60" },
    "e4 e5 Nf3 Nc6 Bc4": { name: "Italian Game", eco: "C50" },
    "e4 e5 Nf3 f5": { name: "Latvian Gambit", eco: "C40" },
    "e4 c5": { name: "Sicilian Defense", eco: "B20" },
    "e4 c6": { name: "Caro-Kann Defense", eco: "B10" },
    "e4 e6": { name: "French Defense", eco: "C00" },
    
    // Queen's pawn openings
    "d4": { name: "Queen's Pawn", eco: "D00" },
    "d4 d5": { name: "Queen's Pawn Game", eco: "D00" },
    "d4 d5 c4": { name: "Queen's Gambit", eco: "D06" },
    "d4 Nf6": { name: "Indian Defense", eco: "A40" },
    "d4 Nf6 c4": { name: "Queen's Indian Setup", eco: "A47" },
    "d4 f5": { name: "Dutch Defense", eco: "A80" },
    
    // Flank openings
    "Nf3": { name: "Réti Opening", eco: "A04" },
    "c4": { name: "English Opening", eco: "A10" },
    "f4": { name: "Bird's Opening", eco: "A02" },
    "b3": { name: "Nimzo-Larsen Attack", eco: "A01" },
    
    // Other
    "g3": { name: "King's Indian Attack", eco: "A07" },
    "Nc3": { name: "Van't Kruijs Opening", eco: "A00" }
  };

  // Engine event handler
  useEffect(() => {
    const unsubscribe = engineManager.onEvent((event: EngineEvent) => {
      switch (event.type) {
        case 'evaluation':
          setEngineLines(prev => {
            const lineId = `stockfish-${event.multiPV}`;
            const existingIndex = prev.findIndex(line => line.id === lineId);
            
            const newLine: EngineLine = {
              id: lineId,
              evaluation: event.evaluation,
              multipv: event.multiPV,
              isSelected: selectedLineId === lineId
            };
            
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = newLine;
              return updated;
            } else {
              return [...prev, newLine].sort((a, b) => a.multipv - b.multipv);
            }
          });
          break;
          
        case 'error':
          console.error('Stockfish error:', event.error);
          break;
      }
    });
    
    return unsubscribe;
  }, [engineManager, selectedLineId]);

  // Auto-analyze current position and update opening info
  useEffect(() => {
    if (engineSettings.enabled && fen) {
      engineManager.analyzePosition(fen);
    }
    
    // Update opening information
    if (moveHistory.length <= 10) { // Only show openings for early moves
      const moveString = moveHistory
        .map(action => formatSan(action))
        .join(' ');
      
      // Try to find exact match first, then partial matches
      let opening = openingDatabase[moveString];
      if (!opening && moveString.includes(' ')) {
        // Try progressively shorter sequences
        const moves = moveString.split(' ');
        for (let i = moves.length - 1; i > 0; i--) {
          const partial = moves.slice(0, i).join(' ');
          if (openingDatabase[partial]) {
            opening = openingDatabase[partial];
            break;
          }
        }
      }
      
      if (opening) {
        setOpeningInfo({
          name: opening.name,
          eco: opening.eco,
          moves: moveString || 'Starting position'
        });
      } else if (moveHistory.length === 0) {
        setOpeningInfo({
          name: 'Starting Position',
          eco: '',
          moves: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -'
        });
      } else {
        setOpeningInfo(null);
      }
    } else {
      setOpeningInfo(null);
    }
  }, [fen, engineSettings.enabled, engineManager, moveHistory]);

  // Format engine evaluation for display
  const formatEvaluation = (score: number, mate?: number): { text: string; className: string } => {
    if (mate !== undefined) {
      return {
        text: `M${Math.abs(mate)}`,
        className: 'mate'
      };
    }
    
    const pawnValue = score / 100;
    const absValue = Math.abs(pawnValue);
    
    if (absValue >= 10) {
      return {
        text: pawnValue > 0 ? '+−' : '−+',
        className: pawnValue > 0 ? 'positive' : 'negative'
      };
    }
    
    const formatted = pawnValue >= 0 ? `+${pawnValue.toFixed(1)}` : pawnValue.toFixed(1);
    return {
      text: formatted,
      className: pawnValue > 0 ? 'positive' : 'negative'
    };
  };

  // Format move for display with proper notation
  const formatMove = (action: Action): string => {
    if ('move' in action) {
      const { from, to, promotion } = action.move;
      const moveStr = promotion ? `${from}${to}=${promotion.toUpperCase()}` : `${from}${to}`;
      return moveStr;
    } else {
      const { from, to } = action.ban;
      return `${from}${to}×`; // Use × to indicate ban
    }
  };

  // Convert action to San notation (simplified)
  const formatSan = (action: Action): string => {
    if ('move' in action) {
      const { from, to, promotion } = action.move;
      // Simplified SAN - in real implementation would need piece context
      const piece = from[0] === from[0].toLowerCase() ? '' : from[0].toUpperCase();
      if (promotion) {
        return `${piece}${to}=${promotion.toUpperCase()}`;
      }
      return `${piece}${to}`;
    } else {
      const { from, to } = action.ban;
      return `${from}-${to}×`; // Show as ban notation
    }
  };

  // Format principal variation from UCI moves
  const formatPV = (pv: string[]): string => {
    return pv.slice(0, 6).join(' ');
  };

  // Generate move pairs for display
  const movePairs = useMemo(() => {
    const pairs: Array<{
      number: number;
      white?: Action;
      black?: Action;
      whiteIndex: number;
      blackIndex: number;
    }> = [];
    
    for (let i = 0; i < moveHistory.length; i += 2) {
      pairs.push({
        number: Math.floor(i / 2) + 1,
        white: moveHistory[i],
        black: moveHistory[i + 1],
        whiteIndex: i,
        blackIndex: i + 1
      });
    }
    
    return pairs;
  }, [moveHistory]);

  // Handle line selection
  const handleLineSelect = (line: EngineLine) => {
    setSelectedLineId(line.id);
    onLineSelect?.(line);
  };

  // Handle move selection
  const handleMoveSelect = (index: number) => {
    onMoveSelect?.(index);
  };

  // Update engine settings
  const updateEngineSettings = (updates: Partial<typeof engineSettings>) => {
    const newSettings = { ...engineSettings, ...updates };
    setEngineSettings(newSettings);
    
    engineManager.updateConfig({
      multiPV: newSettings.multiPV,
      depth: newSettings.depth
    });
  };

  return (
    <div className="lichess-right-panel">
      {/* Panel Tabs */}
      <div className="lichess-panel-tabs">
        {TABS.map(tab => (
          <div
            key={tab.id}
            className={`lichess-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </div>
        ))}
      </div>

      <div className="lichess-analysis-content">
        {/* Computer Analysis Tab */}
        {activeTab === 'computer' && (
          <>
            {/* Engine Lines */}
            <div className="lichess-engine-lines">
              {engineLines.length === 0 && (
                <div className="lichess-loading">
                  Analyzing position...
                </div>
              )}
              
              {engineLines.map((line) => {
                const evalResult = formatEvaluation(line.evaluation.score, line.evaluation.mate);
                return (
                  <div
                    key={line.id}
                    className={`lichess-engine-line ${line.isSelected ? 'selected' : ''}`}
                    data-multipv={line.multipv}
                    onClick={() => handleLineSelect(line)}
                  >
                    <div className={`lichess-line-eval ${evalResult.className}`}>
                      {evalResult.text}
                    </div>
                    <div className="lichess-line-moves">
                      {formatPV(line.evaluation.pv)}
                      {line.evaluation.depth && (
                        <span style={{ 
                          marginLeft: '8px', 
                          fontSize: '10px', 
                          color: 'var(--lichess-text-secondary)' 
                        }}>
                          d{line.evaluation.depth}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Evaluation Graph Placeholder */}
            <div className="lichess-eval-graph">
              <div className="lichess-eval-curve">
                {/* SVG curve would go here */}
              </div>
            </div>

            {/* Move List */}
            <div className="lichess-move-list">
              {movePairs.length === 0 && (
                <div className="lichess-loading">
                  No moves yet
                </div>
              )}
              
              {movePairs.map(pair => (
                <div key={pair.number} className="lichess-move-pair">
                  <div className="lichess-move-number">{pair.number}.</div>
                  
                  {pair.white && (
                    <div
                      className={`lichess-move white-move ${currentMoveIndex === pair.whiteIndex ? 'current' : ''} ${
                        'ban' in pair.white ? 'ban-move' : ''
                      }`}
                      onClick={() => handleMoveSelect(pair.whiteIndex)}
                      title={`${formatMove(pair.white)} (${pair.whiteIndex + 1})`}
                    >
                      {formatSan(pair.white)}
                    </div>
                  )}
                  
                  {pair.black && (
                    <div
                      className={`lichess-move black-move ${currentMoveIndex === pair.blackIndex ? 'current' : ''} ${
                        'ban' in pair.black ? 'ban-move' : ''
                      }`}
                      onClick={() => handleMoveSelect(pair.blackIndex)}
                      title={`${formatMove(pair.black)} (${pair.blackIndex + 1})`}
                    >
                      {formatSan(pair.black)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Opening Book Tab */}
        {activeTab === 'opening' && (
          <div className="lichess-opening">
            {openingInfo ? (
              <>
                <div className="lichess-opening-name">{openingInfo.name}</div>
                {openingInfo.eco && (
                  <div className="lichess-opening-eco">{openingInfo.eco}</div>
                )}
                <div className="lichess-opening-moves">
                  {moveHistory.length > 0 ? (
                    <>
                      <strong>Moves:</strong> {openingInfo.moves}
                    </>
                  ) : (
                    <em>Starting position - make your first move!</em>
                  )}
                </div>
                {moveHistory.length < 10 && (
                  <div style={{ 
                    marginTop: '12px', 
                    fontSize: '11px', 
                    color: 'var(--lichess-text-secondary)',
                    fontStyle: 'italic'
                  }}>
                    Opening information shown for first 10 moves
                  </div>
                )}
              </>
            ) : (
              <div className="lichess-loading">
                {moveHistory.length > 10 ? 
                  'Opening phase complete - now in the middle game' : 
                  'Unknown opening or position'
                }
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="lichess-engine-settings">
            <div className="lichess-settings-section">
              <h4 style={{ color: 'var(--lichess-text)', marginBottom: '12px', fontSize: '13px' }}>
                Engine Configuration
              </h4>
              
              <div className="lichess-setting-row">
                <span className="lichess-setting-label">
                  <strong>Computer Analysis</strong>
                  <div style={{ fontSize: '10px', color: 'var(--lichess-text-secondary)' }}>
                    Enable real-time position evaluation
                  </div>
                </span>
                <label className="lichess-toggle">
                  <input
                    type="checkbox"
                    checked={engineSettings.enabled}
                    onChange={(e) => updateEngineSettings({ 
                      enabled: (e.target as HTMLInputElement).checked 
                    })}
                  />
                  <span className="lichess-toggle-slider"></span>
                </label>
              </div>
              
              <div className="lichess-setting-row">
                <span className="lichess-setting-label">
                  <strong>Multiple Lines</strong>
                  <div style={{ fontSize: '10px', color: 'var(--lichess-text-secondary)' }}>
                    Show top engine variations
                  </div>
                </span>
                <div className="lichess-slider-container">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={engineSettings.multiPV}
                    onChange={(e) => updateEngineSettings({ 
                      multiPV: parseInt((e.target as HTMLInputElement).value)
                    })}
                    className="lichess-slider"
                    disabled={!engineSettings.enabled}
                  />
                  <span className="lichess-setting-value">{engineSettings.multiPV}</span>
                </div>
              </div>
              
              <div className="lichess-setting-row">
                <span className="lichess-setting-label">
                  <strong>Search Depth</strong>
                  <div style={{ fontSize: '10px', color: 'var(--lichess-text-secondary)' }}>
                    Maximum calculation depth
                  </div>
                </span>
                <div className="lichess-slider-container">
                  <input
                    type="range"
                    min="5"
                    max="25"
                    value={engineSettings.depth}
                    onChange={(e) => updateEngineSettings({ 
                      depth: parseInt((e.target as HTMLInputElement).value)
                    })}
                    className="lichess-slider"
                    disabled={!engineSettings.enabled}
                  />
                  <span className="lichess-setting-value">{engineSettings.depth}</span>
                </div>
              </div>
            </div>
            
            <div className="lichess-settings-section" style={{ marginTop: '20px' }}>
              <h4 style={{ color: 'var(--lichess-text)', marginBottom: '8px', fontSize: '13px' }}>
                Engine Status
              </h4>
              <div style={{ fontSize: '11px', color: 'var(--lichess-text-secondary)' }}>
                <div>🔥 Stockfish.js (WASM)</div>
                <div style={{ color: 'var(--lichess-text-tertiary)', fontSize: '10px' }}>
                  World's strongest chess engine
                </div>
                <div style={{ marginTop: '8px' }}>
                  Analysis: {engineSettings.enabled ? '✅ Active' : '⏸️ Paused'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}