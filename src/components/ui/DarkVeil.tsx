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

vec3 hueShiftRGB(vec3 c,float h){
  float cosA=cos(h);
  float sinA=sin(h);
  vec3 k=vec3(0.57735);
  return c*cosA+cross(k,c)*sinA+k*dot(k,c)*(1.0-cosA);
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
  vec2 uv=fragCoord/uResolution;
  vec2 p=(fragCoord-0.5*uResolution)/min(uResolution.x,uResolution.y);

  // Warp
  p+=uWarp*vec2(
    fbm(p*3.0+uTime*0.3)-0.5,
    fbm(p*3.0+uTime*0.3+100.0)-0.5
  );

  float t=uTime*0.15;

  // Layer 1 - deep blue flow
  float n1=fbm(p*2.0+t*0.8);
  // Layer 2 - cyan wisps
  float n2=fbm(p*3.5-t*0.6+vec2(50.0));
  // Layer 3 - bright highlights
  float n3=fbm(p*5.0+t*1.2+vec2(200.0));

  // EasySea palette: navy #0c2340, blue #1e3a5f, electric #3b82f6, cyan #06b6d4
  vec3 navy=vec3(0.047,0.137,0.251);
  vec3 deepBlue=vec3(0.118,0.227,0.373);
  vec3 electric=vec3(0.231,0.510,0.965);
  vec3 cyan=vec3(0.024,0.714,0.831);

  vec3 col=navy;
  col=mix(col,deepBlue,smoothstep(0.3,0.7,n1));
  col=mix(col,electric*0.6,smoothstep(0.5,0.8,n2)*0.7);
  col=mix(col,cyan*0.4,smoothstep(0.6,0.9,n3)*0.5);

  // Vignette
  float vig=1.0-dot(uv-0.5,uv-0.5)*1.8;
  col*=vig;

  // Subtle glow
  float glow=smoothstep(0.7,1.0,n1*n2*4.0);
  col+=electric*glow*0.15;

  fragColor=vec4(col,1.0);
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
    if (!canvas) return;

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
