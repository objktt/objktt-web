precision highp float;

uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uTime;
uniform float uPixelSize;

varying vec2 vUv;

// Bayer matrix
float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
#define Bayer4(a) (Bayer2(0.5 * (a)) * 0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(0.5 * (a)) * 0.25 + Bayer2(a))

// Value noise
float hash11(float n) { return fract(sin(n) * 43758.5453); }

float vnoise(vec3 p) {
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0,0,0), vec3(1,57,113)));
  float n100 = hash11(dot(ip + vec3(1,0,0), vec3(1,57,113)));
  float n010 = hash11(dot(ip + vec3(0,1,0), vec3(1,57,113)));
  float n110 = hash11(dot(ip + vec3(1,1,0), vec3(1,57,113)));
  float n001 = hash11(dot(ip + vec3(0,0,1), vec3(1,57,113)));
  float n101 = hash11(dot(ip + vec3(1,0,1), vec3(1,57,113)));
  float n011 = hash11(dot(ip + vec3(0,1,1), vec3(1,57,113)));
  float n111 = hash11(dot(ip + vec3(1,1,1), vec3(1,57,113)));
  vec3 w = fp * fp * fp * (fp * (fp * 6.0 - 15.0) + 10.0);
  return mix(
    mix(mix(n000, n100, w.x), mix(n010, n110, w.x), w.y),
    mix(mix(n001, n101, w.x), mix(n011, n111, w.x), w.y),
    w.z
  ) * 2.0 - 1.0;
}

float fbm(vec2 uv, float t) {
  vec3 p = vec3(uv * 4.0, t);
  float sum = 0.0, amp = 1.0, freq = 1.0;
  for (int i = 0; i < 4; i++) {
    sum += amp * vnoise(p * freq);
    freq *= 1.25;
    amp *= 0.8;
  }
  return sum * 0.5 + 0.5;
}

void main() {
  vec4 tex = texture2D(uTexture, vUv);

  // Luminance from texture alpha
  float luma = tex.a;

  // Animated fbm noise — shifts the dither threshold over time
  float noise = fbm(vUv, uTime * 0.3) * 0.35;
  luma = luma + noise - 0.15;

  // Bayer ordered dithering with animated offset
  vec2 pixelCoord = gl_FragCoord.xy / uPixelSize;
  float bayer = Bayer8(pixelCoord + uTime * 2.0) - 0.5;
  float dithered = step(0.5, luma + bayer * 0.8);

  // Output: brand color with dithered alpha
  gl_FragColor = vec4(uColor, dithered * tex.a);
}
