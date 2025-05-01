import { FaceLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

// Éléments UI
const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const playButton = document.getElementById("playButton");
const transitionTop = document.getElementById("transitionTop");
const transitionBottom = document.getElementById("transitionBottom");
const gameOverScreen = document.getElementById("gameOverScreen");
const retryButton = document.getElementById("retryButton");
const timerDisplay = document.getElementById("timer");
const scoreDisplay = document.getElementById("scoreDisplay");
const finalStats = document.getElementById("finalStats");

// Variables du jeu
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 880;
canvas.height = 640;

const GRAVITY = 0.5;
const FLAP = -9;
const PIPE_WIDTH = 60;
const MAX_GAP = 160;
const MIN_GAP = 80;
const BIRD_RADIUS = 12;

let birdY, birdVY, pipes, score, gameOver;
let pipeGap = MAX_GAP;
let gameStartTime = 0;
let gameTimerInterval;

// Variables de détection faciale
let faceLandmarker;
let webcamRunning = false;
let lastVideoTime = -1;
let jawOpenValue = 0;
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");

// Initialisation de la détection faciale
async function setupFaceDetection() {
  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU"
    },
    outputFaceBlendshapes: true,
    runningMode: "VIDEO",
    numFaces: 1
  });
}

// Activation de la webcam
async function enableCam() {
  if (!faceLandmarker) {
    alert("Modèle de détection faciale non chargé");
    return;
  }

  webcamRunning = true;
  
  const constraints = {
    video: { width: 1280, height: 720 }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  } catch (err) {
    console.error("Erreur d'accès à la webcam:", err);
  }
}

// Prédiction des mouvements faciaux
async function predictWebcam() {
  if (!webcamRunning) return;

  const radio = video.videoHeight / video.videoWidth;
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    const results = faceLandmarker.detectForVideo(video, startTimeMs);
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const drawingUtils = new DrawingUtils(canvasCtx);
    
    if (results.faceLandmarks) {
      for (const landmarks of results.faceLandmarks) {
        // Dessiner la grille blanche
        canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        canvasCtx.lineWidth = 1;
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_TESSELATION,
          { color: '#FFFFFF', lineWidth: 1 }
        );
        
        if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
          const jawOpen = results.faceBlendshapes[0].categories.find(
            shape => shape.categoryName === "jawOpen"
          );
          
          if (jawOpen) {
            jawOpenValue = jawOpen.score;
            document.getElementById("jawValue").textContent = 
              `Ouverture: ${Math.round(jawOpenValue * 100)}%`;
            
            if (!gameOver && jawOpenValue > 0.1) {
              birdVY = FLAP * jawOpenValue * 4; // Sensibilité à 4
            }
          }
        }
      }
    }
    canvasCtx.restore();
  }

  requestAnimationFrame(predictWebcam);
}

// Fonctions du jeu
function resetGame() {
  birdY = canvas.height / 2;
  birdVY = 0;
  pipes = [];
  score = 0;
  pipeGap = MAX_GAP;
  gameOver = false;
  gameStartTime = Date.now();
  gameOverScreen.classList.add("hidden");

  // Mettre à jour l'affichage
  scoreDisplay.textContent = `Score: 0`;
  updateTimer();

  // Démarrer le timer
  clearInterval(gameTimerInterval);
  gameTimerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  const seconds = Math.floor((Date.now() - gameStartTime) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function flap() {
  birdVY = FLAP;
}

function drawBird() {
  ctx.beginPath();
  ctx.fillStyle = "#00ff88";
  ctx.arc(80, birdY, BIRD_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

function drawPipes() {
  ctx.fillStyle = "#00aa55";
  pipes.forEach(pipe => {
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.top);
    ctx.fillRect(pipe.x, pipe.top + pipeGap, PIPE_WIDTH, canvas.height - pipe.top - pipeGap);
  });
}

function update() {
  birdVY += GRAVITY;
  birdY += birdVY;

  if (birdY + BIRD_RADIUS > canvas.height || birdY - BIRD_RADIUS < 0) {
    endGame();
  }

  pipes.forEach(pipe => {
    pipe.x -= 2;

    if (pipe.x + PIPE_WIDTH === 80) {
      score++;
      scoreDisplay.textContent = `Score: ${score}`;
    }

    if (
      80 + BIRD_RADIUS > pipe.x &&
      80 - BIRD_RADIUS < pipe.x + PIPE_WIDTH &&
      (birdY - BIRD_RADIUS < pipe.top || birdY + BIRD_RADIUS > pipe.top + pipeGap)
    ) {
      endGame();
    }
  });

  if (pipes.length === 0 || pipes[pipes.length - 1].x < 240) {
    const top = Math.random() * (canvas.height - pipeGap - 100) + 20;
    pipes.push({ x: canvas.width, top });
  }

  pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);
}

function endGame() {
  gameOver = true;
  clearInterval(gameTimerInterval);
  
  const totalTime = Math.floor((Date.now() - gameStartTime) / 1000);
  const minutes = Math.floor(totalTime / 60);
  const seconds = totalTime % 60;
  
  finalStats.innerHTML = `
    <div>Score: ${score}</div>
    <div>Temps: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</div>
  `;
  
  gameOverScreen.classList.remove("hidden");
}

function gameLoop() {
  if (!gameOver) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    update();
    drawPipes();
    drawBird();
    requestAnimationFrame(gameLoop);
  }
}

function startGame() {
  transitionTop.style.height = "50vh";
  transitionBottom.style.height = "50vh";
  
  setTimeout(() => {
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    
    setTimeout(() => {
      transitionTop.style.height = "0";
      transitionBottom.style.height = "0";
    }, 500);
    
    // Démarrer le jeu
    enableCam();
    resetGame();
    gameLoop();
  }, 800);
}

// Initialisation
document.addEventListener("DOMContentLoaded", async () => {
  await setupFaceDetection();
  
  playButton.addEventListener("click", startGame);
  retryButton.addEventListener("click", () => {
    gameOverScreen.classList.add("hidden");
    resetGame();
    gameLoop();
  });
});