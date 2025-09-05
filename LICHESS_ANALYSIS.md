# Lichess-Style Analysis Interface

This project now includes a complete Lichess-style chess analysis interface for Ban Chess. The interface provides all the essential features found on Lichess's analysis board with Ban Chess-specific enhancements.

## Components Overview

### 1. VerticalEvalBar
**Location**: `src/components/VerticalEvalBar.tsx`

A vertical evaluation bar exactly like Lichess's, positioned on the left side of the board.

**Features**:
- Shows evaluation from -10 to +10 range
- Smooth animations with cubic-bezier transitions
- White advantage at top, black at bottom
- Mate scores displayed as M1, M2, etc.
- Dynamic scoring with proper color coding
- Responsive design that adapts to mobile

### 2. MultiEngineManager
**Location**: `src/components/MultiEngineManager.ts`

A sophisticated engine management system that handles multiple chess engines in parallel.

**Features**:
- **Stockfish.js Integration**: Full UCI protocol support
- **BanChessEngine Integration**: Ban Chess-specific move evaluation
- **Multi-PV Analysis**: Configurable 1-5 engine lines
- **Event-Based Architecture**: Real-time evaluation updates
- **Parallel Execution**: Multiple engines running simultaneously
- **Dynamic Configuration**: Runtime engine settings adjustment

### 3. AnalysisPanel
**Location**: `src/components/AnalysisPanel.tsx`

Right-side analysis panel that mimics Lichess's design and functionality.

**Features**:
- **Computer Analysis Tab**: 
  - Multiple engine lines (1-5 configurable)
  - Real-time evaluation updates
  - Principal variation display
  - Clickable moves for board navigation

- **Opening Book Tab**:
  - Opening name and ECO code display
  - Move sequence information
  - Integration ready for opening databases

- **Settings Tab**:
  - Engine on/off toggle
  - Multi-PV line configuration (1-5)
  - Search depth adjustment (5-25)
  - Real-time settings application

### 4. LichessAnalysis
**Location**: `src/components/LichessAnalysis.tsx`

Complete Lichess-style interface that combines all components into a cohesive experience.

**Features**:
- **Full Board Integration**: 
  - 60x60px squares matching Lichess dimensions
  - Proper piece rendering with caching
  - Last move highlighting
  - Legal move indicators
  - Ban move visualization

- **Game Navigation**:
  - Move history with algebraic notation
  - Click-to-navigate functionality
  - Ban moves marked with 🚫 prefix
  - Position replay capability

- **Audio Feedback**:
  - Different sounds for moves vs bans
  - Click sounds for interaction
  - Game over sound effects

## Visual Design

### 5. Lichess CSS
**Location**: `src/styles/lichess.css`

Complete recreation of Lichess's visual design with Ban Chess adaptations.

**Color Scheme**:
```css
--lichess-bg: #161512           /* Main background */
--lichess-board-bg: #262421     /* Board area background */
--lichess-light-square: #f0d9b5 /* Light board squares */
--lichess-dark-square: #b58863  /* Dark board squares */
--lichess-text: #d4cfb8         /* Primary text */
--lichess-accent: #8bb266       /* Action highlights */
--lichess-primary: #3893e8      /* Primary buttons */
```

**Layout Features**:
- Three-column layout: eval bar | board | analysis panel
- Responsive design with mobile breakpoints
- Smooth transitions and hover effects
- Professional scrollbar styling
- Loading states and animations

## Usage

### Basic Setup

```typescript
import { LichessAnalysis } from './components/LichessAnalysis';

export function App() {
  return <LichessAnalysis />;
}
```

### Engine Configuration

The MultiEngineManager can be configured for different analysis modes:

```typescript
const engineManager = new MultiEngineManager({
  stockfishEnabled: true,      // Standard chess analysis
  banChessEngineEnabled: true, // Ban Chess specific analysis
  multiPV: 3,                 // Show 3 engine lines
  depth: 18,                  // Search depth
  timeLimit: 3000             // Time limit per position
});
```

### Event Handling

Engine events are handled through a clean event system:

```typescript
engineManager.onEvent((event) => {
  switch (event.type) {
    case 'evaluation':
      // Update evaluation display
      setEvaluation(event.evaluation.score);
      break;
    case 'bestMove':
      // Handle best move found
      break;
    case 'error':
      // Handle engine errors
      break;
  }
});
```

## Ban Chess Specific Features

### 1. Ban Move Visualization
- Ban moves are displayed with a red "×" overlay on affected squares
- Ban moves in the move list are prefixed with 🚫
- Different sound effects for bans vs regular moves

### 2. Action Type Indicators
- Clear indication of whether next action is "ban" or "move"
- Color-coded status (red for ban, green for move)
- Proper game flow enforcement

### 3. Engine Integration
- Ban Chess Engine provides ban-aware analysis
- Stockfish provides standard chess evaluation for comparison
- Multi-engine analysis shows different perspectives

## Performance Optimizations

### 1. Component Level
- Piece image caching for faster rendering
- Memoized calculations for move generation
- Efficient re-rendering with targeted state updates

### 2. Engine Level  
- Worker-based architecture prevents UI blocking
- Parallel engine execution
- Event-based updates minimize unnecessary work

### 3. Visual Level
- CSS transitions for smooth animations
- Optimized grid layouts
- Responsive breakpoints for different screen sizes

## Browser Compatibility

The interface works in all modern browsers with:
- ES6+ support
- Web Workers
- WebAssembly (for Stockfish)
- CSS Grid and Flexbox

## Development

### Building
```bash
cd gui
npm run build
```

### Development Server
```bash
cd gui
npm run dev
```

### Type Checking
All components are fully typed with TypeScript, providing excellent developer experience with autocomplete and error checking.

The interface is now ready for production use and provides a professional chess analysis experience specifically tailored for the Ban Chess variant.