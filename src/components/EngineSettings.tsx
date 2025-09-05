import { useState, useEffect } from 'preact/hooks';

export type EngineMode = 'off' | 'white' | 'black' | 'both' | 'analysis';
export type EngineVersion = 'v1' | 'v2';

export interface EngineConfig {
  mode: EngineMode;
  depth: number;
  timeLimit: number;
  version: EngineVersion;
  autoPlay: boolean;
  showEvaluation: boolean;
}

interface EngineSettingsProps {
  config: EngineConfig;
  onConfigChange: (config: Partial<EngineConfig>) => void;
  isPlaying: boolean;
}

export function EngineSettings({ config, onConfigChange, isPlaying }: EngineSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Load saved settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('engineConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        onConfigChange(parsed);
      } catch (e) {
        console.error('Failed to load engine settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('engineConfig', JSON.stringify(config));
  }, [config]);

  const handleModeChange = (mode: EngineMode) => {
    onConfigChange({ mode });
    if (mode !== 'off') {
      setIsExpanded(true);
    }
  };

  return (
    <div className="engine-settings">
      <div className="engine-settings-header">
        <h3>⚙️ Engine Settings</h3>
        <button 
          className="btn-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Engine Mode Selector */}
      <div className="engine-mode-selector">
        <button
          className={`engine-mode-btn ${config.mode === 'off' ? 'active' : ''}`}
          onClick={() => handleModeChange('off')}
          disabled={isPlaying}
        >
          Off
        </button>
        <button
          className={`engine-mode-btn ${config.mode === 'white' ? 'active' : ''}`}
          onClick={() => handleModeChange('white')}
          disabled={isPlaying}
        >
          Play White
        </button>
        <button
          className={`engine-mode-btn ${config.mode === 'black' ? 'active' : ''}`}
          onClick={() => handleModeChange('black')}
          disabled={isPlaying}
        >
          Play Black
        </button>
        <button
          className={`engine-mode-btn ${config.mode === 'both' ? 'active' : ''}`}
          onClick={() => handleModeChange('both')}
          disabled={isPlaying}
        >
          Engine vs Engine
        </button>
        <button
          className={`engine-mode-btn ${config.mode === 'analysis' ? 'active' : ''}`}
          onClick={() => handleModeChange('analysis')}
          disabled={isPlaying}
        >
          Analysis
        </button>
      </div>

      {/* Advanced Settings */}
      {isExpanded && config.mode !== 'off' && (
        <div className="engine-advanced-settings">
          {/* Engine Version */}
          <div className="setting-group">
            <label className="setting-label">Engine Version</label>
            <div className="setting-buttons">
              <button
                className={`setting-btn ${config.version === 'v1' ? 'active' : ''}`}
                onClick={() => onConfigChange({ version: 'v1' })}
                disabled={isPlaying}
              >
                Classic (V1)
              </button>
              <button
                className={`setting-btn ${config.version === 'v2' ? 'active' : ''}`}
                onClick={() => onConfigChange({ version: 'v2' })}
                disabled={isPlaying}
              >
                Advanced (V2)
              </button>
            </div>
          </div>

          {/* Search Depth */}
          <div className="setting-group">
            <label className="setting-label">
              Search Depth: {config.depth}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={config.depth}
              onChange={(e) => onConfigChange({ depth: parseInt((e.target as HTMLInputElement).value) })}
              className="setting-slider"
              disabled={isPlaying}
            />
            <div className="setting-hint">
              {config.depth <= 3 ? 'Fast' : config.depth <= 6 ? 'Balanced' : 'Deep Analysis'}
            </div>
          </div>

          {/* Time Limit */}
          <div className="setting-group">
            <label className="setting-label">
              Time per Move: {(config.timeLimit / 1000).toFixed(1)}s
            </label>
            <input
              type="range"
              min="500"
              max="10000"
              step="500"
              value={config.timeLimit}
              onChange={(e) => onConfigChange({ timeLimit: parseInt((e.target as HTMLInputElement).value) })}
              className="setting-slider"
              disabled={isPlaying}
            />
            <div className="setting-hint">
              {config.timeLimit <= 1000 ? 'Blitz' : config.timeLimit <= 3000 ? 'Rapid' : 'Classical'}
            </div>
          </div>

          {/* Additional Options */}
          <div className="setting-group">
            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={config.autoPlay}
                onChange={(e) => onConfigChange({ autoPlay: (e.target as HTMLInputElement).checked })}
                disabled={isPlaying}
              />
              <span>Auto-play moves</span>
            </label>
            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={config.showEvaluation}
                onChange={(e) => onConfigChange({ showEvaluation: (e.target as HTMLInputElement).checked })}
              />
              <span>Show evaluation</span>
            </label>
          </div>

          {/* Engine vs Engine Controls */}
          {config.mode === 'both' && (
            <div className="setting-group engine-vs-engine">
              <div className="setting-note">
                🤖 vs 🤖 Engine will play against itself
              </div>
              <button 
                className="btn btn-primary"
                disabled={!config.autoPlay}
              >
                {config.autoPlay ? 'Auto-play enabled' : 'Enable auto-play to start'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}