// Stockfish.js loader wrapper
// This helps ensure the WASM file is loaded from the correct path

self.Module = {
  locateFile: function(file) {
    // Get the directory path of this script
    const scriptPath = self.location.href;
    const dir = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
    
    // Return the full path to the requested file
    if (file === 'stockfish.wasm') {
      return dir + '/stockfish.wasm';
    }
    return file;
  },
  
  print: function(text) {
    postMessage(text);
  },
  
  onRuntimeInitialized: function() {
    // Engine is ready
    console.log('Stockfish runtime initialized');
  }
};

// Now load the actual Stockfish script
importScripts('./stockfish.wasm.js');