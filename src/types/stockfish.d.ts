declare module 'stockfish.js' {
  interface Stockfish extends Worker {
    postMessage(command: string): void;
    onmessage: ((this: Worker, ev: MessageEvent) => any) | null;
  }
  
  function StockfishFactory(): Stockfish;
  export = StockfishFactory;
}