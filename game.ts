// ── Constants ──────────────────────────────────────────────────────────────
const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const P1 = 1;
const P2 = 2;

type Player   = 1 | 2;
type Cell     = 0 | Player;
type RowIndex = 0 | 1 | 2 | 3 | 4 | 5;
type ColIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Row      = [Cell, Cell, Cell, Cell, Cell, Cell, Cell];
type Board    = [Row, Row, Row, Row, Row, Row];

interface Score { p1: number; p2: number; draw: number; }

// ── Game state ──────────────────────────────────────────────────────────────
let board: Board        = createBoard();
let currentPlayer: Player = P1;
let gameOver: boolean   = false;
let scores: Score       = { p1: 0, p2: 0, draw: 0 };

// ── DOM refs ────────────────────────────────────────────────────────────────
const boardEl         = document.getElementById('board')!           as HTMLDivElement;
const colIndicatorsEl = document.getElementById('columnIndicators')! as HTMLDivElement;
const statusText      = document.getElementById('statusText')!       as HTMLSpanElement;
const turnDisc        = document.getElementById('turnDisc')!         as HTMLSpanElement;
const score1El        = document.getElementById('score1')!           as HTMLSpanElement;
const score2El        = document.getElementById('score2')!           as HTMLSpanElement;
const scoreDrawEl     = document.getElementById('scoreDraw')!        as HTMLSpanElement;
const restartBtn      = document.getElementById('restartBtn')!       as HTMLButtonElement;
const resetScoresBtn  = document.getElementById('resetScoresBtn')!   as HTMLButtonElement;
const overlay         = document.getElementById('overlay')!          as HTMLDivElement;
const modalDisc       = document.getElementById('modalDisc')!        as HTMLDivElement;
const modalTitle      = document.getElementById('modalTitle')!       as HTMLHeadingElement;
const modalSubtitle   = document.getElementById('modalSubtitle')!    as HTMLParagraphElement;
const modalRestartBtn = document.getElementById('modalRestartBtn')!  as HTMLButtonElement;

// ── Board logic ─────────────────────────────────────────────────────────────
function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY) as Row) as Board;
}

function isValidCol(col: ColIndex): boolean {
  return board[0][col] === EMPTY;
}

function dropDisc(col: ColIndex): RowIndex | null {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === EMPTY) {
      board[row][col] = currentPlayer;
      return row as RowIndex;
    }
  }
  return null;
}

function checkWin(row: RowIndex, col: ColIndex): [RowIndex, ColIndex][] | null {
  const directions: [number, number][] = [
    [0, 1], [1, 0], [1, 1], [1, -1],
  ];

  for (const [dr, dc] of directions) {
    const cells: [RowIndex, ColIndex][] = [[row, col]];

    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        r >= 0 && r < ROWS &&
        c >= 0 && c < COLS &&
        board[r][c] === currentPlayer
      ) {
        cells.push([r as RowIndex, c as ColIndex]);
        r += dr * sign;
        c += dc * sign;
      }
    }

    if (cells.length >= 4) return cells;
  }
  return null;
}

function isBoardFull(): boolean {
  return board[0].every(cell => cell !== EMPTY);
}

// ── Rendering ───────────────────────────────────────────────────────────────
function buildGrid(): void {
  boardEl.innerHTML = '';
  colIndicatorsEl.innerHTML = '';

  // Column hover indicators
  for (let col = 0; col < COLS; col++) {
    const ind = document.createElement('div');
    ind.classList.add('col-indicator');
    ind.dataset['col'] = String(col);

    const preview = document.createElement('div');
    preview.classList.add('preview-disc');
    ind.appendChild(preview);
    colIndicatorsEl.appendChild(ind);
  }

  // Cells (row 0 = top, row 5 = bottom)
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset['row'] = String(row);
      cell.dataset['col'] = String(col);
      boardEl.appendChild(cell);
    }
  }
}

function getCellEl(row: RowIndex, col: ColIndex): HTMLDivElement {
  return boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`) as HTMLDivElement;
}

function updateCell(row: RowIndex, col: ColIndex, animate = false): void {
  const el = getCellEl(row, col);
  el.classList.remove('player1', 'player2', 'hover-p1', 'hover-p2', 'drop');

  const value = board[row][col];
  if (value === EMPTY) return;

  el.classList.add(`player${value}`);
  if (animate) {
    el.style.setProperty('--drop-rows', String(row + 1));
    void el.offsetWidth; // reflow
    el.classList.add('drop');
  }
}

function highlightWinners(cells: [RowIndex, ColIndex][]): void {
  for (const [r, c] of cells) {
    getCellEl(r, c).classList.add('winner');
  }
}

function clearHover(): void {
  boardEl.querySelectorAll('.hover-p1, .hover-p2').forEach(el => {
    el.classList.remove('hover-p1', 'hover-p2');
  });
  colIndicatorsEl.querySelectorAll('.col-indicator').forEach(el => {
    el.classList.remove('hovering');
  });
}

function applyHover(col: ColIndex): void {
  clearHover();
  if (gameOver) return;

  const hoverClass = currentPlayer === P1 ? 'hover-p1' : 'hover-p2';

  // Highlight bottom-most empty cell in column
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === EMPTY) {
      getCellEl(row as RowIndex, col).classList.add(hoverClass);
      break;
    }
  }

  // Show column indicator
  const indicator = colIndicatorsEl.children[col] as HTMLDivElement;
  const previewDisc = indicator.querySelector('.preview-disc') as HTMLDivElement;
  previewDisc.style.background = currentPlayer === P1 ? 'var(--red)' : 'var(--yellow)';
  indicator.classList.add('hovering');
}

function updateStatus(): void {
  if (gameOver) return;
  turnDisc.className = `turn-disc ${currentPlayer === P1 ? 'player1-disc' : 'player2-disc'}`;
  statusText.textContent = `Tour du Joueur ${currentPlayer}`;
}

function updateScoreDisplay(): void {
  score1El.textContent    = String(scores.p1);
  score2El.textContent    = String(scores.p2);
  scoreDrawEl.textContent = String(scores.draw);
}

function showModal(winner: Player | null): void {
  overlay.classList.remove('hidden');
  modalDisc.className = 'modal-disc';

  if (winner === null) {
    modalDisc.classList.add('draw');
    modalTitle.textContent    = 'Match nul !';
    modalSubtitle.textContent = 'Personne ne remporte cette partie.';
  } else {
    modalDisc.classList.add(`player${winner}`);
    modalTitle.textContent    = `Joueur ${winner} gagne !`;
    modalSubtitle.textContent = `Félicitations, 4 jetons alignés !`;
  }
}

// ── Game flow ────────────────────────────────────────────────────────────────
function handleColumnClick(col: ColIndex): void {
  if (gameOver || !isValidCol(col)) return;

  const row = dropDisc(col);
  if (row === null) return;

  updateCell(row, col, true);
  clearHover();

  const winCells = checkWin(row, col);

  if (winCells) {
    gameOver = true;
    if (currentPlayer === P1) scores.p1++;
    else scores.p2++;
    updateScoreDisplay();
    highlightWinners(winCells);
    statusText.textContent = `Joueur ${currentPlayer} gagne !`;
    setTimeout(() => showModal(currentPlayer), 700);
    return;
  }

  if (isBoardFull()) {
    gameOver = true;
    scores.draw++;
    updateScoreDisplay();
    statusText.textContent = 'Match nul !';
    setTimeout(() => showModal(null), 400);
    return;
  }

  currentPlayer = currentPlayer === P1 ? P2 : P1;
  updateStatus();
}

function startNewGame(): void {
  board         = createBoard();
  currentPlayer = P1;
  gameOver      = false;

  overlay.classList.add('hidden');
  buildGrid();
  updateStatus();
}

// ── Event listeners ──────────────────────────────────────────────────────────
function attachCellListeners(): void {
  boardEl.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('.cell') as HTMLDivElement | null;
    if (!target) return;
    const col = Number(target.dataset['col']) as ColIndex;
    handleColumnClick(col);
  });

  boardEl.addEventListener('mousemove', (e) => {
    const target = (e.target as HTMLElement).closest('.cell') as HTMLDivElement | null;
    if (!target) { clearHover(); return; }
    applyHover(Number(target.dataset['col']) as ColIndex);
  });

  boardEl.addEventListener('mouseleave', clearHover);

  // Column indicators also trigger clicks
  colIndicatorsEl.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('.col-indicator') as HTMLDivElement | null;
    if (!target) return;
    handleColumnClick(Number(target.dataset['col']) as ColIndex);
  });

  colIndicatorsEl.addEventListener('mousemove', (e) => {
    const target = (e.target as HTMLElement).closest('.col-indicator') as HTMLDivElement | null;
    if (!target) return;
    applyHover(Number(target.dataset['col']) as ColIndex);
  });

  // Keyboard: arrow keys + Enter
  document.addEventListener('keydown', handleKeyboard);
}

let hoveredCol: ColIndex = 3; // start at centre

function handleKeyboard(e: KeyboardEvent): void {
  if (gameOver) return;

  if (e.key === 'ArrowLeft') {
    hoveredCol = Math.max(0, hoveredCol - 1) as ColIndex;
    applyHover(hoveredCol);
  } else if (e.key === 'ArrowRight') {
    hoveredCol = Math.min(COLS - 1, hoveredCol + 1) as ColIndex;
    applyHover(hoveredCol);
  } else if (e.key === 'Enter' || e.key === ' ') {
    handleColumnClick(hoveredCol);
  }
}

restartBtn.addEventListener('click', startNewGame);
modalRestartBtn.addEventListener('click', startNewGame);
resetScoresBtn.addEventListener('click', () => {
  scores = { p1: 0, p2: 0, draw: 0 };
  updateScoreDisplay();
});

// ── Bootstrap ────────────────────────────────────────────────────────────────
startNewGame();
attachCellListeners();
