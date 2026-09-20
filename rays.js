/**
 * VPN Telegram Mini App
 * - WebGL Volumetric Rays background with alternative charcoal/graphite gray palette
 * - Telegram user info parsing (avatar, username)
 * - Telegram Haptic feedback
 */

(function () {
  'use strict';

  // --- Telegram WebApp SDK Initialization & User Parsing ---
  function initTelegramApp() {
    let user = null;
    const tg = window.Telegram ? window.Telegram.WebApp : null;

    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (typeof tg.setHeaderColor === 'function') {
          tg.setHeaderColor('#111419');
        }
        if (typeof tg.setBackgroundColor === 'function') {
          tg.setBackgroundColor('#111419');
        }
        if (typeof tg.enableClosingConfirmation === 'function') {
          tg.enableClosingConfirmation();
        }
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
          user = tg.initDataUnsafe.user;
        }
      } catch (e) {
        console.warn('Telegram SDK init warning:', e);
      }
    }

    // Parse & Display User Profile
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');

    if (nameEl) {
      if (user) {
        const usernameStr = user.username ? `@${user.username}` : (user.first_name || 'Пользователь');
        nameEl.textContent = usernameStr;

        if (avatarEl) {
          if (user.photo_url) {
            avatarEl.innerHTML = `<img src="${user.photo_url}" alt="avatar" class="avatar-img">`;
          } else {
            const initial = (user.first_name ? user.first_name[0] : 'U').toUpperCase();
            avatarEl.innerHTML = `<span class="avatar-initial">${initial}</span>`;
          }
        }
      } else {
        // Fallback for regular browser preview
        nameEl.textContent = '@username';
        if (avatarEl) {
          avatarEl.innerHTML = `<span class="avatar-initial">U</span>`;
        }
      }
    }

    // Button Click & Haptic Feedback
    const btnSubscribe = document.getElementById('btn-subscribe');
    if (btnSubscribe) {
      btnSubscribe.addEventListener('click', () => {
        if (tg && tg.HapticFeedback) {
          tg.HapticFeedback.impactOccurred('medium');
        }
      });
    }
  }

  // Run user initialization on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTelegramApp);
  } else {
    initTelegramApp();
  }

  // --- WebGL Volumetric Rays Shader (Alternative Dark Gray Palette) ---
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

      // Organic fluid motion speed
      float t = u_time * 0.75;

      // Natural organic sway of the light apex
      float swayX = sin(t * 0.6) * 0.05 + sin(t * 1.1) * 0.02;
      float swayY = cos(t * 0.5) * 0.02;

      // Light apex placed far above the screen so origin/beginning is completely hidden
      vec2 lightOrigin = vec2(0.5 + swayX, 1.48 + swayY);

      // Position relative to light source
      float dx = uv.x - lightOrigin.x;
      float dy = lightOrigin.y - uv.y;

      // Invariant angular calculation
      float angle = atan(dx * 1.4, max(dy, 0.001));
      float dist = length(vec2(dx * 1.1, dy));

      // Visible, graceful sway of individual beams
      float beamSway = sin(t * 0.8 + dist * 1.3) * 0.05 + cos(t * 0.5) * 0.025;
      float a = angle + beamSway;

      // Dynamic breathing of beam intensities (shimmer & life)
      float pulse1 = 0.85 + 0.25 * sin(t * 0.9);
      float pulse2 = 0.85 + 0.25 * cos(t * 1.25 + 1.8);
      float pulse3 = 0.80 + 0.28 * sin(t * 1.6 + 3.2);
      float pulse4 = 0.75 + 0.30 * cos(t * 1.9 + 4.5);

      // --- Silky Volumetric Ray Harmonics ---
      float r1 = sin(a * 4.2 + t * 0.6) * 0.5 + 0.5;
      r1 = pow(r1, 1.6) * pulse1;

      float r2 = sin(a * 8.5 - t * 0.8 + 1.2) * 0.5 + 0.5;
      r2 = pow(r2, 1.8) * pulse2;

      float r3 = sin(a * 15.0 + t * 1.1 + 2.5) * 0.5 + 0.5;
      r3 = pow(r3, 2.2) * pulse3;

      float r4 = sin(a * 23.0 - t * 1.4 + 4.0) * 0.5 + 0.5;
      r4 = pow(r4, 2.5) * pulse4;

      // Combined ray field
      float rayField = r1 * 0.44 + r2 * 0.32 + r3 * 0.16 + r4 * 0.08;

      // Cone envelope (soft, wide fan across the screen)
      float coneEnvelope = exp(-pow(angle / 1.42, 2.0));

      // Vertical reach (only body of rays visible)
      float verticalFade = smoothstep(1.58, 0.42, dist);
      verticalFade = pow(verticalFade, 1.25);

      // Soft ambient background fill across upper half
      float ambientFill = exp(-pow(dist / 1.55, 1.5)) * 0.36;

      // Total light intensity (balanced so it never overpowers foreground text or cards)
      float totalLight = (rayField * 0.68 + 0.32) * coneEnvelope * verticalFade + ambientFill * coneEnvelope;
      totalLight *= 0.72;

      // --- Alternative Charcoal / Graphite Dark Gray Palette ---
      // Base background: #111419 -> vec3(0.067, 0.078, 0.098)
      vec3 cDarkGray = vec3(0.067, 0.078, 0.098);
      vec3 cDeepNavy = vec3(0.08, 0.12, 0.19);
      vec3 cSteelBlue = vec3(0.14, 0.30, 0.48);
      vec3 cIceBlue = vec3(0.32, 0.54, 0.76);
      vec3 cSilver = vec3(0.62, 0.78, 0.94);

      // Base alternative gray background
      vec3 color = cDarkGray;

      // Upper ambient tone
      color += cDeepNavy * ambientFill * 1.0;

      // Ray color mapping
      vec3 beamColor = mix(cDeepNavy, cSteelBlue, smoothstep(0.0, 0.28, totalLight));
      beamColor = mix(beamColor, cIceBlue, smoothstep(0.28, 0.60, totalLight));
      beamColor = mix(beamColor, cSilver, smoothstep(0.60, 0.95, totalLight));

      color += beamColor * totalLight;

      // Bottom fade cleanly into the alternative gray #111419
      float abyssCutoff = smoothstep(0.02, 0.30, uv.y);
      color = mix(cDarkGray, color, abyssCutoff);

      // Vignette on edges
      float vig = 1.0 - length(vec2((uv.x - 0.5) * 0.7, (1.0 - uv.y) * 0.6));
      vig = clamp(vig, 0.0, 1.0);
      color = mix(cDarkGray, color, 0.85 + 0.15 * vig);

      // Tone mapping
      color = color / (1.0 + color * 0.18);
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
