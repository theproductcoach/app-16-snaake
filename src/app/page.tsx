"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Position = {
  x: number;
  y: number;
};

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

type FoodType = "normal" | "golden";

interface Food extends Position {
  type: FoodType;
  createdAt?: number;
}

interface Theme {
  name: string;
  background: string;
  snake: string;
  normalFood: string;
  goldenFood: string;
  overlay: string;
}

const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;
const INITIAL_SNAKE: Position[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];
const INITIAL_FOOD: Food = { x: 15, y: 15, type: "normal" };
const INITIAL_SPEED = 100;
const MIN_SPEED = 30;
const SPEED_DECREASE = 10;
const SCORE_INCREMENT = 5;
const GOLDEN_FOOD_CHANCE = 0.1; // 10% chance
const GOLDEN_FOOD_DURATION = 5000; // 5 seconds in milliseconds
const POINTS = {
  normal: 1,
  golden: 3,
};

const THEMES: Theme[] = [
  {
    name: "Classic",
    background: "#000000",
    snake: "#00ff00",
    normalFood: "#ff0000",
    goldenFood: "#ffd700",
    overlay: "rgba(0, 0, 0, 0.85)",
  },
  {
    name: "Ocean",
    background: "#001440",
    snake: "#00ffff",
    normalFood: "#ff6b6b",
    goldenFood: "#ffd700",
    overlay: "rgba(0, 20, 64, 0.85)",
  },
  {
    name: "Desert",
    background: "#2c1810",
    snake: "#ffa500",
    normalFood: "#50c878",
    goldenFood: "#ffd700",
    overlay: "rgba(44, 24, 16, 0.85)",
  },
  {
    name: "Neon",
    background: "#1a0033",
    snake: "#ff00ff",
    normalFood: "#00ff00",
    goldenFood: "#ffd700",
    overlay: "rgba(26, 0, 51, 0.85)",
  },
  {
    name: "Forest",
    background: "#0d2818",
    snake: "#90ee90",
    normalFood: "#ff4d4d",
    goldenFood: "#ffd700",
    overlay: "rgba(13, 40, 24, 0.85)",
  },
];

const PIXEL_SIZE = 4; // Size of each pixel in our pixel art

function drawPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  borderColor: string
) {
  const pixels = [
    // Main body pixels (lighter)
    { x: 1, y: 1, w: width - 2, h: height - 2, color },
    // Border pixels (darker)
    { x: 0, y: 0, w: width, h: 1, color: borderColor }, // top
    { x: 0, y: height - 1, w: width, h: 1, color: borderColor }, // bottom
    { x: 0, y: 0, w: 1, h: height, color: borderColor }, // left
    { x: width - 1, y: 0, w: 1, h: height, color: borderColor }, // right
  ];

  pixels.forEach((pixel) => {
    ctx.fillStyle = pixel.color;
    ctx.fillRect(
      x + pixel.x * PIXEL_SIZE,
      y + pixel.y * PIXEL_SIZE,
      pixel.w * PIXEL_SIZE,
      pixel.h * PIXEL_SIZE
    );
  });
}

function drawPixelCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  borderColor: string
) {
  // Create a simple pixel art circle pattern
  const pixels = [
    // Center square
    { x: 1, y: 1, w: 3, h: 3, color },
    // Border pixels
    { x: 0, y: 1, w: 1, h: 3, color: borderColor }, // left
    { x: 4, y: 1, w: 1, h: 3, color: borderColor }, // right
    { x: 1, y: 0, w: 3, h: 1, color: borderColor }, // top
    { x: 1, y: 4, w: 3, h: 1, color: borderColor }, // bottom
  ];

  pixels.forEach((pixel) => {
    ctx.fillStyle = pixel.color;
    ctx.fillRect(
      x + pixel.x * PIXEL_SIZE - radius,
      y + pixel.y * PIXEL_SIZE - radius,
      pixel.w * PIXEL_SIZE,
      pixel.h * PIXEL_SIZE
    );
  });
}

function drawSnakeHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: Direction,
  color: string,
  isPixelMode: boolean
) {
  const size = CELL_SIZE - 1;

  if (isPixelMode) {
    const borderColor =
      color
        .replace(/^#/, "")
        .match(/.{2}/g)
        ?.map((c) =>
          Math.max(0, parseInt(c, 16) - 40)
            .toString(16)
            .padStart(2, "0")
        )
        .join("") || "#000000";

    // Draw head base
    drawPixelRect(ctx, x, y, 5, 5, color, `#${borderColor}`);

    // Add pixel eyes based on direction
    const eyeColor = "#ffffff";
    const pupilColor = "#000000";

    let eye1Pos, eye2Pos;
    switch (direction) {
      case "RIGHT":
        eye1Pos = { x: x + 15, y: y + 4 };
        eye2Pos = { x: x + 15, y: y + 12 };
        break;
      case "LEFT":
        eye1Pos = { x: x + 4, y: y + 4 };
        eye2Pos = { x: x + 4, y: y + 12 };
        break;
      case "UP":
        eye1Pos = { x: x + 4, y: y + 4 };
        eye2Pos = { x: x + 12, y: y + 4 };
        break;
      case "DOWN":
        eye1Pos = { x: x + 4, y: y + 15 };
        eye2Pos = { x: x + 12, y: y + 15 };
        break;
    }

    // Draw eyes
    ctx.fillStyle = eyeColor;
    ctx.fillRect(eye1Pos.x, eye1Pos.y, 3, 3);
    ctx.fillRect(eye2Pos.x, eye2Pos.y, 3, 3);

    // Draw pupils
    ctx.fillStyle = pupilColor;
    ctx.fillRect(eye1Pos.x + 1, eye1Pos.y + 1, 1, 1);
    ctx.fillRect(eye2Pos.x + 1, eye2Pos.y + 1, 1, 1);

    // Draw tongue
    ctx.fillStyle = "#ff0000";
    switch (direction) {
      case "RIGHT":
        ctx.fillRect(x + 19, y + 8, 4, 1);
        ctx.fillRect(x + 21, y + 7, 1, 1);
        ctx.fillRect(x + 21, y + 9, 1, 1);
        break;
      case "LEFT":
        ctx.fillRect(x - 4, y + 8, 4, 1);
        ctx.fillRect(x - 3, y + 7, 1, 1);
        ctx.fillRect(x - 3, y + 9, 1, 1);
        break;
      case "UP":
        ctx.fillRect(x + 8, y - 4, 1, 4);
        ctx.fillRect(x + 7, y - 3, 1, 1);
        ctx.fillRect(x + 9, y - 3, 1, 1);
        break;
      case "DOWN":
        ctx.fillRect(x + 8, y + 19, 1, 4);
        ctx.fillRect(x + 7, y + 21, 1, 1);
        ctx.fillRect(x + 9, y + 21, 1, 1);
        break;
    }
  } else {
    // Regular mode with rounded head
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Add eyes
    const eyeRadius = size / 8;
    const pupilRadius = eyeRadius / 2;
    let eye1X, eye1Y, eye2X, eye2Y;

    switch (direction) {
      case "RIGHT":
        eye1X = x + size * 0.7;
        eye1Y = y + size * 0.3;
        eye2X = x + size * 0.7;
        eye2Y = y + size * 0.7;
        break;
      case "LEFT":
        eye1X = x + size * 0.3;
        eye1Y = y + size * 0.3;
        eye2X = x + size * 0.3;
        eye2Y = y + size * 0.7;
        break;
      case "UP":
        eye1X = x + size * 0.3;
        eye1Y = y + size * 0.3;
        eye2X = x + size * 0.7;
        eye2Y = y + size * 0.3;
        break;
      case "DOWN":
        eye1X = x + size * 0.3;
        eye1Y = y + size * 0.7;
        eye2X = x + size * 0.7;
        eye2Y = y + size * 0.7;
        break;
    }

    // Draw eyes (white part)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
    ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw pupils (black part)
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(eye1X, eye1Y, pupilRadius, 0, Math.PI * 2);
    ctx.arc(eye2X, eye2Y, pupilRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw tongue
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    switch (direction) {
      case "RIGHT":
        ctx.moveTo(x + size, y + size / 2);
        ctx.lineTo(x + size + 8, y + size / 2 - 2);
        ctx.lineTo(x + size + 8, y + size / 2 + 2);
        break;
      case "LEFT":
        ctx.moveTo(x, y + size / 2);
        ctx.lineTo(x - 8, y + size / 2 - 2);
        ctx.lineTo(x - 8, y + size / 2 + 2);
        break;
      case "UP":
        ctx.moveTo(x + size / 2, y);
        ctx.lineTo(x + size / 2 - 2, y - 8);
        ctx.lineTo(x + size / 2 + 2, y - 8);
        break;
      case "DOWN":
        ctx.moveTo(x + size / 2, y + size);
        ctx.lineTo(x + size / 2 - 2, y + size + 8);
        ctx.lineTo(x + size / 2 + 2, y + size + 8);
        break;
    }
    ctx.fill();
  }
}

function drawSnakeBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  index: number,
  color: string,
  isPixelMode: boolean
) {
  const size = CELL_SIZE - 1;

  // Create a slightly darker shade for alternating segments
  const darkerColor = color
    .replace(/^#/, "")
    .match(/.{2}/g)
    ?.map((c) =>
      Math.max(0, parseInt(c, 16) - 20)
        .toString(16)
        .padStart(2, "0")
    )
    .join("");

  const segmentColor = index % 2 === 0 ? color : `#${darkerColor}`;

  if (isPixelMode) {
    const borderColor =
      segmentColor
        .replace(/^#/, "")
        .match(/.{2}/g)
        ?.map((c) =>
          Math.max(0, parseInt(c, 16) - 40)
            .toString(16)
            .padStart(2, "0")
        )
        .join("") || "#000000";

    drawPixelRect(ctx, x, y, 5, 5, segmentColor, `#${borderColor}`);
  } else {
    ctx.fillStyle = segmentColor;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 5);
    ctx.fill();
  }
}

interface TouchControlsProps {
  onDirectionChange: (direction: Direction) => void;
}

function TouchControls({ onDirectionChange }: TouchControlsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 md:gap-3 md:hidden touch-none w-full max-w-[180px] mx-auto mb-safe">
      <div className="w-12 h-12 sm:w-14 sm:h-14" /> {/* Empty space */}
      <button
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-gray-800 to-gray-900
                   border-2 sm:border-4 border-gray-700 shadow-lg active:shadow-inner active:translate-y-[1px]
                   transition-all duration-100 relative overflow-hidden group touch-manipulation"
        onClick={() => onDirectionChange("UP")}
        onTouchStart={(e) => {
          e.preventDefault();
          onDirectionChange("UP");
        }}
        aria-label="Move Up"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent group-active:from-white/5" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-6 h-6 sm:w-8 sm:h-8 text-white/90"
            viewBox="0 0 24 24"
          >
            <path fill="currentColor" d="M12 4l-8 8h16z" />
          </svg>
        </div>
      </button>
      <div className="w-12 h-12 sm:w-14 sm:h-14" /> {/* Empty space */}
      <button
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-gray-800 to-gray-900
                   border-2 sm:border-4 border-gray-700 shadow-lg active:shadow-inner active:translate-y-[1px]
                   transition-all duration-100 relative overflow-hidden group touch-manipulation"
        onClick={() => onDirectionChange("LEFT")}
        onTouchStart={(e) => {
          e.preventDefault();
          onDirectionChange("LEFT");
        }}
        aria-label="Move Left"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent group-active:from-white/5" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-6 h-6 sm:w-8 sm:h-8 text-white/90"
            viewBox="0 0 24 24"
          >
            <path fill="currentColor" d="M4 12l8-8v16z" />
          </svg>
        </div>
      </button>
      <div
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-gray-900 to-black
                   border-2 sm:border-4 border-gray-800 shadow-inner relative"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gray-800 shadow-inner" />
        </div>
      </div>
      <button
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-gray-800 to-gray-900
                   border-2 sm:border-4 border-gray-700 shadow-lg active:shadow-inner active:translate-y-[1px]
                   transition-all duration-100 relative overflow-hidden group touch-manipulation"
        onClick={() => onDirectionChange("RIGHT")}
        onTouchStart={(e) => {
          e.preventDefault();
          onDirectionChange("RIGHT");
        }}
        aria-label="Move Right"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent group-active:from-white/5" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-6 h-6 sm:w-8 sm:h-8 text-white/90"
            viewBox="0 0 24 24"
          >
            <path fill="currentColor" d="M20 12l-8-8v16z" />
          </svg>
        </div>
      </button>
      <div className="w-12 h-12 sm:w-14 sm:h-14" /> {/* Empty space */}
      <button
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-gray-800 to-gray-900
                   border-2 sm:border-4 border-gray-700 shadow-lg active:shadow-inner active:translate-y-[1px]
                   transition-all duration-100 relative overflow-hidden group touch-manipulation"
        onClick={() => onDirectionChange("DOWN")}
        onTouchStart={(e) => {
          e.preventDefault();
          onDirectionChange("DOWN");
        }}
        aria-label="Move Down"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent group-active:from-white/5" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-6 h-6 sm:w-8 sm:h-8 text-white/90"
            viewBox="0 0 24 24"
          >
            <path fill="currentColor" d="M12 20l8-8H4z" />
          </svg>
        </div>
      </button>
    </div>
  );
}

function SplashScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-4">
      <div className="animate-pulse w-full max-w-[600px]">
        <Image
          src="/banner.png"
          alt="Snake Game Banner"
          width={600}
          height={150}
          priority
          className="pixel-rendering w-full h-auto"
        />
      </div>
      <button
        onClick={onStart}
        className="px-6 py-3 bg-green-600 text-white text-base sm:text-xl font-bold rounded 
                 hover:bg-green-500 active:bg-green-700 transition-colors transform hover:scale-105
                 border-2 border-green-400 shadow-lg hover:shadow-green-500/50
                 font-[Press_Start_2P] uppercase tracking-wider"
        style={{ imageRendering: "pixelated" }}
      >
        Start Game
      </button>
      <p className="text-green-500 mt-4 text-xs sm:text-sm animate-bounce hidden md:block">
        Press ENTER to start
      </p>
    </div>
  );
}

function GameHeader({
  level,
  isPixelMode,
  onTogglePixelMode,
}: {
  level: number;
  isPixelMode: boolean;
  onTogglePixelMode: () => void;
}) {
  const getDifficulty = (level: number) => {
    if (level <= 3) return "EASY";
    if (level <= 6) return "MEDIUM";
    if (level <= 9) return "HARD";
    return "INSANE";
  };

  return (
    <div className="w-full max-w-[min(92vw,400px)] mb-2 sm:mb-4 relative">
      <div className="bg-black/90 border border-white/10 rounded-lg p-2 sm:p-3 relative overflow-hidden">
        {/* Glowing border effect */}
        <div className="absolute inset-0 border border-white/20 rounded-lg shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]" />

        <div className="flex items-center justify-between gap-2 sm:gap-4 relative z-10">
          {/* Left section - Pixel/Normal toggle */}
          <div className="w-20 sm:w-24">
            <button
              onClick={onTogglePixelMode}
              className={`
                w-full px-2 py-1.5 font-[Press_Start_2P] text-[0.55rem] sm:text-[0.6rem]
                transition-all duration-150 relative group overflow-hidden
                ${
                  isPixelMode
                    ? "bg-gradient-to-b from-purple-700 to-purple-900 text-white border-2 border-t-purple-400 border-l-purple-500 border-r-purple-900 border-b-purple-950"
                    : "bg-gradient-to-b from-gray-700 to-gray-900 text-white border-2 border-t-gray-500 border-l-gray-600 border-r-gray-900 border-b-gray-950"
                }
                hover:brightness-110 hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]
                active:translate-y-[1px] active:brightness-90
                active:border-t-gray-900 active:border-l-gray-900
                active:border-r-gray-700 active:border-b-gray-700
              `}
            >
              {/* Pixel corners */}
              <div
                className={`absolute -top-0.5 -left-0.5 w-1.5 h-1.5 transform rotate-45 ${
                  isPixelMode ? "bg-purple-300" : "bg-gray-400"
                }`}
              />
              <div
                className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 transform rotate-45 ${
                  isPixelMode ? "bg-purple-300" : "bg-gray-400"
                }`}
              />
              <div
                className={`absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 transform rotate-45 ${
                  isPixelMode ? "bg-purple-950" : "bg-gray-950"
                }`}
              />
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 transform rotate-45 ${
                  isPixelMode ? "bg-purple-950" : "bg-gray-950"
                }`}
              />

              {/* Inner shadow overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/20 pointer-events-none" />

              {/* Button text */}
              <span className="relative z-10 block">
                {isPixelMode ? "NORMAL" : "PIXEL"}
              </span>

              {/* Pressed state overlay */}
              <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 transition-colors duration-75" />

              {/* Hover glow effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div
                  className={`absolute inset-0 ${
                    isPixelMode ? "bg-purple-500/10" : "bg-white/10"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              </div>

              {/* Active state glow */}
              <div
                className={`absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-75 ${
                  isPixelMode ? "bg-purple-500/20" : "bg-white/20"
                }`}
              />
            </button>
          </div>

          {/* Center section - Title */}
          <div className="flex-1 text-center flex items-center justify-center">
            <h1 className="font-[Press_Start_2P] text-white text-xs sm:text-sm md:text-base tracking-wider">
              SNAAKE v1.0
            </h1>
          </div>

          {/* Right section - Difficulty */}
          <div className="w-20 sm:w-24 text-right flex items-center justify-end h-full pr-1.5 sm:pr-2">
            <div
              className={`
              relative px-2 py-1.5 rounded-sm flex items-center justify-center min-w-[64px] sm:min-w-[72px]
              ${
                level <= 3
                  ? "bg-green-900/50"
                  : level <= 6
                  ? "bg-orange-900/50"
                  : "bg-red-900/50"
              }
              ${
                level <= 3
                  ? "border border-green-500"
                  : level <= 6
                  ? "border border-orange-500"
                  : "border border-red-500"
              }
              transition-colors duration-300
            `}
            >
              {/* Glow effect */}
              <div
                className={`
                absolute inset-0 rounded-sm blur-[2px] opacity-50
                ${
                  level <= 3
                    ? "bg-green-500"
                    : level <= 6
                    ? "bg-orange-500"
                    : "bg-red-500"
                }
                animate-pulse
              `}
              />

              {/* Inner shadow */}
              <div className="absolute inset-0 rounded-sm bg-gradient-to-b from-white/10 to-black/20" />

              <span className="font-[Press_Start_2P] text-[0.55rem] sm:text-[0.6rem] md:text-xs text-white relative z-10 whitespace-nowrap">
                {getDifficulty(level)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GameUI({
  score,
  level,
  highScore,
}: {
  score: number;
  level: number;
  highScore: number;
}) {
  return (
    <div className="w-full max-w-[min(92vw,400px)] px-2 sm:px-4">
      <div className="flex justify-between items-center gap-2 text-white font-[Press_Start_2P] text-[0.6rem] sm:text-xs md:text-sm">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>High: {highScore}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !gameStarted) {
        setGameStarted(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameStarted]);

  return (
    <main className="min-h-[100dvh] py-4 sm:py-8 flex items-center justify-center bg-[url('/bg-full.png')] bg-cover bg-center bg-no-repeat">
      <div className="relative bg-black/80 backdrop-blur-sm rounded-lg shadow-2xl p-3 sm:p-4 md:p-8">
        {!gameStarted && <SplashScreen onStart={() => setGameStarted(true)} />}
        {gameStarted && <Game />}
      </div>
    </main>
  );
}

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundRef = useRef<HTMLImageElement>(null);
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Food>(INITIAL_FOOD);
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [hasFirstInput, setHasFirstInput] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [isPixelMode, setIsPixelMode] = useState(false);

  const level = Math.floor(score / SCORE_INCREMENT) + 1;

  // Load high score on mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem("snakeHighScore");
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore));
    }
  }, []);

  // Update high score when game ends
  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
      localStorage.setItem("snakeHighScore", score.toString());
    }
  }, [gameOver, score, highScore]);

  // Load background image
  useEffect(() => {
    const img = new window.Image();
    img.src = "/background.png";
    img.onload = () => {
      backgroundRef.current = img;
    };
  }, []);

  // Generate random food position with type
  const generateFood = (): Food => {
    const maxRetries = 100; // Prevent infinite recursion
    let retries = 0;

    while (retries < maxRetries) {
      const newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
        type: Math.random() < GOLDEN_FOOD_CHANCE ? "golden" : "normal",
      } as Food;

      // Add timestamp for golden food
      if (newFood.type === "golden") {
        newFood.createdAt = Date.now();
      }

      // Check if position is valid (not on snake)
      const isValidPosition = !snake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );

      if (isValidPosition) {
        return newFood;
      }

      retries++;
    }

    // If we couldn't find a valid position after max retries,
    // try to find any available position systematically
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const isValidPosition = !snake.some(
          (segment) => segment.x === x && segment.y === y
        );
        if (isValidPosition) {
          return {
            x,
            y,
            type: Math.random() < GOLDEN_FOOD_CHANCE ? "golden" : "normal",
            createdAt:
              Math.random() < GOLDEN_FOOD_CHANCE ? Date.now() : undefined,
          };
        }
      }
    }

    // If all positions are occupied (very unlikely), return a default position
    return { x: 0, y: 0, type: "normal" };
  };

  // Select random theme on mount and game restart
  const selectRandomTheme = () => {
    const randomIndex = Math.floor(Math.random() * THEMES.length);
    setCurrentTheme(THEMES[randomIndex]);
  };

  // Initialize game state and theme after mount
  useEffect(() => {
    setIsStarted(true);
    selectRandomTheme();
  }, []);

  const handleDirectionChange = (newDirection: Direction) => {
    if (!hasFirstInput) {
      setHasFirstInput(true);
    }

    switch (newDirection) {
      case "UP":
        if (direction !== "DOWN") setDirection(newDirection);
        break;
      case "DOWN":
        if (direction !== "UP") setDirection(newDirection);
        break;
      case "LEFT":
        if (direction !== "RIGHT") setDirection(newDirection);
        break;
      case "RIGHT":
        if (direction !== "LEFT") setDirection(newDirection);
        break;
    }
  };

  // Update keyboard event handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          handleDirectionChange("UP");
          break;
        case "ArrowDown":
          handleDirectionChange("DOWN");
          break;
        case "ArrowLeft":
          handleDirectionChange("LEFT");
          break;
        case "ArrowRight":
          handleDirectionChange("RIGHT");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [direction]);

  // Update speed based on score
  useEffect(() => {
    if (score > 0 && score % SCORE_INCREMENT === 0) {
      const newSpeed = Math.max(
        MIN_SPEED,
        INITIAL_SPEED - Math.floor(score / SCORE_INCREMENT) * SPEED_DECREASE
      );
      setSpeed(newSpeed);
    }
  }, [score]);

  // Check for golden food timeout
  useEffect(() => {
    if (food.type === "golden" && food.createdAt) {
      const timeout = setTimeout(() => {
        if (!gameOver) {
          setFood(generateFood());
        }
      }, GOLDEN_FOOD_DURATION);

      return () => clearTimeout(timeout);
    }
  }, [food, gameOver]);

  // Game loop
  useEffect(() => {
    if (!isStarted || gameOver || !hasFirstInput) return;

    const moveSnake = () => {
      const head = snake[0];
      const newHead = { ...head };

      switch (direction) {
        case "UP":
          newHead.y -= 1;
          break;
        case "DOWN":
          newHead.y += 1;
          break;
        case "LEFT":
          newHead.x -= 1;
          break;
        case "RIGHT":
          newHead.x += 1;
          break;
      }

      // Check wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        setGameOver(true);
        return;
      }

      // Check self collision
      if (
        snake.some(
          (segment) => segment.x === newHead.x && segment.y === newHead.y
        )
      ) {
        setGameOver(true);
        return;
      }

      const newSnake = [newHead];
      const eating = newHead.x === food.x && newHead.y === food.y;

      if (eating) {
        // Add points based on food type
        setScore((prev) => prev + POINTS[food.type]);
        // Add all existing segments if eating
        newSnake.push(...snake);
        setFood(generateFood());
      } else {
        // Add all segments except the last one if not eating
        newSnake.push(...snake.slice(0, -1));
      }

      setSnake(newSnake);
    };

    const gameLoop = setInterval(moveSnake, speed);
    return () => clearInterval(gameLoop);
  }, [snake, direction, food, gameOver, isStarted, speed, hasFirstInput]);

  // Draw game
  useEffect(() => {
    if (!isStarted) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    // Get the container's size
    const container = canvas.parentElement;
    if (!container) return;

    // Calculate the maximum size that fits in the viewport
    const maxWidth = Math.min(
      window.innerWidth * 0.92, // 92% of viewport width
      window.innerHeight * 0.5, // Limit height to 50% of viewport
      400 // Maximum size
    );

    // Set container size
    container.style.width = `${maxWidth}px`;
    container.style.height = `${maxWidth}px`; // Maintain aspect ratio

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Set canvas size to match container
    canvas.width = maxWidth * dpr;
    canvas.height = maxWidth * dpr;

    // Scale the context to maintain the game's internal resolution
    const scale = (maxWidth * dpr) / CANVAS_SIZE;
    ctx.scale(scale, scale);

    // Clear canvas with black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid lines
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= CANVAS_SIZE; x += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_SIZE);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= CANVAS_SIZE; y += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_SIZE, y);
      ctx.stroke();
    }

    // Draw snake
    snake.forEach(({ x, y }, index) => {
      const xPos = x * CELL_SIZE;
      const yPos = y * CELL_SIZE;

      if (index === 0) {
        // Draw head
        drawSnakeHead(
          ctx,
          xPos,
          yPos,
          direction,
          currentTheme.snake,
          isPixelMode
        );
      } else {
        // Draw body segment
        drawSnakeBody(ctx, xPos, yPos, index, currentTheme.snake, isPixelMode);
      }
    });

    // Draw food
    if (food.type === "golden") {
      const timeSinceCreation = Date.now() - (food.createdAt || 0);
      const timeLeft = GOLDEN_FOOD_DURATION - timeSinceCreation;
      const opacity = Math.max(0.3, timeLeft / GOLDEN_FOOD_DURATION);
      const color = `${currentTheme.goldenFood}${Math.floor(opacity * 255)
        .toString(16)
        .padStart(2, "0")}`;

      if (isPixelMode) {
        const borderColor =
          currentTheme.goldenFood
            .replace(/^#/, "")
            .match(/.{2}/g)
            ?.map((c) =>
              Math.max(0, parseInt(c, 16) - 40)
                .toString(16)
                .padStart(2, "0")
            )
            .join("") || "#000000";

        drawPixelCircle(
          ctx,
          food.x * CELL_SIZE + CELL_SIZE / 2,
          food.y * CELL_SIZE + CELL_SIZE / 2,
          10,
          color,
          `#${borderColor}`
        );
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(
          food.x * CELL_SIZE + CELL_SIZE / 2,
          food.y * CELL_SIZE + CELL_SIZE / 2,
          CELL_SIZE / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    } else {
      const xPos = food.x * CELL_SIZE;
      const yPos = food.y * CELL_SIZE;
      const size = CELL_SIZE - 1;

      if (isPixelMode) {
        const borderColor =
          currentTheme.normalFood
            .replace(/^#/, "")
            .match(/.{2}/g)
            ?.map((c) =>
              Math.max(0, parseInt(c, 16) - 40)
                .toString(16)
                .padStart(2, "0")
            )
            .join("") || "#000000";

        drawPixelRect(
          ctx,
          xPos + 2,
          yPos + 2,
          3,
          3,
          currentTheme.normalFood,
          `#${borderColor}`
        );
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(xPos + 3, yPos, 1, 2);
        ctx.fillStyle = "#228B22";
        ctx.fillRect(xPos + 4, yPos, 1, 1);
      } else {
        ctx.fillStyle = currentTheme.normalFood;
        ctx.beginPath();
        ctx.arc(
          xPos + CELL_SIZE / 2,
          yPos + CELL_SIZE / 2,
          CELL_SIZE / 2 - 2,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#8B4513";
        ctx.fillRect(xPos + CELL_SIZE / 2 - 1, yPos + 2, 2, 4);

        ctx.fillStyle = "#228B22";
        ctx.beginPath();
        ctx.moveTo(xPos + CELL_SIZE / 2 + 1, yPos + 2);
        ctx.lineTo(xPos + CELL_SIZE / 2 + 4, yPos);
        ctx.lineTo(xPos + CELL_SIZE / 2 + 3, yPos + 2);
        ctx.fill();
      }
    }

    // Draw game over overlay
    if (gameOver) {
      drawGameOver(ctx, score, highScore, () => {
        setSnake(INITIAL_SNAKE);
        setDirection("RIGHT");
        setFood(generateFood());
        setGameOver(false);
        setSpeed(INITIAL_SPEED);
        setScore(0);
        selectRandomTheme();
      });
    }
  }, [
    snake,
    food,
    isStarted,
    gameOver,
    score,
    highScore,
    level,
    currentTheme,
    isPixelMode,
  ]);

  if (!isStarted) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2 w-full">
      <GameHeader
        level={level}
        isPixelMode={isPixelMode}
        onTogglePixelMode={() => setIsPixelMode(!isPixelMode)}
      />
      <div className="w-full relative retro-screen overflow-hidden">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-black/50 to-transparent opacity-50" />
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full bg-black rounded-lg relative z-20"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
        {!isStarted && <StartButton onStart={() => setIsStarted(true)} />}
        {isStarted && !hasFirstInput && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center font-[Press_Start_2P] text-sm sm:text-base">
              <p>Press any direction</p>
              <p>to start moving!</p>
            </div>
          </div>
        )}
      </div>
      <GameUI score={score} level={level} highScore={highScore} />
      <div className="h-1 sm:h-2" />
      <TouchControls onDirectionChange={handleDirectionChange} />
    </div>
  );
}

function drawGameOver(
  ctx: CanvasRenderingContext2D,
  score: number,
  highScore: number,
  onRestart: () => void
) {
  const canvas = ctx.canvas;
  const isMobile = window.innerWidth < 768;

  // Remove any existing click handlers to prevent unwanted clicks
  canvas.onclick = null;

  // Handle high-DPI displays
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  // Set canvas size accounting for device pixel ratio
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Scale all drawing operations
  ctx.scale(dpr, dpr);

  // Set canvas CSS size
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  // Dark overlay with scanline effect
  ctx.fillStyle = "rgba(0, 0, 0, 0.94)";
  ctx.fillRect(0, 0, rect.width, rect.height);

  // Draw scanlines
  ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
  for (let y = 0; y < rect.height; y += 4) {
    ctx.fillRect(0, y, rect.width, 2);
  }

  // Helper function to draw pixel-style text with glow
  const drawPixelText = (
    text: string,
    y: number,
    size: number,
    color: string = "#fff",
    glow: boolean = false
  ) => {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${size}px "Press Start 2P"`;

    if (glow) {
      // Strong outer glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 25;
      ctx.fillStyle = color;
      ctx.fillText(text, rect.width / 2, y);

      // Medium glow layer
      ctx.shadowBlur = 15;
      ctx.fillStyle = "#fff";
      ctx.fillText(text, rect.width / 2, y);

      // Sharp inner text
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.fillText(text, rect.width / 2, y);
    } else {
      // Text shadow for depth
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = color;
      ctx.fillText(text, rect.width / 2, y);

      // Main text
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillText(text, rect.width / 2, y);
    }
  };

  try {
    // Game Over text with enhanced size and glow
    drawPixelText(
      "GAME",
      rect.height * 0.2,
      isMobile ? 40 : 54,
      "#ff0000",
      true
    );

    drawPixelText(
      "OVER",
      rect.height * 0.38,
      isMobile ? 40 : 54,
      "#ff0000",
      true
    );

    // Final Score with enhanced visibility
    drawPixelText(
      `SCORE: ${score}`,
      rect.height * 0.57,
      isMobile ? 18 : 22,
      "#fff",
      true
    );

    // High Score with glow effect
    if (score === highScore && score > 0) {
      drawPixelText(
        "NEW HIGH SCORE!",
        rect.height * 0.67,
        isMobile ? 13 : 18,
        "#ffd700",
        true
      );
    } else if (highScore > 0) {
      drawPixelText(
        `BEST: ${highScore}`,
        rect.height * 0.67,
        isMobile ? 13 : 18,
        "#666"
      );
    }

    // Pixel-style button with neon purple theme
    const buttonWidth = isMobile ? rect.width * 0.5 : 180;
    const buttonHeight = isMobile ? 40 : 48;
    const buttonX = (rect.width - buttonWidth) / 2;
    const buttonY = rect.height * 0.75;
    const pixelSize = 2;

    const drawPixelButton = (
      isPressed: boolean = false,
      isHovered: boolean = false
    ) => {
      // Button background with darker purple
      ctx.fillStyle = isPressed ? "#2a0066" : isHovered ? "#2d0080" : "#1a0033";
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Neon border effect with enhanced hover state
      ctx.fillStyle = isPressed ? "#9933ff" : isHovered ? "#b366ff" : "#7700ff";
      // Top and left highlight
      ctx.fillRect(buttonX, buttonY, buttonWidth, pixelSize);
      ctx.fillRect(buttonX, buttonY, pixelSize, buttonHeight);

      // Bottom and right shadow
      ctx.fillStyle = isHovered ? "#4d0099" : "#33004d";
      ctx.fillRect(
        buttonX,
        buttonY + buttonHeight - pixelSize,
        buttonWidth,
        pixelSize
      );
      ctx.fillRect(
        buttonX + buttonWidth - pixelSize,
        buttonY,
        pixelSize,
        buttonHeight
      );

      // Button text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${isMobile ? 16 : 20}px "Press Start 2P"`;

      // Neon text effect
      if (!isPressed) {
        // Outer glow with enhanced hover state
        ctx.shadowColor = isHovered ? "#dd99ff" : "#cc66ff";
        ctx.shadowBlur = isHovered ? 20 : 15;
        ctx.fillStyle = isHovered ? "#dd99ff" : "#cc66ff";
        ctx.fillText("RESTART", rect.width / 2, buttonY + buttonHeight / 2);

        // Middle glow
        ctx.shadowBlur = isHovered ? 12 : 8;
        ctx.fillStyle = isHovered ? "#ecd9ff" : "#e6b3ff";
        ctx.fillText("RESTART", rect.width / 2, buttonY + buttonHeight / 2);

        // Inner bright text
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.fillText("RESTART", rect.width / 2, buttonY + buttonHeight / 2);
      } else {
        // Pressed state
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#9933ff";
        ctx.fillText("RESTART", rect.width / 2, buttonY + buttonHeight / 2);
      }
      ctx.shadowBlur = 0;
    };

    // Initial draw of button
    drawPixelButton();

    // Track hover state
    let isHovered = false;

    // Handle hover events
    canvas.onmousemove = (e) => {
      const mouseX = (e.clientX - rect.left) * dpr;
      const mouseY = (e.clientY - rect.top) * dpr;

      const wasHovered = isHovered;
      isHovered =
        mouseX >= buttonX * dpr &&
        mouseX <= (buttonX + buttonWidth) * dpr &&
        mouseY >= buttonY * dpr &&
        mouseY <= (buttonY + buttonHeight) * dpr;

      // Only redraw if hover state changed
      if (wasHovered !== isHovered) {
        // Clear button area
        ctx.fillStyle = "rgba(0, 0, 0, 0.94)";
        ctx.fillRect(
          buttonX - 2,
          buttonY - 2,
          buttonWidth + 4,
          buttonHeight + 4
        );
        drawPixelButton(false, isHovered);
      }
    };

    // Handle mouse leave
    canvas.onmouseleave = () => {
      if (isHovered) {
        isHovered = false;
        // Clear button area
        ctx.fillStyle = "rgba(0, 0, 0, 0.94)";
        ctx.fillRect(
          buttonX - 2,
          buttonY - 2,
          buttonWidth + 4,
          buttonHeight + 4
        );
        drawPixelButton(false, false);
      }
    };

    // Handle click events with proper DPR scaling
    canvas.onclick = (e) => {
      const clickX = (e.clientX - rect.left) * dpr;
      const clickY = (e.clientY - rect.top) * dpr;

      if (
        clickX >= buttonX * dpr &&
        clickX <= (buttonX + buttonWidth) * dpr &&
        clickY >= buttonY * dpr &&
        clickY <= (buttonY + buttonHeight) * dpr
      ) {
        drawPixelButton(true, true);
        setTimeout(() => {
          canvas.onclick = null;
          canvas.onmousemove = null;
          canvas.onmouseleave = null;
          onRestart();
        }, 150);
      }
    };
  } catch (error) {
    // Fallback rendering if there are any issues
    console.error("Error rendering game over screen:", error);

    // Simple fallback display
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${isMobile ? 48 : 64}px sans-serif`;
    ctx.fillStyle = "#fff";
    ctx.fillText("GAME OVER", rect.width / 2, rect.height * 0.4);
    ctx.font = `${isMobile ? 24 : 32}px sans-serif`;
    ctx.fillText(`Score: ${score}`, rect.width / 2, rect.height * 0.5);

    // Simple restart button
    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonX = (rect.width - buttonWidth) / 2;
    const buttonY = rect.height * 0.6;

    ctx.fillStyle = "#333";
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = "#fff";
    ctx.font = "24px sans-serif";
    ctx.fillText("RESTART", rect.width / 2, buttonY + buttonHeight / 2);

    // Add click handler for fallback button
    canvas.onclick = (e) => {
      const clickX = (e.clientX - rect.left) * dpr;
      const clickY = (e.clientY - rect.top) * dpr;

      if (
        clickX >= buttonX * dpr &&
        clickX <= (buttonX + buttonWidth) * dpr &&
        clickY >= buttonY * dpr &&
        clickY <= (buttonY + buttonHeight) * dpr
      ) {
        setTimeout(onRestart, 150);
      }
    };
  }
}

function StartButton({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <button
        onClick={onStart}
        className="px-8 py-4 bg-green-500 text-black font-[Press_Start_2P] text-lg md:text-xl
                 border-4 border-green-700 rounded-lg hover:bg-green-400 active:bg-green-600
                 transition-colors shadow-lg hover:shadow-green-500/50"
      >
        START GAME
      </button>
    </div>
  );
}
