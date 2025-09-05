import { useState, useEffect } from "preact/hooks";
import { BanChess } from "ban-chess.ts";
import type { Move, Action } from "ban-chess.ts";
import { AnalysisPanel } from "./AnalysisPanel";
import { StockfishManager } from "./MultiEngineManager";
import type { EngineLine } from "./MultiEngineManager";
import "../styles/lichess.css";

const BASE_PATH = import.meta.env.BASE_URL || '/';
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

// Simple audio using Web Audio API
function playSound(frequency: number, duration: number = 100) {
  try {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration / 1000
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (e) {
    // Silent fail if audio doesn't work
  }
}

interface PieceImageCache {
  [key: string]: string;
}

/**
 * Complete Lichess-style chess analysis interface
 * Combines the board, evaluation bar, and analysis panel
 */
export function LichessAnalysis() {
  const [game] = useState(() => new BanChess());
  const [board, setBoard] = useState<(string | null)[][]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [legalBans, setLegalBans] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [moveHistory, setMoveHistory] = useState<Action[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [evaluation, setEvaluation] = useState<number>(0);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [, forceUpdate] = useState({});

  // Engine manager - using Stockfish only
  const [engineManager] = useState(() => new StockfishManager({
    multiPV: 3,
    depth: 18,
    timeLimit: 3000
  }));

  // Piece image cache for better performance
  const [pieceImageCache] = useState<PieceImageCache>({});

  useEffect(() => {
    updateBoard();
    
    // Initialize engine manager
    engineManager.initialize().catch(console.error);
    
    // Setup evaluation updates
    const unsubscribe = engineManager.onEvent((event) => {
      if (event.type === 'evaluation') {
        setEvaluation(event.evaluation.score);
        setIsThinking(false); // Show as not thinking when we get evaluation updates
      } else if (event.type === 'bestMove') {
        setIsThinking(false);
      } else if (event.type === 'ready') {
        console.log('Stockfish engine is ready');
        // Start analysis of current position when engine is ready
        if (game.fen()) {
          engineManager.analyzePosition(game.fen());
        }
      }
    });
    
    // Cleanup on unmount
    return () => {
      unsubscribe();
      engineManager.dispose();
    };
  }, []);

  // Trigger analysis when position changes
  useEffect(() => {
    const fen = game.fen();
    if (fen) {
      setIsThinking(true);
      engineManager.analyzePosition(fen);
    }
  }, [moveHistory, currentMoveIndex]);

  // Get piece image path with caching
  const getPieceImage = (piece: string | null): string | null => {
    if (!piece) return null;

    const cacheKey = piece;
    if (pieceImageCache[cacheKey]) {
      return pieceImageCache[cacheKey];
    }

    const isWhite = piece === piece.toUpperCase();
    const pieceType = piece.toUpperCase();

    const pieceMap: Record<string, string> = {
      K: "King",
      Q: "Queen", 
      R: "Rook",
      B: "Bishop",
      N: "Knight",
      P: "Pawn",
    };

    const pieceName = pieceMap[pieceType];
    if (!pieceName) return null;

    // Use a default/classic piece set for Lichess style
    const imagePath = `${BASE_PATH}themes/classic/${
      isWhite ? "white" : "black"
    }/${pieceName}.png`;
    
    pieceImageCache[cacheKey] = imagePath;
    return imagePath;
  };

  const updateBoard = () => {
    const fen = game.fen().split(" ")[0];
    const rows = fen.split("/");
    const parsedRows = rows.map((row) => {
      const squares = [];
      for (const char of row) {
        if (isNaN(parseInt(char))) {
          squares.push(char);
        } else {
          for (let i = 0; i < parseInt(char); i++) {
            squares.push(null);
          }
        }
      }
      return squares;
    });
    setBoard(parsedRows);
    setLegalMoves(game.legalMoves());
    setLegalBans(game.legalBans());
  };

  const getSquareNotation = (displayRank: number, displayFile: number) => {
    if (!flipped) {
      const rank = 8 - displayRank;
      return FILES[displayFile] + rank;
    } else {
      const rank = displayRank + 1;
      return FILES[7 - displayFile] + rank;
    }
  };

  const isLegalTarget = (square: string) => {
    if (!selectedSquare) return false;
    if (game.nextActionType() === "move") {
      return legalMoves.some(
        (m) => m.from === selectedSquare && m.to === square
      );
    } else {
      return legalBans.some(
        (b) => b.from === selectedSquare && b.to === square
      );
    }
  };

  const canSelectSquare = (square: string) => {
    if (game.nextActionType() === "move") {
      return legalMoves.some((m) => m.from === square);
    } else {
      return legalBans.some((b) => b.from === square);
    }
  };

  const handleSquareClick = (displayRank: number, displayFile: number) => {
    const square = getSquareNotation(displayRank, displayFile);

    // Play click sound
    playSound(600, 50);

    if (!selectedSquare) {
      if (canSelectSquare(square)) {
        setSelectedSquare(square);
      }
      return;
    }

    if (square === selectedSquare) {
      setSelectedSquare(null);
      return;
    }

    if (isLegalTarget(square)) {
      const action = game.nextActionType() === "move"
        ? { move: { from: selectedSquare, to: square } }
        : { ban: { from: selectedSquare, to: square } };

      playAction(action as Action);
    } else if (canSelectSquare(square)) {
      setSelectedSquare(square);
    }
  };

  const playAction = (action: Action) => {
    const result = game.play(action);
    if (result.success) {
      // Play different sounds for move vs ban
      if (game.nextActionType() === "ban") {
        playSound(800, 150); // Higher pitch for move
      } else {
        playSound(400, 200); // Lower pitch for ban
      }

      const from = 'move' in action ? action.move.from : action.ban.from;
      const to = 'move' in action ? action.move.to : action.ban.to;

      setMoveHistory(prev => [...prev, action]);
      setCurrentMoveIndex(moveHistory.length);
      setLastMove({ from, to });
      updateBoard();
      setSelectedSquare(null);
      forceUpdate({});

      // Check for game over
      if (game.gameOver()) {
        setTimeout(() => {
          playSound(200, 500); // Deep sound for game over
        }, 200);
      }
    }
  };

  const getPieceAtSquare = (displayRank: number, displayFile: number) => {
    if (!flipped) {
      return board[displayRank]?.[displayFile];
    } else {
      return board[7 - displayRank]?.[7 - displayFile];
    }
  };

  const renderPiece = (piece: string) => {
    const imageSrc = getPieceImage(piece);
    if (!imageSrc) return null;

    return (
      <img
        src={imageSrc}
        alt={piece}
        style={{
          width: '90%',
          height: '90%',
          objectFit: 'contain',
          userSelect: 'none',
          pointerEvents: 'none'
        }}
        onError={(e) => {
          console.warn('Failed to load piece image:', imageSrc);
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  };

  const handleMoveSelect = (index: number) => {
    // Reset game and replay moves up to the selected index
    game.reset();
    for (let i = 0; i <= index; i++) {
      if (moveHistory[i]) {
        game.play(moveHistory[i]);
      }
    }
    setCurrentMoveIndex(index);
    updateBoard();
    forceUpdate({});
  };

  const handleLineSelect = (line: EngineLine) => {
    setEvaluation(line.evaluation.score);
    // In a full implementation, we could show the variation on the board
  };

  const resetGame = () => {
    playSound(1000, 100);
    game.reset();
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
    setLastMove(null);
    setSelectedSquare(null);
    setEvaluation(0);
    updateBoard();
    forceUpdate({});
  };

  return (
    <div className="lichess-analysis-layout">
      {/* Left Sidebar with Evaluation Bar */}
      <div className="lichess-left-sidebar">
        <div className="lichess-eval-bar">
          <div 
            className="lichess-eval-bar-fill"
            style={{
              height: `${Math.max(0, Math.min(100, 50 + (evaluation / 100) * 25))}%`,
              bottom: 0
            }}
          />
          <div className={`lichess-eval-score ${
            Math.abs(evaluation) > 200 
              ? evaluation > 0 ? 'white-winning' : 'black-winning'
              : ''
          }`}>
            {Math.abs(evaluation) >= 2000 
              ? evaluation > 0 ? '+M' : '-M'
              : evaluation >= 0 
                ? `+${(evaluation / 100).toFixed(1)}`
                : (evaluation / 100).toFixed(1)
            }
          </div>
          {isThinking && (
            <div style={{
              position: 'absolute',
              top: '4px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '12px',
              height: '12px',
              border: '2px solid var(--lichess-border)',
              borderTop: '2px solid var(--lichess-primary)',
              borderRadius: '50%',
              animation: 'lichess-spin 1s linear infinite'
            }} />
          )}
        </div>
      </div>

      {/* Main Board Area */}
      <div className="lichess-board-area">
        <div className="lichess-board-wrapper">
          <div className="lichess-board">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((displayRank) =>
              [0, 1, 2, 3, 4, 5, 6, 7].map((displayFile) => {
                const square = getSquareNotation(displayRank, displayFile);
                const piece = getPieceAtSquare(displayRank, displayFile);
                const isSelected = square === selectedSquare;
                const isLegal = selectedSquare && isLegalTarget(square);
                const isLight = (displayRank + displayFile) % 2 === 0;
                const isLastMoveSquare = lastMove && 
                  (lastMove.from === square || lastMove.to === square);
                const isBanned = game.currentBannedMove &&
                  (game.currentBannedMove.from === square || game.currentBannedMove.to === square);

                return (
                  <div
                    key={`${displayRank}-${displayFile}`}
                    onClick={() => handleSquareClick(displayRank, displayFile)}
                    className={`lichess-square ${isLight ? 'light' : 'dark'} ${
                      isSelected ? 'selected' : ''
                    } ${isLegal ? 'legal-move' : ''} ${
                      isLegal && piece ? 'has-piece' : ''
                    } ${isLastMoveSquare ? 'last-move' : ''}`}
                  >
                    {piece && renderPiece(piece)}
                    {isBanned && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#dc2626',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                        pointerEvents: 'none'
                      }}>
                        ×
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          {/* Board coordinates */}
          <div style={{
            position: 'absolute',
            left: '-20px',
            top: '0',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            fontSize: '12px',
            color: 'var(--lichess-text-secondary)'
          }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i}>
                {flipped ? i + 1 : 8 - i}
              </div>
            ))}
          </div>
          
          <div style={{
            position: 'absolute',
            bottom: '-20px',
            left: '0',
            right: '0',
            display: 'flex',
            justifyContent: 'space-around',
            fontSize: '12px',
            color: 'var(--lichess-text-secondary)'
          }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i}>
                {flipped ? FILES[7 - i] : FILES[i]}
              </div>
            ))}
          </div>
        </div>

        {/* Game Status and Controls */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <div style={{ 
            fontSize: '16px', 
            marginBottom: '16px', 
            color: 'var(--lichess-text)' 
          }}>
            {game.gameOver() ? (
              <div style={{ color: '#ffeb3b', fontWeight: '600' }}>
                {game.inCheckmate() ? 
                  `Checkmate! ${game.turn === 'white' ? 'Black' : 'White'} wins!` :
                  'Draw!' 
                }
              </div>
            ) : (
              <div>
                <span style={{ color: game.turn === 'white' ? '#fff' : '#aaa' }}>
                  {game.turn === 'white' ? 'White' : 'Black'}
                </span>
                <span style={{ margin: '0 8px' }}>to</span>
                <span style={{
                  color: game.nextActionType() === 'ban' ? '#e57373' : 'var(--lichess-accent)',
                  fontWeight: '500'
                }}>
                  {game.nextActionType() === 'ban' ? 'ban' : 'move'}
                </span>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              onClick={resetGame}
              style={{
                padding: '10px 20px',
                background: 'var(--lichess-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              New Game
            </button>
            
            <button
              onClick={() => setFlipped(!flipped)}
              style={{
                padding: '10px 20px',
                background: 'var(--lichess-panel-bg)',
                color: 'var(--lichess-text)',
                border: '1px solid var(--lichess-border)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Flip Board
            </button>
          </div>
        </div>
      </div>

      {/* Right Analysis Panel */}
      <AnalysisPanel
        fen={game.fen()}
        moveHistory={moveHistory}
        currentMoveIndex={currentMoveIndex}
        engineManager={engineManager}
        onMoveSelect={handleMoveSelect}
        onLineSelect={handleLineSelect}
      />
    </div>
  );
}