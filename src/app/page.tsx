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
    <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 grid grid-cols-3 gap-1 md:gap-2 md:hidden touch-none">
      <div className="w-12 h-12 md:w-16 md:h-16" /> {/* Empty space */}
      <button
        className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-lg active:bg-white/30 backdrop-blur-sm border-2 border-white/20"
        onClick={() => onDirectionChange("UP")}
        aria-label="Move Up"
      >
        <svg
          className="w-full h-full p-3 md:p-4 text-white"
          viewBox="0 0 24 24"
        >
          <path fill="currentColor" d="M12 4l-8 8h16z" />
        </svg>
      </button>
      <div className="w-12 h-12 md:w-16 md:h-16" /> {/* Empty space */}
      <button
        className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-lg active:bg-white/30 backdrop-blur-sm border-2 border-white/20"
        onClick={() => onDirectionChange("LEFT")}
        aria-label="Move Left"
      >
        <svg
          className="w-full h-full p-3 md:p-4 text-white"
          viewBox="0 0 24 24"
        >
          <path fill="currentColor" d="M4 12l8-8v16z" />
        </svg>
      </button>
      <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-lg border-2 border-white/10">
        <svg
          className="w-full h-full p-3 md:p-4 text-white/30"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      </div>
      <button
        className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-lg active:bg-white/30 backdrop-blur-sm border-2 border-white/20"
        onClick={() => onDirectionChange("RIGHT")}
        aria-label="Move Right"
      >
        <svg
          className="w-full h-full p-3 md:p-4 text-white"
          viewBox="0 0 24 24"
        >
          <path fill="currentColor" d="M20 12l-8-8v16z" />
        </svg>
      </button>
      <div className="w-12 h-12 md:w-16 md:h-16" /> {/* Empty space */}
      <button
        className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-lg active:bg-white/30 backdrop-blur-sm border-2 border-white/20"
        onClick={() => onDirectionChange("DOWN")}
        aria-label="Move Down"
      >
        <svg
          className="w-full h-full p-3 md:p-4 text-white"
          viewBox="0 0 24 24"
        >
          <path fill="currentColor" d="M12 20l8-8H4z" />
        </svg>
      </button>
    </div>
  );
}

function SplashScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-8 z-50 p-4">
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

function GameUI({
  score,
  level,
  highScore,
  isPixelMode,
  onTogglePixelMode,
}: {
  score: number;
  level: number;
  highScore: number;
  isPixelMode: boolean;
  onTogglePixelMode: () => void;
}) {
  return (
    <div className="w-full max-w-[min(100vw-2rem,400px)] px-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex flex-wrap justify-between flex-1 gap-2 md:gap-4 text-white font-[Press_Start_2P] text-[0.65rem] sm:text-xs md:text-sm">
          <span>Score: {score}</span>
          <span>Level: {level}</span>
          <span>High: {highScore}</span>
        </div>
        <button
          onClick={onTogglePixelMode}
          className="px-2 py-1 md:px-3 md:py-1.5 bg-gray-700 text-white text-[0.65rem] sm:text-xs rounded 
                   hover:bg-gray-600 transition-colors font-[Press_Start_2P]"
        >
          {isPixelMode ? "Normal" : "Pixel"}
        </button>
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-black">
      {!gameStarted && <SplashScreen onStart={() => setGameStarted(true)} />}
      {gameStarted && <Game />}
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
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
      type: Math.random() < GOLDEN_FOOD_CHANCE ? "golden" : "normal",
    } as Food;

    // Add timestamp for golden food
    if (newFood.type === "golden") {
      newFood.createdAt = Date.now();
    }

    // Ensure food doesn't spawn on snake
    return snake.some(
      (segment) => segment.x === newFood.x && segment.y === newFood.y
    )
      ? generateFood()
      : newFood;
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
    if (!isStarted || gameOver) return;

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
  }, [snake, direction, food, gameOver, isStarted, speed]);

  // Draw game
  useEffect(() => {
    if (!isStarted) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

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
          xPos,
          yPos,
          5,
          5,
          currentTheme.normalFood,
          `#${borderColor}`
        );
      } else {
        ctx.fillStyle = currentTheme.normalFood;
        ctx.fillRect(xPos, yPos, size, size);
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
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 overflow-hidden bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-[min(100vw-2rem,400px)] aspect-square mb-4 md:mb-8 relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full relative z-10 bg-black rounded-lg"
        />
        {!isStarted && <StartButton onStart={() => setIsStarted(true)} />}
      </div>
      <GameUI
        score={score}
        level={level}
        highScore={highScore}
        isPixelMode={isPixelMode}
        onTogglePixelMode={() => setIsPixelMode(!isPixelMode)}
      />
      <div className="mt-4 md:mt-8" /> {/* Spacer */}
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

  // Semi-transparent overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Game Over text
  ctx.font = isMobile ? "24px Press Start 2P" : "30px Press Start 2P";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);

  // Score text
  ctx.font = isMobile ? "16px Press Start 2P" : "20px Press Start 2P";
  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);

  // High Score text
  if (score === highScore && score > 0) {
    ctx.fillStyle = "#ffd700";
    ctx.fillText("New High Score!", canvas.width / 2, canvas.height / 2 + 40);
  }

  // Restart button
  const buttonWidth = isMobile ? canvas.width * 0.5 : 120; // Reduced by 40%
  const buttonHeight = isMobile ? 45 : 40; // Reduced by 40%
  const buttonX = (canvas.width - buttonWidth) / 2;
  const buttonY = canvas.height / 2 + (isMobile ? 60 : 80);

  // Button background
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

  // Button border
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 2;
  ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

  // Button text
  ctx.fillStyle = "#ffffff";
  ctx.font = isMobile ? "20px Press Start 2P" : "24px Press Start 2P"; // Increased text size
  ctx.fillText("RESTART", canvas.width / 2, buttonY + (isMobile ? 30 : 25));

  // Store button position for click handling
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (
      x >= buttonX &&
      x <= buttonX + buttonWidth &&
      y >= buttonY &&
      y <= buttonY + buttonHeight
    ) {
      // Add hover effect
      ctx.fillStyle = "#333333";
      ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Invert text color
      ctx.fillStyle = "#1a1a1a";
      ctx.fillText("RESTART", canvas.width / 2, buttonY + (isMobile ? 30 : 25));

      // Add glowing border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

      // Reset after a short delay
      setTimeout(() => {
        onRestart();
      }, 150);
    }
  };
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
