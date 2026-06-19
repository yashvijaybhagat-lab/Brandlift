// @ts-nocheck
'use client'

/**
 * Silk — flowing silk shader.
 * Ported from the React Bits @react-three/fiber version to raw ogl so it works
 * under Next 16 + React 18 without the r3f/React-internals mismatch. Same props.
 */
import { useEffect, useRef } from 'react'
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl'

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`

const fragmentShader = `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform vec3  uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2  r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2  rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  float rnd        = noise(gl_FragCoord.xy);
  vec2  uv         = rotateUvs(vUv * uScale, uRotation);
  vec2  tex        = uv * uScale;
  float tOffset    = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
                  0.4 * sin(5.0 * (tex.x + tex.y +
                                   cos(3.0 * tex.x + 5.0 * tex.y) +
                                   0.02 * tOffset) +
                           sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  vec4 col = vec4(uColor, 1.0) * vec4(pattern) - rnd / 15.0 * uNoiseIntensity;
  col.a = 1.0;
  gl_FragColor = col;
}
`

const hexToNormalizedRGB = (hex) => {
  hex = hex.replace('#', '')
  return [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255]
}

const Silk = ({ speed = 5, scale = 1, color = '#7B7481', noiseIntensity = 1.5, rotation = 0 }) => {
  const ref = useRef(null)

  useEffect(() => {
    const ctn = ref.current
    if (!ctn) return

    const renderer = new Renderer({ alpha: false })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 1)

    function resize() {
      renderer.setSize(ctn.offsetWidth, ctn.offsetHeight)
    }
    window.addEventListener('resize', resize)

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(...hexToNormalizedRGB(color)) },
        uSpeed: { value: speed },
        uScale: { value: scale },
        uRotation: { value: rotation },
        uNoiseIntensity: { value: noiseIntensity },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })
    ctn.appendChild(gl.canvas)
    resize()

    let raf
    let last = performance.now()
    const update = (t) => {
      raf = requestAnimationFrame(update)
      const delta = (t - last) / 1000
      last = t
      program.uniforms.uTime.value += 0.1 * delta
      renderer.render({ scene: mesh })
    }
    raf = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      if (gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [speed, scale, color, noiseIntensity, rotation])

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />
}

export default Silk
