# Ban Chess GUI

A lightweight, mobile-friendly GUI for testing the Ban Chess game implementation.

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

## Running the GUI

```bash
cd gui
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