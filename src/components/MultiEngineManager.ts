// Stockfish manager for Ban Chess analysis - no longer uses Action types

/** Evaluation result from Stockfish */
export interface EngineEvaluation {
  score: number;
  depth: number;
  nodes: number;
  time: number;
  nps?: number;
  pv: string[]; // UCI moves from Stockfish
  mate?: number;
}

/** Engine line for display */
export interface EngineLine {
  id: string;
  evaluation: EngineEvaluation;
  multipv: number;
  isSelected: boolean;
}

/** Stockfish configuration */
export interface StockfishConfig {
  multiPV: number; // Number of lines to show (1-5)
  depth: number;
  timeLimit: number;
}

/** Event types for Stockfish manager */
export type EngineEvent = 
  | { type: 'evaluation'; evaluation: EngineEvaluation; multiPV: number }
  | { type: 'bestMove'; move: string; ponder?: string }
  | { type: 'ready' }
  | { type: 'error'; error: string };

/**
 * Stockfish engine manager for Ban Chess analysis
 * Uses Stockfish.js Web Worker for powerful chess analysis
 */
export class StockfishManager {
  private stockfishWorker: Worker | null = null;
  private eventHandlers: ((event: EngineEvent) => void)[] = [];
  private config: StockfishConfig;
  private isInitialized = false;
  
  constructor(config: StockfishConfig) {
    this.config = { ...config };
  }
  
  /** Initialize Stockfish engine */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await this.initializeStockfish();
    this.isInitialized = true;
  }
  
  /** Initialize Stockfish worker */
  private async initializeStockfish(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create our dedicated Stockfish worker
        this.stockfishWorker = new Worker(
          new URL('../engine/StockfishWorker.ts', import.meta.url),
          { type: 'module' }
        );
        
        this.stockfishWorker.onmessage = (e: MessageEvent) => {
          this.handleStockfishMessage(e.data);
        };
        
        // Initialize Stockfish
        this.stockfishWorker.postMessage({
          type: 'INIT',
          payload: {
            multiPV: this.config.multiPV,
            depth: this.config.depth,
            timeLimit: this.config.timeLimit
          }
        });
        
        // Wait for ready signal
        const readyHandler = (e: MessageEvent) => {
          if (e.data.type === 'READY') {
            this.stockfishWorker!.removeEventListener('message', readyHandler);
            this.emit({ type: 'ready' });
            resolve();
          } else if (e.data.type === 'ERROR') {
            reject(new Error(e.data.error));
          }
        };
        
        this.stockfishWorker.addEventListener('message', readyHandler);
        
        setTimeout(() => reject(new Error('Stockfish initialization timeout')), 10000);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /** Handle Stockfish worker messages */
  private handleStockfishMessage(message: any): void {
    switch (message.type) {
      case 'ANALYSIS':
        this.emit({
          type: 'evaluation',
          evaluation: message.evaluation,
          multiPV: message.multiPV
        });
        break;
        
      case 'BEST_MOVE':
        this.emit({
          type: 'bestMove',
          move: message.move,
          ponder: message.ponder
        });
        break;
        
      case 'ERROR':
        this.emit({
          type: 'error',
          error: message.error
        });
        break;
    }
  }
  
  /** Start analysis of a position */
  analyzePosition(fen: string): void {
    if (!this.isInitialized || !this.stockfishWorker) return;
    
    this.stockfishWorker.postMessage({
      type: 'ANALYZE_POSITION',
      payload: { fen }
    });
  }
  
  /** Find best move for a position */
  findBestMove(fen: string): void {
    if (!this.isInitialized || !this.stockfishWorker) return;
    
    this.stockfishWorker.postMessage({
      type: 'FIND_BEST_MOVE',
      payload: { fen, timeLimit: this.config.timeLimit }
    });
  }
  
  /** Stop current analysis */
  stop(): void {
    if (this.stockfishWorker) {
      this.stockfishWorker.postMessage({ type: 'STOP' });
    }
  }
  
  /** Update configuration */
  updateConfig(updates: Partial<StockfishConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (this.stockfishWorker) {
      this.stockfishWorker.postMessage({
        type: 'UPDATE_CONFIG',
        payload: updates
      });
    }
  }
  
  /** Add event listener */
  onEvent(handler: (event: EngineEvent) => void): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index >= 0) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }
  
  /** Emit event to all handlers */
  private emit(event: EngineEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Engine event handler error:', error);
      }
    });
  }
  
  /** Cleanup resources */
  dispose(): void {
    if (this.stockfishWorker) {
      this.stockfishWorker.terminate();
      this.stockfishWorker = null;
    }
    
    this.eventHandlers = [];
    this.isInitialized = false;
  }
}

// Legacy alias for backward compatibility
export const MultiEngineManager = StockfishManager;