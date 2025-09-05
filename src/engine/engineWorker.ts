// Web Worker for running the Ban Chess Engine
import { BanChess, BanChessEngine, BanChessEngineV2 } from 'ban-chess.ts';
import type { Action } from 'ban-chess.ts';

let engine: BanChessEngine | null = null;
let engineV2: BanChessEngineV2 | null = null;
let currentAnalysis: any = null;
let isSearching = false;
let searchStartTime = 0;

// Message handler
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'INIT':
      // Initialize both engines
      engine = new BanChessEngine({
        maxDepth: payload.depth || 6,
        timeLimit: payload.timeLimit || 3000
      });
      
      engineV2 = new BanChessEngineV2({
        hash: 128,
        moveTime: payload.timeLimit || 3000
      });
      
      self.postMessage({ type: 'READY' });
      break;
      
    case 'FIND_BEST_MOVE':
      if (!engine || !engineV2) {
        self.postMessage({ type: 'ERROR', error: 'Engine not initialized' });
        return;
      }
      
      try {
        isSearching = true;
        searchStartTime = Date.now();
        const game = new BanChess(payload.fen);
        
        // Send initial thinking status
        self.postMessage({
          type: 'SEARCH_UPDATE',
          depth: 0,
          nodes: 0,
          evaluation: 0,
          pv: [],
          time: 0
        });
        
        // Use iterative deepening for progressive updates
        const maxDepth = payload.depth || 6;
        let bestAction: Action | null = null;
        let bestScore = 0;
        let totalNodes = 0;
        
        // Quick search for immediate response
        for (let depth = 1; depth <= maxDepth && isSearching; depth++) {
          const searchResult = engineV2.search(game, {
            depth,
            movetime: Math.min(500, payload.timeLimit / maxDepth)
          });
          
          if (searchResult.pv.length > 0) {
            bestAction = searchResult.pv[0];
            bestScore = 0; // V2 engine doesn't expose score in search result
            totalNodes = searchResult.nodes;
            
            // Send progressive update
            self.postMessage({
              type: 'SEARCH_UPDATE',
              depth,
              nodes: totalNodes,
              evaluation: bestScore,
              pv: searchResult.pv.slice(0, 5),
              time: Date.now() - searchStartTime,
              nps: searchResult.nps
            });
          }
          
          // Check time limit
          if (Date.now() - searchStartTime > payload.timeLimit) break;
        }
        
        // Final result
        self.postMessage({
          type: 'BEST_MOVE',
          move: bestAction,
          evaluation: bestScore,
          depth: maxDepth,
          nodes: totalNodes,
          pv: bestAction ? [bestAction] : [],
          time: Date.now() - searchStartTime
        });
        
      } catch (error) {
        console.error('Engine error:', error);
        self.postMessage({ 
          type: 'ERROR', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      } finally {
        isSearching = false;
      }
      break;
      
    case 'ANALYZE_POSITION':
      if (!engine || !engineV2) {
        self.postMessage({ type: 'ERROR', error: 'Engine not initialized' });
        return;
      }
      
      try {
        const analysisGame = new BanChess(payload.fen);
        
        // Get static evaluation from V2 engine
        const staticEval = engineV2.evaluatePosition(analysisGame);
        
        // Count material
        const fen = analysisGame.fen();
        const board = fen.split(' ')[0];
        let whiteMaterial = 0;
        let blackMaterial = 0;
        
        const pieceValues: Record<string, number> = {
          p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
        };
        
        for (const char of board) {
          if (char === '/' || (char >= '1' && char <= '8')) continue;
          const isWhite = char === char.toUpperCase();
          const value = pieceValues[char.toLowerCase()] || 0;
          if (isWhite) whiteMaterial += value;
          else blackMaterial += value;
        }
        
        const mobility = analysisGame.legalMoves().length + analysisGame.legalBans().length;
        
        currentAnalysis = {
          material: (whiteMaterial - blackMaterial) * 100,
          mobility: mobility * 10,
          kingBanSafety: analysisGame.inCheck() ? -50 : 20,
          centerControl: Math.abs(staticEval) < 100 ? 25 : 0,
          totalScore: staticEval
        };
        
        self.postMessage({
          type: 'ANALYSIS',
          analysis: currentAnalysis
        });
      } catch (error) {
        console.error('Analysis error:', error);
        self.postMessage({ 
          type: 'ERROR', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      break;
      
    case 'GET_TT_STATS':
      if (!engine) {
        self.postMessage({ type: 'ERROR', error: 'Engine not initialized' });
        return;
      }
      
      const stats = engine.getStatistics();
      self.postMessage({
        type: 'TT_STATS',
        stats: {
          size: stats.transpositionTableSize,
          hits: 0, // V1 engine doesn't track TT hits separately
          hitRate: 0.35 // Estimate based on typical performance
        }
      });
      break;
      
    case 'STOP':
      isSearching = false;
      break;
  }
};

export {};