/**
 * VPN Telegram Mini App
 * - WebGL Volumetric Rays background with alternative charcoal/graphite gray palette
 * - Telegram user info parsing (avatar, username)
 * - Telegram Haptic feedback
 */

(function () {
  'use strict';


  // --- Telegram WebApp SDK Initialization & UI Interactivity ---
  function initTelegramApp() {
    let user = null;
    const tg = window.Telegram ? window.Telegram.WebApp : null;

    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (typeof tg.disableVerticalSwipes === 'function') {
          tg.disableVerticalSwipes();
        }
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
    const accountTgId = document.getElementById('account-tg-id');
    const accountTgUser = document.getElementById('account-tg-user');

    if (user) {
      const usernameStr = user.username ? `@${user.username}` : (user.first_name || 'Пользователь');
      if (nameEl) nameEl.textContent = usernameStr;
      if (accountTgUser) accountTgUser.textContent = usernameStr;
      if (accountTgId) accountTgId.textContent = user.id ? String(user.id) : '—';

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
      if (nameEl) nameEl.textContent = '@username';
      if (accountTgUser) accountTgUser.textContent = '@username';
      if (accountTgId) accountTgId.textContent = '849201948';
      if (avatarEl) {
        avatarEl.innerHTML = `<span class="avatar-initial">U</span>`;
      }
    }

    // Tab Navigation with Directional Swipe Transitions
    const dockItems = document.querySelectorAll('.dock-item');
    const tabOrder = ['home', 'tariffs', 'devices', 'account'];
    const tabContents = {
      home: document.getElementById('tab-home-content'),
      tariffs: document.getElementById('tab-tariffs-content'),
      devices: document.getElementById('tab-devices-content'),
      account: document.getElementById('tab-account-content')
    };

    let currentTabId = 'home';
    let transitionTimer = null;

    function switchTab(targetTabId) {
      if (!tabContents[targetTabId]) return;
      if (targetTabId === currentTabId) return;

      const fromTabId = currentTabId;
      const currentIndex = tabOrder.indexOf(fromTabId);
      const targetIndex = tabOrder.indexOf(targetTabId);
      const isForward = targetIndex > currentIndex;

      const currentEl = tabContents[fromTabId];
      const targetEl = tabContents[targetTabId];

      if (!currentEl || !targetEl) return;

      // Update active dock item immediately for instant tactile feedback
      dockItems.forEach(item => {
        if (item.getAttribute('data-tab') === targetTabId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      // Clear any pending transition
      if (transitionTimer) {
        clearTimeout(transitionTimer);
        transitionTimer = null;
        Object.values(tabContents).forEach(el => {
          if (el) el.className = 'tab-content';
        });
      }

      // Phase 1: Current tab sweeps out in the navigation direction (140ms)
      currentEl.className = isForward 
        ? 'tab-content active flip-glide-out-left' 
        : 'tab-content active flip-glide-out-right';

      currentTabId = targetTabId;

      transitionTimer = setTimeout(() => {
        // Hide outgoing tab completely (eliminates WebKit backdrop-filter collisions & dark vignette)
        currentEl.className = 'tab-content';

        // Reset scroll position cleanly
        const container = document.querySelector('.app-container');
        if (container && container.scrollTop > 0) {
          container.scrollTop = 0;
        }

        // Ensure all non-active tabs are hidden
        Object.entries(tabContents).forEach(([id, el]) => {
          if (el && id !== targetTabId) {
            el.className = 'tab-content';
          }
        });

        // Phase 2: Incoming tab enters with fluid Apple deceleration glide (240ms)
        targetEl.className = isForward 
          ? 'tab-content active flip-glide-in-right' 
          : 'tab-content active flip-glide-in-left';

        if (tg && tg.HapticFeedback) {
          tg.HapticFeedback.selectionChanged();
        }

        // Settle cleanly to static active state
        transitionTimer = setTimeout(() => {
          if (targetEl) {
            targetEl.className = 'tab-content active';
          }
          transitionTimer = null;
        }, 250);
      }, 140);
    }

    // Horizontal Touch Swipe Support for natural fluid page switching
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    document.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches.length === 1 && !transitionTimer) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const deltaTime = Date.now() - touchStartTime;

        // Trigger swipe if horizontal displacement exceeds 45px and dominates vertical motion
        if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && deltaTime < 500) {
          const currentIndex = tabOrder.indexOf(currentTabId);
          if (deltaX < 0 && currentIndex < tabOrder.length - 1) {
            // Swiped left -> Next tab
            switchTab(tabOrder[currentIndex + 1]);
          } else if (deltaX > 0 && currentIndex > 0) {
            // Swiped right -> Previous tab
            switchTab(tabOrder[currentIndex - 1]);
          }
        }
      }
    }, { passive: true });

    dockItems.forEach(item => {
      item.addEventListener('click', () => {
        const tabId = item.getAttribute('data-tab');
        switchTab(tabId);
      });
    });

    // Quick Actions & In-Page Navigation
    const actionTariffs = document.getElementById('action-tariffs');
    if (actionTariffs) {
      actionTariffs.addEventListener('click', () => {
        switchTab('tariffs');
      });
    }

    const btnSubscribe = document.getElementById('btn-subscribe');
    if (btnSubscribe) {
      btnSubscribe.addEventListener('click', () => {
        switchTab('tariffs');
      });
    }

    const miniDevicesCard = document.getElementById('mini-devices-card');
    if (miniDevicesCard) {
      miniDevicesCard.addEventListener('click', () => {
        switchTab('devices');
      });
    }

    function openSupport() {
      if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
      }
      if (tg && typeof tg.openTelegramLink === 'function') {
        tg.openTelegramLink('https://t.me/telegram');
      } else {
        window.open('https://t.me/telegram', '_blank');
      }
    }

    const actionSupport = document.getElementById('action-support');
    if (actionSupport) {
      actionSupport.addEventListener('click', openSupport);
    }

    const accountActionSupport = document.getElementById('account-action-support');
    if (accountActionSupport) {
      accountActionSupport.addEventListener('click', openSupport);
    }

    // Tariff Plan Selection
    const planCards = document.querySelectorAll('.plan-card');
    const buyButton = document.getElementById('btn-buy-tariff');
    const planPrices = {
      'lifetime': '899 ₽',
      '1year': '590 ₽',
      '6months': '340 ₽',
      '3months': '190 ₽',
      '1month': '79 ₽'
    };

    planCards.forEach(card => {
      card.addEventListener('click', () => {
        planCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const planKey = card.getAttribute('data-plan');
        if (buyButton && planPrices[planKey]) {
          const btnSpan = buyButton.querySelector('span');
          if (btnSpan) {
            btnSpan.textContent = `Оплатить тариф (${planPrices[planKey]})`;
          }
        }
        if (tg && tg.HapticFeedback) {
          tg.HapticFeedback.selectionChanged();
        }
      });
    });

    if (buyButton) {
      buyButton.addEventListener('click', () => {
        if (tg && tg.HapticFeedback) {
          tg.HapticFeedback.impactOccurred('medium');
        }
      });
    }

    // Devices Section & Test Mode Interactivity
    const titleDevices = document.getElementById('title-devices');
    const devicesCountVal = document.getElementById('devices-count-value');
    const devicesEmptyState = document.getElementById('devices-empty-state');
    const testDeviceCard = document.getElementById('test-device-card');
    const btnConnectDevice = document.getElementById('btn-connect-device');

    let isTestDeviceActive = false;

    function setDeviceActiveState(active) {
      isTestDeviceActive = active;
      if (active) {
        if (devicesCountVal) devicesCountVal.textContent = '1 / 3';
        if (devicesEmptyState) devicesEmptyState.style.display = 'none';
        if (testDeviceCard) testDeviceCard.style.display = 'block';
      } else {
        if (devicesCountVal) devicesCountVal.textContent = '0 / 3';
        if (devicesEmptyState) devicesEmptyState.style.display = 'block';
        if (testDeviceCard) testDeviceCard.style.display = 'none';
      }
    }

    // Secret trigger: clicking on "Устройства" header toggles test device
    if (titleDevices) {
      titleDevices.addEventListener('click', () => {
        setDeviceActiveState(!isTestDeviceActive);
        if (tg && tg.HapticFeedback) {
          tg.HapticFeedback.impactOccurred('medium');
        }
      });
    }

    // "Подключить устройство" button in empty state
    if (btnConnectDevice) {
      btnConnectDevice.addEventListener('click', () => {
        setDeviceActiveState(true);
        if (tg && tg.HapticFeedback) {
          tg.HapticFeedback.impactOccurred('medium');
        }
      });
    }

    // Device Rename functionality
    const btnEditDeviceName = document.getElementById('btn-edit-device-name');
    const deviceNameView = document.getElementById('device-name-view');
    const deviceNameEdit = document.getElementById('device-name-edit');
    const renameDeviceInput = document.getElementById('rename-device-input');
    const btnSaveDeviceName = document.getElementById('btn-save-device-name');
    const btnCancelDeviceName = document.getElementById('btn-cancel-device-name');
    const deviceTitleText = document.getElementById('device-title-text');

    if (btnEditDeviceName && deviceNameView && deviceNameEdit && renameDeviceInput) {
      btnEditDeviceName.addEventListener('click', () => {
        deviceNameView.style.display = 'none';
        deviceNameEdit.style.display = 'flex';
        renameDeviceInput.value = deviceTitleText ? deviceTitleText.textContent.trim() : '';
        renameDeviceInput.focus();
        if (tg && tg.HapticFeedback) {
          tg.HapticFeedback.selectionChanged();
        }
      });
    }

    function saveDeviceName() {
      if (renameDeviceInput && deviceTitleText) {
        const val = renameDeviceInput.value.trim();
        if (val.length > 0) {
          deviceTitleText.textContent = val;
        }
      }
      if (deviceNameEdit) deviceNameEdit.style.display = 'none';
      if (deviceNameView) deviceNameView.style.display = 'flex';
      if (tg && tg.HapticFeedback) {
        if (typeof tg.HapticFeedback.notificationOccurred === 'function') {
          tg.HapticFeedback.notificationOccurred('success');
        } else {
          tg.HapticFeedback.impactOccurred('light');
        }
      }
    }

    function cancelDeviceName() {
      if (deviceNameEdit) deviceNameEdit.style.display = 'none';
      if (deviceNameView) deviceNameView.style.display = 'flex';
      if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.selectionChanged();
      }
    }

    if (btnSaveDeviceName) {
      btnSaveDeviceName.addEventListener('click', saveDeviceName);
    }
    if (btnCancelDeviceName) {
      btnCancelDeviceName.addEventListener('click', cancelDeviceName);
    }
    if (renameDeviceInput) {
      renameDeviceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveDeviceName();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelDeviceName();
        }
      });
    }

    // HWID Click-to-Copy with visual hint & feedback
    const hwidCopyPill = document.getElementById('hwid-copy-pill');
    const hwidCodeText = document.getElementById('hwid-code-text');
    const copyHintText = document.getElementById('copy-hint-text');
    let copyResetTimer = null;

    if (hwidCopyPill && hwidCodeText) {
      hwidCopyPill.addEventListener('click', () => {
        const textToCopy = hwidCodeText.textContent.trim();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy).catch(() => {});
        } else {
          const tempTextArea = document.createElement('textarea');
          tempTextArea.value = textToCopy;
          tempTextArea.style.position = 'fixed';
          tempTextArea.style.left = '-9999px';
          document.body.appendChild(tempTextArea);
          tempTextArea.focus();
          tempTextArea.select();
          try { document.execCommand('copy'); } catch(e) {}
          document.body.removeChild(tempTextArea);
        }

        hwidCopyPill.classList.add('copied');
        if (copyHintText) copyHintText.textContent = 'Скопировано! ✓';

        if (tg && tg.HapticFeedback) {
          if (typeof tg.HapticFeedback.notificationOccurred === 'function') {
            tg.HapticFeedback.notificationOccurred('success');
          } else {
            tg.HapticFeedback.impactOccurred('medium');
          }
        }

        if (copyResetTimer) clearTimeout(copyResetTimer);
        copyResetTimer = setTimeout(() => {
          hwidCopyPill.classList.remove('copied');
          if (copyHintText) copyHintText.textContent = 'Копировать';
        }, 2000);
      });
    }

    // Block / Unblock device toggle
    const btnToggleBlock = document.getElementById('btn-toggle-block-device');
    const btnBlockText = document.getElementById('btn-block-text');
    const deviceStatusTag = document.getElementById('device-status-tag');
    const statusTagLabel = document.getElementById('status-tag-label');
    let isDeviceBlocked = false;

    if (btnToggleBlock) {
      btnToggleBlock.addEventListener('click', () => {
        isDeviceBlocked = !isDeviceBlocked;
        if (isDeviceBlocked) {
          if (deviceStatusTag) deviceStatusTag.classList.add('blocked');
          if (statusTagLabel) {
            statusTagLabel.textContent = 'Заблокировано';
            statusTagLabel.classList.add('blocked');
          }
          if (btnBlockText) btnBlockText.textContent = 'Разблокировать';
          btnToggleBlock.classList.add('is-blocked');
          if (tg && tg.HapticFeedback) {
            if (typeof tg.HapticFeedback.notificationOccurred === 'function') {
              tg.HapticFeedback.notificationOccurred('warning');
            } else {
              tg.HapticFeedback.impactOccurred('medium');
            }
          }
        } else {
          if (deviceStatusTag) deviceStatusTag.classList.remove('blocked');
          if (statusTagLabel) {
            statusTagLabel.textContent = 'Активно';
            statusTagLabel.classList.remove('blocked');
          }
          if (btnBlockText) btnBlockText.textContent = 'Заблокировать';
          btnToggleBlock.classList.remove('is-blocked');
          if (tg && tg.HapticFeedback) {
            if (typeof tg.HapticFeedback.notificationOccurred === 'function') {
              tg.HapticFeedback.notificationOccurred('success');
            } else {
              tg.HapticFeedback.impactOccurred('medium');
            }
          }
        }
      });
    }

    // Delete device button
    const btnDeleteDevice = document.getElementById('btn-delete-device');
    if (btnDeleteDevice) {
      btnDeleteDevice.addEventListener('click', () => {
        // Reset device block state
        isDeviceBlocked = false;
        if (deviceStatusTag) deviceStatusTag.classList.remove('blocked');
        if (statusTagLabel) {
          statusTagLabel.textContent = 'Активно';
          statusTagLabel.classList.remove('blocked');
        }
        if (btnBlockText) btnBlockText.textContent = 'Заблокировать';
        if (btnToggleBlock) btnToggleBlock.classList.remove('is-blocked');

        // Restore empty state
        setDeviceActiveState(false);

        if (tg && tg.HapticFeedback) {
          tg.HapticFeedback.impactOccurred('heavy');
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

  // --- WebGL Volumetric Rays Shader (Optimized High-Performance Pipeline) ---
  const canvas = document.getElementById('glcanvas');
  const gl = canvas.getContext('webgl', { powerPreference: 'low-power', antialias: false, preserveDrawingBuffer: false }) ||
             canvas.getContext('experimental-webgl', { preserveDrawingBuffer: false });

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
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif

    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_lightOrigin;
    uniform vec4 u_pulses;

    void main() {
      vec2 uv = v_uv;
      float t = u_time;

      vec2 lightOrigin = u_lightOrigin;
      float pulse1 = u_pulses.x;
      float pulse2 = u_pulses.y;
      float pulse3 = u_pulses.z;
      float pulse4 = u_pulses.w;

      // Position relative to light source
      float dx = uv.x - lightOrigin.x;
      float dy = lightOrigin.y - uv.y;

      // Invariant angular calculation
      float angle = atan(dx * 1.4, max(dy, 0.001));
      float dist = length(vec2(dx * 1.1, dy));

      // Visible, graceful sway of individual beams
      float beamSway = sin(t * 0.8 + dist * 1.3) * 0.05 + cos(t * 0.5) * 0.025;
      float a = angle + beamSway;

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

      // Vertical reach (extended down so bottom mini-cards catch the exact same light)
      float verticalFade = smoothstep(1.88, 0.40, dist);
      verticalFade = pow(verticalFade, 1.20);

      // Soft ambient background fill across the viewport
      float ambientFill = exp(-pow(dist / 1.65, 1.5)) * 0.36;

      // Total light intensity
      float totalLight = (rayField * 0.68 + 0.32) * coneEnvelope * verticalFade + ambientFill * coneEnvelope;
      totalLight *= 0.72;

      // --- Alternative Charcoal / Graphite Dark Gray Palette ---
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

      // Smooth tone mapping (no artificial dark edge vignette)
      color = color / (1.0 + color * 0.15);
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
  const uLightOrigin = gl.getUniformLocation(program, 'u_lightOrigin');
  const uPulses = gl.getUniformLocation(program, 'u_pulses');

  let width = 0;
  let height = 0;

  function resize() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    // For smooth, volumetric blurry rays, rendering at ~0.75 DPR on mobile
    // is visually identical to native DPR (bilinear filtering provides anti-aliasing),
    // while reducing memory bandwidth and GPU fill-rate by 50-70%.
    const dpr = isMobile ? Math.min(window.devicePixelRatio || 1, 0.75) : Math.min(window.devicePixelRatio || 1, 1.2);

    const displayWidth = Math.max(240, Math.round(window.innerWidth * dpr));
    const displayHeight = Math.max(320, Math.round(window.innerHeight * dpr));

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
    const t = elapsed * 0.75;

    // Compute organic sway and pulses once per frame on CPU instead of per-pixel on GPU
    const swayX = Math.sin(t * 0.6) * 0.05 + Math.sin(t * 1.1) * 0.02;
    const swayY = Math.cos(t * 0.5) * 0.02;
    const pulse1 = 0.85 + 0.25 * Math.sin(t * 0.9);
    const pulse2 = 0.85 + 0.25 * Math.cos(t * 1.25 + 1.8);
    const pulse3 = 0.80 + 0.28 * Math.sin(t * 1.6 + 3.2);
    const pulse4 = 0.75 + 0.30 * Math.cos(t * 1.9 + 4.5);

    gl.uniform2f(uResolution, width, height);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uLightOrigin, 0.5 + swayX, 1.48 + swayY);
    gl.uniform4f(uPulses, pulse1, pulse2, pulse3, pulse4);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
