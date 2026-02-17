export function mount(container) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
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
    ctx.fillStyle = '#F2F2F2'; 
    ctx.fillRect(0, 0, w, h);

    // Draw Frame
    ctx.fillStyle = '#000';
    ctx.fillRect(frameX, frameY, frameW, frameH);

    // Breathing circle
    const radius = (Math.sin(time * 0.05) * 0.2 + 0.5) * (frameW * 0.3);
    
    ctx.beginPath();
    ctx.arc(frameX + frameW/2, frameY + frameH/2, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#F2F2F2';
    ctx.fill();

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
