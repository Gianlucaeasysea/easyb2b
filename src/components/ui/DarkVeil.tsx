import { useRef, useEffect } from 'react';
import { Renderer, Program, Mesh, Triangle, Vec2 } from 'ogl';

const vertex = /* glsl */ `
attribute vec2 position;
void main(){gl_Position=vec4(position,0.0,1.0);}
`;

const fragment = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uHueShift;
uniform float uNoise;
uniform float uScan;
uniform float uScanFreq;
uniform float uWarp;

#define PI 3.14159265359

mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}

float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}

float fbm(vec2 p){
  float v=0.0,a=0.5;
  mat2 r=rot(0.37);
  for(int i=0;i<6;i++){
    v+=a*noise(p);
    p=r*p*2.0+vec2(100.0);
    a*=0.5;
  }
  return v;
}

// Ocean wave function — layered sine waves with noise displacement
float oceanWave(vec2 p, float t) {
  float wave = 0.0;
  // Primary swell
  wave += sin(p.x * 1.2 + t * 0.8 + sin(p.y * 0.5 + t * 0.3) * 0.8) * 0.35;
  // Secondary cross-wave
  wave += sin(p.x * 0.7 - p.y * 1.1 + t * 0.5) * 0.25;
  // Choppy detail
  wave += sin(p.x * 3.0 + p.y * 2.5 + t * 1.5) * 0.08;
  wave += sin(p.x * 4.5 - p.y * 3.2 + t * 2.0) * 0.04;
  // Noise-based turbulence
  wave += (fbm(p * 1.5 + t * 0.2) - 0.5) * 0.3;
  return wave;
}

vec3 hueShiftRGB(vec3 c,float h){
  float cosA=cos(h);
  float sinA=sin(h);
  vec3 k=vec3(0.57735);
  return c*cosA+cross(k,c)*sinA+k*dot(k,c)*(1.0-cosA);
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=fragCoord/uResolution;
  vec2 p=(fragCoord-0.5*uResolution)/min(uResolution.x,uResolution.y);

  // Warp coordinates with ocean-like distortion
  float t = uTime * 0.15;
  
  p += uWarp * vec2(
    fbm(p * 2.0 + t * 0.5) - 0.5,
    fbm(p * 2.0 + t * 0.5 + 100.0) - 0.5
  );

  // Compute ocean surface
  float wave1 = oceanWave(p * 2.5, uTime * 0.2);
  float wave2 = oceanWave(p * 1.8 + vec2(50.0), uTime * 0.15);
  float wave3 = oceanWave(p * 3.2 + vec2(200.0), uTime * 0.25);

  // EasySea palette
  vec3 deepAbyss = vec3(0.02, 0.06, 0.14);    // very deep navy
  vec3 navy      = vec3(0.047, 0.137, 0.251);  // #0c2340
  vec3 deepBlue  = vec3(0.118, 0.227, 0.373);  // #1e3a5f
  vec3 electric  = vec3(0.231, 0.510, 0.965);  // #3b82f6
  vec3 cyan      = vec3(0.024, 0.714, 0.831);  // #06b6d4
  vec3 foam      = vec3(0.6, 0.85, 0.95);      // white-ish foam highlights

  // Build ocean color from wave layers
  vec3 col = deepAbyss;
  
  // Deep water base with gentle movement
  float baseFlow = smoothstep(-0.3, 0.5, wave1);
  col = mix(col, navy, baseFlow);
  
  // Mid-water blue tones
  float midWater = smoothstep(0.0, 0.6, wave2) * 0.8;
  col = mix(col, deepBlue, midWater);

  // Electric blue highlights on wave crests
  float crest = smoothstep(0.2, 0.6, wave1 + wave2 * 0.5);
  col = mix(col, electric * 0.5, crest * 0.5);

  // Cyan caustic-like reflections
  float caustic = smoothstep(0.4, 0.8, wave3 * wave1 * 4.0 + 0.3);
  col += cyan * caustic * 0.12;

  // Subtle foam on wave peaks
  float foamLine = smoothstep(0.55, 0.7, wave1 + wave3 * 0.3);
  col = mix(col, foam * 0.15, foamLine * 0.3);

  // Soft horizontal light gradient (surface light from above)
  float surfaceLight = smoothstep(-0.5, 0.8, p.y + wave1 * 0.3);
  col = mix(col, col * 1.3, surfaceLight * 0.2);

  // Vignette — slightly stronger at bottom for depth
  float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 2.0;
  vig *= smoothstep(0.0, 0.3, uv.y * 0.5 + 0.15);
  col *= vig;

  // Subtle glow on bright areas
  float glow = smoothstep(0.5, 0.9, (wave1 + wave2) * 2.0);
  col += electric * glow * 0.08;

  fragColor = vec4(col, 1.0);
}

void main(){
  vec4 col;
  mainImage(col,gl_FragCoord.xy);

  col.rgb=hueShiftRGB(col.rgb,uHueShift);

  // Scanlines
  float scanline_val=sin(gl_FragCoord.y*uScanFreq)*0.5+0.5;
  col.rgb*=1.0-(scanline_val*scanline_val)*uScan;

  // Noise grain
  col.rgb+=(hash(gl_FragCoord.xy+uTime)-0.5)*uNoise;
  col.rgb=clamp(col.rgb,0.0,1.0);

  gl_FragColor=vec4(col.rgb,1.0);
}
`;

interface DarkVeilProps {
  hueShift?: number;
  noiseIntensity?: number;
  scanlineIntensity?: number;
  speed?: number;
  scanlineFrequency?: number;
  warpAmount?: number;
  resolutionScale?: number;
  className?: string;
}

export default function DarkVeil({
  hueShift = 0,
  noiseIntensity = 0.03,
  scanlineIntensity = 0,
  speed = 0.5,
  scanlineFrequency = 0,
  warpAmount = 0.03,
  resolutionScale = 1,
  className = '',
}: DarkVeilProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = new Renderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    const gl = renderer.gl;

    const geometry = new Triangle(gl);
    if ((geometry as any).attributes.uv) {
      delete (geometry as any).attributes.uv;
    }

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Vec2(canvas.offsetWidth * resolutionScale, canvas.offsetHeight * resolutionScale) },
        uHueShift: { value: hueShift },
        uNoise: { value: noiseIntensity },
        uScan: { value: scanlineIntensity },
        uScanFreq: { value: scanlineFrequency },
        uWarp: { value: warpAmount },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      if (!canvas) return;
      const w = canvas.parentElement?.offsetWidth ?? canvas.offsetWidth;
      const h = canvas.parentElement?.offsetHeight ?? canvas.offsetHeight;
      renderer.setSize(w * resolutionScale, h * resolutionScale);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      program.uniforms.uResolution.value = new Vec2(w * resolutionScale, h * resolutionScale);
    }

    window.addEventListener('resize', resize);
    resize();

    let animId = 0;
    const update = (t: number) => {
      animId = requestAnimationFrame(update);
      program.uniforms.uTime.value = t * 0.001 * speed;
      program.uniforms.uHueShift.value = hueShift;
      program.uniforms.uNoise.value = noiseIntensity;
      program.uniforms.uScan.value = scanlineIntensity;
      program.uniforms.uScanFreq.value = scanlineFrequency;
      program.uniforms.uWarp.value = warpAmount;
      renderer.render({ scene: mesh });
    };
    animId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [hueShift, noiseIntensity, scanlineIntensity, speed, scanlineFrequency, warpAmount, resolutionScale]);

  return <canvas ref={canvasRef} className={`w-full h-full block ${className}`} />;
}
