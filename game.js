/**
 * 2D Platformer Game Engine
 * Featuring smooth physics, coyote time, jump buffering, double jumps,
 * procedural Web Audio SFX, squash & stretch, particles, and parallax backgrounds.
 */

// Canvas & Display Configuration
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

canvas.width = VIEW_WIDTH * DPR;
canvas.height = VIEW_HEIGHT * DPR;
ctx.scale(DPR, DPR);

// UI Elements
const coinCounterEl = document.getElementById('coin-counter');
const scoreCounterEl = document.getElementById('score-counter');
const soundBtn = document.getElementById('sound-btn');
const restartBtn = document.getElementById('restart-btn');
const victoryModal = document.getElementById('victory-modal');
const finalStatsEl = document.getElementById('final-stats');
const playAgainBtn = document.getElementById('play-again-btn');

// --- Procedural Audio Engine (Web Audio API) ---
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playJump() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.15);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {
      // Audio error catch
    }
  }

  playDoubleJump() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.18);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.19);
    } catch (e) {}
  }

  playLand() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  playCoin() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      osc2.frequency.setValueAtTime(987.77 * 1.5, now);
      osc2.frequency.setValueAtTime(1318.51 * 1.5, now + 0.08);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    } catch (e) {}
  }

  playBounce() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.22);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch (e) {}
  }

  playVictory() {
    if (!this.enabled || !this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const start = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteStart = start + idx * 0.12;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.25, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.28);
      });
    } catch (e) {}
  }

  toggle() {
    this.enabled = !this.enabled;
    soundBtn.textContent = this.enabled ? '🔊 Sound: ON' : '🔈 Sound: OFF';
  }
}

const audio = new AudioEngine();

// --- Input Manager ---
class InputManager {
  constructor() {
    this.keys = {};
    this.jumpPressed = false;
    this.jumpJustPressed = false;

    window.addEventListener('keydown', (e) => {
      audio.init();
      if (['Space', 'ArrowUp', 'KeyW', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }

      if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !this.keys[e.code]) {
        this.jumpJustPressed = true;
      }

      this.keys[e.code] = true;

      if (e.code === 'KeyR') {
        game.reset();
      }
      if (e.code === 'KeyM') {
        audio.toggle();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  isLeft() {
    return this.keys['ArrowLeft'] || this.keys['KeyA'];
  }

  isRight() {
    return this.keys['ArrowRight'] || this.keys['KeyD'];
  }

  isJumpHeld() {
    return this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW'];
  }

  consumeJump() {
    if (this.jumpJustPressed) {
      this.jumpJustPressed = false;
      return true;
    }
    return false;
  }
}

const input = new InputManager();

// --- Particle System ---
class Particle {
  constructor(x, y, vx, vy, color, size, life, shape = 'circle') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.shape = shape;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.12; // gravity on particles
    this.vx *= 0.98;
    this.life--;
    this.rotation += this.rotSpeed;
    return this.life > 0;
  }

  draw(ctx, camera) {
    const alpha = Math.max(0, this.life / this.maxLife);
    const renderSize = this.size * (this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x - camera.x, this.y - camera.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;

    if (this.shape === 'star') {
      ctx.fillRect(-renderSize / 2, -renderSize / 2, renderSize, renderSize);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, renderSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  add(x, y, vx, vy, color, size, life, shape = 'circle') {
    this.particles.push(new Particle(x, y, vx, vy, color, size, life, shape));
  }

  burst(x, y, count, color, speed = 3, shape = 'circle') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.7) * speed;
      this.add(
        x,
        y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        color,
        2 + Math.random() * 3,
        20 + Math.random() * 20,
        shape
      );
    }
  }

  createDust(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 2;
      const vy = -Math.random() * 1.5;
      this.add(x, y, vx, vy, 'rgba(255, 255, 255, 0.7)', 2 + Math.random() * 2, 16);
    }
  }

  update() {
    this.particles = this.particles.filter((p) => p.update());
  }

  draw(ctx, camera) {
    for (const p of this.particles) {
      p.draw(ctx, camera);
    }
  }
}

// --- Player Character ---
class Player {
  constructor(x, y) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 36;
    this.vx = 0;
    this.vy = 0;

    // Movement tuning
    this.accel = 0.9;
    this.maxSpeed = 5.2;
    this.friction = 0.82;
    this.airFriction = 0.94;
    this.gravity = 0.48;
    this.jumpForce = -11.2;
    this.doubleJumpForce = -10.2;

    // Jumping mechanics
    this.onGround = false;
    this.wasOnGround = false;
    this.canDoubleJump = true;
    this.coyoteCounter = 0;
    this.coyoteMax = 8; // frames
    this.jumpBufferCounter = 0;
    this.jumpBufferMax = 8; // frames

    // Aesthetics & Squash/Stretch
    this.facing = 1; // 1: right, -1: left
    this.scaleX = 1;
    this.scaleY = 1;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.runCycle = 0;
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.canDoubleJump = true;
    this.scaleX = 1;
    this.scaleY = 1;
  }

  update(level, particles) {
    // Jump buffering
    if (input.consumeJump()) {
      this.jumpBufferCounter = this.jumpBufferMax;
    } else if (this.jumpBufferCounter > 0) {
      this.jumpBufferCounter--;
    }

    // Horizontal Movement
    if (input.isLeft()) {
      this.vx -= this.accel;
      this.facing = -1;
      this.runCycle += 0.2;
    } else if (input.isRight()) {
      this.vx += this.accel;
      this.facing = 1;
      this.runCycle += 0.2;
    } else {
      this.vx *= this.onGround ? this.friction : this.airFriction;
    }

    // Clamp horizontal speed
    this.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vx));
    if (Math.abs(this.vx) < 0.05) this.vx = 0;

    // Footstep particles when running on ground
    if (this.onGround && Math.abs(this.vx) > 1.5 && Math.random() < 0.3) {
      particles.add(
        this.x + this.width / 2 + (Math.random() - 0.5) * 8,
        this.y + this.height,
        -this.facing * (Math.random() * 1.5),
        -Math.random() * 1,
        'rgba(240, 240, 240, 0.6)',
        2,
        14
      );
    }

    // Coyote time tracking
    if (this.onGround) {
      this.coyoteCounter = this.coyoteMax;
      this.canDoubleJump = true;
    } else {
      if (this.coyoteCounter > 0) this.coyoteCounter--;
    }

    // Jump Execution
    if (this.jumpBufferCounter > 0) {
      if (this.coyoteCounter > 0) {
        // Normal Jump
        this.vy = this.jumpForce;
        this.coyoteCounter = 0;
        this.jumpBufferCounter = 0;
        this.onGround = false;
        this.scaleX = 0.72;
        this.scaleY = 1.35;
        audio.playJump();
        particles.createDust(this.x + this.width / 2, this.y + this.height, 8);
      } else if (this.canDoubleJump) {
        // Double Jump
        this.vy = this.doubleJumpForce;
        this.canDoubleJump = false;
        this.jumpBufferCounter = 0;
        this.scaleX = 0.8;
        this.scaleY = 1.25;
        audio.playDoubleJump();
        particles.burst(this.x + this.width / 2, this.y + this.height / 2, 12, '#38bdf8', 3);
      }
    }

    // Variable jump height: cut jump short if button released early
    if (!input.isJumpHeld() && this.vy < -3.5) {
      this.vy *= 0.55;
    }

    // Gravity
    this.vy += this.gravity;
    if (this.vy > 14) this.vy = 14; // terminal velocity

    // Apply squash and stretch decay
    this.scaleX += (1 - this.scaleX) * 0.15;
    this.scaleY += (1 - this.scaleY) * 0.15;

    // Movement & Collision (X axis first, then Y axis for precise AABB)
    this.x += this.vx;
    this.handleCollisionX(level.platforms);

    this.y += this.vy;
    this.wasOnGround = this.onGround;
    this.onGround = false;
    this.handleCollisionY(level.platforms, level.springs, particles);

    // Landing detection
    if (!this.wasOnGround && this.onGround) {
      this.scaleX = 1.35;
      this.scaleY = 0.65;
      audio.playLand();
      particles.createDust(this.x + this.width / 2, this.y + this.height, 7);
    }

    // Blinking animation
    this.blinkTimer++;
    if (this.blinkTimer > 180 + Math.random() * 100) {
      this.isBlinking = true;
      if (this.blinkTimer > 192) {
        this.isBlinking = false;
        this.blinkTimer = 0;
      }
    }

    // Respawn if fell off the level
    if (this.y > level.height + 200) {
      this.reset();
      particles.burst(this.x + this.width / 2, this.y + this.height / 2, 20, '#ef4444', 4);
    }
  }

  handleCollisionX(platforms) {
    for (const plat of platforms) {
      if (
        this.x < plat.x + plat.w &&
        this.x + this.width > plat.x &&
        this.y < plat.y + plat.h &&
        this.y + this.height > plat.y
      ) {
        if (this.vx > 0) {
          this.x = plat.x - this.width;
          this.vx = 0;
        } else if (this.vx < 0) {
          this.x = plat.x + plat.w;
          this.vx = 0;
        }
      }
    }
  }

  handleCollisionY(platforms, springs, particles) {
    // Check Spring Pads first
    if (springs) {
      for (const s of springs) {
        if (
          this.x + this.width * 0.7 > s.x &&
          this.x + this.width * 0.3 < s.x + s.w &&
          this.y + this.height >= s.y &&
          this.y + this.height <= s.y + s.h + 8 &&
          this.vy > 0
        ) {
          this.y = s.y - this.height;
          this.vy = -16.5; // mega spring bounce!
          this.canDoubleJump = true;
          this.scaleX = 0.6;
          this.scaleY = 1.45;
          s.compress = 10;
          audio.playBounce();
          particles.burst(s.x + s.w / 2, s.y, 14, '#e11d48', 4);
          return;
        }
      }
    }

    // Regular Platforms
    for (const plat of platforms) {
      if (
        this.x < plat.x + plat.w &&
        this.x + this.width > plat.x &&
        this.y < plat.y + plat.h &&
        this.y + this.height > plat.y
      ) {
        if (this.vy > 0) {
          this.y = plat.y - this.height;
          this.vy = 0;
          this.onGround = true;
        } else if (this.vy < 0) {
          this.y = plat.y + plat.h;
          this.vy = 0;
        }
      }
    }
  }

  draw(ctx, camera) {
    ctx.save();
    // Center transformation for squash & stretch
    const centerX = this.x + this.width / 2 - camera.x;
    const centerY = this.y + this.height - camera.y;

    // Shadow on ground below player
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 2, (this.width / 2) * this.scaleX, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(centerX, centerY);
    ctx.scale(this.scaleX, this.scaleY);

    // Body Gradient (Charming Blue/Cyan Blob Knight)
    const bodyGrad = ctx.createLinearGradient(0, -this.height, 0, 0);
    bodyGrad.addColorStop(0, '#38bdf8');
    bodyGrad.addColorStop(1, '#0284c7');

    ctx.fillStyle = bodyGrad;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
    ctx.shadowBlur = 10;

    // Rounded character body
    const rx = -this.width / 2;
    const ry = -this.height;
    const rw = this.width;
    const rh = this.height;
    const radius = 10;

    ctx.beginPath();
    ctx.moveTo(rx + radius, ry);
    ctx.lineTo(rx + rw - radius, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
    ctx.lineTo(rx + rw, ry + rh - radius);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
    ctx.lineTo(rx + radius, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
    ctx.lineTo(rx, ry + radius);
    ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
    ctx.closePath();
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Cute Knight Scarf / Antenna
    ctx.fillStyle = '#f43f5e';
    const scarfOffset = Math.sin(this.runCycle) * 3 * this.facing;
    ctx.fillRect(rx + 4, ry + 16, rw - 8, 5);
    ctx.beginPath();
    ctx.moveTo(rx + (this.facing > 0 ? 4 : rw - 4), ry + 18);
    ctx.lineTo(rx + (this.facing > 0 ? -6 : rw + 6) + scarfOffset, ry + 22);
    ctx.lineTo(rx + (this.facing > 0 ? 4 : rw - 4), ry + 21);
    ctx.fill();

    // Eyes
    if (!this.isBlinking) {
      const eyeOffsetX = this.facing * 4;
      const eyeY = ry + 12;

      // Eye whites
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeOffsetX - 4, eyeY, 4, 0, Math.PI * 2);
      ctx.arc(eyeOffsetX + 4, eyeY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Pupils (looking toward movement direction)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(eyeOffsetX - 4 + this.facing * 1.5, eyeY, 2, 0, Math.PI * 2);
      ctx.arc(eyeOffsetX + 4 + this.facing * 1.5, eyeY, 2, 0, Math.PI * 2);
      ctx.fill();

      // Eye catchlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeOffsetX - 5 + this.facing, eyeY - 1.2, 1, 0, Math.PI * 2);
      ctx.arc(eyeOffsetX + 3 + this.facing, eyeY - 1.2, 1, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Blinking lines
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const eyeOffsetX = this.facing * 4;
      const eyeY = ry + 12;
      ctx.moveTo(eyeOffsetX - 7, eyeY);
      ctx.lineTo(eyeOffsetX - 1, eyeY);
      ctx.moveTo(eyeOffsetX + 1, eyeY);
      ctx.lineTo(eyeOffsetX + 7, eyeY);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// --- Collectible Coin ---
class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.collected = false;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(player, particles) {
    if (this.collected) return false;
    this.phase += 0.06;

    // Check collision with player
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const currentY = this.y + Math.sin(this.phase) * 5;

    const dx = playerCenterX - this.x;
    const dy = playerCenterY - currentY;
    const dist = Math.hypot(dx, dy);

    if (dist < this.radius + player.width / 2) {
      this.collected = true;
      audio.playCoin();
      particles.burst(this.x, currentY, 16, '#facc15', 3.5, 'star');
      particles.burst(this.x, currentY, 8, '#ffffff', 2.5);
      return true;
    }
    return false;
  }

  draw(ctx, camera) {
    if (this.collected) return;
    const currentY = this.y + Math.sin(this.phase) * 5 - camera.y;
    const currentX = this.x - camera.x;

    // 3D spinning ellipse simulation
    const spinWidth = Math.cos(this.phase * 1.5) * this.radius;

    ctx.save();
    ctx.translate(currentX, currentY);

    // Glowing aura
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 12;

    // Outer coin
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(1, Math.abs(spinWidth)), this.radius, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner rim
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(0.5, Math.abs(spinWidth * 0.7)), this.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// --- Spring Pad ---
class Spring {
  constructor(x, y, w = 36, h = 14) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.compress = 0;
  }

  update() {
    if (this.compress > 0) {
      this.compress *= 0.8;
      if (this.compress < 0.1) this.compress = 0;
    }
  }

  draw(ctx, camera) {
    const rx = this.x - camera.x;
    const ry = this.y - camera.y + this.compress;
    const rh = this.h - this.compress;

    ctx.save();
    // Base plate
    ctx.fillStyle = '#475569';
    ctx.fillRect(rx - 2, ry + rh - 4, this.w + 4, 4);

    // Red spring cap
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(rx, ry, this.w, 6, 3) : ctx.fillRect(rx, ry, this.w, 6);
    ctx.fill();

    // Spring coils
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rx + 6, ry + 6);
    ctx.lineTo(rx + this.w - 6, ry + rh - 4);
    ctx.stroke();

    ctx.restore();
  }
}

// --- Level Definition ---
class Level {
  constructor() {
    this.width = 2500;
    this.height = 700;
    this.platforms = [];
    this.coins = [];
    this.springs = [];
    this.clouds = [];
    this.totalCoins = 0;
    this.build();
  }

  build() {
    // Ground platforms
    this.platforms = [
      // Starting ground
      { x: 0, y: 500, w: 600, h: 200, type: 'grass' },
      // First island steps
      { x: 680, y: 440, w: 160, h: 30, type: 'stone' },
      { x: 920, y: 360, w: 180, h: 30, type: 'stone' },
      // High lookout
      { x: 1180, y: 260, w: 220, h: 30, type: 'grass' },
      // Spring plateau
      { x: 1480, y: 380, w: 160, h: 30, type: 'stone' },
      // Sky island (reached via spring)
      { x: 1420, y: 140, w: 320, h: 30, type: 'grass' },
      // Stepping stones descent
      { x: 1820, y: 240, w: 140, h: 30, type: 'stone' },
      { x: 2040, y: 340, w: 140, h: 30, type: 'stone' },
      // Final victory plateau
      { x: 2240, y: 450, w: 260, h: 250, type: 'grass' },
      // Lower rescue platform
      { x: 1200, y: 560, w: 600, h: 40, type: 'stone' }
    ];

    // Springs
    this.springs = [
      new Spring(1540, 366, 36, 14) // Launches player to sky island!
    ];

    // Golden Coins
    const coinPositions = [
      { x: 200, y: 440 },
      { x: 300, y: 410 },
      { x: 400, y: 440 },
      { x: 760, y: 380 },
      { x: 1010, y: 300 },
      { x: 1250, y: 200 },
      { x: 1330, y: 200 },
      // Sky island treasure trove!
      { x: 1480, y: 80 },
      { x: 1540, y: 60 },
      { x: 1600, y: 60 },
      { x: 1660, y: 80 },
      // Lower path & steps
      { x: 1450, y: 510 },
      { x: 1550, y: 510 },
      { x: 1890, y: 180 },
      { x: 2110, y: 280 },
      { x: 2320, y: 390 },
      { x: 2400, y: 390 }
    ];

    this.coins = coinPositions.map((pos) => new Coin(pos.x, pos.y));
    this.totalCoins = this.coins.length;

    // Decorative drifting clouds
    for (let i = 0; i < 16; i++) {
      this.clouds.push({
        x: Math.random() * this.width,
        y: 40 + Math.random() * 220,
        w: 80 + Math.random() * 120,
        speed: 0.15 + Math.random() * 0.3
      });
    }
  }

  update(player, particles) {
    // Springs
    for (const s of this.springs) {
      s.update();
    }

    // Clouds drifting
    for (const c of this.clouds) {
      c.x += c.speed;
      if (c.x > this.width + 100) c.x = -150;
    }

    // Coins
    let collectedCount = 0;
    for (const coin of this.coins) {
      if (coin.update(player, particles)) {
        game.addScore(100);
      }
      if (coin.collected) collectedCount++;
    }
    return collectedCount;
  }

  drawBackground(ctx, camera) {
    // Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    skyGrad.addColorStop(0, '#38bdf8');
    skyGrad.addColorStop(0.65, '#bae6fd');
    skyGrad.addColorStop(1, '#f0f9ff');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Distant Parallax Hills (Factor 0.12)
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath();
    ctx.moveTo(0, VIEW_HEIGHT);
    const hillOffset1 = camera.x * 0.12;
    for (let x = 0; x <= VIEW_WIDTH; x += 60) {
      const worldX = x + hillOffset1;
      const y = 340 + Math.sin(worldX * 0.003) * 70 + Math.cos(worldX * 0.008) * 35;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fill();

    // Midground Parallax Hills (Factor 0.28)
    ctx.fillStyle = '#6ee7b7';
    ctx.beginPath();
    ctx.moveTo(0, VIEW_HEIGHT);
    const hillOffset2 = camera.x * 0.28;
    for (let x = 0; x <= VIEW_WIDTH; x += 40) {
      const worldX = x + hillOffset2;
      const y = 410 + Math.sin(worldX * 0.005) * 50 + Math.sin(worldX * 0.012) * 20;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fill();

    // Floating Clouds (Parallax Factor 0.35)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    for (const c of this.clouds) {
      const renderX = c.x - camera.x * 0.35;
      if (renderX + c.w > -50 && renderX < VIEW_WIDTH + 50) {
        ctx.beginPath();
        ctx.ellipse(renderX, c.y, c.w / 2, 22, 0, 0, Math.PI * 2);
        ctx.ellipse(renderX - c.w * 0.2, c.y + 2, c.w * 0.35, 18, 0, 0, Math.PI * 2);
        ctx.ellipse(renderX + c.w * 0.2, c.y + 2, c.w * 0.35, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawPlatforms(ctx, camera) {
    for (const plat of this.platforms) {
      const rx = plat.x - camera.x;
      const ry = plat.y - camera.y;

      // Frustum culling
      if (rx + plat.w < -100 || rx > VIEW_WIDTH + 100) continue;

      if (plat.type === 'grass') {
        // Platform Body (Earthy Rock)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(rx, ry + 10, plat.w, plat.h - 10);

        // Lush Grass Top
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(rx, ry, plat.w, 12);

        // Stylized grass drips / edge blades
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(rx, ry + 10, plat.w, 3);
        for (let i = 8; i < plat.w - 12; i += 22) {
          ctx.beginPath();
          ctx.moveTo(rx + i, ry + 12);
          ctx.lineTo(rx + i + 5, ry + 18);
          ctx.lineTo(rx + i + 10, ry + 12);
          ctx.fill();
        }
      } else {
        // Modern Smooth Stone Platform
        ctx.fillStyle = '#334155';
        ctx.fillRect(rx, ry, plat.w, plat.h);

        // Stone highlight
        ctx.fillStyle = '#475569';
        ctx.fillRect(rx, ry, plat.w, 4);

        // Rivets/details
        ctx.fillStyle = '#64748b';
        ctx.fillRect(rx + 6, ry + 8, plat.w - 12, 2);
      }
    }

    // Springs
    for (const s of this.springs) {
      s.draw(ctx, camera);
    }

    // Coins
    for (const coin of this.coins) {
      coin.draw(ctx, camera);
    }
  }
}

// --- Smooth Camera ---
class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.leadX = 0;
  }

  update(player, level) {
    // Camera lead ahead of moving player for cinematic feel
    const targetLead = player.facing * Math.min(Math.abs(player.vx) * 16, 70);
    this.leadX += (targetLead - this.leadX) * 0.05;

    // Target center
    this.targetX = player.x + player.width / 2 - VIEW_WIDTH / 2 + this.leadX;
    this.targetY = player.y + player.height / 2 - VIEW_HEIGHT / 2 - 20;

    // Smooth Lerp damping
    this.x += (this.targetX - this.x) * 0.08;
    this.y += (this.targetY - this.y) * 0.08;

    // Clamp camera within level bounds
    this.x = Math.max(0, Math.min(level.width - VIEW_WIDTH, this.x));
    this.y = Math.max(-100, Math.min(level.height - VIEW_HEIGHT, this.y));
  }
}

// --- Main Game Controller ---
class Game {
  constructor() {
    this.level = new Level();
    this.player = new Player(80, 420);
    this.camera = new Camera();
    this.particles = new ParticleSystem();

    this.score = 0;
    this.collectedCoins = 0;
    this.won = false;
    this.startTime = Date.now();

    this.initUI();
    this.updateHUD();
  }

  initUI() {
    soundBtn.addEventListener('click', () => {
      audio.init();
      audio.toggle();
    });

    restartBtn.addEventListener('click', () => {
      audio.init();
      this.reset();
    });

    playAgainBtn.addEventListener('click', () => {
      audio.init();
      victoryModal.classList.add('hidden');
      this.reset();
    });
  }

  reset() {
    this.level = new Level();
    this.player.reset();
    this.score = 0;
    this.collectedCoins = 0;
    this.won = false;
    this.startTime = Date.now();
    this.updateHUD();
    victoryModal.classList.add('hidden');
  }

  addScore(pts) {
    this.score += pts;
    this.updateHUD();
  }

  updateHUD() {
    coinCounterEl.textContent = `${this.collectedCoins} / ${this.level.totalCoins}`;
    scoreCounterEl.textContent = this.score;
  }

  update() {
    this.player.update(this.level, this.particles);
    this.collectedCoins = this.level.update(this.player, this.particles);
    this.camera.update(this.player, this.level);
    this.particles.update();
    this.updateHUD();

    // Check Victory
    if (!this.won && this.collectedCoins >= this.level.totalCoins) {
      this.won = true;
      audio.playVictory();
      const timeSpent = ((Date.now() - this.startTime) / 1000).toFixed(1);
      finalStatsEl.textContent = `Score: ${this.score} pts • Time: ${timeSpent}s`;
      victoryModal.classList.remove('hidden');

      // Celebration burst of fireworks particles
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          this.particles.burst(
            this.player.x + (Math.random() - 0.5) * 100,
            this.player.y - 40 + (Math.random() - 0.5) * 80,
            24,
            ['#facc15', '#38bdf8', '#f43f5e', '#a855f7'][i % 4],
            5,
            'star'
          );
        }, i * 200);
      }
    }
  }

  draw() {
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // 1. Parallax background
    this.level.drawBackground(ctx, this.camera);

    // 2. Platforms & springs & coins
    this.level.drawPlatforms(ctx, this.camera);

    // 3. Player
    this.player.draw(ctx, this.camera);

    // 4. Particles
    this.particles.draw(ctx, this.camera);
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }

  start() {
    this.loop();
  }
}

// Launch Game
const game = new Game();
game.start();
