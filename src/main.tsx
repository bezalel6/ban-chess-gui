import { render } from 'preact'
import './styles.css'
import { App } from './app.tsx'

// Import Stockfish test for browser console
import './stockfish-test'

render(<App />, document.getElementById('app')!)
