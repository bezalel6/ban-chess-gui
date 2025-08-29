import React from 'react';

export interface Theme {
  id: string;
  name: string;
  path: string;
  description: string;
}

export const THEMES: Theme[] = [
  { 
    id: 'classic', 
    name: 'Classic', 
    path: '/themes/classic',
    description: 'In Soviet Russia, you don\'t see the pieces; the pieces see you.'
  },
  { 
    id: 'modern', 
    name: 'Modern', 
    path: '/themes/modern',
    description: 'For the spoiled players who like seeing where their pieces are.'
  }
];

interface ThemeSliderProps {
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
}

export const ThemeSlider: React.FC<ThemeSliderProps> = ({ currentTheme, onThemeChange }) => {
  const currentIndex = THEMES.findIndex(t => t.id === currentTheme);
  
  const handlePrevious = () => {
    const newIndex = currentIndex <= 0 ? THEMES.length - 1 : currentIndex - 1;
    onThemeChange(THEMES[newIndex].id);
  };

  const handleNext = () => {
    const newIndex = currentIndex >= THEMES.length - 1 ? 0 : currentIndex + 1;
    onThemeChange(THEMES[newIndex].id);
  };

  return (
    <div className="theme-carousel">
      <button 
        className="carousel-arrow left" 
        onClick={handlePrevious}
        aria-label="Previous theme"
      >
        ◀
      </button>
      <div className="carousel-display">
        <div className="carousel-header">
          <span className="carousel-label">Theme:</span>
          <span className="carousel-value">{THEMES[currentIndex]?.name || 'Classic'}</span>
        </div>
        <div className="carousel-description">{THEMES[currentIndex]?.description}</div>
      </div>
      <button 
        className="carousel-arrow right" 
        onClick={handleNext}
        aria-label="Next theme"
      >
        ▶
      </button>
    </div>
  );
};