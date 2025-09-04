# Ban Chess Engine + GUI Integration Guide

## Overview
This document outlines the modifications needed to integrate the Ban Chess Engine with the Ban Chess GUI for real-time evaluation display and engine play capabilities.

## Modifications Required

### 1. Ban Chess Engine Repository Changes

#### A. Add Browser Build Support
**File**: `package.json`
```json
{
  "scripts": {
    "build:browser": "vite build",
    "dev:browser": "vite"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

**File**: `vite.config.ts` (new)
- Configure Vite to build UMD and ES modules
- External dependency on ban-chess.ts
- Output formats for browser consumption

#### B. Update Exports for Browser
**File**: `src/index.ts`
- Ensure all necessary types are exported
- Export interfaces for `Action`, `SearchResult`, etc.

### 2. Ban Chess GUI Repository Changes

#### A. Install Engine Dependency
```bash
npm install ban-chess-engine
```
Or link locally:
```bash
npm link ../ban-chess-engine
```

#### B. Add Engine Worker Module
**File**: `src/engine/engineWorker.ts` (new)
- Web Worker to run engine in background thread
- Prevents UI blocking during search
- Message-based communication with main thread

#### C. Create Engine Hook
**File**: `src/hooks/useEngine.ts` (new)
- React/Preact hook for engine state management
- Handles worker communication
- Provides engine API to components

#### D. Add Engine Panel Component
**File**: `src/components/EnginePanel.tsx` (new)
Features:
- **Evaluation Bar**: Visual representation of position evaluation
- **Search Stats**: Depth, nodes searched, time
- **Position Analysis**: Material, mobility, king safety breakdown
- **Principal Variation**: Best line display
- **Transposition Table Stats**: Hit rate display

#### E. Update Main ChessBoard Component
**File**: `src/components/ChessBoardWithEngine.tsx` (new extended version)
New features:
- Engine mode selector (Off/White/Black/Analysis)
- Auto-play for engine moves
- Disable board during engine thinking
- Integration with EnginePanel

#### F. Add Engine Styles
**File**: `src/styles/engine.css` (new)
- Evaluation bar styling
- Engine panel layout
- Animation for "thinking" indicator
- Dark mode support

### 3. Key Integration Points

#### A. Engine-GUI Communication Flow
```
User Move → Update Board → Send FEN to Engine → 
Engine Calculates → Returns Best Move → 
Auto-play if Engine Turn → Update Board
```

#### B. Engine Modes
1. **Off**: Human vs Human (default)
2. **Engine as White**: Engine plays white pieces
3. **Engine as Black**: Engine plays black pieces
4. **Analysis Mode**: Engine analyzes all positions without playing

#### C. Real-time Updates
- Position evaluation after every move
- Search statistics during thinking
- Principal variation display
- Material balance visualization

### 4. Build & Deployment Steps

#### For Ban Chess Engine:
```bash
cd ban-chess-engine
npm run build         # Node.js build
npm run build:browser # Browser build
npm link             # For local development
```

#### For Ban Chess GUI:
```bash
cd ban-chess-gui
npm link ban-chess-engine  # Link local engine
npm install                # Or install from npm
npm run dev               # Development server
npm run build            # Production build
```

### 5. Configuration Options

#### Engine Configuration
```typescript
interface EngineConfig {
  depth?: number;        // Search depth (default: 6)
  timeLimit?: number;    // Time per move in ms (default: 3000)
  useOpeningBook?: boolean; // Use opening book (default: true)
}
```

#### GUI Configuration
- Board flipping (auto or manual)
- Piece themes (classic/modern)
- Board size adjustment
- Debug information display

### 6. Performance Considerations

#### Web Worker Benefits
- Non-blocking UI during engine search
- Parallel computation capability
- Clean separation of concerns

#### Optimization Tips
- Transposition table size limited by browser memory
- Consider reducing search depth on mobile devices
- Opening book significantly speeds up early game

### 7. Future Enhancements

#### Potential Features
1. **UCI Protocol Support**: Connect to external engines
2. **Analysis Board**: Multiple variations exploration
3. **Game Database**: Save/load games with engine analysis
4. **Time Controls**: Implement clock for timed games
5. **Multiplayer**: WebRTC for peer-to-peer play
6. **Mobile App**: React Native wrapper

#### Performance Improvements
1. **Shared ArrayBuffer**: Faster worker communication
2. **WASM Compilation**: Compile engine to WebAssembly
3. **IndexedDB**: Persistent transposition table
4. **Progressive Web App**: Offline capability

### 8. Testing Integration

#### Manual Testing
1. Load GUI in browser
2. Select "Engine as Black"
3. Make a move as White
4. Verify engine responds
5. Check evaluation display updates
6. Test all engine modes

#### Automated Testing
```typescript
// Example test for engine integration
describe('Engine Integration', () => {
  test('engine responds to position', async () => {
    const engine = new BanChessEngine();
    const game = new BanChess();
    const result = await engine.findBestAction(game);
    expect(result.action).toBeDefined();
  });
});
```

### 9. Troubleshooting

#### Common Issues
1. **Worker not loading**: Check module resolution in vite.config
2. **Engine timeout**: Increase timeLimit configuration
3. **Memory issues**: Reduce transposition table size
4. **CORS errors**: Ensure proper development server configuration

### 10. API Reference

#### Engine Worker Messages
```typescript
// Initialize engine
{ type: 'INIT', payload: { depth, timeLimit, useOpeningBook } }

// Find best move
{ type: 'FIND_BEST_MOVE', payload: { fen, timeLimit } }

// Analyze position
{ type: 'ANALYZE_POSITION', payload: { fen } }

// Get statistics
{ type: 'GET_TT_STATS' }
```

#### Engine Responses
```typescript
// Ready signal
{ type: 'READY' }

// Best move found
{ type: 'BEST_MOVE', move, evaluation, depth, nodes, pv }

// Position analysis
{ type: 'ANALYSIS', analysis: { material, mobility, kingBanSafety, centerControl } }

// Statistics
{ type: 'TT_STATS', stats: { size, hits, hitRate } }
```

## Summary

The integration provides a complete chess GUI with integrated AI engine featuring:
- Real-time position evaluation
- Multiple playing modes
- Visual feedback for engine thinking
- Comprehensive analysis display
- Responsive design
- Performance optimization through Web Workers

Both repositories need minimal modifications while maintaining clean separation of concerns and the ability to use each component independently.