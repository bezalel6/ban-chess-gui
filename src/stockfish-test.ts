// Test script to verify Stockfish integration works
// This can be run in browser dev tools

import { StockfishManager } from './components/MultiEngineManager';

// Test function that can be called from browser console
window.testStockfish = async () => {
  console.log('🔥 Testing Stockfish integration...');
  
  const manager = new StockfishManager({
    multiPV: 3,
    depth: 15,
    timeLimit: 2000
  });
  
  // Set up event listener
  const unsubscribe = manager.onEvent((event) => {
    console.log('📊 Stockfish Event:', event.type);
    
    if (event.type === 'evaluation') {
      console.log(`📈 Evaluation: ${event.evaluation.score} cp, depth ${event.evaluation.depth}`);
      console.log(`🎯 Best line: ${event.evaluation.pv.slice(0, 5).join(' ')}`);
    } else if (event.type === 'ready') {
      console.log('✅ Stockfish is ready! Starting analysis...');
      
      // Analyze starting position
      const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      manager.analyzePosition(startingFen);
      
      // Stop analysis after 3 seconds
      setTimeout(() => {
        console.log('⏹️ Stopping analysis...');
        manager.stop();
        
        // Clean up
        setTimeout(() => {
          unsubscribe();
          manager.dispose();
          console.log('🧹 Test completed and cleaned up');
        }, 1000);
      }, 3000);
      
    } else if (event.type === 'error') {
      console.error('❌ Stockfish error:', event.error);
    }
  });
  
  try {
    await manager.initialize();
  } catch (error) {
    console.error('💥 Failed to initialize Stockfish:', error);
  }
};

console.log('🎮 Stockfish test loaded. Run testStockfish() to start the test.');

export {};