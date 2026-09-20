/**
 * Atmospheric Hero Light Rays & Ambient Glow
 * Adapted for Telegram Mini App (TMA)
 * Cursor / Touch movement disabled - fully autonomous organic drift
 */

(function () {
  'use strict';

  // --- Telegram WebApp SDK Initialization ---
  if (window.Telegram && window.Telegram.WebApp) {
    try {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      if (typeof tg.setHeaderColor === 'function') {
        tg.setHeaderColor('#000000');
      }
      if (typeof tg.setBackgroundColor === 'function') {
        tg.setBackgroundColor('#000000');
      }
      if (typeof tg.enableClosingConfirmation === 'function') {
        tg.enableClosingConfirmation();
      }
    } catch (e) {
      console.warn('Telegram WebApp init error:', e);
    }
  }

  const canvas = document.getElementById('glcanvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (!gl) {
    console.error('WebGL not supported');
    return;
  }

  const vsSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = (a_position + 1.0) * 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision highp float;

    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform float u_time;

    // Hash for subtle dither
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = v_uv;
      float aspect = u_resolution.x / u_resolution.y;

      // Fully autonomous, natural breathing drift (cursor influence disabled)
      vec2 lightOrigin = vec2(
        0.5 + sin(u_time * 0.12) * 0.04,
        1.18 + cos(u_time * 0.09) * 0.02
      );

      // Vector from light to pixel
      vec2 toPixel = vec2((uv.x - lightOrigin.x) * aspect, uv.y - lightOrigin.y);
      float dist = length(toPixel);
      float angle = atan(toPixel.x, -toPixel.y); // angle around downwards direction

      // Clean, silky ray angle with only a very gentle global sway (no distortion)
      float t = u_time * 0.35;
      float globalSway = sin(t * 0.3) * 0.015;
      float a = angle + globalSway;

      // --- Pure, Silky Volumetric Ray Harmonics ---
      // Beams depend strictly on angle and time so there are ZERO horizontal stripes or tears
      float r1 = sin(a * 5.5 + t * 0.40) * 0.5 + 0.5;
      r1 = pow(r1, 1.8);

      float r2 = sin(a * 11.5 - t * 0.50 + 1.2) * 0.5 + 0.5;
      r2 = pow(r2, 2.0);

      float r3 = sin(a * 20.0 + t * 0.65 + 2.5) * 0.5 + 0.5;
      r3 = pow(r3, 2.4);

      float r4 = sin(a * 32.0 - t * 0.80 + 4.1) * 0.5 + 0.5;
      r4 = pow(r4, 2.8);

      // Clean combination of smooth light beams
      float rayField = r1 * 0.42 + r2 * 0.34 + r3 * 0.16 + r4 * 0.08;

      // Wide elegant cone envelope
      float coneEnvelope = exp(-pow(angle / 1.18, 2.0));

      // Silky smooth vertical attenuation (pure gradient, no rings or ripples)
      float verticalFade = smoothstep(1.35, 0.15, dist);
      verticalFade = pow(verticalFade, 1.35);

      // Ambient top dome glow
      float topAmbientGlow = exp(-pow(dist / 0.92, 1.6)) * 0.38;

      // Total light intensity (perfectly smooth volumetric beams)
      float totalLight = (rayField * 0.65 + 0.35) * coneEnvelope * verticalFade + topAmbientGlow * coneEnvelope;

      // --- Precise Color Palette ---
      vec3 cBlack = vec3(0.0, 0.0, 0.0);
      vec3 cDeepNavy = vec3(0.02, 0.045, 0.085);
      vec3 cSteelBlue = vec3(0.12, 0.28, 0.46);
      vec3 cIceBlue = vec3(0.38, 0.62, 0.85);
      vec3 cSilver = vec3(0.82, 0.91, 1.0);

      // Smooth color mapping
      vec3 color = cBlack;

      // Ambient deep navy presence across the upper half
      color += cDeepNavy * topAmbientGlow * 1.2;

      // Beam color gradations
      vec3 beamColor = mix(cDeepNavy, cSteelBlue, smoothstep(0.0, 0.28, totalLight));
      beamColor = mix(beamColor, cIceBlue, smoothstep(0.28, 0.65, totalLight));
      beamColor = mix(beamColor, cSilver, smoothstep(0.65, 1.05, totalLight));

      color += beamColor * totalLight;

      // Smooth bottom abyss blackout (pure pitch black below)
      float abyssCutoff = smoothstep(0.02, 0.35, uv.y);
      color *= abyssCutoff;

      // Ultra-subtle dither to prevent banding
      float grain = (hash(gl_FragCoord.xy + vec2(u_time * 15.1, u_time * 47.3)) - 0.5) * 0.008;
      color += vec3(grain * smoothstep(0.04, 0.95, uv.y));

      // Vignette on edges
      float vig = 1.0 - length(vec2((uv.x - 0.5) * 0.7, (1.0 - uv.y) * 0.6));
      vig = clamp(vig, 0.0, 1.0);
      color *= (0.8 + 0.2 * vig);

      // Soft tone mapping
      color = color / (1.0 + color * 0.22);
      color = clamp(color, 0.0, 1.0);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]),
    gl.STATIC_DRAW
  );

  const aPosition = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  const uResolution = gl.getUniformLocation(program, 'u_resolution');
  const uTime = gl.getUniformLocation(program, 'u_time');

  let width = 0;
  let height = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    const displayWidth = Math.round(window.innerWidth * dpr);
    const displayHeight = Math.round(window.innerHeight * dpr);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      width = displayWidth;
      height = displayHeight;
      gl.viewport(0, 0, width, height);
    }
  }

  window.addEventListener('resize', resize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resize);
  }
  if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.onEvent === 'function') {
    window.Telegram.WebApp.onEvent('viewportChanged', resize);
  }

  resize();

  const startTime = performance.now();

  function render(now) {
    const elapsed = (now - startTime) * 0.001;

    gl.uniform2f(uResolution, width, height);
    gl.uniform1f(uTime, elapsed);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
