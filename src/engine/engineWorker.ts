// Web Worker for running the Ban Chess Engine
// Note: This would normally import from 'ban-chess-engine'
// For now, we'll create a simplified version that can be expanded
import { BanChess } from 'ban-chess.ts';

// Simplified engine interface for worker
interface SimpleEngine {
  findBestMove: (game: BanChess) => any;
  evaluatePosition: (game: BanChess) => any;
}

let engine: SimpleEngine | null = null;
let currentAnalysis: any = null;

// Message handler
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'INIT':
      // Initialize simplified engine
      engine = {
        findBestMove: (game: BanChess) => {
          // Simplified move selection - returns random legal move
          const actionType = game.nextActionType();
          const actions = actionType === 'move' ? game.legalMoves() : game.legalBans();
          if (actions.length === 0) return null;
          
          // Convert to proper action format
          const formattedActions = actions.map((a: any) => 
            actionType === 'move' ? { move: a } : { ban: a }
          );
          
          // Simple evaluation heuristic
          const randomIndex = Math.floor(Math.random() * Math.min(3, formattedActions.length));
          return {
            action: formattedActions[randomIndex],
            score: Math.random() * 200 - 100,
            depth: payload.depth || 4,
            nodes: Math.floor(Math.random() * 10000)
          };
        },
        evaluatePosition: (game: BanChess) => {
          // Simple material count
          const fen = game.fen();
          const board = fen.split(' ')[0];
          let whiteValue = 0;
          let blackValue = 0;
          
          const pieceValues: Record<string, number> = {
            p: 1, n: 3, b: 3, r: 5, q: 9, k: 100
          };
          
          for (const char of board) {
            if (char === '/' || (char >= '1' && char <= '8')) continue;
            const isWhite = char === char.toUpperCase();
            const value = pieceValues[char.toLowerCase()] || 0;
            if (isWhite) whiteValue += value;
            else blackValue += value;
          }
          
          const activePlayer = game.turn;
          const material = activePlayer === 'white' ? 
            whiteValue - blackValue : blackValue - whiteValue;
          
          return {
            material: material * 100,
            mobility: (game.legalMoves().length + game.legalBans().length) * 10,
            kingBanSafety: 0,
            centerControl: 0,
            totalScore: material * 100
          };
        }
      };
      self.postMessage({ type: 'READY' });
      break;
      
    case 'FIND_BEST_MOVE':
      if (!engine) {
        self.postMessage({ type: 'ERROR', error: 'Engine not initialized' });
        return;
      }
      
      const game = new BanChess(payload.fen);
      const result = engine.findBestMove(game);
      
      self.postMessage({
        type: 'BEST_MOVE',
        move: result.action,
        evaluation: result.score,
        depth: result.depth,
        nodes: result.nodesSearched,
        pv: result.pv
      });
      break;
      
    case 'ANALYZE_POSITION':
      if (!engine) {
        self.postMessage({ type: 'ERROR', error: 'Engine not initialized' });
        return;
      }
      
      const analysisGame = new BanChess(payload.fen);
      currentAnalysis = engine.evaluatePosition(analysisGame);
      
      self.postMessage({
        type: 'ANALYSIS',
        analysis: currentAnalysis
      });
      break;
      
    case 'GET_TT_STATS':
      // Return mock stats for now
      self.postMessage({
        type: 'TT_STATS',
        stats: {
          size: 1000,
          hits: 350,
          hitRate: 0.35
        }
      });
      break;
      
    case 'STOP':
      // In future, implement stopping long-running searches
      break;
  }
};

export {};