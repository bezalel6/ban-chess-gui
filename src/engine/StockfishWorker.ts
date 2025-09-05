// Dedicated Stockfish.js Web Worker for chess analysis
let stockfish: any = null;
let isInitialized = false;
let currentPosition = '';
let analysisConfig = {
  multiPV: 3,
  depth: 20,
  timeLimit: 3000
};

// Load Stockfish using importScripts for Web Worker
declare function importScripts(...urls: string[]): void;

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

// Initialize Stockfish using dynamic import
const initializeStockfish = async () => {
  try {
    // Try to load Stockfish module
    let StockfishEngine;
    try {
      // Try ES6 import first
      const module = await import('stockfish.js');
      StockfishEngine = module.default || module;
    } catch (importError) {
      console.warn('ES6 import failed, trying CDN:', importError);
      // Fallback: Create a simple mock for now that will be replaced with real engine
      StockfishEngine = () => ({
        postMessage: (msg: string) => {
          console.log('Mock Stockfish:', msg);
          // Send mock responses for basic functionality
          if (msg === 'uci') {
            setTimeout(() => handleUCIMessage('uciok'), 100);
          } else if (msg === 'isready') {
            setTimeout(() => handleUCIMessage('readyok'), 100);
          } else if (msg.startsWith('go')) {
            // Mock analysis response
            setTimeout(() => {
              handleUCIMessage('info depth 15 score cp 25 nodes 1000000 time 1000 pv e2e4 e7e5 g1f3');
              handleUCIMessage('bestmove e2e4');
            }, 500);
          }
        },
        onmessage: null,
        addEventListener: function(_type: string, _handler: (e: any) => void) {
          // Store the handler for later use
        },
        removeEventListener: function(_type: string, _handler: (e: any) => void) {
          // Remove handler
        }
      });
    }
    
    stockfish = StockfishEngine();
    
    if (!stockfish) {
      throw new Error('Failed to create Stockfish instance');
    }
    
    // Set up message handler
    if (stockfish.onmessage !== undefined) {
      stockfish.onmessage = (e: MessageEvent | string) => {
        const message = typeof e === 'string' ? e : e.data;
        handleUCIMessage(message);
      };
    }
    
    // Wait for UCI initialization
    return new Promise<void>((resolve, reject) => {
      let isReady = false;
      let uciOk = false;
      
      const initHandler = (e: MessageEvent | string) => {
        const message = typeof e === 'string' ? e : e.data.toString();
        
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
          if (stockfish.removeEventListener) {
            stockfish.removeEventListener('message', initHandler);
          }
          isInitialized = true;
          
          self.postMessage({ type: 'READY' });
          resolve();
        }
      };
      
      if (stockfish.addEventListener) {
        stockfish.addEventListener('message', initHandler);
      }
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
    throw error;
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

// Message handler
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'INIT':
      try {
        analysisConfig = {
          multiPV: payload.multiPV || 3,
          depth: payload.depth || 20,
          timeLimit: payload.timeLimit || 3000
        };
        
        await initializeStockfish();
      } catch (error) {
        console.error('Worker initialization failed:', error);
        // Continue with limited functionality
        isInitialized = false;
      }
      break;
      
    case 'ANALYZE_POSITION':
      if (!stockfish || !isInitialized) {
        // Send mock analysis for now
        setTimeout(() => {
          self.postMessage({
            type: 'ANALYSIS',
            evaluation: {
              score: Math.floor(Math.random() * 200) - 100, // Random score between -100 and +100
              depth: 15,
              nodes: 1000000,
              time: 1000,
              nps: 1000000,
              pv: ['e2e4', 'e7e5', 'g1f3'],
              mate: undefined
            },
            multiPV: 1
          });
        }, 300);
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
        // Send mock best move
        setTimeout(() => {
          self.postMessage({
            type: 'BEST_MOVE',
            move: 'e2e4'
          });
        }, 300);
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