# Ban Chess GUI

[![Live Demo](https://img.shields.io/badge/demo-play%20online-brightgreen)](https://bezalel6.github.io/ban-chess.ts/)
[![Main Library](https://img.shields.io/badge/library-ban--chess.ts-blue)](https://github.com/bezalel6/ban-chess.ts)
[![npm version](https://img.shields.io/npm/v/ban-chess.ts.svg)](https://www.npmjs.com/package/ban-chess.ts)

A lightweight, mobile-friendly GUI for the Ban Chess variant, built on top of the [ban-chess.ts](https://github.com/bezalel6/ban-chess.ts) library.

## Try It Online

🎮 **[Play Ban Chess Now!](https://bezalel6.github.io/ban-chess.ts/)**

## Main Library

This GUI is built for the **ban-chess.ts** library:
- **GitHub Repository**: [https://github.com/bezalel6/ban-chess.ts](https://github.com/bezalel6/ban-chess.ts)
- **NPM Package**: [https://www.npmjs.com/package/ban-chess.ts](https://www.npmjs.com/package/ban-chess.ts)
- **Documentation**: See the [main repository](https://github.com/bezalel6/ban-chess.ts) for full API documentation

## Features

- **Visual Chess Board**: Interactive 8x8 board with Unicode chess pieces
- **Live State Display**: Real-time FEN and PGN state visualization
- **Ban State Tracking**: Shows current banned move and 7th FEN field
- **Mobile Responsive**: Works on phones and tablets
- **Move/Ban Interaction**: Click source square, then target square
- **Game State Info**: Shows turn, action type, check status
- **History Viewer**: Expandable detailed history JSON

## Tech Stack

- **Preact**: 3KB React-compatible framework
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first styling
- **TypeScript**: Type safety

## Development

### Prerequisites

Make sure you have the parent repository cloned with submodules:
```bash
git clone --recursive https://github.com/bezalel6/ban-chess.ts.git
cd ban-chess.ts/gui
```

Or if you're working with this GUI repository directly:
```bash
git clone https://github.com/bezalel6/ban-chess-gui.git
cd ban-chess-gui
```

### Running Locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173 (or the URL shown in terminal)

## How to Play

1. **Black starts** by banning one of White's opening moves
2. Click a source square (piece origin for bans)
3. Click target square to complete the ban
4. **White moves** (avoiding the banned square)
5. **White bans** one of Black's moves
6. **Black moves** (avoiding the ban)
7. Pattern continues...

## Visual Indicators

- **Blue ring**: Selected square
- **Green ring**: Legal target square
- **Red/faded**: Banned square
- **Light/dark squares**: Standard chess board pattern

## State Display

The GUI shows:
- Current FEN with 7th field (ban state)
- PGN with ban annotations `{banning: e2e4}`
- Full history JSON (expandable)
- Current turn and action type
- Active ban if any
- Check/checkmate status

## Related Links

- **Main Library**: [ban-chess.ts on GitHub](https://github.com/bezalel6/ban-chess.ts)
- **NPM Package**: [ban-chess.ts on NPM](https://www.npmjs.com/package/ban-chess.ts)
- **Live Demo**: [Play Ban Chess](https://bezalel6.github.io/ban-chess.ts/)
- **API Documentation**: [Library README](https://github.com/bezalel6/ban-chess.ts#readme)

## License

ISC - See the [main repository](https://github.com/bezalel6/ban-chess.ts) for license details.