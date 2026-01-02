import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  ArrowDown,
  ChevronsDown,
  Play,
  Pause,
  X,
  Palette,
  Star,
  Heart,
  Circle,
  Square,
  ShoppingBag,
  Coins,
  Zap,
  Trophy,
  Lock,
  Unlock,
  Bitcoin,
  Rocket,
  Gem,
  Skull,
  Moon,
  Wallet,
  Smartphone,
  Archive,
  Disc,
  Shield
} from 'lucide-react';

// --- Constants & Shapes ---
const ROWS = 20;
const COLS = 10;
const BASE_SPEED = 800; // ms
const OBSTACLE = 'OBSTACLE';

// Standard Tetromino definitions
const TETROMINOS = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: '#06b6d4' }, // Cyan
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: '#3b82f6' }, // Blue
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: '#f97316' }, // Orange
  O: { shape: [[1, 1], [1, 1]], color: '#eab308' }, // Yellow
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: '#22c55e' }, // Green
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: '#a855f7' }, // Purple
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: '#ef4444' } // Red
};

// Premium Themes (Unlockables)
const THEMES = {
  DEFAULT: { name: 'Classic', cost: 0, colors: null },
  NEON: {
    name: 'Cyberpunk',
    cost: 500,
    colors: { I: '#00fff2', J: '#0048ff', L: '#ff00ff', O: '#fbff00', S: '#00ff08', T: '#b300ff', Z: '#ff0000' }
  },
  GOLD: {
    name: 'Midas Touch',
    cost: 1000,
    colors: { I: '#fcd34d', J: '#fbbf24', L: '#f59e0b', O: '#d97706', S: '#b45309', T: '#fffbeb', Z: '#78350f' }
  },
  MATRIX: {
    name: 'The Matrix',
    cost: 750,
    colors: { I: '#22c55e', J: '#16a34a', L: '#15803d', O: '#166534', S: '#14532d', T: '#4ade80', Z: '#86efac' }
  },
  DOGE: {
    name: 'Much Wow',
    cost: 2000,
    colors: { I: '#E1B303', J: '#CB9800', L: '#E8C02B', O: '#FDDC5C', S: '#F0D045', T: '#C69403', Z: '#DAB82A' }
  },
  WHALE: {
    name: 'The Whale',
    cost: 3000,
    colors: { I: '#0c4a6e', J: '#075985', L: '#0369a1', O: '#0284c7', S: '#0ea5e9', T: '#38bdf8', Z: '#7dd3fc' }
  }
};

const SHAPE_STYLES = [
  { id: 'square', name: 'Square', cost: 0, icon: <Square size={16} /> },
  { id: 'rounded', name: 'Rounded', cost: 100, icon: <Square size={16} className="rounded-md" /> },
  { id: 'circle', name: 'Circle', cost: 250, icon: <Circle size={16} /> },
  { id: 'star', name: 'Star', cost: 1000, icon: <Star size={16} /> },
  { id: 'heart', name: 'Heart', cost: 2000, icon: <Heart size={16} /> },
  { id: 'skull', name: 'Rekt', cost: 500, icon: <Skull size={16} /> },
  { id: 'rocket', name: 'Moon', cost: 3000, icon: <Rocket size={16} /> },
  { id: 'diamond', name: 'HODL', cost: 4000, icon: <Gem size={16} /> },
  { id: 'bitcoin', name: 'Bitcoin', cost: 5000, icon: <Bitcoin size={16} /> }
];

// --- Audio Synthesizer Hook ---
const useAudio = () => {
  const playSound = useCallback((type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      switch (type) {
        case 'move':
          osc.type = 'square';
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        case 'rotate':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.linearRampToValueAtTime(600, now + 0.1);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        case 'drop':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        case 'clear': {
          const notes = [440, 554, 659, 880];
          notes.forEach((freq, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.05, now + i * 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
            o.start(now + i * 0.05);
            o.stop(now + i * 0.05 + 0.3);
          });
          break;
        }
        case 'gameover':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 1);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0, now + 1);
          osc.start(now);
          osc.stop(now + 1);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error('Audio Error', e);
    }
  }, []);
  return playSound;
};

// Helper: Create grid with obstacles
const createGrid = (withObstacles = false) => {
  const newGrid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  if (withObstacles) {
    // Generate random "Pinball" layout
    const layoutType = Math.floor(Math.random() * 3);

    // Safety zone: Top 4 rows clear
    const safeZone = 4;

    if (layoutType === 0) {
      // Scattered Bumpers
      for (let i = 0; i < 8; i += 1) {
        const r = Math.floor(Math.random() * (ROWS - safeZone)) + safeZone;
        const c = Math.floor(Math.random() * COLS);
        newGrid[r][c] = OBSTACLE;
      }
    } else if (layoutType === 1) {
      // Central Pillar
      for (let r = 8; r < 14; r += 1) {
        newGrid[r][4] = OBSTACLE;
        newGrid[r][5] = OBSTACLE;
      }
    } else {
      // Side Ramps
      for (let r = 10; r < ROWS; r += 2) {
        newGrid[r][0] = OBSTACLE;
        newGrid[r][1] = OBSTACLE;
        newGrid[r][COLS - 1] = OBSTACLE;
        newGrid[r][COLS - 2] = OBSTACLE;
      }
    }
  }
  return newGrid;
};

// --- Main Component ---
export default function BlockGame() {
  // Game State
  const [grid, setGrid] = useState(createGrid(true));
  const [activePiece, setActivePiece] = useState(null);
  const [heldPiece, setHeldPiece] = useState(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [dropTime, setDropTime] = useState(null);
  const [particles, setParticles] = useState([]);

  // Economy & Progression State
  const [wallet, setWallet] = useState(0);
  const [unlockedItems, setUnlockedItems] = useState(['square', 'DEFAULT']);
  const [combo, setCombo] = useState(0);

  // Solana State
  const [solanaAddress, setSolanaAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Customization State
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [activeTheme, setActiveTheme] = useState('DEFAULT');
  const [customColors, setCustomColors] = useState({ ...TETROMINOS });
  const [blockStyle, setBlockStyle] = useState('square');
  const [isGlowMode, setIsGlowMode] = useState(true);

  // Tools
  const requestRef = useRef();
  const lastTimeRef = useRef();
  const playSound = useAudio();

  const openPhantomDeepLink = useCallback(() => {
    const url = encodeURIComponent(window.location.href);
    window.location.href = `https://phantom.app/ul/browse/${url}`;
  }, []);

  const connectWallet = useCallback(
    async (silent = false) => {
      if (window.solana && window.solana.isPhantom) {
        try {
          setIsConnecting(true);
          const response = await window.solana.connect({ onlyIfTrusted: silent });
          setSolanaAddress(response.publicKey.toString());
          localStorage.setItem('blockfit_solana_connected', 'true');
          if (!silent) console.log(`Connected: ${response.publicKey.toString()}`);
        } catch (err) {
          if (!silent) console.error('Err', err);
        } finally {
          setIsConnecting(false);
        }
      } else if (!silent) {
        openPhantomDeepLink();
      }
    },
    [openPhantomDeepLink]
  );

  const disconnectWallet = useCallback(() => {
    setSolanaAddress(null);
    localStorage.removeItem('blockfit_solana_connected');
    if (window.solana) window.solana.disconnect();
  }, []);

  // Load Save Data
  useEffect(() => {
    const savedWallet = localStorage.getItem('blockfit_wallet');
    const savedUnlocks = localStorage.getItem('blockfit_unlocks');
    if (savedWallet) setWallet(parseInt(savedWallet, 10));
    if (savedUnlocks) setUnlockedItems(JSON.parse(savedUnlocks));
    if (window.solana && window.solana.isPhantom && localStorage.getItem('blockfit_solana_connected')) {
      connectWallet(true);
    }
  }, [connectWallet]);

  useEffect(() => {
    const handleWalletResume = () => {
      if (!solanaAddress && window.solana && window.solana.isPhantom) {
        connectWallet(true);
      }
    };
    window.addEventListener('solana:resume', handleWalletResume);
    return () => window.removeEventListener('solana:resume', handleWalletResume);
  }, [connectWallet, solanaAddress]);

  // Save Data
  useEffect(() => {
    localStorage.setItem('blockfit_wallet', wallet.toString());
    localStorage.setItem('blockfit_unlocks', JSON.stringify(unlockedItems));
  }, [wallet, unlockedItems]);

  // Update Colors
  useEffect(() => {
    if (activeTheme === 'DEFAULT') {
      const defaults = {};
      Object.keys(TETROMINOS).forEach((k) => {
        defaults[k] = TETROMINOS[k].color;
      });
      setCustomColors(defaults);
    } else {
      setCustomColors(THEMES[activeTheme].colors);
    }
  }, [activeTheme]);

  // Particle Loop
  useEffect(() => {
    if (particles.length > 0) {
      const timer = setTimeout(() => {
        setParticles((prev) => prev.filter((p) => Date.now() - p.created < 1000));
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [particles]);

  // --- Game Logic ---

  const checkCollision = (piece, gridToCheck, { x, y }) => {
    if (!gridToCheck) return false;
    for (let row = 0; row < piece.shape.length; row += 1) {
      for (let col = 0; col < piece.shape[row].length; col += 1) {
        if (piece.shape[row][col] !== 0) {
          const newY = y + row;
          const newX = x + col;
          if (
            newY >= ROWS ||
            newX < 0 ||
            newX >= COLS ||
            (newY >= 0 && gridToCheck[newY][newX] !== 0)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const rotateMatrix = (matrix) => matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());

  const spawnPiece = useCallback(
    (typeOverride = null, gridToCheck = grid) => {
      const types = 'IJLOSTZ';
      const type = typeOverride || types[Math.floor(Math.random() * types.length)];
      const newPiece = {
        type,
        shape: TETROMINOS[type].shape,
        pos: { x: Math.floor(COLS / 2) - 1, y: 0 }
      };

      if (checkCollision(newPiece, gridToCheck, newPiece.pos)) {
        setGameOver(true);
        setDropTime(null);
        playSound('gameover');
      } else {
        setActivePiece(newPiece);
      }
    },
    [grid, playSound]
  );

  const spawnParticles = (blocks) => {
    const newParticles = [];
    blocks.forEach((b) => {
      for (let i = 0; i < 3; i += 1) {
        newParticles.push({
          x: (b.x / COLS) * 100 + Math.random() * 5,
          y: (b.y / ROWS) * 100 + Math.random() * 5,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          color: customColors[b.type] || '#fff',
          created: Date.now(),
          id: Math.random()
        });
      }
    });
    setParticles((prev) => [...prev, ...newParticles]);
  };

  // --- MATCH-5 LOGIC & SMART GRAVITY ---

  const findMatches = (gridToCheck) => {
    const visited = new Set();
    const allMatches = [];
    const getKey = (x, y) => `${x},${y}`;

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const type = gridToCheck[y][x];
        // Skip Empty (0) and Obstacles
        if (type !== 0 && type !== OBSTACLE && !visited.has(getKey(x, y))) {
          const group = [];
          const queue = [{ x, y }];
          visited.add(getKey(x, y));

          let head = 0;
          while (head < queue.length) {
            const { x: cx, y: cy } = queue[head];
            head += 1;
            group.push({ x: cx, y: cy, type });

            const neighbors = [
              { nx: cx + 1, ny: cy },
              { nx: cx - 1, ny: cy },
              { nx: cx, ny: cy + 1 },
              { nx: cx, ny: cy - 1 }
            ];

            neighbors.forEach(({ nx, ny }) => {
              if (
                nx >= 0 &&
                nx < COLS &&
                ny >= 0 &&
                ny < ROWS &&
                gridToCheck[ny][nx] === type &&
                !visited.has(getKey(nx, ny))
              ) {
                visited.add(getKey(nx, ny));
                queue.push({ x: nx, y: ny });
              }
            });
          }

          // CONNECT 5 RULE
          if (group.length >= 5) {
            allMatches.push(...group);
          }
        }
      }
    }
    return allMatches;
  };

  // Smart Gravity: Blocks fall, but Obstacles stay put. Blocks stop on obstacles.
  const applyGravity = (gridToProcess) => {
    const newGrid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

    for (let x = 0; x < COLS; x += 1) {
      let writeY = ROWS - 1;

      // Scan from bottom to top
      for (let y = ROWS - 1; y >= 0; y -= 1) {
        const cell = gridToProcess[y][x];

        if (cell === OBSTACLE) {
          newGrid[y][x] = OBSTACLE; // Keep obstacle in place
          writeY = y - 1; // Reset write pointer to above obstacle
        } else if (cell !== 0) {
          // It's a movable block
          if (writeY >= 0) {
            newGrid[writeY][x] = cell;
            writeY -= 1;
          }
        }
      }
    }
    return newGrid;
  };

  const processBoard = (gridToProcess) => {
    const matches = findMatches(gridToProcess);

    if (matches.length === 0) {
      return { grid: gridToProcess, cleared: 0, blocks: [] };
    }

    // Remove matches
    const clearedGrid = gridToProcess.map((row) => [...row]);
    matches.forEach((m) => {
      clearedGrid[m.y][m.x] = 0;
    });

    // Apply Gravity
    const gravityGrid = applyGravity(clearedGrid);

    return {
      grid: gravityGrid,
      cleared: matches.length,
      blocks: matches
    };
  };

  const lockPiece = () => {
    // 1. Merge Piece
    const tempGrid = grid.map((row) => [...row]);
    activePiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const gridY = activePiece.pos.y + y;
          const gridX = activePiece.pos.x + x;
          if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
            tempGrid[gridY][gridX] = activePiece.type;
          }
        }
      });
    });

    setCanHold(true);
    playSound('drop');

    // 2. Process Matches & Gravity
    const result = processBoard(tempGrid);

    // 3. Update Stats
    if (result.cleared > 0) {
      playSound('clear');
      spawnParticles(result.blocks);
      const points = result.cleared * 10 + (result.cleared > 5 ? (result.cleared - 5) * 50 : 0);
      const comboBonus = combo * 25;
      setScore((prev) => prev + points + comboBonus);
      setWallet((prev) => prev + Math.floor(points / 10));
      setCombo((prev) => prev + 1);
    } else {
      setCombo(0);
    }

    setGrid(result.grid);
    spawnPiece(null, result.grid);
  };

  // --- Controls ---

  const move = (dirX, dirY) => {
    if (!activePiece || gameOver || isPaused) return false;

    const newPos = { x: activePiece.pos.x + dirX, y: activePiece.pos.y + dirY };
    if (!checkCollision(activePiece, grid, newPos)) {
      setActivePiece({ ...activePiece, pos: newPos });
      if (dirX !== 0) playSound('move');
      return true;
    }
    if (dirY > 0) {
      lockPiece();
      return false;
    }
    return false;
  };

  const rotate = () => {
    if (!activePiece || gameOver || isPaused) return;
    const rotatedShape = rotateMatrix(activePiece.shape);
    const clonedPiece = { ...activePiece, shape: rotatedShape };

    let offset = 0;
    while (checkCollision(clonedPiece, grid, { ...clonedPiece.pos, x: clonedPiece.pos.x + offset })) {
      offset = offset > 0 ? -offset - 1 : -offset + 1;
      if (offset > 2) return;
    }

    playSound('rotate');
    setActivePiece({ ...clonedPiece, pos: { ...clonedPiece.pos, x: clonedPiece.pos.x + offset } });
  };

  const hardDrop = () => {
    if (!activePiece || gameOver || isPaused) return;
    let currentY = activePiece.pos.y;
    while (!checkCollision(activePiece, grid, { x: activePiece.pos.x, y: currentY + 1 })) {
      currentY += 1;
    }

    const finalY = currentY;
    const tempGrid = grid.map((row) => [...row]);
    activePiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const gridY = finalY + y;
          const gridX = activePiece.pos.x + x;
          if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
            tempGrid[gridY][gridX] = activePiece.type;
          }
        }
      });
    });

    setCanHold(true);
    playSound('drop');

    const result = processBoard(tempGrid);

    if (result.cleared > 0) {
      playSound('clear');
      spawnParticles(result.blocks);
      const points = result.cleared * 10 + (result.cleared > 5 ? (result.cleared - 5) * 50 : 0);
      const comboBonus = combo * 25;
      setScore((prev) => prev + points + comboBonus);
      setWallet((prev) => prev + Math.floor(points / 10));
      setCombo((prev) => prev + 1);
    } else {
      setCombo(0);
    }

    setGrid(result.grid);
    spawnPiece(null, result.grid);
  };

  const hold = () => {
    if (!activePiece || gameOver || isPaused || !canHold) return;

    playSound('move');
    if (heldPiece === null) {
      setHeldPiece(activePiece.type);
      spawnPiece();
    } else {
      const temp = activePiece.type;
      spawnPiece(heldPiece); // Spawn the held piece
      setHeldPiece(temp);
    }
    setCanHold(false); // Disable holding until next lock
  };

  // --- Game Loop ---
  useEffect(() => {
    const handleGameLoop = (time) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = time - lastTimeRef.current;
      const speed = Math.max(100, BASE_SPEED - Math.floor(score / 500) * 50);

      if (dropTime !== null && deltaTime > speed) {
        move(0, 1);
        lastTimeRef.current = time;
      }
      requestRef.current = requestAnimationFrame(handleGameLoop);
    };

    if (!gameOver && !isPaused && !showMarketplace) {
      requestRef.current = requestAnimationFrame(handleGameLoop);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [activePiece, gameOver, isPaused, dropTime, grid, showMarketplace, move, score]);

  // --- Inputs ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showMarketplace) return;
      if (e.key === 'ArrowLeft') move(-1, 0);
      if (e.key === 'ArrowRight') move(1, 0);
      if (e.key === 'ArrowDown') move(0, 1);
      if (e.key === 'ArrowUp') rotate();
      if (e.key === ' ') hardDrop();
      if (e.key.toLowerCase() === 'c') hold();
      if (e.key === 'p') setIsPaused((prev) => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePiece, gameOver, isPaused, grid, showMarketplace, heldPiece, canHold]);

  const resetGame = () => {
    setGrid(createGrid(true));
    setScore(0);
    setCombo(0);
    setHeldPiece(null);
    setCanHold(true);
    setGameOver(false);
    setIsPaused(false);
    setDropTime(BASE_SPEED);
    spawnPiece();
    setShowMarketplace(false);
  };

  const buyItem = (id, cost) => {
    if (wallet >= cost && !unlockedItems.includes(id)) {
      setWallet((prev) => prev - cost);
      setUnlockedItems((prev) => [...prev, id]);
      playSound('clear');
    }
  };

  useEffect(() => {
    if (!activePiece && !gameOver) {
      spawnPiece();
      setDropTime(BASE_SPEED);
    }
  }, [activePiece, gameOver, spawnPiece]);

  // --- Rendering ---
  const getBlockStyle = (type, isGhost = false) => {
    if (type === OBSTACLE) {
      return {
        backgroundColor: '#475569',
        borderColor: '#334155',
        borderWidth: '2px',
        borderRadius: '4px',
        boxShadow: 'inset 0 0 10px #1e293b'
      };
    }

    const color = customColors[type] || '#ccc';
    const style = {
      backgroundColor: isGhost ? 'transparent' : color,
      borderColor: isGhost ? color : 'rgba(0,0,0,0.1)',
      borderWidth: isGhost ? '2px' : '0'
    };
    if (isGlowMode && !isGhost) {
      style.boxShadow = `0 0 10px ${color}, 0 0 20px ${color}`;
      style.zIndex = 1;
    }
    if (!isGhost) {
      if (blockStyle === 'rounded') style.borderRadius = '6px';
      if (blockStyle === 'circle') style.borderRadius = '50%';
    }
    return style;
  };

  let ghostPos = null;
  if (activePiece && !gameOver) {
    ghostPos = { ...activePiece.pos };
    while (!checkCollision(activePiece, grid, { x: ghostPos.x, y: ghostPos.y + 1 })) {
      ghostPos.y += 1;
    }
  }

  const renderCell = (x, y) => {
    let type = grid[y][x];
    let isGhost = false;
    let isCurrent = false;

    if (activePiece && !gameOver) {
      const relativeY = y - activePiece.pos.y;
      const relativeX = x - activePiece.pos.x;
      if (
        relativeY >= 0 &&
        relativeY < activePiece.shape.length &&
        relativeX >= 0 &&
        relativeX < activePiece.shape[relativeY].length &&
        activePiece.shape[relativeY][relativeX] !== 0
      ) {
        type = activePiece.type;
        isCurrent = true;
      }
    }

    if (ghostPos && type === 0 && !isCurrent) {
      const relativeY = y - ghostPos.y;
      const relativeX = x - ghostPos.x;
      if (
        relativeY >= 0 &&
        relativeY < activePiece.shape.length &&
        relativeX >= 0 &&
        relativeX < activePiece.shape[relativeY].length &&
        activePiece.shape[relativeY][relativeX] !== 0
      ) {
        type = activePiece.type;
        isGhost = true;
      }
    }

    if (type === 0 && !isGhost) {
      return <div key={`${x}-${y}`} className="w-full h-full bg-slate-900/50 border border-slate-800/50" />;
    }

    const style = getBlockStyle(type, isGhost);
    const renderInnerShape = () => {
      if (type === OBSTACLE) return <Disc size={20} className="text-slate-400" />;
      if (isGhost) return null;

      const iconProps = { className: 'text-white/90 w-3/4 h-3/4 animate-pulse', fill: 'currentColor' };
      if (blockStyle === 'star') return <Star {...iconProps} />;
      if (blockStyle === 'heart') return <Heart {...iconProps} />;
      if (blockStyle === 'bitcoin') return <Bitcoin {...iconProps} />;
      if (blockStyle === 'diamond') return <Gem {...iconProps} />;
      if (blockStyle === 'rocket') return <Rocket {...iconProps} />;
      if (blockStyle === 'skull') return <Skull {...iconProps} />;
      return null;
    };

    return (
      <div key={`${x}-${y}`} className="relative w-full h-full bg-slate-900/30 flex items-center justify-center">
        <div
          className={`w-full h-full transition-colors duration-200 flex items-center justify-center ${isGhost ? 'opacity-30' : ''}`}
          style={{
            ...style,
            transform: ['star', 'heart', 'bitcoin', 'diamond', 'rocket', 'skull'].includes(blockStyle)
              ? 'scale(0.85)'
              : 'scale(1)'
          }}
        >
          {(blockStyle === 'square' || blockStyle === 'rounded') && !isGhost && !isGlowMode && type !== OBSTACLE && (
            <div
              className="w-full h-full absolute inset-0 bg-white/10"
              style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
            />
          )}
          {renderInnerShape()}
        </div>
      </div>
    );
  };

  // Render Held Piece Preview
  const renderMiniGrid = (type) => {
    if (!type) return <div className="text-slate-600 text-[10px] text-center mt-4">Empty</div>;
    const shape = TETROMINOS[type].shape;
    return (
      <div className="grid gap-1 justify-center" style={{ gridTemplateColumns: `repeat(${shape[0].length}, 10px)` }}>
        {shape.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-2.5 h-2.5 ${cell ? '' : 'opacity-0'}`}
              style={cell ? { backgroundColor: customColors[type] } : {}}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-center p-4">
      {/* --- HEADER --- */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 px-4">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-lg">
            BLOCK<span className="text-white">COIN</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
            {solanaAddress ? (
              <span className="text-green-400 flex items-center gap-1">
                <Smartphone size={10} /> SOLANA CONNECTED
              </span>
            ) : (
              'PINBALL MODE ENABLED'
            )}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {!solanaAddress ? (
            <button
              onClick={() => connectWallet(false)}
              disabled={isConnecting}
              className="hidden md:flex px-4 py-2 bg-[#9945FF] hover:bg-[#7c37d1] rounded-full text-white font-bold items-center gap-2 transition shadow-[0_0_15px_rgba(153,69,255,0.4)]"
            >
              <Wallet size={16} /> {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <button
              onClick={disconnectWallet}
              className="hidden md:flex px-4 py-2 bg-slate-800 border border-[#9945FF]/50 rounded-full text-[#9945FF] font-mono text-xs items-center gap-2 hover:bg-slate-800/80 transition"
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {solanaAddress.slice(0, 4)}...{solanaAddress.slice(-4)}
            </button>
          )}

          <div className="bg-slate-900 border border-cyan-500/30 px-4 py-2 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <div className="bg-cyan-500/20 p-1.5 rounded-full">
              <Coins size={20} className="text-cyan-400" />
            </div>
            <div className="flex flex-col items-end leading-none">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Balance</span>
              <span className="font-mono text-xl font-bold text-white">{wallet.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsPaused(true);
                setShowMarketplace(true);
              }}
              className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full hover:scale-105 active:scale-95 transition shadow-lg shadow-purple-900/20"
              title="Marketplace"
            >
              <ShoppingBag size={20} className="text-white" />
            </button>
            <button
              onClick={resetGame}
              className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 active:scale-95 transition"
              title="Restart"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col md:flex-row gap-8 items-start">
        {/* --- LEFT SIDEBAR (Stats) --- */}
        <div className="hidden md:flex flex-col gap-4 w-48">
          {/* HOLD QUEUE */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm h-32 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-2 left-3 flex items-center gap-2 text-slate-400">
              <Archive size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Hold (C)</span>
            </div>
            <div className="mt-4 scale-150">{renderMiniGrid(heldPiece)}</div>
            {!canHold && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Lock size={16} className="text-white/50" />
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1 text-slate-400">
              <Trophy size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Score</span>
            </div>
            <div className="text-3xl font-mono text-white font-bold">{score.toLocaleString()}</div>
          </div>

          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1 text-slate-400">
              <Zap size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">Combo</span>
            </div>
            <div
              className={`text-3xl font-mono font-bold transition-all ${combo > 1 ? 'text-yellow-400 scale-110' : 'text-slate-600'}`}
            >
              x{combo}
            </div>
          </div>

          <div className="mt-4 text-slate-500 text-xs space-y-2 font-mono">
            <p>↑ Rotate • C Hold</p>
            <p>← → Move • ↓ Drop</p>
          </div>
        </div>

        {/* --- MAIN GAME BOARD --- */}
        <div className="relative p-3 bg-slate-800 rounded-xl shadow-2xl border-4 border-slate-700 ring-1 ring-white/10">
          {/* Particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute w-2 h-2 bg-white rounded-full pointer-events-none z-50 animate-ping"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                backgroundColor: p.color,
                boxShadow: `0 0 10px ${p.color}`
              }}
            />
          ))}

          {/* Grid Container */}
          <div
            className={`grid gap-[1px] ${isGlowMode ? 'bg-slate-950' : 'bg-slate-900'} transition-colors duration-500`}
            style={{
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              width: 'min(80vw, 300px)',
              height: 'min(160vw, 600px)',
              boxShadow: isGlowMode ? 'inset 0 0 50px rgba(0,0,0,0.8)' : 'none'
            }}
          >
            {grid.map((row, y) => row.map((_, x) => renderCell(x, y)))}
          </div>

          {/* Overlays */}
          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-10 rounded-lg p-6 text-center animate-in fade-in duration-300">
              <h2 className="text-5xl font-black text-white mb-2 italic">BUSTED</h2>
              <p className="text-slate-400 mb-6 font-mono">Session Earnings</p>
              <div className="flex items-center gap-2 text-cyan-400 text-3xl font-bold mb-8">
                <Coins size={32} />
                <span>+{Math.floor(score / 50)}</span>
              </div>
              <button
                onClick={resetGame}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-900/50 hover:scale-[1.02]"
              >
                <RefreshCw size={22} /> MINE AGAIN
              </button>
            </div>
          )}

          {isPaused && !gameOver && !showMarketplace && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
              <h2 className="text-3xl font-bold text-white mb-6 tracking-widest">PAUSED</h2>
              <button
                onClick={() => setIsPaused(false)}
                className="px-8 py-3 bg-white text-slate-900 hover:bg-slate-200 rounded-full font-bold flex items-center gap-2 transition"
              >
                <Play size={20} /> RESUME
              </button>
              <button
                onClick={() => connectWallet(false)}
                className="md:hidden mt-4 px-6 py-2 bg-[#9945FF] rounded-full text-white font-bold flex items-center gap-2"
              >
                <Wallet size={16} /> {solanaAddress ? 'Wallet Connected' : 'Connect Phantom'}
              </button>
            </div>
          )}

          {showMarketplace && (
            <div className="absolute inset-0 bg-slate-900 z-20 flex flex-col rounded-lg overflow-hidden animate-in slide-in-from-bottom-10 duration-200">
              <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="text-purple-400" size={24} />
                  <div>
                    <h2 className="text-lg font-bold text-white leading-none">Block Market</h2>
                    <span className="text-[10px] text-slate-400 uppercase">Spend your earnings</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowMarketplace(false);
                    setIsPaused(false);
                  }}
                  className="p-2 hover:bg-slate-700 rounded-full transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
                <div className="bg-slate-800/50 p-3 rounded-xl flex items-center justify-between border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                      <Zap size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Glow FX</div>
                      <div className="text-xs text-slate-400">High-end visuals</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsGlowMode(!isGlowMode)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${isGlowMode ? 'bg-purple-500' : 'bg-slate-700'}`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isGlowMode ? 'left-7' : 'left-1'}`}
                    />
                  </button>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1">Block Shapes</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {SHAPE_STYLES.map((style) => {
                      const isUnlocked = unlockedItems.includes(style.id) || style.cost === 0;
                      const isActive = blockStyle === style.id;
                      return (
                        <button
                          key={style.id}
                          onClick={() => {
                            if (isUnlocked) setBlockStyle(style.id);
                            else buyItem(style.id, style.cost);
                          }}
                          className={`relative p-3 rounded-xl border flex items-center justify-between group transition-all ${
                            isActive
                              ? 'bg-cyan-500/10 border-cyan-500 ring-1 ring-cyan-500'
                              : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                isActive ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {style.icon}
                            </div>
                            <div className="text-left">
                              <div className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                                {style.name}
                              </div>
                              {!isUnlocked && (
                                <div className="text-xs text-yellow-500 font-mono flex items-center gap-1">
                                  <Coins size={10} /> {style.cost}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-slate-500">
                            {isActive ? (
                              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                            ) : !isUnlocked ? (
                              <Lock size={16} />
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1">Color Themes</h3>
                  <div className="space-y-3">
                    {Object.keys(THEMES).map((key) => {
                      const theme = THEMES[key];
                      const isUnlocked = unlockedItems.includes(key) || theme.cost === 0;
                      const isActive = activeTheme === key;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            if (isUnlocked) setActiveTheme(key);
                            else buyItem(key, theme.cost);
                          }}
                          className={`w-full relative p-3 rounded-xl border flex items-center justify-between transition-all ${
                            isActive
                              ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500'
                              : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-1">
                              {theme.colors ? (
                                Object.values(theme.colors)
                                  .slice(0, 3)
                                  .map((c, i) => (
                                    <div
                                      key={c + i}
                                      className="w-4 h-4 rounded-full border border-slate-900"
                                      style={{ backgroundColor: c }}
                                    />
                                  ))
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-slate-400" />
                              )}
                            </div>
                            <div className="text-left">
                              <div className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                                {theme.name}
                              </div>
                              {!isUnlocked && (
                                <div className="text-xs text-yellow-500 font-mono flex items-center gap-1">
                                  <Coins size={10} /> {theme.cost}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-slate-500">
                            {isActive ? (
                              <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_10px_#a855f7]" />
                            ) : !isUnlocked ? (
                              <Lock size={16} />
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-sm font-mono text-slate-400">
                <span>Wallet Balance:</span>
                <span className="text-white font-bold flex items-center gap-2">
                  <Coins size={14} className="text-yellow-500" /> {wallet}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* --- MOBILE STATS --- */}
        <div className="flex md:hidden w-full justify-between gap-2 px-2">
          <div className="bg-slate-900 p-3 rounded-lg flex-1 border border-slate-800 flex justify-between items-center">
            <div className="text-[10px] uppercase text-slate-500 font-bold">Hold</div>
            <div className="scale-75 opacity-80">{renderMiniGrid(heldPiece)}</div>
          </div>
          <div className="bg-slate-900 p-3 rounded-lg flex-1 border border-slate-800">
            <div className="text-[10px] uppercase text-slate-500 font-bold">Score</div>
            <div className="text-lg text-white font-mono">{score}</div>
          </div>
          <div className="bg-slate-900 p-3 rounded-lg flex-1 border border-slate-800">
            <div className="text-[10px] uppercase text-slate-500 font-bold">Combo</div>
            <div className="text-lg text-yellow-400 font-mono">x{combo}</div>
          </div>
        </div>

        {/* --- MOBILE CONTROLS --- */}
        <div className="grid grid-cols-4 gap-2 mt-2 md:hidden w-full max-w-sm mx-auto">
          <div className="col-span-1 row-start-1">
            <button
              className="w-full h-16 bg-slate-800 border-b-4 border-slate-950 rounded-xl flex items-center justify-center active:border-b-0 active:translate-y-1 transition text-yellow-400 font-bold text-xs uppercase"
              onClick={() => hold()}
            >
              Hold
            </button>
          </div>
          <div className="col-start-3 row-start-1">
            <button
              className="w-full h-16 bg-slate-800 border-b-4 border-slate-950 rounded-xl flex items-center justify-center active:border-b-0 active:translate-y-1 transition text-cyan-400"
              onClick={() => rotate()}
            >
              <RotateCw size={28} />
            </button>
          </div>
          <div className="col-start-2 row-start-2">
            <button
              className="w-full h-16 bg-slate-800 border-b-4 border-slate-950 rounded-xl flex items-center justify-center active:border-b-0 active:translate-y-1 transition text-white"
              onClick={() => move(-1, 0)}
            >
              <ChevronLeft size={28} />
            </button>
          </div>
          <div className="col-start-3 row-start-2">
            <button
              className="w-full h-16 bg-slate-800 border-b-4 border-slate-950 rounded-xl flex items-center justify-center active:border-b-0 active:translate-y-1 transition text-white"
              onClick={() => move(0, 1)}
            >
              <ArrowDown size={28} />
            </button>
          </div>
          <div className="col-start-4 row-start-2">
            <button
              className="w-full h-16 bg-slate-800 border-b-4 border-slate-950 rounded-xl flex items-center justify-center active:border-b-0 active:translate-y-1 transition text-white"
              onClick={() => move(1, 0)}
            >
              <ChevronRight size={28} />
            </button>
          </div>
          <div className="col-start-3 row-start-3">
            <button
              className="w-full h-16 bg-red-900/30 border-2 border-red-500/30 rounded-xl flex items-center justify-center active:bg-red-900/50 transition text-red-400"
              onClick={() => hardDrop()}
            >
              <ChevronsDown size={28} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
