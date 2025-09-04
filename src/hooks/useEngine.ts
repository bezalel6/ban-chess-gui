import { useState, useEffect, useRef } from 'preact/hooks';
import type { Action } from 'ban-chess.ts';

export interface EngineConfig {
  depth?: number;
  timeLimit?: number;
  useOpeningBook?: boolean;
  autoPlay?: boolean;
  playAs?: 'white' | 'black' | 'both' | 'none';
}

export interface EngineState {
  isReady: boolean;
  isThinking: boolean;
  bestMove: Action | null;
  evaluation: number;
  depth: number;
  nodes: number;
  pv: Action[];
  analysis: {
    material: number;
    mobility: number;
    kingBanSafety: number;
    centerControl: number;
    totalScore: number;
  } | null;
  ttStats: {
    size: number;
    hits: number;
    hitRate: number;
  } | null;
}

export function useEngine(config: EngineConfig = {}) {
  const [state, setState] = useState<EngineState>({
    isReady: false,
    isThinking: false,
    bestMove: null,
    evaluation: 0,
    depth: 0,
    nodes: 0,
    pv: [],
    analysis: null,
    ttStats: null
  });
  
  const workerRef = useRef<Worker | null>(null);
  const configRef = useRef(config);
  
  useEffect(() => {
    // Create worker
    const worker = new Worker(
      new URL('../engine/engineWorker.ts', import.meta.url),
      { type: 'module' }
    );
    
    // Set up message handler
    worker.onmessage = (e: MessageEvent) => {
      const { type, ...data } = e.data;
      
      switch (type) {
        case 'READY':
          setState(prev => ({ ...prev, isReady: true }));
          break;
          
        case 'BEST_MOVE':
          setState(prev => ({
            ...prev,
            isThinking: false,
            bestMove: data.move,
            evaluation: data.evaluation,
            depth: data.depth,
            nodes: data.nodes,
            pv: data.pv || []
          }));
          break;
          
        case 'ANALYSIS':
          setState(prev => ({
            ...prev,
            analysis: data.analysis
          }));
          break;
          
        case 'TT_STATS':
          setState(prev => ({
            ...prev,
            ttStats: data.stats
          }));
          break;
          
        case 'ERROR':
          console.error('Engine error:', data.error);
          setState(prev => ({ ...prev, isThinking: false }));
          break;
      }
    };
    
    // Initialize engine
    worker.postMessage({
      type: 'INIT',
      payload: {
        depth: config.depth || 6,
        timeLimit: config.timeLimit || 3000,
        useOpeningBook: config.useOpeningBook !== false
      }
    });
    
    workerRef.current = worker;
    
    // Cleanup
    return () => {
      worker.terminate();
    };
  }, []);
  
  const findBestMove = (fen: string, timeLimit?: number) => {
    if (!workerRef.current || !state.isReady) return;
    
    setState(prev => ({ ...prev, isThinking: true }));
    
    workerRef.current.postMessage({
      type: 'FIND_BEST_MOVE',
      payload: {
        fen,
        timeLimit: timeLimit || configRef.current.timeLimit || 3000
      }
    });
  };
  
  const analyzePosition = (fen: string) => {
    if (!workerRef.current || !state.isReady) return;
    
    workerRef.current.postMessage({
      type: 'ANALYZE_POSITION',
      payload: { fen }
    });
  };
  
  const getStats = () => {
    if (!workerRef.current || !state.isReady) return;
    
    workerRef.current.postMessage({
      type: 'GET_TT_STATS'
    });
  };
  
  return {
    ...state,
    findBestMove,
    analyzePosition,
    getStats,
    config: configRef.current
  };
}