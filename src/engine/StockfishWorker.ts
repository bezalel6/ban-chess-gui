// Dedicated Stockfish.js Web Worker for chess analysis
import StockfishFactory from 'stockfish.js';

let stockfish: any = null;
let isInitialized = false;
let currentPosition = '';
let analysisConfig = {
  multiPV: 3,
  depth: 20,
  timeLimit: 3000
};

// UCI message handling
const handleUCIMessage = (message: string) => {
  const parts = message.trim().split(' ');
  
  if (parts[0] === 'info' && parts.includes('depth') && parts.includes('score')) {
    try {
      const depthIndex = parts.indexOf('depth');
      const scoreIndex = parts.indexOf('score');
      const nodesIndex = parts.indexOf('nodes');
      const timeIndex = parts.indexOf('time');
      const pvIndex = parts.indexOf('pv');
      const multipvIndex = parts.indexOf('multipv');
      const npsIndex = parts.indexOf('nps');
      
      const depth = parseInt(parts[depthIndex + 1]);
      const nodes = nodesIndex >= 0 ? parseInt(parts[nodesIndex + 1]) : 0;
      const time = timeIndex >= 0 ? parseInt(parts[timeIndex + 1]) : 0;
      const multiPV = multipvIndex >= 0 ? parseInt(parts[multipvIndex + 1]) : 1;
      const nps = npsIndex >= 0 ? parseInt(parts[npsIndex + 1]) : 0;
      
      // Parse score
      let score = 0;
      let mate: number | undefined;
      
      if (parts[scoreIndex + 1] === 'cp') {
        score = parseInt(parts[scoreIndex + 2]);
      } else if (parts[scoreIndex + 1] === 'mate') {
        mate = parseInt(parts[scoreIndex + 2]);
        score = mate > 0 ? 20000 - mate * 2 : -20000 - mate * 2;
      }
      
      // Parse PV (principal variation)
      let pv: string[] = [];
      if (pvIndex >= 0) {
        // Get moves up to the next parameter or end of string
        for (let i = pvIndex + 1; i < parts.length; i++) {
          const part = parts[i];
          // Stop if we hit another parameter
          if (part.startsWith('wdl') || part.startsWith('string') || part.startsWith('currline')) {
            break;
          }
          // Valid UCI move format check
          if (part.length >= 4 && part.match(/^[a-h][1-8][a-h][1-8][qrbn]?$/)) {
            pv.push(part);
          } else {
            break; // Invalid move format, stop parsing PV
          }
        }
      }
      
      // Send analysis update
      self.postMessage({
        type: 'ANALYSIS',
        evaluation: {
          score,
          depth,
          nodes,
          time,
          nps,
          pv: pv.slice(0, 10), // Limit to first 10 moves
          mate
        },
        multiPV
      });
      
    } catch (error) {
      console.warn('Failed to parse Stockfish info:', message, error);
    }
  } else if (parts[0] === 'bestmove' && parts[1]) {
    // Send best move
    self.postMessage({
      type: 'BEST_MOVE',
      move: parts[1],
      ponder: parts[3] // Ponder move if available
    });
  }
};

// Initialize Stockfish
const initializeStockfish = async () => {
  try {
    stockfish = StockfishFactory();
    
    if (!stockfish) {
      throw new Error('Failed to create Stockfish instance');
    }
    
    // Set up message handler
    stockfish.onmessage = (e: MessageEvent) => {
      handleUCIMessage(e.data);
    };
    
    // Wait for UCI initialization
    return new Promise<void>((resolve, reject) => {
      let isReady = false;
      let uciOk = false;
      
      const initHandler = (e: MessageEvent) => {
        const message = e.data.toString();
        
        if (message.includes('uciok')) {
          uciOk = true;
          // Configure Stockfish
          stockfish.postMessage(`setoption name MultiPV value ${analysisConfig.multiPV}`);
          stockfish.postMessage('setoption name Hash value 128');
          stockfish.postMessage('setoption name Threads value 1');
          stockfish.postMessage('setoption name Ponder value false');
          stockfish.postMessage('isready');
        } else if (message.includes('readyok') && uciOk) {
          isReady = true;
          stockfish.removeEventListener('message', initHandler);
          isInitialized = true;
          
          self.postMessage({ type: 'READY' });
          resolve();
        }
      };
      
      stockfish.addEventListener('message', initHandler);
      stockfish.postMessage('uci');
      
      // Timeout if initialization takes too long
      setTimeout(() => {
        if (!isReady) {
          reject(new Error('Stockfish initialization timeout'));
        }
      }, 10000);
    });
    
  } catch (error) {
    console.error('Stockfish initialization error:', error);
    self.postMessage({ 
      type: 'ERROR', 
      error: error instanceof Error ? error.message : 'Failed to initialize Stockfish'
    });
  }
};

// Convert Ban Chess FEN to standard chess FEN for Stockfish analysis
const convertBanChessFEN = (banChessFEN: string): string => {
  // Split the FEN into parts
  const parts = banChessFEN.split(' ');
  
  // For Ban Chess, we want to analyze the underlying chess position
  // Remove the ban state field if it exists (7th field)
  if (parts.length > 6) {
    // Standard FEN has 6 fields: position, active color, castling, en passant, halfmove, fullmove
    return parts.slice(0, 6).join(' ');
  }
  
  return banChessFEN;
};

// Note: UCI moves are now returned as strings for display
// No conversion to Action format needed since we work with raw UCI

// Message handler
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'INIT':
      analysisConfig = {
        multiPV: payload.multiPV || 3,
        depth: payload.depth || 20,
        timeLimit: payload.timeLimit || 3000
      };
      
      await initializeStockfish();
      break;
      
    case 'ANALYZE_POSITION':
      if (!stockfish || !isInitialized) {
        self.postMessage({ type: 'ERROR', error: 'Stockfish not initialized' });
        return;
      }
      
      try {
        const standardFEN = convertBanChessFEN(payload.fen);
        currentPosition = standardFEN;
        
        // Stop any ongoing analysis
        stockfish.postMessage('stop');
        
        // Set position and start analysis
        stockfish.postMessage(`position fen ${standardFEN}`);
        stockfish.postMessage(`go depth ${analysisConfig.depth}`);
        
      } catch (error) {
        console.error('Analysis error:', error);
        self.postMessage({ 
          type: 'ERROR', 
          error: error instanceof Error ? error.message : 'Analysis failed'
        });
      }
      break;
      
    case 'FIND_BEST_MOVE':
      if (!stockfish || !isInitialized) {
        self.postMessage({ type: 'ERROR', error: 'Stockfish not initialized' });
        return;
      }
      
      try {
        const standardFEN = convertBanChessFEN(payload.fen);
        currentPosition = standardFEN;
        
        // Stop any ongoing analysis
        stockfish.postMessage('stop');
        
        // Set position and find best move
        stockfish.postMessage(`position fen ${standardFEN}`);
        stockfish.postMessage(`go movetime ${payload.timeLimit || analysisConfig.timeLimit}`);
        
      } catch (error) {
        console.error('Best move search error:', error);
        self.postMessage({ 
          type: 'ERROR', 
          error: error instanceof Error ? error.message : 'Best move search failed'
        });
      }
      break;
      
    case 'UPDATE_CONFIG':
      if (!stockfish || !isInitialized) {
        self.postMessage({ type: 'ERROR', error: 'Stockfish not initialized' });
        return;
      }
      
      const newConfig = { ...analysisConfig, ...payload };
      
      // Update MultiPV if changed
      if (payload.multiPV && payload.multiPV !== analysisConfig.multiPV) {
        stockfish.postMessage(`setoption name MultiPV value ${payload.multiPV}`);
      }
      
      analysisConfig = newConfig;
      
      // Restart analysis with new config if we have a position
      if (currentPosition) {
        stockfish.postMessage('stop');
        stockfish.postMessage(`position fen ${currentPosition}`);
        stockfish.postMessage(`go depth ${analysisConfig.depth}`);
      }
      break;
      
    case 'STOP':
      if (stockfish && isInitialized) {
        stockfish.postMessage('stop');
      }
      break;
  }
};

export {};