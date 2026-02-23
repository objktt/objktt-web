import { useRef, useEffect } from 'react';
import vertSrc from '../shaders/bayerDither.vert?raw';
import fragSrc from '../shaders/bayerDither.frag?raw';

const BRAND_RGB: [number, number, number] = [17 / 255, 25 / 255, 233 / 255];

function createShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

interface Props {
  src: string;
  width: number;
  height: number;
}

export default function BayerDither({ src, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = devicePixelRatio;
    const pxW = Math.round(width * dpr);
    const pxH = Math.round(height * dpr);
    canvas.width = pxW;
    canvas.height = pxH;

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })!;
    if (!gl) return;

    // Shaders & program
    const vs = createShader(gl, gl.VERTEX_SHADER, vertSrc);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const uTex = gl.getUniformLocation(prog, 'uTexture');
    const uColor = gl.getUniformLocation(prog, 'uColor');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uPixelSize = gl.getUniformLocation(prog, 'uPixelSize');

    gl.uniform3f(uColor, ...BRAND_RGB);
    gl.uniform1f(uPixelSize, 3.0);
    gl.uniform1i(uTex, 0);

    gl.viewport(0, 0, pxW, pxH);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Rasterize SVG to offscreen canvas at exact pixel size, then use as texture
    const tex = gl.createTexture()!;
    let texReady = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Draw SVG preserving aspect ratio (objectFit: contain)
      const offscreen = document.createElement('canvas');
      offscreen.width = pxW;
      offscreen.height = pxH;
      const ctx2d = offscreen.getContext('2d')!;
      const imgW = img.naturalWidth || pxW;
      const imgH = img.naturalHeight || pxH;
      const scale = Math.min(pxW / imgW, pxH / imgH);
      const dw = imgW * scale;
      const dh = imgH * scale;
      const dx = (pxW - dw) / 2;
      const dy = (pxH - dh) / 2;
      ctx2d.drawImage(img, dx, dy, dw, dh);

      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreen);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      texReady = true;
    };
    img.src = src;

    // Render loop
    const t0 = performance.now();
    const render = () => {
      if (!texReady) { rafRef.current = requestAnimationFrame(render); return; }
      const elapsed = (performance.now() - t0) / 1000;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(prog);
      gl.uniform1f(uTime, elapsed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
      gl.deleteTexture(tex);
    };
  }, [src, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
