/**
 * Ludo Champion • Complete Game Engine
 * Standard Ludo Rules with Unified Clockwise Track, Path Highlighting, 3D Dice, and Synthesized Audio
 */

(() => {
  'use strict';

  // --- Single Unified Clockwise Main Track (52 Cells) ---
  // Goes clockwise: DOWN top arm → RIGHT right arm → DOWN right edge → LEFT right arm → DOWN bottom arm
  //                 LEFT bottom edge → UP bottom arm → LEFT left arm → UP left edge → RIGHT left arm → UP top arm → RIGHT top edge
  // Player start squares (each adjacent to their yard):
  //   Index  0: Yellow start  {r:1,c:8}  — Top arm right col (exits Top-Right yard going DOWN)
  //   Index 13: Blue start    {r:8,c:13} — Right arm bottom row (exits Bottom-Right yard going LEFT)
  //   Index 26: Red start     {r:13,c:6} — Bottom arm left col (exits Bottom-Left yard going UP)
  //   Index 39: Green start   {r:6,c:1}  — Left arm top row (exits Top-Left yard going RIGHT)
  const MAIN_PATH = [
    // 0: Yellow Start Square (Top Arm, Right Column)
    { r: 1, c: 8 },
    { r: 2, c: 8 },
    { r: 3, c: 8 },
    { r: 4, c: 8 },
    { r: 5, c: 8 },
    // 5-10: Right Arm (Row 6, moving right)
    { r: 6, c: 9 },
    { r: 6, c: 10 },
    { r: 6, c: 11 },
    { r: 6, c: 12 }, // 8: Safe Star ★ (mid right arm)
    { r: 6, c: 13 },
    { r: 6, c: 14 },
    // 11: Blue Home Entrance (right edge top)
    { r: 7, c: 14 },
    // 12: Right edge bottom
    { r: 8, c: 14 },
    // 13: Blue Start Square (Right Arm, Bottom Row)
    { r: 8, c: 13 },
    { r: 8, c: 12 },
    { r: 8, c: 11 },
    { r: 8, c: 10 },
    { r: 8, c: 9 },
    // 18-23: Bottom Arm (Col 8, moving down)
    { r: 9, c: 8 },
    { r: 10, c: 8 },
    { r: 11, c: 8 },
    { r: 12, c: 8 }, // 21: Safe Star ★ (mid bottom arm)
    { r: 13, c: 8 },
    { r: 14, c: 8 },
    // 24: Red Home Entrance (bottom edge right)
    { r: 14, c: 7 },
    // 25: Bottom edge left
    { r: 14, c: 6 },
    // 26: Red Start Square (Bottom Arm, Left Column)
    { r: 13, c: 6 },
    { r: 12, c: 6 },
    { r: 11, c: 6 },
    { r: 10, c: 6 },
    { r: 9, c: 6 },
    // 31-36: Left Arm (Row 8, moving left)
    { r: 8, c: 5 },
    { r: 8, c: 4 },
    { r: 8, c: 3 },
    { r: 8, c: 2 }, // 34: Safe Star ★ (mid left arm)
    { r: 8, c: 1 },
    { r: 8, c: 0 },
    // 37: Green Home Entrance (left edge bottom)
    { r: 7, c: 0 },
    // 38: Left edge top
    { r: 6, c: 0 },
    // 39: Green Start Square (Left Arm, Top Row)
    { r: 6, c: 1 },
    { r: 6, c: 2 },
    { r: 6, c: 3 },
    { r: 6, c: 4 },
    { r: 6, c: 5 },
    // 44-49: Top Arm (Col 6, moving up)
    { r: 5, c: 6 },
    { r: 4, c: 6 },
    { r: 3, c: 6 },
    { r: 2, c: 6 }, // 47: Safe Star ★ (mid top arm)
    { r: 1, c: 6 },
    { r: 0, c: 6 },
    // 50: Yellow Home Entrance (top edge left)
    { r: 0, c: 7 },
    // 51: Top edge right → wraps back to index 0: { r: 1, c: 8 }
    { r: 0, c: 8 }
  ];

  // Safe global track indices (cannot be captured here)
  const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

  // Player configurations: start indices on MAIN_PATH, 5 home corridor tiles, and center finish
  const PLAYERS_CONFIG = {
    // Green = Top-Left yard → enters LEFT ARM going RIGHT → home lane on LEFT (row 7, cols 1-5 rightward)
    green: {
      name: 'Green',
      startIndex: 39, // { r: 6, c: 1 } — left arm top row, adjacent to top-left yard
      homeLane: [
        { r: 7, c: 1 }, { r: 7, c: 2 }, { r: 7, c: 3 }, { r: 7, c: 4 }, { r: 7, c: 5 }
      ],
      finish: { r: 7, c: 6 }
    },
    // Yellow = Top-Right yard → enters TOP ARM going DOWN → home lane at TOP (col 7, rows 1-5 downward)
    yellow: {
      name: 'Yellow',
      startIndex: 0, // { r: 1, c: 8 } — top arm right col, adjacent to top-right yard
      homeLane: [
        { r: 1, c: 7 }, { r: 2, c: 7 }, { r: 3, c: 7 }, { r: 4, c: 7 }, { r: 5, c: 7 }
      ],
      finish: { r: 6, c: 7 }
    },
    // Blue = Bottom-Right yard → enters RIGHT ARM going LEFT → home lane on RIGHT (row 7, cols 13-9 leftward)
    blue: {
      name: 'Blue',
      startIndex: 13, // { r: 8, c: 13 } — right arm bottom row, adjacent to bottom-right yard
      homeLane: [
        { r: 7, c: 13 }, { r: 7, c: 12 }, { r: 7, c: 11 }, { r: 7, c: 10 }, { r: 7, c: 9 }
      ],
      finish: { r: 7, c: 8 }
    },
    // Red = Bottom-Left yard → enters BOTTOM ARM going UP → home lane at BOTTOM (col 7, rows 13-9 upward)
    red: {
      name: 'Red',
      startIndex: 26, // { r: 13, c: 6 } — bottom arm left col, adjacent to bottom-left yard
      homeLane: [
        { r: 13, c: 7 }, { r: 12, c: 7 }, { r: 11, c: 7 }, { r: 10, c: 7 }, { r: 9, c: 7 }
      ],
      finish: { r: 8, c: 7 }
    }
  };

  // Base Yard slot coordinates for each color's 4 tokens
  const YARD_SLOTS = {
    green: [{ r: 2, c: 2 }, { r: 2, c: 3 }, { r: 3, c: 2 }, { r: 3, c: 3 }],
    yellow: [{ r: 2, c: 11 }, { r: 2, c: 12 }, { r: 3, c: 11 }, { r: 3, c: 12 }],
    red: [{ r: 11, c: 2 }, { r: 11, c: 3 }, { r: 12, c: 2 }, { r: 12, c: 3 }],
    blue: [{ r: 11, c: 11 }, { r: 11, c: 12 }, { r: 12, c: 11 }, { r: 12, c: 12 }]
  };

  // Pre-generate full 57-step movement path for each player
  // Steps 0..50: 51 steps around the outer MAIN_PATH
  // Steps 51..55: 5 steps down player's exclusive colored home lane
  // Step 56: Center home finish
  const PLAYER_FULL_PATHS = {};
  ['green', 'yellow', 'blue', 'red'].forEach(color => {
    const cfg = PLAYERS_CONFIG[color];
    const path = [];

    for (let i = 0; i < 51; i++) {
      const idx = (cfg.startIndex + i) % MAIN_PATH.length;
      path.push(MAIN_PATH[idx]);
    }
    cfg.homeLane.forEach(coord => path.push(coord));
    path.push(cfg.finish);

    PLAYER_FULL_PATHS[color] = path;
  });

  // 3D Cube rotation transforms for faces 1-6
  const DICE_FACE_TRANSFORMS = {
    1: 'rotateX(0deg) rotateY(0deg)',
    2: 'rotateX(0deg) rotateY(-90deg)',
    3: 'rotateX(0deg) rotateY(-180deg)',
    4: 'rotateX(0deg) rotateY(90deg)',
    5: 'rotateX(-90deg) rotateY(0deg)',
    6: 'rotateX(90deg) rotateY(0deg)'
  };

  // --- Game State ---
  let playerCount = 2; // 2, 3, or 4
  let activePlayerColors = ['green', 'yellow']; // Clockwise order: Green -> Yellow -> Blue -> Red
  let currentTurnIndex = 0;
  let diceValue = null;
  let isRolling = false;
  let isMoving = false;
  let hasBonusRoll = false;
  let soundEnabled = true;

  // Tokens: { id: 0..3, color: 'green', step: -1..56, element: DOMNode }
  const playersTokens = {
    green: [],
    yellow: [],
    blue: [],
    red: []
  };

  // --- Web Audio API Synthesizer ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) audioCtx = new AudioCtxClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  const Sound = {
    dice() {
      if (!soundEnabled || !audioCtx) return;
      try {
        for (let i = 0; i < 4; i++) {
          setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200 + Math.random() * 300, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
          }, i * 70);
        }
      } catch (e) { }
    },
    hop() {
      if (!soundEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(680, audioCtx.currentTime + 0.09);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch (e) { }
    },
    release() {
      if (!soundEnabled || !audioCtx) return;
      try {
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((f, i) => {
          setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.14);
          }, i * 65);
        });
      } catch (e) { }
    },
    capture() {
      if (!soundEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.28);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) { }
    },
    win() {
      if (!soundEnabled || !audioCtx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((f, i) => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.28);
        }, i * 110);
      });
    },
    pass() {
      if (!soundEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch (e) { }
    }
  };

  // --- Confetti Particle System ---
  const confettiCanvas = document.getElementById('confetti-canvas');
  const ctx = confettiCanvas.getContext('2d');
  let confettiParticles = [];
  let confettiAnimId = null;

  function resizeConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeConfetti);
  resizeConfetti();

  function triggerConfetti() {
    cancelAnimationFrame(confettiAnimId);
    confettiParticles = [];
    const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#ffffff', '#a855f7'];

    for (let i = 0; i < 110; i++) {
      confettiParticles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
        y: window.innerHeight / 2 - 50,
        w: Math.random() * 8 + 6,
        h: Math.random() * 12 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.9) * 16,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        opacity: 1,
        gravity: 0.36 + Math.random() * 0.1
      });
    }

    function render() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      let alive = false;

      for (const p of confettiParticles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.rotation += p.vRot;
        p.opacity -= 0.008;

        if (p.opacity > 0 && p.y < confettiCanvas.height) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      if (alive) {
        confettiAnimId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }

    render();
  }

  // --- DOM Elements ---
  const boardEl = document.getElementById('ludo-board');
  const activePlayerBadge = document.getElementById('active-player-badge');
  const activePlayerName = document.getElementById('active-player-name');
  const diceCube = document.getElementById('dice-cube');
  const diceTrigger = document.getElementById('dice-trigger');
  const rollButton = document.getElementById('roll-button');
  const statusMsg = document.getElementById('game-status-msg');
  const bonusBadge = document.getElementById('game-bonus-badge');
  const playerCntBtns = document.querySelectorAll('.player-cnt-btn');
  const restartBtn = document.getElementById('restart-game-btn');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const soundOnSvg = document.getElementById('sound-on-svg');
  const soundOffSvg = document.getElementById('sound-off-svg');

  // Winner Modal
  const winnerModal = document.getElementById('winner-modal');
  const winnerTitle = document.getElementById('winner-title');
  const winnerDesc = document.getElementById('winner-desc');
  const modalPlayAgainBtn = document.getElementById('modal-play-again-btn');

  // Mini progress tokens
  const pcards = {
    green: document.getElementById('pcard-green'),
    yellow: document.getElementById('pcard-yellow'),
    blue: document.getElementById('pcard-blue'),
    red: document.getElementById('pcard-red')
  };

  // --- Board Generation ---
  function buildBoardDOM() {
    boardEl.innerHTML = '';

    // 1. Green Yard (Top-Left, 6x6)
    const yardGreen = createYardElement('green', 1, 1, 7, 7);
    boardEl.appendChild(yardGreen);

    // 2. Yellow Yard (Top-Right, 6x6)
    const yardYellow = createYardElement('yellow', 1, 10, 7, 16);
    boardEl.appendChild(yardYellow);

    // 3. Red Yard (Bottom-Left, 6x6)
    const yardRed = createYardElement('red', 10, 1, 16, 7);
    boardEl.appendChild(yardRed);

    // 4. Blue Yard (Bottom-Right, 6x6)
    const yardBlue = createYardElement('blue', 10, 10, 16, 16);
    boardEl.appendChild(yardBlue);

    // 5. Center Home Finish (Rows 7-9, Cols 7-9)
    const centerHome = document.createElement('div');
    centerHome.className = 'center-home';
    centerHome.id = 'center-home-area';
    centerHome.innerHTML = `
      <div class="center-triangle tri-top"></div>
      <div class="center-triangle tri-right"></div>
      <div class="center-triangle tri-bottom"></div>
      <div class="center-triangle tri-left"></div>
      <div class="center-crown">👑</div>
    `;
    boardEl.appendChild(centerHome);

    // 6. Generate 1x1 Track Cells (Normal clean Ludo cells without confusing red arrows)
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        // Skip 6x6 yards and 3x3 center
        if (r < 6 && c < 6) continue;
        if (r < 6 && c > 8) continue;
        if (r > 8 && c < 6) continue;
        if (r > 8 && c > 8) continue;
        if (r >= 6 && r <= 8 && c >= 6 && c <= 8) continue;

        const cell = document.createElement('div');
        cell.className = 'track-cell';
        cell.style.gridRow = `${r + 1} / ${r + 2}`;
        cell.style.gridColumn = `${c + 1} / ${c + 2}`;
        cell.id = `cell-${r}-${c}`;

        // Container for holding player tokens
        const tokensContainer = document.createElement('div');
        tokensContainer.className = 'cell-tokens-container';
        cell.appendChild(tokensContainer);

        // Starting squares — each color adjacent to its own yard corner
        // Green (Top-Left yard) → left arm top row
        if (r === 6 && c === 1) {
          cell.classList.add('start-cell-green');
        // Yellow (Top-Right yard) → top arm right col
        } else if (r === 1 && c === 8) {
          cell.classList.add('start-cell-yellow');
        // Blue (Bottom-Right yard) → right arm bottom row
        } else if (r === 8 && c === 13) {
          cell.classList.add('start-cell-blue');
        // Red (Bottom-Left yard) → bottom arm left col
        } else if (r === 13 && c === 6) {
          cell.classList.add('start-cell-red');
        }

        // Colored Home Corridor cells (match each player's home lane approach direction)
        // Green home: row 7, cols 1-5 (entering from left, going right)
        if (r === 7 && c >= 1 && c <= 5) cell.classList.add('home-col-green');
        // Yellow home: col 7, rows 1-5 (entering from top, going down)
        if (c === 7 && r >= 1 && r <= 5) cell.classList.add('home-col-yellow');
        // Blue home: row 7, cols 9-13 (entering from right, going left)
        if (r === 7 && c >= 9 && c <= 13) cell.classList.add('home-col-blue');
        // Red home: col 7, rows 9-13 (entering from bottom, going up)
        if (c === 7 && r >= 9 && r <= 13) cell.classList.add('home-col-red');

        // Safe Star cells (★)
        const isSafeStar = (r === 6 && c === 12) || // Index 8
          (r === 12 && c === 8) || // Index 21
          (r === 8 && c === 2) || // Index 34
          (r === 2 && c === 6);    // Index 47
        if (isSafeStar) {
          cell.appendChild(createIconSpan('safe-star', '★'));
        }

        boardEl.appendChild(cell);
      }
    }
  }

  function createYardElement(color, rStart, cStart, rEnd, cEnd) {
    const yard = document.createElement('div');
    yard.className = `base-yard yard-${color}`;
    yard.style.gridArea = `${rStart} / ${cStart} / ${rEnd} / ${cEnd}`;

    const inner = document.createElement('div');
    inner.className = 'yard-inner';

    for (let i = 0; i < 4; i++) {
      const slot = document.createElement('div');
      slot.className = 'yard-slot';
      slot.id = `yard-slot-${color}-${i}`;
      inner.appendChild(slot);
    }

    yard.appendChild(inner);
    return yard;
  }

  function createIconSpan(cls, text) {
    const span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    return span;
  }

  // --- Token Management ---
  function initializeTokens() {
    ['green', 'yellow', 'blue', 'red'].forEach(color => {
      playersTokens[color] = [];
      for (let i = 0; i < 4; i++) {
        const tokenEl = document.createElement('div');
        tokenEl.className = `ludo-token token-${color}`;
        tokenEl.setAttribute('data-color', color);
        tokenEl.setAttribute('data-token-id', i);
        tokenEl.setAttribute('title', `${color.toUpperCase()} Token ${i + 1}`);

        tokenEl.addEventListener('click', onTokenClick);
        tokenEl.addEventListener('mouseenter', () => onTokenHover(color, i));
        tokenEl.addEventListener('mouseleave', clearPathHighlights);

        playersTokens[color].push({
          id: i,
          color: color,
          step: -1, // -1: Yard, 0..50: Main Track, 51..55: Home Lane, 56: Finished Home
          element: tokenEl
        });
      }
    });

    renderAllTokens();
  }

  function renderAllTokens() {
    // Detach all tokens from the DOM
    document.querySelectorAll('.ludo-token').forEach(el => el.remove());

    const cellGroups = {};

    ['green', 'yellow', 'blue', 'red'].forEach(color => {
      playersTokens[color].forEach(token => {
        const coord = getTokenCoordinate(token);
        const key = `${coord.r}_${coord.c}`;

        if (!cellGroups[key]) {
          cellGroups[key] = {
            coord: coord,
            tokens: [],
            isYard: token.step === -1,
            yardColor: color,
            yardId: token.id
          };
        }
        cellGroups[key].tokens.push(token);
      });
    });

    Object.keys(cellGroups).forEach(key => {
      const group = cellGroups[key];
      if (group.isYard) {
        const slotEl = document.getElementById(`yard-slot-${group.yardColor}-${group.yardId}`);
        if (slotEl && group.tokens[0]) {
          slotEl.appendChild(group.tokens[0].element);
        }
      } else {
        const cellEl = document.getElementById(`cell-${group.coord.r}-${group.coord.c}`);
        if (cellEl) {
          const container = cellEl.querySelector('.cell-tokens-container');
          if (container) {
            container.className = 'cell-tokens-container';
            if (group.tokens.length === 2) container.classList.add('stack-2');
            if (group.tokens.length === 3) container.classList.add('stack-3');
            if (group.tokens.length >= 4) container.classList.add('stack-4');

            group.tokens.forEach(t => container.appendChild(t.element));
          }
        }
      }
    });

    updateMiniProgress();
  }

  function getTokenCoordinate(token) {
    const { color, step, id } = token;
    if (step === -1) {
      return YARD_SLOTS[color][id];
    }
    const fullPath = PLAYER_FULL_PATHS[color];
    return fullPath[step] || PLAYERS_CONFIG[color].finish;
  }

  function updateMiniProgress() {
    ['green', 'yellow', 'blue', 'red'].forEach(color => {
      const pcard = pcards[color];
      const isActive = activePlayerColors.includes(color);

      pcard.classList.toggle('inactive', !isActive);

      playersTokens[color].forEach((t, idx) => {
        const miniEl = document.getElementById(`mini-${color}-${idx}`);
        if (!miniEl) return;

        miniEl.className = 'token-mini';
        if (t.step === -1) {
          miniEl.classList.add('base');
          miniEl.title = `Token ${idx + 1}: In Yard`;
        } else if (t.step === 56) {
          miniEl.classList.add('finished');
          miniEl.title = `Token ${idx + 1}: Home (Finished!)`;
        } else {
          miniEl.title = `Token ${idx + 1}: Step ${t.step} / 56`;
        }
      });
    });
  }

  // --- Dynamic Legal Path Highlighting ---
  function clearPathHighlights() {
    document.querySelectorAll('.path-highlight, .path-dest').forEach(cell => {
      cell.classList.remove('path-highlight', 'path-dest', 'hl-green', 'hl-yellow', 'hl-blue', 'hl-red');
    });
  }

  function highlightLegalPathForToken(token) {
    clearPathHighlights();
    if (diceValue === null || isMoving) return;

    const color = token.color;
    const fullPath = PLAYER_FULL_PATHS[color];

    // Case 1: Token in yard -> highlights starting cell
    if (token.step === -1 && diceValue === 6) {
      const startCoord = fullPath[0];
      const cellEl = document.getElementById(`cell-${startCoord.r}-${startCoord.c}`);
      if (cellEl) {
        cellEl.classList.add('path-highlight', 'path-dest', `hl-${color}`);
      }
      return;
    }

    // Case 2: Token on track or in home lane
    if (token.step >= 0 && token.step + diceValue <= 56) {
      const targetStep = token.step + diceValue;

      for (let s = token.step + 1; s <= targetStep; s++) {
        if (s < 56) {
          const coord = fullPath[s];
          const cellEl = document.getElementById(`cell-${coord.r}-${coord.c}`);
          if (cellEl) {
            cellEl.classList.add('path-highlight', `hl-${color}`);
            if (s === targetStep) {
              cellEl.classList.add('path-dest');
            }
          }
        }
      }
    }
  }

  function onTokenHover(color, id) {
    if (isMoving || isRolling || diceValue === null) return;
    if (color !== getCurrentColor()) return;

    const token = playersTokens[color].find(t => t.id === id);
    if (token && token.element.classList.contains('selectable')) {
      highlightLegalPathForToken(token);
    }
  }

  // --- Turn Management ---
  function getCurrentColor() {
    return activePlayerColors[currentTurnIndex];
  }

  function updateTurnUI() {
    const color = getCurrentColor();

    activePlayerBadge.className = `active-player-card is-${color}`;
    activePlayerName.textContent = `${color.toUpperCase()}'s Turn`;

    Object.keys(pcards).forEach(c => {
      pcards[c].classList.toggle('active', c === color && activePlayerColors.includes(c));
    });

    if (hasBonusRoll) {
      bonusBadge.classList.remove('hidden');
    } else {
      bonusBadge.classList.add('hidden');
    }

    statusMsg.textContent = isRolling ? 'Rolling dice...' : 'Roll the dice to move!';
    rollButton.disabled = isRolling || isMoving;
  }

  function advanceTurn() {
    clearPathHighlights();
    hasBonusRoll = false;
    currentTurnIndex = (currentTurnIndex + 1) % activePlayerColors.length;
    diceValue = null;
    clearSelectableTokens();
    updateTurnUI();
  }

  // --- Dice Rolling ---
  function rollDice() {
    initAudio();
    if (isRolling || isMoving) return;

    clearPathHighlights();
    isRolling = true;
    rollButton.disabled = true;
    statusMsg.textContent = 'Rolling...';
    Sound.dice();

    diceCube.classList.add('rolling');

    // Simulate 3D tumble
    setTimeout(() => {
      diceValue = Math.floor(Math.random() * 6) + 1;

      diceCube.classList.remove('rolling');
      diceCube.style.transform = DICE_FACE_TRANSFORMS[diceValue];

      isRolling = false;
      statusMsg.textContent = `Rolled a ${diceValue}!`;

      handlePostRoll();
    }, 650);
  }

  function handlePostRoll() {
    const color = getCurrentColor();
    const tokens = playersTokens[color];

    const validTokens = tokens.filter(t => {
      if (t.step === -1) {
        return diceValue === 6; // Needs a 6 to leave home area
      }
      if (t.step >= 0 && t.step < 56) {
        return t.step + diceValue <= 56; // Exact or within center home
      }
      return false;
    });

    if (validTokens.length === 0) {
      statusMsg.textContent = `No valid moves for ${color.toUpperCase()}!`;
      Sound.pass();

      setTimeout(() => {
        advanceTurn();
      }, 950);
      return;
    }

    // Highlight selectable tokens
    validTokens.forEach(t => t.element.classList.add('selectable'));

    if (validTokens.length === 1) {
      // Exactly 1 valid move: highlight its path and execute smoothly
      highlightLegalPathForToken(validTokens[0]);
      statusMsg.textContent = `${color.toUpperCase()}: Moving token...`;
      setTimeout(() => {
        if (validTokens[0].element.classList.contains('selectable')) {
          executeMove(validTokens[0]);
        }
      }, 420);
    } else {
      // Multiple options: instruct player to pick
      statusMsg.textContent = `Choose which ${color.toUpperCase()} token to move!`;
      // Preview path for the first movable token
      highlightLegalPathForToken(validTokens[0]);
    }
  }

  function clearSelectableTokens() {
    document.querySelectorAll('.ludo-token.selectable').forEach(el => {
      el.classList.remove('selectable');
    });
  }

  function onTokenClick(e) {
    const tokenEl = e.currentTarget;
    if (!tokenEl.classList.contains('selectable') || isMoving) return;

    const color = tokenEl.getAttribute('data-color');
    const id = parseInt(tokenEl.getAttribute('data-token-id'), 10);
    const token = playersTokens[color].find(t => t.id === id);

    if (token) {
      executeMove(token);
    }
  }

  // --- Step-by-Step Clockwise Move Execution ---
  function executeMove(token) {
    clearSelectableTokens();
    isMoving = true;
    rollButton.disabled = true;

    // Moving out of base onto starting square
    if (token.step === -1) {
      token.step = 0;
      Sound.release();
      renderAllTokens();
      clearPathHighlights();
      finishMoveStep(token);
      return;
    }

    // Advance step-by-step strictly along player's predefined clockwise path
    const targetStep = token.step + diceValue;
    let currentStep = token.step;

    const stepInterval = setInterval(() => {
      currentStep++;
      token.step = currentStep;
      Sound.hop();
      renderAllTokens();

      if (currentStep >= targetStep) {
        clearInterval(stepInterval);
        clearPathHighlights();
        finishMoveStep(token);
      }
    }, 130);
  }

  function finishMoveStep(token) {
    const color = token.color;

    // Check for Opponent Capture (only on the 51 outer track steps 0..50)
    let capturedOpponent = false;
    if (token.step >= 0 && token.step <= 50) {
      const cfg = PLAYERS_CONFIG[color];
      const globalTrackIndex = (cfg.startIndex + token.step) % MAIN_PATH.length;

      // Safe cells cannot have captures
      if (!SAFE_TRACK_INDICES.includes(globalTrackIndex)) {
        activePlayerColors.forEach(otherColor => {
          if (otherColor !== color) {
            const otherCfg = PLAYERS_CONFIG[otherColor];
            playersTokens[otherColor].forEach(oppToken => {
              if (oppToken.step >= 0 && oppToken.step <= 50) {
                const oppGlobalIndex = (otherCfg.startIndex + oppToken.step) % MAIN_PATH.length;
                if (oppGlobalIndex === globalTrackIndex) {
                  // Captured! Send opponent back to their yard
                  oppToken.step = -1;
                  capturedOpponent = true;
                  Sound.capture();
                }
              }
            });
          }
        });
      }
    }

    renderAllTokens();

    // Check for Victory (All 4 tokens reached home step 56)
    const allHome = playersTokens[color].every(t => t.step === 56);
    if (allHome) {
      handleVictory(color);
      return;
    }

    // Check Bonus Roll (Rolled a 6 OR captured an opponent)
    const gotBonus = diceValue === 6 || capturedOpponent;

    isMoving = false;

    if (gotBonus) {
      hasBonusRoll = true;
      if (capturedOpponent) {
        statusMsg.textContent = `🎯 CAPTURED OPPONENT! Bonus roll!`;
      } else {
        statusMsg.textContent = `🎲 ROLLED A 6! Bonus roll!`;
      }
      updateTurnUI();
    } else {
      advanceTurn();
    }
  }

  // --- Victory Celebration ---
  function handleVictory(color) {
    isMoving = false;
    isRolling = false;
    clearPathHighlights();
    Sound.win();
    triggerConfetti();

    winnerTitle.textContent = `${color.toUpperCase()} WINS THE CHAMPIONSHIP!`;
    winnerDesc.textContent = `Magnificent strategy! All 4 ${color.toUpperCase()} tokens conquered the track and reached home safely.`;

    winnerModal.classList.remove('hidden');
  }

  function hideWinnerModal() {
    winnerModal.classList.add('hidden');
  }

  // --- Player Count Configuration ---
  function setPlayerCount(count) {
    playerCount = count;

    playerCntBtns.forEach(btn => {
      const active = parseInt(btn.getAttribute('data-players'), 10) === count;
      btn.classList.toggle('active', active);
    });

    if (count === 2) {
      // 2 Players: Green vs Blue (opposite corners)
      activePlayerColors = ['green', 'blue'];
    } else if (count === 3) {
      // 3 Players: Green -> Yellow -> Red
      activePlayerColors = ['green', 'yellow', 'red'];
    } else {
      // 4 Players: Green -> Yellow -> Blue -> Red (Clockwise)
      activePlayerColors = ['green', 'yellow', 'blue', 'red'];
    }

    restartMatch();
  }

  // --- Restart Game ---
  function restartMatch() {
    clearPathHighlights();
    hideWinnerModal();
    currentTurnIndex = 0;
    diceValue = null;
    isRolling = false;
    isMoving = false;
    hasBonusRoll = false;

    diceCube.style.transform = DICE_FACE_TRANSFORMS[1];

    ['green', 'yellow', 'blue', 'red'].forEach(color => {
      playersTokens[color].forEach(t => {
        t.step = -1;
      });
    });

    clearSelectableTokens();
    renderAllTokens();
    updateTurnUI();
  }

  // --- Event Listeners ---
  function setupEvents() {
    diceTrigger.addEventListener('click', rollDice);
    rollButton.addEventListener('click', rollDice);

    // Keyboard Space / Enter rolls dice
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (!isRolling && !isMoving && winnerModal.classList.contains('hidden')) {
          rollDice();
        }
      }
    });

    playerCntBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        initAudio();
        const cnt = parseInt(btn.getAttribute('data-players'), 10);
        setPlayerCount(cnt);
      });
    });

    restartBtn.addEventListener('click', () => {
      initAudio();
      restartMatch();
    });

    modalPlayAgainBtn.addEventListener('click', () => {
      initAudio();
      restartMatch();
    });

    soundToggleBtn.addEventListener('click', () => {
      initAudio();
      soundEnabled = !soundEnabled;
      soundOnSvg.classList.toggle('hidden', !soundEnabled);
      soundOffSvg.classList.toggle('hidden', soundEnabled);
    });

    window.addEventListener('pointerdown', initAudio, { once: true });
  }

  // --- Initialization ---
  function init() {
    buildBoardDOM();
    initializeTokens();
    setupEvents();
    setPlayerCount(2); // Default to 2 players (Green vs Blue)
  }

  init();
})();
