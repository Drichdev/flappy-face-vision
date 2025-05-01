# Flappy Face Vision

A demo game that combines a classic Flappy Bird–style gameplay with real-time face-landmark AI. The player “flaps” the bird by opening their mouth: the wider the jaw opens, the more flap impulses are sent (up to 4 per frame).

Game link: [Flappy face vision]()

## Technologies

- **HTML5** & **CSS3** — page structure & styling  
- **JavaScript (ES Modules)** — game logic & AI integration  
- **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`) — real-time face landmark detection in the browser via WebAssembly & GPU delegate  
- **Canvas API** — rendering game graphics and face-mask overlay  

---

## Setup

1. Clone or download this repository.  
2. Ensure you have an internet connection (to load MediaPipe via CDN).  
3. Open `index.html` in a modern browser (Chrome, Firefox, Edge).  

---

## Usage

1. Click **“Commencer”** to start the game.  
2. Click **“Activer Webcam”** and grant camera permission.  
3. Position your face so the white mask grid (tesselation) aligns.  
4. Open your mouth to make the bird flap. The wider you open, the more flaps (up to 6) per animation frame.  
5. Navigate the bird through the pipes. When you collide or hit top/bottom, the game ends.  
6. Click **“Réessayer”** to restart.


## How It Works

1. **MediaPipe Initialization**  
   - Loads the FaceLandmarker WASM model via CDN.  
   - Configures `outputFaceBlendshapes: true` and `runningMode: "VIDEO"`.

2. **Webcam Stream & Overlay**  
   - Captures live video.  
   - Draws facial landmark tesselation on a transparent canvas (`faceMask`) atop the video.

3. **Jaw-Open Detection**  
   - From `faceBlendshapes[0].categories`, extracts the `jawOpen` score (0.0–1.0).  
   - Maps that score to an integer 0–6 (“flaps”) each frame.

4. **Game Loop**  
   - Every animation frame, applies gravity, moves pipes, detects collisions.  
   - Before physics, calls `flap()` as many times as determined by jaw-open.  
   - Renders bird, pipes, score, and time on the game canvas.

---

## AI Components

- **FaceLandmarker**  
  - Part of MediaPipe Tasks Vision (v0.10.3).  
  - Provides both 468 3D face landmarks and high-level face blendshape scores (including `jawOpen`).  
- **FilesetResolver**  
  - Dynamically loads the WebAssembly binaries.  
- **DrawingUtils**  
  - Renders connector meshes (white grid) for visual feedback.
