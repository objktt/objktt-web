export function mount(container) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Aspect ratio 4:5
  const frameAspect = 4 / 5;
  
  let w, h, frameW, frameH, frameX, frameY;
  let animationId;
  let time = 0;

  function resize() {
    w = container.clientWidth;
    h = container.clientHeight;
    
    const padding = 40;
    const availW = w - padding * 2;
    const availH = h - padding * 2;
    
    if (availW / availH > frameAspect) {
        frameH = availH;
        frameW = frameH * frameAspect;
    } else {
        frameW = availW;
        frameH = frameW / frameAspect;
    }
    
    frameX = (w - frameW) / 2;
    frameY = (h - frameH) / 2;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);
  }

  function draw() {
    // Clear background
    ctx.fillStyle = '#F2F2F2'; 
    ctx.fillRect(0, 0, w, h);

    // Draw Frame
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(frameX, frameY, frameW, frameH);

    // Draw Content (Static Noise)
    ctx.save();
    ctx.beginPath();
    ctx.rect(frameX, frameY, frameW, frameH);
    ctx.clip();

    const imgData = ctx.createImageData(frameW * window.devicePixelRatio, frameH * window.devicePixelRatio);
    const buffer32 = new Uint32Array(imgData.data.buffer);
    const len = buffer32.length;

    for (let i = 0; i < len; i++) {
        if (Math.random() < 0.1) {
             buffer32[i] = 0xff000000; // Black
        }
    }
    
    // This is a bit heavy for 60fps full frame JS, but let's try a simplified approach for perf
    // Just drawing random rectangles for "digital noise" vibe
    
    ctx.fillStyle = '#000';
    for(let i=0; i<100; i++) {
        const x = frameX + Math.random() * frameW;
        const y = frameY + Math.random() * frameH;
        const rw = Math.random() * 50;
        const rh = 1;
        ctx.fillRect(x, y, rw, rh);
    }

    ctx.restore();
    
    time += 1;
    animationId = requestAnimationFrame(draw);
  }

  container.appendChild(canvas);
  window.addEventListener('resize', resize);
  resize();
  draw();

  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', resize);
    container.removeChild(canvas);
  };
}
