import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const DIRECTION_OFFSETS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const getInitialSnake = (): Point[] => [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];

const getRandomFood = (snake: Point[]): Point => {
  let newFood: Point;
  let attempts = 0;
  while (attempts < 1000) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    if (!snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      return newFood;
    }
    attempts++;
  }
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!snake.some(segment => segment.x === x && segment.y === y)) {
        return { x, y };
      }
    }
  }
  return { x: 0, y: 0 };
};

export default function App() {
  const [snake, setSnake] = useState<Point[]>(getInitialSnake());
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('UP');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(INITIAL_SPEED);

  const directionRef = useRef<Direction>('UP');
  const nextDirectionQueueRef = useRef<Direction[]>([]);
  const stateRef = useRef({ snake, food, speed, score });

  useEffect(() => {
    stateRef.current = { snake, food, speed, score };
  }, [snake, food, speed, score]);

  useEffect(() => {
    const saved = localStorage.getItem('saudiSnakeHighScore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  useEffect(() => {
    if (highScore > 0) {
      localStorage.setItem('saudiSnakeHighScore', highScore.toString());
    }
  }, [highScore]);

  const startGame = () => {
    const initialSnake = getInitialSnake();
    setSnake(initialSnake);
    directionRef.current = 'UP';
    setDirection('UP');
    nextDirectionQueueRef.current = [];
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setHasStarted(true);
    setSpeed(INITIAL_SPEED);
    setFood(getRandomFood(initialSnake));
  };

  const handleDirectionChange = useCallback(
    (newDir: Direction) => {
      if (gameOver || isPaused || !hasStarted) return;

      const lastQDir =
        nextDirectionQueueRef.current.length > 0
          ? nextDirectionQueueRef.current[nextDirectionQueueRef.current.length - 1]
          : directionRef.current;

      const isOpposite = (d1: Direction, d2: Direction) => {
        return (
          (d1 === 'UP' && d2 === 'DOWN') ||
          (d1 === 'DOWN' && d2 === 'UP') ||
          (d1 === 'LEFT' && d2 === 'RIGHT') ||
          (d1 === 'RIGHT' && d2 === 'LEFT')
        );
      };

      if (newDir !== lastQDir && !isOpposite(newDir, lastQDir)) {
        nextDirectionQueueRef.current.push(newDir);
      }
    },
    [gameOver, isPaused, hasStarted]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (!isPaused && hasStarted && !gameOver) {
          e.preventDefault();
        }
      }

      if (gameOver || !hasStarted) return;

      if (e.key === ' ' || e.key === 'Escape') {
         e.preventDefault();
        setIsPaused(p => !p);
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          handleDirectionChange('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          handleDirectionChange('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          handleDirectionChange('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          handleDirectionChange('RIGHT');
          break;
      }
    },
    [gameOver, hasStarted, isPaused, handleDirectionChange]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (gameOver || isPaused || !hasStarted) return;

    const tick = () => {
      const { snake: currentSnake, food: currentFood, speed: currentSpeed, score: currentScore } = stateRef.current;

      if (nextDirectionQueueRef.current.length > 0) {
        directionRef.current = nextDirectionQueueRef.current.shift()!;
        setDirection(directionRef.current);
      }

      const head = currentSnake[0];
      const offset = DIRECTION_OFFSETS[directionRef.current];
      const newHead = { x: head.x + offset.x, y: head.y + offset.y };

      // Collision wall
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true);
        return;
      }
      
      // Collision self
      if (currentSnake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
        setGameOver(true);
        return;
      }

      const newSnake = [newHead, ...currentSnake];

      if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
        const newScore = currentScore + 10;
        setScore(newScore);
        setHighScore(prev => Math.max(prev, newScore));
        setFood(getRandomFood(newSnake));
        setSpeed(prev => Math.max(60, prev - 2));
      } else {
        newSnake.pop();
      }

      setSnake(newSnake);
    };

    const timeoutId = setTimeout(tick, speed);
    return () => clearTimeout(timeoutId);
  }, [snake, gameOver, isPaused, hasStarted, speed]);

  const ControlButton = ({ dir, Icon }: { dir: Direction; Icon: React.ElementType }) => (
    <button
      onPointerDown={e => {
        e.preventDefault();
        handleDirectionChange(dir);
      }}
      className="w-16 h-16 bg-white/5 backdrop-blur-sm border border-[#c5a059]/30 rounded-2xl flex items-center justify-center text-[#c5a059] hover:bg-white/10 active:bg-[#c5a059] active:text-[#05140d] transition-colors touch-none shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
    >
      <Icon size={32} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#05140d] text-[#e5e7eb] flex flex-col items-center justify-center p-4 font-sans selection:bg-[#c5a059] overflow-hidden">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Game Board container */}
        <div className="relative aspect-square w-full max-w-[400px] mx-auto bg-transparent border-[4px] border-[#c5a059] shadow-[0_0_40px_rgba(0,108,53,0.3)] rounded-sm overflow-hidden">
          {/* Grid lines */}
          <div
            className="absolute inset-0 opacity-100 pointer-events-none w-full h-full"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(197, 160, 89, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(197, 160, 89, 0.05) 1px, transparent 1px)',
              backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`,
            }}
          />

          {hasStarted && !gameOver && (
            <>
              {/* Food */}
              <motion.div
                className="absolute z-10 flex items-center justify-center drop-shadow-[0_0_10px_#c5a059]"
                style={{
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  left: `${(food.x / GRID_SIZE) * 100}%`,
                  top: `${(food.y / GRID_SIZE) * 100}%`,
                }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >
                  <svg viewBox="0 0 24 24" fill="#c5a059" className="w-[80%] h-[80%]">
                      <path d="M12,2A10,10 0 0,0 2,12C2,13.88 2.5,15.65 3.42,17.15L3.45,17.2L3.5,17.31L12,22L20.5,17.31L20.55,17.2L20.58,17.15C21.5,15.65 22,13.88 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12C20,13.5 19.6,14.9 18.89,16.1L12,19.92L5.11,16.1C4.4,14.9 4,13.5 4,12A8,8 0 0,1 12,4M12,6V10M12,14V18M8,12H10M14,12H16"/>
                  </svg>
              </motion.div>
              
              {/* Snake */}
              {snake.map((segment, i) => {
                const isHead = i === 0;
                return (
                  <div
                    key={`${segment.x}-${segment.y}-${i}`}
                    className={`absolute transition-all duration-[50ms] ${
                      isHead ? 'z-20' : 'z-10'
                    }`}
                    style={{
                      width: `${100 / GRID_SIZE}%`,
                      height: `${100 / GRID_SIZE}%`,
                      left: `${(segment.x / GRID_SIZE) * 100}%`,
                      top: `${(segment.y / GRID_SIZE) * 100}%`,
                      background: isHead ? '#c5a059' : 'linear-gradient(135deg, #006c35 0%, #00a150 100%)',
                      border: '1px solid #c5a059',
                    }}
                  >
                    {isHead && (
                      <div className="w-full h-full relative">
                        {/* Little black eyes on the snake head based on direction */}
                        <div 
                           className={`absolute bg-black rounded-full w-[25%] h-[25%] ${
                              direction === 'UP' ? 'top-[15%] left-[15%]' : 
                              direction === 'DOWN' ? 'bottom-[15%] left-[15%]' : 
                              direction === 'LEFT' ? 'top-[15%] left-[15%]' : 
                              'top-[15%] right-[15%]'
                           }`} 
                        />
                        <div 
                           className={`absolute bg-black rounded-full w-[25%] h-[25%] ${
                              direction === 'UP' ? 'top-[15%] right-[15%]' : 
                              direction === 'DOWN' ? 'bottom-[15%] right-[15%]' : 
                              direction === 'LEFT' ? 'bottom-[15%] left-[15%]' : 
                              'bottom-[15%] right-[15%]'
                           }`} 
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Overlays */}
          <AnimatePresence>
            {!hasStarted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#05140d]/80 backdrop-blur-[2px] flex flex-col items-center justify-center z-30"
              >
                <button
                  onClick={startGame}
                  className="w-full max-w-[200px] flex items-center justify-center gap-3 py-4 bg-[#c5a059] text-[#05140d] font-bold rounded-lg hover:bg-[#d4af37] transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(197,160,89,0.3)] uppercase tracking-widest"
                >
                  <Play size={20} fill="currentColor" /> Play Now
                </button>
                <p className="mt-8 text-gray-500 text-xs text-center leading-relaxed uppercase tracking-widest">
                  USE ARROW KEYS OR<br />ON-SCREEN CONTROLS
                </p>
              </motion.div>
            )}

            {isPaused && hasStarted && !gameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#05140d]/80 backdrop-blur-sm flex flex-col items-center justify-center z-30"
              >
                <h2 className="text-2xl font-bold uppercase text-white mb-6 tracking-widest">Paused</h2>
                <button
                  onClick={() => setIsPaused(false)}
                  className="flex items-center justify-center gap-2 py-3 px-8 w-full max-w-[200px] border border-[#c5a059]/50 text-[#c5a059] font-medium rounded-lg hover:bg-white/5 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest"
                >
                  <Play size={18} fill="currentColor" /> Resume
                </button>
              </motion.div>
            )}

            {gameOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#05140d]/90 backdrop-blur-md flex flex-col items-center justify-center z-30 border border-red-900/30"
              >
                <h2 className="text-4xl font-bold uppercase text-white mb-2 tracking-tighter">Game Over</h2>
                <p className="text-gray-400 mb-8 text-sm uppercase tracking-widest">
                  Final Score: <span className="text-[#c5a059] font-bold text-lg ml-1">{score}</span>
                </p>

                <button
                  onClick={startGame}
                  className="w-full max-w-[200px] flex items-center justify-center gap-2 py-4 bg-[#c5a059] text-[#05140d] font-bold rounded-lg hover:bg-[#d4af37] transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(197,160,89,0.3)] uppercase tracking-widest"
                >
                  <RotateCcw size={18} /> Play Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Controls */}
        <div className="mt-2 md:mt-4 md:hidden flex flex-col items-center gap-3 select-none">
          <ControlButton dir="UP" Icon={ChevronUp} />
          <div className="flex gap-16">
            <ControlButton dir="LEFT" Icon={ChevronLeft} />
            <ControlButton dir="RIGHT" Icon={ChevronRight} />
          </div>
          <ControlButton dir="DOWN" Icon={ChevronDown} />
        </div>
        
        {/* Header / Score Board (Moved to bottom & scaled down) */}
        <div className="flex justify-between items-center bg-white/5 backdrop-blur-md border border-[#c5a059]/20 rounded-xl p-3 sm:p-4 shadow-lg w-full max-w-[400px] mx-auto mt-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tighter text-[#c5a059] leading-none flex items-center gap-2 m-0 p-0">
              SAUDI SNAKE
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-none m-0 p-0">
              Classic Edition
            </p>
          </div>

          <div className="flex space-x-6 border-l border-white/10 pl-6">
            <div className="flex flex-col justify-between">
              <span className="text-[9px] sm:text-[10px] text-gray-400 mb-1 leading-none uppercase tracking-widest">Score</span>
              <span className="text-xl sm:text-2xl font-bold text-white tracking-tighter leading-none">
                {score.toString().padStart(4, '0')}
              </span>
            </div>
            <div className="flex flex-col justify-between">
              <span className="text-[9px] sm:text-[10px] text-gray-400 mb-1 flex items-center gap-1 leading-none uppercase tracking-widest">
                High
              </span>
              <span className="text-lg sm:text-xl font-semibold text-[#006c35] tracking-tighter leading-none">
                {highScore.toString().padStart(4, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

