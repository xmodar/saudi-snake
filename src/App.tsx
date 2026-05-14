import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Play, Sparkles, Pause } from 'lucide-react';
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

      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true);
        return;
      }

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
      className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-[#dcb66f] hover:bg-white/20 active:bg-[#c5a059] active:text-[#05140d] transition-all duration-200 touch-none shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
    >
      <Icon size={32} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0d2f21_0%,#06130e_45%,#030906_100%)] text-[#e5e7eb] p-4 font-sans selection:bg-[#c5a059] overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-30 [background:linear-gradient(to_right,rgba(197,160,89,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(197,160,89,0.08)_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative z-10 max-w-5xl mx-auto min-h-screen flex items-center justify-center">
        <div className="w-full grid lg:grid-cols-[1.2fr_0.9fr] gap-6 items-center">
          <section className="order-2 lg:order-1">
            <div className="relative aspect-square w-full max-w-[540px] mx-auto bg-[#04110c]/80 border border-[#c5a059]/40 shadow-[0_0_50px_rgba(197,160,89,0.2)] rounded-3xl overflow-hidden">
              <div
                className="absolute inset-0 opacity-90 pointer-events-none w-full h-full"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(197, 160, 89, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(197, 160, 89, 0.08) 1px, transparent 1px)',
                  backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`,
                }}
              />

              {hasStarted && !gameOver && (
                <>
                  <motion.div
                    className="absolute z-10 flex items-center justify-center drop-shadow-[0_0_12px_#e4be74]"
                    style={{ width: `${100 / GRID_SIZE}%`, height: `${100 / GRID_SIZE}%`, left: `${(food.x / GRID_SIZE) * 100}%`, top: `${(food.y / GRID_SIZE) * 100}%` }}
                    animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                  >
                    <Sparkles className="w-[75%] h-[75%] text-[#d9b168]" />
                  </motion.div>

                  {snake.map((segment, i) => {
                    const isHead = i === 0;
                    return (
                      <div
                        key={`${segment.x}-${segment.y}-${i}`}
                        className={`absolute transition-all duration-[50ms] rounded-[4px] ${isHead ? 'z-20' : 'z-10'}`}
                        style={{
                          width: `${100 / GRID_SIZE}%`,
                          height: `${100 / GRID_SIZE}%`,
                          left: `${(segment.x / GRID_SIZE) * 100}%`,
                          top: `${(segment.y / GRID_SIZE) * 100}%`,
                          background: isHead ? 'linear-gradient(145deg,#f0cc86,#c89f56)' : 'linear-gradient(135deg, #13884e 0%, #0c663b 100%)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          boxShadow: isHead ? '0 0 12px rgba(220,182,111,0.35)' : 'none',
                        }}
                      />
                    );
                  })}
                </>
              )}

              <AnimatePresence>
                {!hasStarted && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#05140d]/75 backdrop-blur-md flex flex-col items-center justify-center z-30 px-6">
                    <h2 className="text-3xl font-bold text-[#e3be73] mb-3">Saudi Snake</h2>
                    <p className="text-sm text-gray-300 mb-6 text-center">واجهة جديدة وحركة أنعم وتجربة لعب أكثر حداثة.</p>
                    <button onClick={startGame} className="w-full max-w-[220px] flex items-center justify-center gap-3 py-4 bg-[#d1aa62] text-[#05140d] font-bold rounded-xl hover:bg-[#e0bd7d] transition-all hover:scale-105 active:scale-95">
                      <Play size={20} fill="currentColor" /> ابدأ اللعب
                    </button>
                  </motion.div>
                )}
                {isPaused && hasStarted && !gameOver && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#05140d]/80 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                    <Pause className="text-[#d8b06a] mb-3" />
                    <h2 className="text-2xl font-bold text-white mb-5">متوقف مؤقتًا</h2>
                    <button onClick={() => setIsPaused(false)} className="py-3 px-8 border border-[#d8b06a]/70 text-[#e6c98f] rounded-xl hover:bg-white/10">متابعة</button>
                  </motion.div>
                )}
                {gameOver && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#05140d]/90 backdrop-blur-md flex flex-col items-center justify-center z-30">
                    <h2 className="text-4xl font-bold text-white mb-2">Game Over</h2>
                    <p className="text-gray-300 mb-6">Final Score: <span className="text-[#d8b06a] font-bold">{score}</span></p>
                    <button onClick={startGame} className="w-full max-w-[220px] flex items-center justify-center gap-2 py-4 bg-[#d1aa62] text-[#05140d] font-bold rounded-xl hover:bg-[#e0bd7d] transition-all"><RotateCcw size={18} /> لعب مرة أخرى</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-4 md:hidden flex flex-col items-center gap-3 select-none">
              <ControlButton dir="UP" Icon={ChevronUp} />
              <div className="flex gap-16"><ControlButton dir="LEFT" Icon={ChevronLeft} /><ControlButton dir="RIGHT" Icon={ChevronRight} /></div>
              <ControlButton dir="DOWN" Icon={ChevronDown} />
            </div>
          </section>

          <aside className="order-1 lg:order-2 bg-white/8 backdrop-blur-xl border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl">
            <h1 className="text-3xl font-extrabold text-[#e7c380] tracking-tight mb-2">SAUDI SNAKE</h1>
            <p className="text-sm text-gray-300 mb-6">تصميم حديث بطابع بصري متطور وتحكم سريع بلوحة المفاتيح أو الأزرار.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                <p className="text-xs text-gray-400 mb-1">Score</p>
                <p className="text-3xl font-bold">{score.toString().padStart(4, '0')}</p>
              </div>
              <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Trophy size={14} /> High</p>
                <p className="text-3xl font-bold text-[#61d18b]">{highScore.toString().padStart(4, '0')}</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-200 leading-6">
              <li>• الأسهم أو WASD للحركة</li>
              <li>• المسافة أو ESC للإيقاف المؤقت</li>
              <li>• كل نقطة تزيد السرعة تلقائيًا</li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
