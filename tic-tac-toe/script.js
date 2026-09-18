/**
 * CyberTic • Modern Glassmorphic Tic-Tac-Toe
 * Pure Vanilla JavaScript logic with AI (Minimax), Synthesized Web Audio, & Particle Confetti
 */

(() => {
  'use strict';

  // --- Winning Combinations & SVG Coordinates ---
  const WINNING_COMBOS = [
    // Rows
    { combo: [0, 1, 2], coords: { x1: 25, y1: 50, x2: 275, y2: 50 } },
    { combo: [3, 4, 5], coords: { x1: 25, y1: 150, x2: 275, y2: 150 } },
    { combo: [6, 7, 8], coords: { x1: 25, y1: 250, x2: 275, y2: 250 } },
    // Columns
    { combo: [0, 3, 6], coords: { x1: 50, y1: 25, x2: 50, y2: 275 } },
    { combo: [1, 4, 7], coords: { x1: 150, y1: 25, x2: 150, y2: 275 } },
    { combo: [2, 5, 8], coords: { x1: 250, y1: 25, x2: 250, y2: 275 } },
    // Diagonals
    { combo: [0, 4, 8], coords: { x1: 30, y1: 30, x2: 270, y2: 270 } },
    { combo: [2, 4, 6], coords: { x1: 270, y1: 30, x2: 30, y2: 270 } }
  ];

  // --- State Variables ---
  let board = Array(9).fill(null);
  let currentPlayer = 'X';
  let isGameActive = true;
  let gameMode = 'pvp'; // 'pvp' | 'ai'
  let aiDifficulty = 'unbeatable'; // 'easy' | 'medium' | 'unbeatable'
  let isAiThinking = false;
  let soundEnabled = true;

  const scores = {
    x: 0,
    ties: 0,
    o: 0
  };

  // --- DOM Elements ---
  const cells = document.querySelectorAll('.cell');
  const boardEl = document.getElementById('board');
  const turnIndicator = document.getElementById('turn-indicator');
  const turnXBadge = document.getElementById('turn-x-badge');
  const turnOBadge = document.getElementById('turn-o-badge');
  const statusSubtext = document.getElementById('game-status-subtext');
  const playerXLabel = document.getElementById('player-x-label');
  const playerOLabel = document.getElementById('player-o-label');

  const scoreXEl = document.getElementById('score-x');
  const scoreTiesEl = document.getElementById('score-ties');
  const scoreOEl = document.getElementById('score-o');
  const scoreXLabel = document.getElementById('score-x-label');
  const scoreOLabel = document.getElementById('score-o-label');

  const modePvpBtn = document.getElementById('mode-pvp');
  const modeAiBtn = document.getElementById('mode-ai');
  const aiDiffContainer = document.getElementById('ai-difficulty-container');
  const diffChips = document.querySelectorAll('.chip-btn');

  const soundToggleBtn = document.getElementById('sound-toggle');
  const soundIconOn = document.getElementById('sound-icon-on');
  const soundIconOff = document.getElementById('sound-icon-off');
  const resetGameBtn = document.getElementById('reset-game-btn');
  const resetScoreBtn = document.getElementById('reset-score-btn');

  const winningLine = document.getElementById('winning-line');

  // Modal elements
  const resultModal = document.getElementById('result-modal');
  const modalBadge = document.getElementById('modal-badge');
  const modalAvatar = document.getElementById('modal-avatar');
  const modalIcon = document.getElementById('modal-icon');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalPlayAgainBtn = document.getElementById('modal-play-again');

  // Confetti Canvas
  const confettiCanvas = document.getElementById('confetti-canvas');
  const ctx = confettiCanvas.getContext('2d');
  let confettiParticles = [];
  let confettiAnimationId = null;

  // --- Web Audio API Synthesizer ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type, duration, startGain = 0.2, endGain = 0.001) {
    if (!soundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(startGain, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(endGain, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  const Sound = {
    placeX() {
      if (!soundEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.14);
      } catch (e) {}
    },
    placeO() {
      if (!soundEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(360, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(620, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.17);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.17);
      } catch (e) {}
    },
    win() {
      if (!soundEnabled || !audioCtx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          playTone(freq, 'sine', 0.28, 0.25, 0.001);
        }, idx * 110);
      });
    },
    draw() {
      if (!soundEnabled || !audioCtx) return;
      playTone(280, 'sawtooth', 0.25, 0.18, 0.01);
      setTimeout(() => playTone(220, 'sawtooth', 0.3, 0.2, 0.01), 120);
    },
    click() {
      playTone(800, 'sine', 0.04, 0.1, 0.001);
    },
    reset() {
      if (!soundEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } catch (e) {}
    }
  };

  // --- Confetti Particle System ---
  function resizeCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function triggerConfetti() {
    cancelAnimationFrame(confettiAnimationId);
    confettiParticles = [];
    const colors = ['#00f0ff', '#ff2a85', '#f59e0b', '#38ef7d', '#ffffff', '#a855f7'];

    for (let i = 0; i < 90; i++) {
      confettiParticles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
        y: window.innerHeight / 2 - 40,
        w: Math.random() * 8 + 5,
        h: Math.random() * 12 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.9) * 16,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        opacity: 1,
        gravity: 0.38 + Math.random() * 0.1
      });
    }

    renderConfetti();
  }

  function renderConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = false;

    for (const p of confettiParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.rotation += p.vRot;
      p.opacity -= 0.009;

      if (p.opacity > 0 && p.y < confettiCanvas.height) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }

    if (alive) {
      confettiAnimationId = requestAnimationFrame(renderConfetti);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  // --- Persistence (Local Storage) ---
  function loadPersistedState() {
    try {
      const savedScores = localStorage.getItem('cybertic_scores');
      if (savedScores) {
        const parsed = JSON.parse(savedScores);
        scores.x = parsed.x || 0;
        scores.ties = parsed.ties || 0;
        scores.o = parsed.o || 0;
      }
      const savedSound = localStorage.getItem('cybertic_sound');
      if (savedSound !== null) {
        soundEnabled = savedSound === 'true';
      }
    } catch (e) {}

    updateScoreDisplay();
    updateSoundUI();
  }

  function saveScores() {
    try {
      localStorage.setItem('cybertic_scores', JSON.stringify(scores));
    } catch (e) {}
  }

  function saveSoundPreference() {
    try {
      localStorage.setItem('cybertic_sound', soundEnabled.toString());
    } catch (e) {}
  }

  function updateScoreDisplay() {
    scoreXEl.textContent = scores.x;
    scoreTiesEl.textContent = scores.ties;
    scoreOEl.textContent = scores.o;
  }

  function bumpScore(el) {
    el.classList.remove('bump');
    void el.offsetWidth; // Trigger reflow
    el.classList.add('bump');
  }

  function updateSoundUI() {
    if (soundEnabled) {
      soundIconOn.classList.remove('hidden');
      soundIconOff.classList.add('hidden');
      soundToggleBtn.setAttribute('title', 'Sound: Enabled');
    } else {
      soundIconOn.classList.add('hidden');
      soundIconOff.classList.remove('hidden');
      soundToggleBtn.setAttribute('title', 'Sound: Muted');
    }
  }

  // --- SVG Mark Generators ---
  function createXMarkSvg() {
    return `
      <svg class="cell-mark mark-x" viewBox="0 0 100 100" aria-label="X">
        <path d="M 24 24 L 76 76" />
        <path d="M 76 24 L 24 76" />
      </svg>
    `;
  }

  function createOMarkSvg() {
    return `
      <svg class="cell-mark mark-o" viewBox="0 0 100 100" aria-label="O">
        <circle cx="50" cy="50" r="34" fill="none" />
      </svg>
    `;
  }

  // --- Turn UI Update ---
  function updateTurnUI() {
    if (currentPlayer === 'X') {
      turnIndicator.classList.add('is-x');
      turnIndicator.classList.remove('is-o');
      turnXBadge.classList.add('active');
      turnOBadge.classList.remove('active');

      if (gameMode === 'ai') {
        statusSubtext.textContent = 'Your turn (X)';
      } else {
        statusSubtext.textContent = "Player X's turn";
      }
    } else {
      turnIndicator.classList.add('is-o');
      turnIndicator.classList.remove('is-x');
      turnXBadge.classList.remove('active');
      turnOBadge.classList.add('active');

      if (gameMode === 'ai') {
        statusSubtext.textContent = 'AI is calculating move...';
      } else {
        statusSubtext.textContent = "Player O's turn";
      }
    }

    // Update hover preview symbol and classes on empty cells
    cells.forEach(cell => {
      if (!cell.classList.contains('occupied')) {
        cell.setAttribute('data-preview', currentPlayer);
        cell.classList.remove('preview-x', 'preview-o');
        cell.classList.add(currentPlayer === 'X' ? 'preview-x' : 'preview-o');
      }
    });
  }

  // --- SVG Line Strike-through Animation ---
  function drawWinningLine(winData, winner) {
    const { coords } = winData;
    winningLine.setAttribute('x1', coords.x1);
    winningLine.setAttribute('y1', coords.y1);
    winningLine.setAttribute('x2', coords.x2);
    winningLine.setAttribute('y2', coords.y2);

    const length = Math.hypot(coords.x2 - coords.x1, coords.y2 - coords.y1);
    winningLine.style.strokeDasharray = length;
    winningLine.style.strokeDashoffset = length;

    winningLine.className.baseVal = `win-laser ${winner === 'X' ? 'laser-x' : 'laser-o'}`;
    winningLine.classList.remove('hidden');

    // Trigger animation
    requestAnimationFrame(() => {
      winningLine.style.strokeDashoffset = '0';
    });
  }

  function hideWinningLine() {
    winningLine.classList.add('hidden');
    winningLine.style.strokeDashoffset = '';
    winningLine.style.strokeDasharray = '';
    winningLine.className.baseVal = 'win-laser hidden';
  }

  // --- Check Win / Draw ---
  function checkWin(currentBoard) {
    for (const item of WINNING_COMBOS) {
      const [a, b, c] = item.combo;
      if (
        currentBoard[a] &&
        currentBoard[a] === currentBoard[b] &&
        currentBoard[a] === currentBoard[c]
      ) {
        return {
          winner: currentBoard[a],
          combo: item.combo,
          coords: item.coords
        };
      }
    }
    return null;
  }

  function isBoardFull(currentBoard) {
    return currentBoard.every(cell => cell !== null);
  }

  // --- Cell Click Handler ---
  function handleCellClick(e) {
    initAudio();
    if (!isGameActive || isAiThinking) return;

    const cell = e.currentTarget;
    const index = parseInt(cell.getAttribute('data-index'), 10);

    if (board[index] !== null) return;

    makeMove(index, currentPlayer);

    // If AI mode and game is still active, trigger AI turn
    if (gameMode === 'ai' && isGameActive && currentPlayer === 'O') {
      triggerAiMove();
    }
  }

  function makeMove(index, player) {
    board[index] = player;
    const cell = cells[index];
    cell.classList.add('occupied');
    cell.setAttribute('aria-label', `Cell ${index + 1}, occupied by ${player}`);

    // Insert SVG
    cell.innerHTML = player === 'X' ? createXMarkSvg() : createOMarkSvg();

    // Sound effect
    if (player === 'X') {
      Sound.placeX();
    } else {
      Sound.placeO();
    }

    // Check for win
    const winResult = checkWin(board);
    if (winResult) {
      handleGameOver(winResult);
      return;
    }

    // Check for tie
    if (isBoardFull(board)) {
      handleGameOver(null);
      return;
    }

    // Switch player
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateTurnUI();
  }

  // --- Game Over Handling ---
  function handleGameOver(winResult) {
    isGameActive = false;

    if (winResult) {
      const { winner, combo } = winResult;

      // Highlight winning cells
      combo.forEach(idx => {
        cells[idx].classList.add('winning-cell', winner === 'X' ? 'cell-x' : 'cell-o');
      });

      // Draw dynamic laser strike line
      drawWinningLine(winResult, winner);

      // Score increment
      if (winner === 'X') {
        scores.x++;
        bumpScore(scoreXEl);
      } else {
        scores.o++;
        bumpScore(scoreOEl);
      }
      saveScores();
      updateScoreDisplay();

      // Sound & Confetti
      Sound.win();
      triggerConfetti();

      // Modal info
      setTimeout(() => {
        showResultModal({
          type: 'win',
          winner: winner,
          title: gameMode === 'ai'
            ? (winner === 'X' ? 'YOU WON THE MATCH!' : 'THE AI OUTSMARTED YOU!')
            : `PLAYER ${winner} TAKES THE VICTORY!`,
          desc: winner === 'X'
            ? 'Outstanding tactical strategy and precision!'
            : 'Formidable play! Better luck next round.'
        });
      }, 700);

      statusSubtext.textContent = `Game Over: Player ${winner} wins!`;

    } else {
      // Tie
      scores.ties++;
      bumpScore(scoreTiesEl);
      saveScores();
      updateScoreDisplay();

      Sound.draw();

      setTimeout(() => {
        showResultModal({
          type: 'tie',
          winner: null,
          title: "IT'S A STALEMATE!",
          desc: 'A battle of equal minds. No moves left on the grid.'
        });
      }, 400);

      statusSubtext.textContent = "Game Over: It's a draw!";
    }
  }

  // --- Result Modal ---
  function showResultModal({ type, winner, title, desc }) {
    modalAvatar.className = 'modal-avatar';
    if (type === 'win') {
      modalBadge.textContent = 'VICTORY ARCHIVED';
      modalAvatar.classList.add(winner === 'X' ? 'avatar-x' : 'avatar-o');
      modalIcon.textContent = winner === 'X' ? '✕' : '◯';
    } else {
      modalBadge.textContent = 'ROUND DRAW';
      modalAvatar.classList.add('avatar-tie');
      modalIcon.textContent = '═';
    }

    modalTitle.textContent = title;
    modalDesc.textContent = desc;

    resultModal.classList.remove('hidden');
  }

  function hideResultModal() {
    resultModal.classList.add('hidden');
  }

  // --- Reset / Play Again ---
  function startNewRound() {
    Sound.reset();
    board = Array(9).fill(null);
    currentPlayer = 'X';
    isGameActive = true;
    isAiThinking = false;

    hideWinningLine();
    hideResultModal();

    cells.forEach(cell => {
      cell.innerHTML = '';
      cell.className = 'cell';
    });

    updateTurnUI();
  }

  function resetAllScores() {
    Sound.click();
    scores.x = 0;
    scores.ties = 0;
    scores.o = 0;
    saveScores();
    updateScoreDisplay();
  }

  // --- AI Logic & Minimax Algorithm ---
  function triggerAiMove() {
    isAiThinking = true;
    updateTurnUI();

    // Natural humanized delay between 320ms and 500ms
    const thinkingDelay = Math.floor(Math.random() * 180) + 320;

    setTimeout(() => {
      if (!isGameActive) {
        isAiThinking = false;
        return;
      }

      let chosenIndex;
      if (aiDifficulty === 'easy') {
        chosenIndex = getEasyMove();
      } else if (aiDifficulty === 'medium') {
        chosenIndex = getMediumMove();
      } else {
        chosenIndex = getUnbeatableMove();
      }

      isAiThinking = false;
      if (chosenIndex !== undefined && chosenIndex !== null && board[chosenIndex] === null) {
        makeMove(chosenIndex, 'O');
      }
    }, thinkingDelay);
  }

  function getAvailableMoves(b) {
    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (b[i] === null) moves.push(i);
    }
    return moves;
  }

  // Easy: Pure random selection
  function getEasyMove() {
    const empty = getAvailableMoves(board);
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Medium: Tactical win / block with 30% blunder chance
  function getMediumMove() {
    const empty = getAvailableMoves(board);

    // 25% chance to make random move for playful challenge
    if (Math.random() < 0.25) {
      return empty[Math.floor(Math.random() * empty.length)];
    }

    // 1. Can AI win immediately?
    for (const move of empty) {
      const copy = [...board];
      copy[move] = 'O';
      if (checkWin(copy)) return move;
    }

    // 2. Can player X win immediately? Block them!
    for (const move of empty) {
      const copy = [...board];
      copy[move] = 'X';
      if (checkWin(copy)) return move;
    }

    // 3. Take center if available
    if (board[4] === null) return 4;

    // 4. Fallback random
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Unbeatable: Recursive Minimax with optimal depth scoring
  function getUnbeatableMove() {
    let bestScore = -Infinity;
    let bestMove = null;
    const empty = getAvailableMoves(board);

    // Opening optimization: if center is open, taking center or corner is optimal
    if (empty.length === 9) {
      return 4; // Center
    }

    for (const move of empty) {
      board[move] = 'O';
      const score = minimax(board, 0, false);
      board[move] = null;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  function minimax(currentBoard, depth, isMaximizing) {
    const winResult = checkWin(currentBoard);
    if (winResult) {
      if (winResult.winner === 'O') return 10 - depth; // AI wins
      if (winResult.winner === 'X') return depth - 10; // Human wins
    }
    if (isBoardFull(currentBoard)) return 0; // Draw

    const available = getAvailableMoves(currentBoard);

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of available) {
        currentBoard[move] = 'O';
        const score = minimax(currentBoard, depth + 1, false);
        currentBoard[move] = null;
        maxScore = Math.max(maxScore, score);
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const move of available) {
        currentBoard[move] = 'X';
        const score = minimax(currentBoard, depth + 1, true);
        currentBoard[move] = null;
        minScore = Math.min(minScore, score);
      }
      return minScore;
    }
  }

  // --- Mode & Difficulty Switchers ---
  function setGameMode(mode) {
    if (gameMode === mode) return;
    initAudio();
    Sound.click();
    gameMode = mode;

    if (gameMode === 'pvp') {
      modePvpBtn.classList.add('active');
      modeAiBtn.classList.remove('active');
      aiDiffContainer.classList.add('hidden');
      playerXLabel.textContent = 'Player X';
      playerOLabel.textContent = 'Player O';
      scoreXLabel.textContent = 'PLAYER (X)';
      scoreOLabel.textContent = 'PLAYER (O)';
    } else {
      modeAiBtn.classList.add('active');
      modePvpBtn.classList.remove('active');
      aiDiffContainer.classList.remove('hidden');
      playerXLabel.textContent = 'You (X)';
      playerOLabel.textContent = 'AI (O)';
      scoreXLabel.textContent = 'YOU (X)';
      scoreOLabel.textContent = 'AI (O)';
    }

    startNewRound();
  }

  function setAiDifficulty(diff) {
    initAudio();
    Sound.click();
    aiDifficulty = diff;
    diffChips.forEach(chip => {
      const isSelected = chip.getAttribute('data-diff') === diff;
      chip.classList.toggle('active', isSelected);
      chip.setAttribute('aria-checked', isSelected.toString());
    });
    startNewRound();
  }

  // --- Keyboard Navigation ---
  function handleKeyDown(e) {
    // 1-9 for cells (Supports Top Row numbers & Numpad)
    const key = e.key;

    // Restart key: 'r' or 'R'
    if (key === 'r' || key === 'R') {
      startNewRound();
      return;
    }

    // Escape closes modal
    if (key === 'Escape' && !resultModal.classList.contains('hidden')) {
      hideResultModal();
      return;
    }

    // Keys 1 to 9
    const num = parseInt(key, 10);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      const index = num - 1;
      if (index >= 0 && index < 9) {
        cells[index].click();
      }
    }
  }

  // --- Event Listeners Setup ---
  function attachEventListeners() {
    // Cell clicks
    cells.forEach(cell => {
      cell.addEventListener('click', handleCellClick);
    });

    // Game controls
    modePvpBtn.addEventListener('click', () => setGameMode('pvp'));
    modeAiBtn.addEventListener('click', () => setGameMode('ai'));

    diffChips.forEach(chip => {
      chip.addEventListener('click', () => {
        setAiDifficulty(chip.getAttribute('data-diff'));
      });
    });

    soundToggleBtn.addEventListener('click', () => {
      initAudio();
      soundEnabled = !soundEnabled;
      saveSoundPreference();
      updateSoundUI();
      if (soundEnabled) Sound.click();
    });

    resetGameBtn.addEventListener('click', () => {
      initAudio();
      startNewRound();
    });

    resetScoreBtn.addEventListener('click', () => {
      initAudio();
      resetAllScores();
    });

    // Modal buttons
    modalPlayAgainBtn.addEventListener('click', () => {
      initAudio();
      startNewRound();
    });

    resultModal.addEventListener('click', (e) => {
      if (e.target === resultModal) {
        hideResultModal();
      }
    });

    // Keyboard navigation
    window.addEventListener('keydown', handleKeyDown);

    // Unlock Web Audio on first touch/interaction
    window.addEventListener('pointerdown', initAudio, { once: true });
  }

  // --- Initialization ---
  function init() {
    loadPersistedState();
    attachEventListeners();
    updateTurnUI();
  }

  init();
})();
