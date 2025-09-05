import { useState, useEffect } from "preact/hooks";
import { BanChess } from "ban-chess.ts";
import type { Move, Action } from "ban-chess.ts";
import { ThemeSlider, THEMES } from "./ThemeSlider";
import { EnginePanel } from "./EnginePanel";
import { useEngine } from "../hooks/useEngine";
import "../styles/engine.css";

const BASE_PATH = import.meta.env.BASE_URL;
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

type EngineMode = 'off' | 'white' | 'black' | 'analysis';

export function ChessBoardWithEngine() {
  const [game] = useState(() => new BanChess());
  const [board, setBoard] = useState<(string | null)[][]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [legalBans, setLegalBans] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [autoFlip, setAutoFlip] = useState(true);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [, forceUpdate] = useState({});

  // Visual customization states
  const [boardSize, setBoardSize] = useState(4);
  const [showControls, setShowControls] = useState(true);
  const [currentTheme, setCurrentTheme] = useState("classic");
  const [showDebug, setShowDebug] = useState(false);
  
  // Engine states
  const [engineMode, setEngineMode] = useState<EngineMode>('off');
  const [showEnginePanel, setShowEnginePanel] = useState(false);
  
  // Initialize engine
  const engine = useEngine({
    depth: 6,
    timeLimit: 3000,
    useOpeningBook: true
  });

  useEffect(() => {
    updateBoard();
  }, []);

  // Get piece image path based on theme
  const getPieceImage = (piece: string | null, _: string): string | null => {
    if (!piece) return null;

    const isWhite = piece === piece.toUpperCase();
    const pieceType = piece.toUpperCase();
    const theme = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

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

    return `${BASE_PATH}${theme.path}/${
      isWhite ? "white" : "black"
    }/${pieceName}.png`;
  };

  // Update CSS variables when settings change
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--board-size", `${boardSize}rem`);
  }, [boardSize]);

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

  const getSquareColor = (rank: number, file: number) => {
    const isLight = (rank + file) % 2 === 0;
    return isLight ? "square-light" : "square-dark";
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
  
  // Check if it's engine's turn
  const isEngineTurn = () => {
    if (engineMode === 'off' || engineMode === 'analysis') return false;
    if (engineMode === 'white' && game.turn === 'white') return true;
    if (engineMode === 'black' && game.turn === 'black') return true;
    return false;
  };

  const handleSquareClick = (displayRank: number, displayFile: number) => {
    // Don't allow moves during engine's turn
    if (isEngineTurn()) return;
    
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
      
      if (game.nextActionType() === "move") {
        setMoveHistory([...moveHistory, `🚫 ${from}→${to}`]);
      } else {
        setMoveHistory([...moveHistory, `${from}→${to}`]);
      }

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
  
  // Handle engine moves
  const handleEngineMove = (action: Action) => {
    if (!isEngineTurn()) return;
    
    setTimeout(() => {
      playAction(action);
    }, 500); // Small delay to make it visible
  };

  const getPieceAtSquare = (displayRank: number, displayFile: number) => {
    if (!flipped) {
      return board[displayRank]?.[displayFile];
    } else {
      return board[7 - displayRank]?.[7 - displayFile];
    }
  };

  const resetGame = () => {
    playSound(1000, 100);
    game.reset();
    setSelectedSquare(null);
    setLastMove(null);
    setMoveHistory([]);
    updateBoard();
    forceUpdate({});
  };

  const renderPiece = (piece: string, square: string) => {
    const imageSrc = getPieceImage(piece, square);
    if (!imageSrc) return null;

    const isWhite = piece === piece.toUpperCase();

    return (
      <div className="piece-wrapper">
        <img
          src={imageSrc}
          alt={piece}
          className={`chess-piece ${isWhite ? "piece-white" : "piece-black"}`}
        />
      </div>
    );
  };

  useEffect(() => {
    if (autoFlip) {
      const shouldFlip = game.turn === "black";
      if (shouldFlip !== flipped) {
        setFlipped(shouldFlip);
      }
    }
  }, [game.turn, autoFlip]);

  return (
    <div className="container">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <img
            src={`${BASE_PATH}logo.png`}
            alt="Ban Chess Logo"
            className="header-logo"
          />
          <div className="header-text">
            <h1 className="page-title">Ban Chess with Engine</h1>
            <p className="subtitle">
              {game.gameOver()
                ? "Game Over"
                : isEngineTurn() 
                ? "Engine is thinking..."
                : "Click on a piece to select, then click destination"}
            </p>
            <p className="version-info">
              Library v{(BanChess as any).VERSION || "1.2.2"} | Engine v0.1.0
            </p>
          </div>
        </div>
      </div>

      {/* Engine Mode Selector */}
      <div className="engine-mode-selector">
        <button 
          className={`engine-mode-btn ${engineMode === 'off' ? 'active' : ''}`}
          onClick={() => { setEngineMode('off'); setShowEnginePanel(false); }}
        >
          Human vs Human
        </button>
        <button 
          className={`engine-mode-btn ${engineMode === 'white' ? 'active' : ''}`}
          onClick={() => { setEngineMode('white'); setShowEnginePanel(true); }}
        >
          Engine as White
        </button>
        <button 
          className={`engine-mode-btn ${engineMode === 'black' ? 'active' : ''}`}
          onClick={() => { setEngineMode('black'); setShowEnginePanel(true); }}
        >
          Engine as Black
        </button>
        <button 
          className={`engine-mode-btn ${engineMode === 'analysis' ? 'active' : ''}`}
          onClick={() => { setEngineMode('analysis'); setShowEnginePanel(true); }}
        >
          Analysis Mode
        </button>
      </div>

      {/* Game Info */}
      <div className="game-info">
        <div className="turn-indicator">
          <span className={game.turn === "white" ? "white-turn" : "black-turn"}>
            Turn: {game.turn === "white" ? "White" : "Black"}
            {isEngineTurn() && " (Engine)"}
          </span>
          <span
            className={`dot ${
              game.turn === "white" ? "dot-white" : "dot-black"
            }`}
          />
        </div>

        <div
          className={`action-type ${
            game.nextActionType() === "ban" ? "ban" : "move"
          }`}
        >
          Next:{" "}
          {game.nextActionType() === "ban" ? "🚫 Ban a move" : "♟️ Make a move"}
        </div>

        {game.inCheckmate() && (
          <div className="game-status checkmate">♔ Checkmate!</div>
        )}
        {game.inCheck() && !game.inCheckmate() && (
          <div className="game-status check">♔ Check!</div>
        )}
      </div>

      {/* Board Container */}
      <div className="board-container">
        <div className="board-wrapper">
          {/* Rank labels (1-8) */}
          <div className="rank-labels">
            {Array.from({ length: 8 }, (_, i) => {
              const rank = flipped ? i + 1 : 8 - i;
              return <div key={i}>{rank}</div>;
            })}
          </div>

          {/* File labels (a-h) */}
          <div className="file-labels">
            {Array.from({ length: 8 }, (_, i) => {
              const file = flipped ? FILES[7 - i] : FILES[i];
              return <div key={i}>{file}</div>;
            })}
          </div>

          {/* Chess board grid */}
          <div className="chess-board">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((displayRank) =>
              [0, 1, 2, 3, 4, 5, 6, 7].map((displayFile) => {
                const square = getSquareNotation(displayRank, displayFile);
                const piece = getPieceAtSquare(displayRank, displayFile);
                const isSelected = square === selectedSquare;
                const isLegal = selectedSquare && isLegalTarget(square);
                const isBanned =
                  game.currentBannedMove &&
                  (game.currentBannedMove.from === square ||
                    game.currentBannedMove.to === square);
                const isLastMoveFrom = lastMove?.from === square;
                const isLastMoveTo = lastMove?.to === square;
                const canSelect = canSelectSquare(square);

                return (
                  <div
                    key={`${displayRank}-${displayFile}`}
                    onClick={() => handleSquareClick(displayRank, displayFile)}
                    className={`board-square ${getSquareColor(
                      displayRank,
                      displayFile
                    )} ${isSelected ? "square-selected" : ""} ${
                      isLegal ? "square-legal-move" : ""
                    } ${isLastMoveFrom ? "square-last-move-from" : ""} ${
                      isLastMoveTo ? "square-last-move-to" : ""
                    } ${isBanned ? "square-banned" : ""} ${
                      canSelect && !isSelected ? "square-can-select" : ""
                    } ${
                      !canSelect && !isLegal && selectedSquare
                        ? "square-inactive"
                        : ""
                    } ${isEngineTurn() ? "square-disabled" : ""}`}
                  >
                    {piece && renderPiece(piece, square)}
                    {isLegal && !piece && <div className="move-dot" />}
                    {isBanned && (
                      <div className="ban-overlay">
                        <div className="ban-x">×</div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      {/* Engine Panel */}
      {showEnginePanel && (
        <EnginePanel 
          engine={engine}
          fen={game.fen()}
          isEngineMove={isEngineTurn()}
          onEngineMove={handleEngineMove}
        />
      )}

      {/* Controls */}
      <div className="controls">
        <button onClick={resetGame} className="btn btn-primary">
          New Game
        </button>
        <button onClick={() => setFlipped(!flipped)} className="btn">
          Flip Board
        </button>
        <button
          onClick={() => setAutoFlip(!autoFlip)}
          className={`btn ${autoFlip ? "btn-success" : ""}`}
        >
          Auto-flip: {autoFlip ? "ON" : "OFF"}
        </button>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="btn"
        >
          Debug: {showDebug ? "ON" : "OFF"}
        </button>
      </div>

      {/* Visual Controls */}
      <div className="controls-section">
        <button
          className="btn btn-secondary controls-toggle"
          onClick={() => setShowControls(!showControls)}
        >
          {showControls ? "🎨 Hide Controls" : "🎨 Show Controls"}
        </button>

        {showControls && (
          <div className="controls-panel">
            <div className="control-group">
              <label className="control-label">
                Board Size: {boardSize}rem
              </label>
              <input
                type="range"
                min="3"
                max="8"
                step="0.5"
                value={boardSize}
                onChange={(e) =>
                  setBoardSize(parseFloat((e.target as any).value))
                }
                className="control-slider"
              />
            </div>

            <div className="control-group">
              <ThemeSlider
                currentTheme={currentTheme}
                onThemeChange={setCurrentTheme}
              />
            </div>
          </div>
        )}
      </div>

      {/* Move History */}
      <div className="history-section">
        <h3 className="history-title">Move History</h3>
        <div className="move-history">
          {moveHistory.length > 0 ? (
            <div className="moves-inline">
              {moveHistory.map((entry, i) => (
                <span
                  key={i}
                  className={`move-entry-inline ${
                    entry.startsWith("🚫") ? "ban-entry" : ""
                  }`}
                >
                  {Math.floor(i / 2) + 1}.{i % 2 === 0 ? "" : ".."} {entry}
                </span>
              ))}
            </div>
          ) : (
            <div className="move-entry">No moves yet</div>
          )}
        </div>
      </div>

      {/* Debug View */}
      {showDebug && (
        <div className="debug-section">
          <h3 className="debug-title">Debug Information</h3>
          <div className="debug-content">
            <div className="debug-group">
              <label className="debug-label">FEN:</label>
              <code className="debug-value">{game.fen()}</code>
            </div>
            <div className="debug-group">
              <label className="debug-label">PGN:</label>
              <code className="debug-value">{game.pgn()}</code>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Message */}
      {game.gameOver() && (
        <div className="game-over">
          <h2>Game Over!</h2>
          <p>
            {game.inCheckmate()
              ? `Checkmate! ${game.turn === "white" ? "Black" : "White"} wins!`
              : "Draw!"}
          </p>
        </div>
      )}
    </div>
  );
}