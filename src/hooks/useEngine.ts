import { useState, useEffect, useRef } from 'preact/hooks';
import { StockfishManager } from '../components/MultiEngineManager';
import type { StockfishConfig, EngineEvent } from '../components/MultiEngineManager';

export interface EngineConfig {
  depth?: number;
  timeLimit?: number;
  multiPV?: number;
  autoPlay?: boolean;
  playAs?: 'white' | 'black' | 'both' | 'none';
}

export interface EngineState {
  isReady: boolean;
  isThinking: boolean;
  bestMove: string | null;
  evaluation: number;
  depth: number;
  nodes: number;
  nps?: number;
  pv: string[];
  mate?: number;
  // Legacy compatibility fields - no longer populated
  analysis?: {
    material: number;
    mobility: number;
    kingBanSafety: number;
    centerControl: number;
    totalScore: number;
  } | null;
  ttStats?: {
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
    nps: 0,
    pv: [],
    analysis: null,
    ttStats: null
  });
  
  const engineRef = useRef<StockfishManager | null>(null);
  const configRef = useRef(config);
  
  useEffect(() => {
    // Create Stockfish manager
    const stockfishConfig: StockfishConfig = {
      multiPV: config.multiPV || 1,
      depth: config.depth || 20,
      timeLimit: config.timeLimit || 3000
    };
    
    const manager = new StockfishManager(stockfishConfig);
    
    // Set up event handler
    const unsubscribe = manager.onEvent((event: EngineEvent) => {
      switch (event.type) {
        case 'ready':
          setState(prev => ({ ...prev, isReady: true }));
          break;
          
        case 'evaluation':
          setState(prev => ({
            ...prev,
            isThinking: true,
            evaluation: event.evaluation.score,
            depth: event.evaluation.depth,
            nodes: event.evaluation.nodes,
            nps: event.evaluation.nps,
            pv: event.evaluation.pv,
            mate: event.evaluation.mate
          }));
          break;
          
        case 'bestMove':
          setState(prev => ({
            ...prev,
            isThinking: false,
            bestMove: event.move
          }));
          break;
          
        case 'error':
          console.error('Stockfish error:', event.error);
          setState(prev => ({ ...prev, isThinking: false }));
          break;
      }
    });
    
    // Initialize manager
    manager.initialize().catch(error => {
      console.error('Failed to initialize Stockfish:', error);
    });
    
    engineRef.current = manager;
    
    // Cleanup
    return () => {
      unsubscribe();
      manager.dispose();
    };
  }, []);
  
  const findBestMove = (fen: string, timeLimit?: number) => {
    if (!engineRef.current || !state.isReady) return;
    
    setState(prev => ({ ...prev, isThinking: true }));
    
    // Update time limit if provided
    if (timeLimit && timeLimit !== configRef.current.timeLimit) {
      engineRef.current.updateConfig({ timeLimit });
      configRef.current = { ...configRef.current, timeLimit };
    }
    
    engineRef.current.findBestMove(fen);
  };
  
  const analyzePosition = (fen: string) => {
    if (!engineRef.current || !state.isReady) return;
    
    engineRef.current.analyzePosition(fen);
  };
  
  const stop = () => {
    if (!engineRef.current) return;
    
    engineRef.current.stop();
    setState(prev => ({ ...prev, isThinking: false }));
  };
  
  const updateConfig = (updates: Partial<EngineConfig>) => {
    if (!engineRef.current) return;
    
    const newConfig = { ...configRef.current, ...updates };
    configRef.current = newConfig;
    
    // Convert to Stockfish config
    const stockfishUpdates: Partial<StockfishConfig> = {};
    if (updates.depth !== undefined) stockfishUpdates.depth = updates.depth;
    if (updates.timeLimit !== undefined) stockfishUpdates.timeLimit = updates.timeLimit;
    if (updates.multiPV !== undefined) stockfishUpdates.multiPV = updates.multiPV;
    
    engineRef.current.updateConfig(stockfishUpdates);
  };
  
  // Legacy getStats method for compatibility
  const getStats = () => {
    // Stockfish doesn't expose TT stats in the same way
    // This is a stub for backward compatibility
    console.warn('getStats() is not available with Stockfish engine');
  };

  return {
    ...state,
    findBestMove,
    analyzePosition,
    stop,
    updateConfig,
    getStats,
    config: configRef.current
  };
}