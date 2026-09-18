/* ==========================================================================
   Chess Game Logic & AI
   ========================================================================== */

'use strict';

// --- Constants & Config ---
const COLORS = { WHITE: 'w', BLACK: 'b' };
const PIECES = { PAWN: 'p', ROOK: 'r', KNIGHT: 'n', BISHOP: 'b', QUEEN: 'q', KING: 'k' };
const PIECE_SYMBOLS = {
  'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
  'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
};

const PIECE_VALUES = {
  'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900
};

// Initial position
const START_BOARD = [
  ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
  ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
  ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
];

// --- Game State ---
let board = [];
let turn = COLORS.WHITE;
let gameMode = 'ai'; // 'friend' or 'ai'
let aiDifficulty = 'standard'; // 'basic', 'standard', 'advanced'
let isGameOver = false;

let selectedSquare = null;
let validMovesForSelected = [];
let lastMove = null;

let capturedWhite = [];
let capturedBlack = [];

// Castling rights: [whiteKingSide, whiteQueenSide, blackKingSide, blackQueenSide]
let castlingRights = [true, true, true, true];
let enPassantSquare = null; // {r, c}

let moveHistory = []; // For undoing moves during AI evaluation

// --- Audio ---
// Using Web Audio API for simple synthesized sounds
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let soundEnabled = true;

function playSound(type) {
  if (!soundEnabled || audioCtx.state === 'suspended') return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  if (type === 'move') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'capture') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } else if (type === 'check') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(500, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } else if (type === 'end') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  }
}

// --- DOM Elements ---
const boardEl = document.getElementById('chess-board');
const gameStatusMsg = document.getElementById('game-status-msg');
const modeModal = document.getElementById('mode-modal');
const gameContainer = document.getElementById('game-container');
const aiDiffSection = document.getElementById('ai-difficulty-section');
const capturedWhiteEl = document.getElementById('captured-by-black'); // Black captures white pieces
const capturedBlackEl = document.getElementById('captured-by-white');
const hudWhite = document.getElementById('hud-white');
const hudBlack = document.getElementById('hud-black');
const nameBlack = document.getElementById('name-black');
const statusBlack = document.getElementById('status-black');
const statusWhite = document.getElementById('status-white');
const promotionModal = document.getElementById('promotion-modal');
const promotionOptionsEl = document.getElementById('promotion-options');
const gameOverModal = document.getElementById('game-over-modal');

// --- Initialization ---
function initGame() {
  board = START_BOARD.map(row => [...row]);
  turn = COLORS.WHITE;
  isGameOver = false;
  selectedSquare = null;
  validMovesForSelected = [];
  lastMove = null;
  capturedWhite = [];
  capturedBlack = [];
  castlingRights = [true, true, true, true];
  enPassantSquare = null;
  moveHistory = [];
  
  updateUI();
  updateStatus();
  gameContainer.classList.remove('hidden');
}

// --- Core Logic ---
function getPieceColor(piece) {
  return piece ? piece[0] : null;
}
function getPieceType(piece) {
  return piece ? piece[1] : null;
}

function isValidCoord(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// Generate pseudo-legal moves for a specific piece (ignoring check)
function getPseudoLegalMoves(b, r, c) {
  const piece = b[r][c];
  if (!piece) return [];
  const color = piece[0];
  const type = piece[1];
  const moves = [];

  const addMove = (tr, tc, isCaptureOnly = false) => {
    if (!isValidCoord(tr, tc)) return false;
    const target = b[tr][tc];
    if (!target) {
      if (!isCaptureOnly) moves.push({r: tr, c: tc});
      return true; // continue sliding
    }
    if (getPieceColor(target) !== color) {
      moves.push({r: tr, c: tc}); // capture
    }
    return false; // blocked
  };

  const addSlidingMoves = (dirs) => {
    for (let [dr, dc] of dirs) {
      let tr = r + dr, tc = c + dc;
      while (addMove(tr, tc)) { tr += dr; tc += dc; }
    }
  };

  if (type === PIECES.PAWN) {
    const dir = color === COLORS.WHITE ? -1 : 1;
    const startRow = color === COLORS.WHITE ? 6 : 1;
    
    // Forward move
    if (isValidCoord(r + dir, c) && !b[r + dir][c]) {
      moves.push({r: r + dir, c: c});
      // Double move
      if (r === startRow && !b[r + 2 * dir][c]) {
        moves.push({r: r + 2 * dir, c: c});
      }
    }
    // Captures
    for (let dc of [-1, 1]) {
      if (isValidCoord(r + dir, c + dc)) {
        const target = b[r + dir][c + dc];
        if (target && getPieceColor(target) !== color) {
          moves.push({r: r + dir, c: c + dc});
        } else if (enPassantSquare && enPassantSquare.r === r + dir && enPassantSquare.c === c + dc) {
          moves.push({r: r + dir, c: c + dc, isEnPassant: true});
        }
      }
    }
  } else if (type === PIECES.KNIGHT) {
    const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (let [dr, dc] of jumps) addMove(r + dr, c + dc);
  } else if (type === PIECES.BISHOP) {
    addSlidingMoves([[-1,-1],[-1,1],[1,-1],[1,1]]);
  } else if (type === PIECES.ROOK) {
    addSlidingMoves([[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (type === PIECES.QUEEN) {
    addSlidingMoves([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (type === PIECES.KING) {
    const steps = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (let [dr, dc] of steps) addMove(r + dr, c + dc);
    
    // Castling
    if (color === COLORS.WHITE && r === 7 && c === 4) {
      if (castlingRights[0] && !b[7][5] && !b[7][6]) moves.push({r: 7, c: 6, isCastle: true, side: 'k'});
      if (castlingRights[1] && !b[7][3] && !b[7][2] && !b[7][1]) moves.push({r: 7, c: 2, isCastle: true, side: 'q'});
    } else if (color === COLORS.BLACK && r === 0 && c === 4) {
      if (castlingRights[2] && !b[0][5] && !b[0][6]) moves.push({r: 0, c: 6, isCastle: true, side: 'k'});
      if (castlingRights[3] && !b[0][3] && !b[0][2] && !b[0][1]) moves.push({r: 0, c: 2, isCastle: true, side: 'q'});
    }
  }

  return moves;
}

// Generate all pseudo-legal moves for a color
function getAllPseudoLegalMoves(b, color) {
  let moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (getPieceColor(b[r][c]) === color) {
        let pieceMoves = getPseudoLegalMoves(b, r, c);
        pieceMoves.forEach(m => moves.push({from: {r, c}, to: m}));
      }
    }
  }
  return moves;
}

function findKing(b, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (b[r][c] === color + 'k') return {r, c};
    }
  }
  return null;
}

function isSquareAttacked(b, r, c, attackerColor) {
  const oppMoves = getAllPseudoLegalMoves(b, attackerColor);
  return oppMoves.some(m => m.to.r === r && m.to.c === c);
}

function inCheck(b, color) {
  const kingSq = findKing(b, color);
  if (!kingSq) return false;
  return isSquareAttacked(b, kingSq.r, kingSq.c, color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE);
}

function cloneBoard(b) {
  return b.map(row => [...row]);
}

// Generate fully legal moves for a specific square
function getLegalMoves(b, r, c) {
  const pseudoMoves = getPseudoLegalMoves(b, r, c);
  const color = getPieceColor(b[r][c]);
  const legalMoves = [];
  
  for (let m of pseudoMoves) {
    // Castle validation: king cannot pass through or end in check
    if (m.isCastle) {
      if (inCheck(b, color)) continue; // Can't castle out of check
      let passSq = m.side === 'k' ? {r, c: c+1} : {r, c: c-1};
      if (isSquareAttacked(b, passSq.r, passSq.c, color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE)) continue;
    }

    const testBoard = cloneBoard(b);
    applyMoveRaw(testBoard, {from: {r, c}, to: m});
    if (!inCheck(testBoard, color)) {
      legalMoves.push(m);
    }
  }
  return legalMoves;
}

function getAllLegalMoves(b, color) {
  let moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (getPieceColor(b[r][c]) === color) {
        let pieceMoves = getLegalMoves(b, r, c);
        pieceMoves.forEach(m => moves.push({from: {r, c}, to: m}));
      }
    }
  }
  return moves;
}

// Apply a move without managing global state history (used for engine testing)
function applyMoveRaw(b, move) {
  const {from, to} = move;
  let piece = b[from.r][from.c];
  
  if (to.isEnPassant) {
    b[from.r][to.c] = ''; // capture pawn
  }
  
  // Auto-promote to Queen for AI evaluation
  if (getPieceType(piece) === PIECES.PAWN && (to.r === 0 || to.r === 7)) {
    piece = getPieceColor(piece) + 'q';
  }
  
  b[to.r][to.c] = piece;
  b[from.r][from.c] = '';
  
  if (to.isCastle) {
    if (to.side === 'k') {
      b[from.r][5] = b[from.r][7];
      b[from.r][7] = '';
    } else {
      b[from.r][3] = b[from.r][0];
      b[from.r][0] = '';
    }
  }
}

// Apply a move to the real board and update state
function applyMove(move, promoteTo = 'q') {
  const {from, to} = move;
  const piece = board[from.r][from.c];
  const color = getPieceColor(piece);
  let captured = board[to.r][to.c];
  
  // Save state for AI undo if needed
  moveHistory.push({
    from, to, piece, captured,
    castlingRights: [...castlingRights],
    enPassantSquare, promoteTo
  });

  // Handle captures
  if (to.isEnPassant) {
    captured = board[from.r][to.c];
    board[from.r][to.c] = '';
  }
  if (captured) {
    if (color === COLORS.WHITE) capturedBlack.push(captured);
    else capturedWhite.push(captured);
  }

  // Handle move
  board[to.r][to.c] = piece;
  board[from.r][from.c] = '';

  // Handle Promotion
  let promoted = false;
  if (getPieceType(piece) === PIECES.PAWN && (to.r === 0 || to.r === 7)) {
    board[to.r][to.c] = color + promoteTo;
    promoted = true;
  }

  // Handle Castling
  if (to.isCastle) {
    if (to.side === 'k') {
      board[from.r][5] = board[from.r][7];
      board[from.r][7] = '';
    } else {
      board[from.r][3] = board[from.r][0];
      board[from.r][0] = '';
    }
  }

  // Update Castling Rights
  if (piece === 'wk') { castlingRights[0] = false; castlingRights[1] = false; }
  else if (piece === 'bk') { castlingRights[2] = false; castlingRights[3] = false; }
  else if (piece === 'wr') {
    if (from.r === 7 && from.c === 7) castlingRights[0] = false;
    if (from.r === 7 && from.c === 0) castlingRights[1] = false;
  }
  else if (piece === 'br') {
    if (from.r === 0 && from.c === 7) castlingRights[2] = false;
    if (from.r === 0 && from.c === 0) castlingRights[3] = false;
  }
  // Rook gets captured
  if (to.r === 7 && to.c === 7) castlingRights[0] = false;
  if (to.r === 7 && to.c === 0) castlingRights[1] = false;
  if (to.r === 0 && to.c === 7) castlingRights[2] = false;
  if (to.r === 0 && to.c === 0) castlingRights[3] = false;

  // En Passant target
  if (getPieceType(piece) === PIECES.PAWN && Math.abs(to.r - from.r) === 2) {
    enPassantSquare = {r: (from.r + to.r) / 2, c: from.c};
  } else {
    enPassantSquare = null;
  }

  // Audio
  if (captured) playSound('capture');
  else playSound('move');

  lastMove = {from, to};
  turn = turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

  checkGameState();
}

function checkGameState() {
  const legalMoves = getAllLegalMoves(board, turn);
  const isCheck = inCheck(board, turn);

  if (legalMoves.length === 0) {
    isGameOver = true;
    playSound('end');
    if (isCheck) {
      showGameOver(turn === COLORS.WHITE ? 'Black' : 'White', 'Checkmate');
    } else {
      showGameOver('Draw', 'Stalemate');
    }
  } else if (isCheck) {
    playSound('check');
  }

  updateUI();
  updateStatus(isCheck);

  if (!isGameOver && gameMode === 'ai' && turn === COLORS.BLACK) {
    setTimeout(makeAIMove, 200); // small delay for UI rendering
  }
}

// --- UI Interaction ---
function createBoardDOM() {
  boardEl.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = document.createElement('div');
      square.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
      square.dataset.r = r;
      square.dataset.c = c;
      square.addEventListener('click', () => handleSquareClick(r, c));
      boardEl.appendChild(square);
    }
  }
}

function updateUI() {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = getSquareDOM(r, c);
      square.innerHTML = '';
      square.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;

      const piece = board[r][c];
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className = 'piece';
        pieceEl.innerText = PIECE_SYMBOLS[piece];
        // Ensure pieces are the correct text color
        pieceEl.style.color = piece[0] === 'w' ? '#fff' : '#000';
        // Add subtle shadow so black pieces are visible on dark squares
        pieceEl.style.textShadow = piece[0] === 'b' ? '0 0 5px rgba(255,255,255,0.8)' : '0 2px 4px rgba(0,0,0,0.6)';
        square.appendChild(pieceEl);
      }

      // Highlights
      if (lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c))) {
        square.classList.add('last-move');
      }
      if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
        square.classList.add('selected');
      }
      
      const move = validMovesForSelected.find(m => m.r === r && m.c === c);
      if (move) {
        if (board[r][c] || move.isEnPassant) square.classList.add('valid-capture');
        else square.classList.add('valid-move');
      }
    }
  }

  // Check highlight
  if (inCheck(board, COLORS.WHITE)) {
    const k = findKing(board, COLORS.WHITE);
    if(k) getSquareDOM(k.r, k.c).classList.add('in-check');
  }
  if (inCheck(board, COLORS.BLACK)) {
    const k = findKing(board, COLORS.BLACK);
    if(k) getSquareDOM(k.r, k.c).classList.add('in-check');
  }

  // Captured pieces
  capturedBlackEl.innerHTML = capturedBlack.map(p => `<span style="color:#000; text-shadow: 0 0 2px #fff">${PIECE_SYMBOLS[p]}</span>`).join('');
  capturedWhiteEl.innerHTML = capturedWhite.map(p => `<span style="color:#fff">${PIECE_SYMBOLS[p]}</span>`).join('');

  if (turn === COLORS.WHITE) {
    hudWhite.classList.add('active-turn');
    hudBlack.classList.remove('active-turn');
  } else {
    hudBlack.classList.add('active-turn');
    hudWhite.classList.remove('active-turn');
  }
}

function updateStatus(isCheck = false) {
  if (isGameOver) return;
  
  if (gameMode === 'ai' && turn === COLORS.BLACK) {
    gameStatusMsg.innerText = "AI is thinking...";
    statusBlack.innerText = "Thinking...";
    statusWhite.innerText = "Waiting";
  } else {
    gameStatusMsg.innerText = turn === COLORS.WHITE ? "White's Turn" : "Black's Turn";
    if (isCheck) gameStatusMsg.innerText = "Check! " + gameStatusMsg.innerText;
    
    if (turn === COLORS.WHITE) {
      statusWhite.innerText = "Your Turn";
      statusBlack.innerText = "Waiting...";
    } else {
      statusBlack.innerText = "Your Turn";
      statusWhite.innerText = "Waiting...";
    }
  }
}

function getSquareDOM(r, c) {
  return document.querySelector(`.square[data-r="${r}"][data-c="${c}"]`);
}

let pendingPromotionMove = null;

function handleSquareClick(r, c) {
  if (isGameOver) return;
  if (gameMode === 'ai' && turn === COLORS.BLACK) return; // Wait for AI
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const piece = board[r][c];

  if (selectedSquare) {
    const move = validMovesForSelected.find(m => m.r === r && m.c === c);
    if (move) {
      const movingPiece = board[selectedSquare.r][selectedSquare.c];
      
      // Pawn promotion check
      if (getPieceType(movingPiece) === PIECES.PAWN && (move.r === 0 || move.r === 7)) {
        pendingPromotionMove = {from: selectedSquare, to: move};
        showPromotionModal(getPieceColor(movingPiece));
        return;
      }

      applyMove({from: selectedSquare, to: move});
      selectedSquare = null;
      validMovesForSelected = [];
      return;
    }
  }

  if (piece && getPieceColor(piece) === turn) {
    if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
      selectedSquare = null;
      validMovesForSelected = [];
    } else {
      selectedSquare = {r, c};
      validMovesForSelected = getLegalMoves(board, r, c);
    }
    updateUI();
  } else {
    selectedSquare = null;
    validMovesForSelected = [];
    updateUI();
  }
}

// --- Modals & Popups ---
function showPromotionModal(color) {
  const pieces = ['q', 'r', 'b', 'n'];
  promotionOptionsEl.innerHTML = '';
  pieces.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'promo-piece-btn';
    btn.innerHTML = PIECE_SYMBOLS[color + p];
    btn.style.color = color === 'w' ? '#fff' : '#000';
    btn.style.textShadow = color === 'w' ? 'none' : '0 0 5px rgba(255,255,255,0.8)';
    btn.onclick = () => {
      applyMove(pendingPromotionMove, p);
      pendingPromotionMove = null;
      promotionModal.classList.add('hidden');
    };
    promotionOptionsEl.appendChild(btn);
  });
  promotionModal.classList.remove('hidden');
}

function showGameOver(winner, reason) {
  const title = document.getElementById('game-over-title');
  const desc = document.getElementById('game-over-desc');
  
  if (reason === 'Stalemate') {
    title.innerText = "Draw!";
    desc.innerText = "Stalemate";
  } else {
    title.innerText = "Checkmate!";
    desc.innerText = `${winner} Wins!`;
  }
  
  gameOverModal.classList.remove('hidden');
}

// --- AI Implementation ---
// Basic evaluation function based on piece values and simple positioning
function evaluateBoard(b) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (p) {
        let val = PIECE_VALUES[p[1]];
        // Bonus for center control
        if (r >= 3 && r <= 4 && c >= 3 && c <= 4) val += 2;
        score += p[0] === COLORS.WHITE ? val : -val;
      }
    }
  }
  return score; // Positive = White winning, Negative = Black winning
}

function makeAIMove() {
  const legalMoves = getAllLegalMoves(board, turn);
  if (legalMoves.length === 0) return; // Handled by checkGameState

  let bestMove = null;

  if (aiDifficulty === 'basic') {
    // 1. Check if there's a capture, if so, pick a random capture
    const captures = legalMoves.filter(m => board[m.to.r][m.to.c] !== '' || m.to.isEnPassant);
    if (captures.length > 0 && Math.random() > 0.3) {
      bestMove = captures[Math.floor(Math.random() * captures.length)];
    } else {
      bestMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
  } 
  else if (aiDifficulty === 'standard') {
    // 1-ply search (look at immediate responses)
    let bestScore = Infinity; // Black wants lowest score
    for (let move of legalMoves) {
      // Simulate
      const clonedBoard = cloneBoard(board);
      applyMoveRaw(clonedBoard, move);
      let score = evaluateBoard(clonedBoard);
      
      // Checkmate in 1 bonus
      if (inCheck(clonedBoard, COLORS.WHITE) && getAllLegalMoves(clonedBoard, COLORS.WHITE).length === 0) {
        score -= 10000;
      }

      if (score < bestScore || (score === bestScore && Math.random() > 0.5)) {
        bestScore = score;
        bestMove = move;
      }
    }
  }
  else if (aiDifficulty === 'advanced') {
    // Basic Minimax with Alpha-Beta Pruning (Depth 3)
    // To keep UI responsive, we limit depth to 3 and don't use workers here.
    let bestScore = Infinity;
    for (let move of legalMoves) {
      const testBoard = cloneBoard(board);
      applyMoveRaw(testBoard, move);
      let score = minimax(testBoard, 2, -Infinity, Infinity, true); // Next turn is White (maximizing)
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  // Ensure pawn promotions by AI
  let promoteTo = 'q'; // AI always promotes to queen for simplicity
  applyMove(bestMove, promoteTo);
}

function minimax(b, depth, alpha, beta, isMaximizing) {
  if (depth === 0) return evaluateBoard(b);

  const color = isMaximizing ? COLORS.WHITE : COLORS.BLACK;
  const moves = getAllLegalMoves(b, color);
  
  if (moves.length === 0) {
    if (inCheck(b, color)) return isMaximizing ? -10000 : 10000;
    return 0; // Stalemate
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let move of moves) {
      const nextB = cloneBoard(b);
      applyMoveRaw(nextB, move);
      const ev = minimax(nextB, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let move of moves) {
      const nextB = cloneBoard(b);
      applyMoveRaw(nextB, move);
      const ev = minimax(nextB, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}


// --- Event Listeners ---
document.getElementById('mode-friend').addEventListener('click', () => {
  gameMode = 'friend';
  nameBlack.innerText = 'Player 2';
  document.getElementById('name-white').innerText = 'Player 1';
  modeModal.classList.add('hidden');
  initGame();
});

document.getElementById('mode-ai').addEventListener('click', () => {
  gameMode = 'ai';
  nameBlack.innerText = 'AI';
  document.getElementById('name-white').innerText = 'You';
  document.querySelector('.mode-options').classList.add('hidden');
  aiDiffSection.classList.remove('hidden');
});

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    aiDifficulty = e.currentTarget.dataset.diff;
  });
});

document.getElementById('start-ai-game-btn').addEventListener('click', () => {
  modeModal.classList.add('hidden');
  initGame();
});

document.getElementById('new-game-btn').addEventListener('click', () => {
  modeModal.classList.remove('hidden');
  document.querySelector('.mode-options').classList.remove('hidden');
  aiDiffSection.classList.add('hidden');
  gameContainer.classList.add('hidden');
});

document.getElementById('modal-new-game-btn').addEventListener('click', () => {
  gameOverModal.classList.add('hidden');
  modeModal.classList.remove('hidden');
  document.querySelector('.mode-options').classList.remove('hidden');
  aiDiffSection.classList.add('hidden');
  gameContainer.classList.add('hidden');
});

document.getElementById('restart-game-btn').addEventListener('click', () => {
  if (confirm("Restart current game?")) initGame();
});

document.getElementById('modal-play-again-btn').addEventListener('click', () => {
  gameOverModal.classList.add('hidden');
  initGame();
});

const soundBtn = document.getElementById('sound-toggle-btn');
const soundOnIcon = document.getElementById('sound-on-svg');
const soundOffIcon = document.getElementById('sound-off-svg');

soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    soundOnIcon.classList.remove('hidden');
    soundOffIcon.classList.add('hidden');
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } else {
    soundOnIcon.classList.add('hidden');
    soundOffIcon.classList.remove('hidden');
  }
});

// Setup board on load
createBoardDOM();
