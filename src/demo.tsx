import { useState } from 'preact/hooks';
import { ChessBoard } from './components/ChessBoard';
import { ChessBoardWithEngine } from './components/ChessBoardWithEngine';
import { LichessAnalysis } from './components/LichessAnalysis';

type InterfaceType = 'basic' | 'engine' | 'lichess';

/**
 * Demo component that allows switching between different chess interfaces
 * Useful for development and testing
 */
export function ChessInterfaceDemo() {
  const [currentInterface, setCurrentInterface] = useState<InterfaceType>('lichess');

  const renderInterface = () => {
    switch (currentInterface) {
      case 'basic':
        return <ChessBoard />;
      case 'engine':
        return <ChessBoardWithEngine />;
      case 'lichess':
        return <LichessAnalysis />;
      default:
        return <LichessAnalysis />;
    }
  };

  return (
    <div>
      {/* Interface Selector */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        padding: '10px',
        borderRadius: '8px',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={() => setCurrentInterface('basic')}
          style={{
            padding: '6px 12px',
            background: currentInterface === 'basic' ? '#3893e8' : '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Basic
        </button>
        <button
          onClick={() => setCurrentInterface('engine')}
          style={{
            padding: '6px 12px',
            background: currentInterface === 'engine' ? '#3893e8' : '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Engine
        </button>
        <button
          onClick={() => setCurrentInterface('lichess')}
          style={{
            padding: '6px 12px',
            background: currentInterface === 'lichess' ? '#3893e8' : '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Lichess
        </button>
      </div>

      {/* Current Interface */}
      {renderInterface()}
    </div>
  );
}