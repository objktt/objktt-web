import React, { useEffect, useRef, useState } from 'react';

interface PosterStageProps {
  scriptUrl: string;
  onClose: () => void;
}

const PosterStage: React.FC<PosterStageProps> = ({ scriptUrl, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-load all available poster scripts from ../posters
  const posters = import.meta.glob('../posters/*.js');

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const loadScript = async () => {
      try {
        // Construct the key for import.meta.glob
        const posterKey = `../posters/${scriptUrl}`;
        const loadModule = posters[posterKey];

        if (!loadModule) {
            throw new Error(`Poster script not found: ${scriptUrl}`);
        }

        const module: any = await loadModule();
        
        if (module && typeof module.mount === 'function' && containerRef.current) {
           cleanup = module.mount(containerRef.current);
        } else {
            throw new Error('Poster script must export a mount(container) function.');
        }

      } catch (err: any) {
        console.error("Failed to load poster:", err);
        setError("Failed to render artwork.");
      }
    };

    loadScript();

    return () => {
      if (cleanup) cleanup();
    };
  }, [scriptUrl]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--color-off-white)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 200,
    }}>
      {/* Controls */}
      <div style={{
         position: 'absolute',
         top: '2rem',
         right: '2rem',
         zIndex: 201
      }}>
         <button onClick={onClose} style={{ fontSize: '1rem', fontWeight: 500 }}>Close [x]</button>
      </div>

      {/* Stage */}
      <div ref={containerRef} style={{
        flexGrow: 1,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}>
        {error && <div>{error}</div>}
      </div>
    </div>
  );
};

export default PosterStage;
