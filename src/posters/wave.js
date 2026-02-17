export function mount(container) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Strict aspect ratio 4:5 frame within container
  const frameAspect = 4 / 5;
  
  let w, h, frameW, frameH, frameX, frameY;
  let animationId;
  let time = 0;

  function resize() {
    w = container.clientWidth;
    h = container.clientHeight;
    
    // Calculate frame dimensions to fit within container with padding
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
    // Clear whole canvas
    ctx.fillStyle = '#F2F2F2'; // var(--color-off-white)
    ctx.fillRect(0, 0, w, h);

    // Draw Frame Background
    ctx.fillStyle = '#000';
    ctx.fillRect(frameX, frameY, frameW, frameH);

    // Draw Content (Waves) inside the frame
    ctx.save();
    ctx.beginPath();
    ctx.rect(frameX, frameY, frameW, frameH);
    ctx.clip();

    ctx.strokeStyle = '#F2F2F2';
    ctx.lineWidth = 2;

    const lines = 20;
    const gap = frameH / lines;
    
    for (let i = 0; i < lines; i++) {
        const yBase = frameY + i * gap + gap/2;
        
        ctx.beginPath();
        for (let x = 0; x <= frameW; x += 5) {
            const yOffset = Math.sin((x + time) * 0.02 + i) * 20;
            ctx.lineTo(frameX + x, yBase + yOffset);
        }
        ctx.stroke();
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
