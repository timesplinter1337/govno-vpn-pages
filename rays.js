/**
 * Atmospheric Hero Light Rays & Ambient Glow
 * Specially optimized for Telegram Mini App & mobile screens
 * - Anchored directly at the top edge (no offset on portrait/tall phones)
 * - Noticeable, fluid, organic shimmering and breathing motion
 * - Lightweight canvas resolution (DPR 1.0) for silky 60/120 FPS on all phones
 */

(function () {
  'use strict';

  // Telegram WebApp SDK Initialization
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
  const gl = canvas.getContext('webgl', { powerPreference: 'low-power', antialias: false }) ||
             canvas.getContext('experimental-webgl');

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

    void main() {
      vec2 uv = v_uv;

      // Fluid time speed (clearly noticeable, mesmerizing movement)
      float t = u_time * 0.75;

      // Natural organic sway of the light apex
      float swayX = sin(t * 0.6) * 0.045 + sin(t * 1.1) * 0.02;
      float swayY = cos(t * 0.5) * 0.012;

      // Anchored directly at the very top edge of the screen (no vertical displacement)
      vec2 lightOrigin = vec2(0.5 + swayX, 1.015 + swayY);

      // Position relative to light source
      float dx = uv.x - lightOrigin.x;
      float dy = lightOrigin.y - uv.y;

      // Coordinate invariant to aspect distortion on mobile portrait displays
      float angle = atan(dx * 1.6, max(dy, 0.001));
      float dist = length(vec2(dx * 1.3, dy));

      // Visible, graceful sway of individual beams
      float beamSway = sin(t * 0.8 + dist * 1.4) * 0.055 + cos(t * 0.5) * 0.03;
      float a = angle + beamSway;

      // Dynamic breathing of beam intensities (clearly visible shimmer & life)
      float pulse1 = 0.85 + 0.25 * sin(t * 0.9);
      float pulse2 = 0.85 + 0.25 * cos(t * 1.25 + 1.8);
      float pulse3 = 0.80 + 0.28 * sin(t * 1.6 + 3.2);
      float pulse4 = 0.75 + 0.30 * cos(t * 1.9 + 4.5);

      // --- Silky Volumetric Ray Harmonics ---
      float r1 = sin(a * 4.8 + t * 0.6) * 0.5 + 0.5;
      r1 = pow(r1, 1.7) * pulse1;

      float r2 = sin(a * 9.5 - t * 0.8 + 1.2) * 0.5 + 0.5;
      r2 = pow(r2, 1.9) * pulse2;

      float r3 = sin(a * 16.0 + t * 1.1 + 2.5) * 0.5 + 0.5;
      r3 = pow(r3, 2.3) * pulse3;

      float r4 = sin(a * 25.0 - t * 1.4 + 4.0) * 0.5 + 0.5;
      r4 = pow(r4, 2.6) * pulse4;

      // Combined ray field
      float rayField = r1 * 0.42 + r2 * 0.34 + r3 * 0.16 + r4 * 0.08;

      // Cone envelope (fans gracefully across the full screen width)
      float coneEnvelope = exp(-pow(angle / 1.32, 2.0));

      // Vertical reach (intense at top, gently dissolves towards the bottom)
      float verticalFade = smoothstep(1.35, 0.08, dist);
      verticalFade = pow(verticalFade, 1.25);

      // Soft ambient glow right at the top entry edge
      float topGlow = exp(-pow(dist / 0.45, 1.5)) * 0.55;

      // Total light
      float totalLight = (rayField * 0.65 + 0.35) * coneEnvelope * verticalFade + topGlow * coneEnvelope;

      // Precise Color Palette: Inky black, slate navy, steel blue, icy highlight, soft silver core
      vec3 cBlack = vec3(0.0, 0.0, 0.0);
      vec3 cDeepNavy = vec3(0.02, 0.045, 0.085);
      vec3 cSteelBlue = vec3(0.12, 0.28, 0.46);
      vec3 cIceBlue = vec3(0.38, 0.62, 0.85);
      vec3 cSilver = vec3(0.82, 0.91, 1.0);

      vec3 color = cBlack;

      // Upper ambient navy wash
      color += cDeepNavy * topGlow * 1.2;

      // Ray color mapping
      vec3 beamColor = mix(cDeepNavy, cSteelBlue, smoothstep(0.0, 0.28, totalLight));
      beamColor = mix(beamColor, cIceBlue, smoothstep(0.28, 0.65, totalLight));
      beamColor = mix(beamColor, cSilver, smoothstep(0.65, 1.05, totalLight));

      color += beamColor * totalLight;

      // Smooth abyss blackout at the bottom ~25% of the screen
      float abyssCutoff = smoothstep(0.02, 0.28, uv.y);
      color *= abyssCutoff;

      // Vignette on edges
      float vig = 1.0 - length(vec2((uv.x - 0.5) * 0.7, (1.0 - uv.y) * 0.6));
      vig = clamp(vig, 0.0, 1.0);
      color *= (0.85 + 0.15 * vig);

      // Soft tone mapping
      color = color / (1.0 + color * 0.20);
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

  // Ultra-optimized resize for mobile Telegram Mini App:
  // Capping resolution to DPR 1.0 guarantees zero battery drain and smooth 60/120 FPS
  function resize() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    const dpr = isMobile ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.25);

    const displayWidth = Math.max(300, Math.round(window.innerWidth * dpr));
    const displayHeight = Math.max(400, Math.round(window.innerHeight * dpr));

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
