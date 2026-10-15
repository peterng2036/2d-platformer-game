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

  playSwing() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * 0.14);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.12);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);
    } catch (e) {}
  }

  playHit() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
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
      if (e.target && e.target.tagName === 'INPUT') return;
      audio.init();
      if (['Space', 'ArrowUp', 'KeyW', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }

      if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !this.keys[e.code]) {
        this.jumpJustPressed = true;
      }

      if ((e.code === 'KeyF' || e.code === 'KeyJ') && !this.keys[e.code]) {
        this.attackJustPressed = true;
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

  consumeAttack() {
    if (this.attackJustPressed) {
      this.attackJustPressed = false;
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

    // Combat
    this.maxHp = 3;
    this.hp = this.maxHp;
    this.dead = false;
    this.respawnTimer = 0;
    this.invuln = 0; // frames of invulnerability after a hit / respawn
    this.attackDuration = 12; // frames the slash animation lasts
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.hitSet = new Set(); // remote players already hit by the current swing
    this.cloak = null; // optional cloak color (used to tell online players apart)
  }

  /** Is the slash currently able to hurt someone? (middle of the swing) */
  isAttackActive() {
    return !this.dead && this.attackTimer > 1 && this.attackTimer <= this.attackDuration - 3;
  }

  /**
   * Take one point of damage. Returns 'dead' if this killed us, 'hit' if we
   * survived, or null if the hit was ignored (invulnerable / already dead).
   */
  takeHit(dir, particles) {
    if (this.dead || this.invuln > 0) return null;
    this.hp = Math.max(0, this.hp - 1);
    this.invuln = 70;
    this.vx = dir * 7;
    this.vy = -6;
    this.onGround = false;
    this.scaleX = 0.8;
    this.scaleY = 1.2;
    audio.playHit();
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    particles.burst(cx, cy, 14, '#8f2b2b', 4);
    if (this.hp <= 0) {
      this.dead = true;
      this.respawnTimer = 180; // 3 seconds
      this.attackTimer = 0;
      particles.burst(cx, cy, 30, '#6e1f1f', 5);
      return 'dead';
    }
    return 'hit';
  }

  reset(full = true) {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.canDoubleJump = true;
    this.scaleX = 1;
    this.scaleY = 1;
    if (full) {
      this.hp = this.maxHp;
      this.dead = false;
      this.respawnTimer = 0;
      this.invuln = 0;
      this.attackTimer = 0;
      this.attackCooldown = 0;
    }
  }

  update(level, particles) {
    // Combat timers
    if (this.attackTimer > 0) this.attackTimer--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.invuln > 0) this.invuln--;

    // Defeated: sit out, then respawn with full health
    if (this.dead) {
      input.consumeJump();
      input.consumeAttack();
      this.respawnTimer--;
      if (this.respawnTimer <= 0) {
        this.reset(true);
        this.invuln = 90;
        particles.burst(this.x + this.width / 2, this.y + this.height / 2, 16, '#c9d3df', 3);
      }
      return;
    }

    // Start a new swing
    if (input.consumeAttack() && this.attackCooldown <= 0) {
      this.attackTimer = this.attackDuration;
      this.attackCooldown = 28;
      this.hitSet.clear();
      audio.playSwing();
    }

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
        particles.burst(this.x + this.width / 2, this.y + this.height / 2, 12, '#c9d3df', 3);
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
      this.reset(false);
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
    if (this.dead) return;
    ctx.save();
    // Flicker while invulnerable after being hit
    if (this.invuln > 0 && Math.floor(this.invuln / 4) % 2 === 0) ctx.globalAlpha = 0.4;
    // Origin = feet center (hitbox is wider than the visible figure)
    const centerX = this.x + this.width / 2 - camera.x;
    const centerY = this.y + this.height - camera.y;

    // Soft contact shadow on the ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 2, 11 * this.scaleX, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(centerX, centerY);
    ctx.scale(this.scaleX * this.facing, this.scaleY);

    const moving = this.onGround && Math.abs(this.vx) > 0.6;
    const swing = moving ? Math.sin(this.runCycle * 1.6) : 0;
    const airborne = !this.onGround;
    const rise = airborne ? Math.max(-1, Math.min(1, this.vy / 10)) : 0; // -1 rising ... 1 falling
    const bob = moving ? Math.abs(Math.sin(this.runCycle * 1.6)) * -1.5 : 0;

    // --- Cloak tail (behind the body), trails opposite to movement ---
    const trail = airborne ? 6 + rise * 5 : 3 + Math.abs(this.vx) * 1.4;
    const flutter = Math.sin(this.runCycle * 1.2 + 1) * 1.5;
    ctx.fillStyle = this.cloak || '#2b2f36';
    ctx.beginPath();
    ctx.moveTo(-3, -27 + bob);
    ctx.quadraticCurveTo(-8 - trail, -18 + flutter, -9 - trail * 1.3, -6 + flutter + (airborne ? -rise * 6 : 0));
    ctx.lineTo(-3, -9 + bob);
    ctx.closePath();
    ctx.fill();

    // --- Back leg ---
    const legBack = airborne ? -2 - rise * 2 : -swing * 5;
    ctx.strokeStyle = '#15171b';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1.5, -12 + bob);
    ctx.lineTo(-1.5 + legBack, airborne ? -4 : -1);
    ctx.stroke();

    // --- Torso (coat) with fabric shading ---
    const coat = ctx.createLinearGradient(-7, 0, 7, 0);
    coat.addColorStop(0, '#2c3038');
    coat.addColorStop(0.55, '#454b57');
    coat.addColorStop(1, '#262a31');
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-6, -26 + bob);
    ctx.quadraticCurveTo(0, -29 + bob, 6, -26 + bob);
    ctx.lineTo(7, -11 + bob);
    ctx.lineTo(-7, -11 + bob);
    ctx.closePath();
    ctx.fill();

    // Belt and strap
    ctx.fillStyle = '#6b5232';
    ctx.fillRect(-7, -16 + bob, 14, 2.2);
    ctx.fillStyle = '#9a8a5a';
    ctx.fillRect(-1, -16.3 + bob, 2.4, 2.8);
    ctx.strokeStyle = '#4a3a24';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-5, -25 + bob);
    ctx.lineTo(5, -13 + bob);
    ctx.stroke();

    // --- Front leg ---
    const legFront = airborne ? 3 + rise * 3 : swing * 5;
    ctx.strokeStyle = '#1c1f25';
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.moveTo(1.5, -12 + bob);
    ctx.lineTo(1.5 + legFront, airborne ? -5 + rise * -1 : -1);
    ctx.stroke();

    // Boots
    ctx.fillStyle = '#0f1013';
    ctx.fillRect(-1.5 + legBack - 3, airborne ? -6 : -3, 5.5, 3);
    ctx.fillRect(1.5 + legFront - 2.5, airborne ? -7 + rise * -1 : -3, 6, 3);

    // --- Arm (front), swings opposite to the front leg ---
    const armAng = airborne ? -0.9 - rise * 0.5 : -swing * 0.7;
    ctx.save();
    ctx.translate(2, -24 + bob);
    ctx.rotate(armAng);
    ctx.strokeStyle = '#3a3f4a';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1, 9);
    ctx.stroke();
    ctx.fillStyle = '#b08a6a';
    ctx.beginPath();
    ctx.arc(1.2, 10, 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- Hood / head ---
    const hood = ctx.createRadialGradient(1, -33 + bob, 1, 0, -31 + bob, 9);
    hood.addColorStop(0, '#4a505c');
    hood.addColorStop(1, '#23262d');
    ctx.fillStyle = hood;
    ctx.beginPath();
    ctx.moveTo(-7, -25 + bob);
    ctx.quadraticCurveTo(-8, -37 + bob, 0, -37 + bob);
    ctx.quadraticCurveTo(8, -37 + bob, 7, -25 + bob);
    ctx.quadraticCurveTo(0, -23 + bob, -7, -25 + bob);
    ctx.closePath();
    ctx.fill();

    // Face opening in deep shadow
    ctx.fillStyle = '#0b0c0f';
    ctx.beginPath();
    ctx.ellipse(2.8, -30 + bob, 3.8, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes: tiny, pale glints (blink = thin line)
    if (!this.isBlinking) {
      ctx.fillStyle = '#e8e2cf';
      ctx.fillRect(2.2, -31.2 + bob, 1.6, 1.3);
      ctx.fillRect(4.4, -31.2 + bob, 1.4, 1.3);
    } else {
      ctx.fillStyle = '#e8e2cf';
      ctx.fillRect(2.2, -30.8 + bob, 3.6, 0.5);
    }

    // Warm rim light on the hood edge from the sunset
    ctx.strokeStyle = 'rgba(255, 190, 130, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(1, -36.5 + bob);
    ctx.quadraticCurveTo(7, -36 + bob, 7, -26 + bob);
    ctx.stroke();

    // --- Attack slash: a bright crescent sweeping in front of the player ---
    if (this.attackTimer > 0) {
      const t = 1 - this.attackTimer / this.attackDuration; // 0 -> 1
      const alpha = Math.sin(Math.PI * Math.min(1, t * 1.15));
      const sweep = -1.3 + t * 2.3;
      ctx.save();
      ctx.translate(5, -17);
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(235, 238, 245, ${0.85 * alpha})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, 25, sweep - 0.9, sweep);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 210, 150, ${0.5 * alpha})`;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, 0, 24, sweep - 0.6, sweep);
      ctx.stroke();
      ctx.restore();
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
    if (player.dead) return false;

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

    // Spinning coin: horizontal radius shrinks as it turns edge-on
    const spin = Math.cos(this.phase * 1.5);
    const rw = Math.max(1.5, Math.abs(spin) * this.radius);
    const rh = this.radius;

    ctx.save();
    ctx.translate(currentX, currentY);

    // Soft warm glow (subtle)
    const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius * 2.2);
    aura.addColorStop(0, 'rgba(255, 200, 90, 0.25)');
    aura.addColorStop(1, 'rgba(255, 200, 90, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(-this.radius * 2.2, -this.radius * 2.2, this.radius * 4.4, this.radius * 4.4);

    // Coin face: brushed-gold gradient, brighter on one side to read as metal
    const g = ctx.createLinearGradient(-rw, -rh, rw, rh);
    g.addColorStop(0, '#f1d98a');
    g.addColorStop(0.45, '#b98a2c');
    g.addColorStop(1, '#6b4a14');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark outer edge
    ctx.strokeStyle = '#4a3410';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Inner embossed ring + highlight, only visible when facing the camera
    if (rw > 4) {
      ctx.strokeStyle = 'rgba(70, 48, 12, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, rw * 0.68, rh * 0.68, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 240, 190, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-0.5, -0.5, rw * 0.68, rh * 0.68, 0, Math.PI * 1.05, Math.PI * 1.65);
      ctx.stroke();
    }

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
    // Base plate (dark steel)
    const baseG = ctx.createLinearGradient(0, ry + rh - 5, 0, ry + rh);
    baseG.addColorStop(0, '#59616b');
    baseG.addColorStop(1, '#23272d');
    ctx.fillStyle = baseG;
    ctx.fillRect(rx - 2, ry + rh - 5, this.w + 4, 5);

    // Steel coil: alternating dark/light strokes with a metallic sheen
    const coils = 4;
    const coilH = Math.max(1, (rh - 9) / coils);
    for (let i = 0; i < coils; i++) {
      const cy = ry + 6 + i * coilH;
      ctx.strokeStyle = '#1a1d22';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(rx + 5, cy + coilH);
      ctx.lineTo(rx + this.w - 5, cy);
      ctx.stroke();
      ctx.strokeStyle = '#9aa4af';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(rx + 5, cy + coilH - 1);
      ctx.lineTo(rx + this.w - 5, cy - 1);
      ctx.stroke();
    }

    // Top plate with brushed-metal gradient and a worn orange hazard edge
    const capG = ctx.createLinearGradient(0, ry, 0, ry + 6);
    capG.addColorStop(0, '#8b949e');
    capG.addColorStop(1, '#3b4047');
    ctx.fillStyle = capG;
    ctx.fillRect(rx - 1, ry, this.w + 2, 6);
    ctx.fillStyle = '#a4552b';
    ctx.fillRect(rx - 1, ry + 4, this.w + 2, 2);

    ctx.restore();
  }
}

// --- Procedural Textures (generated once) ---
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeNoisePattern(size, baseRGB, variance, seed, blotches = 0) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const rnd = seededRandom(seed);
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = (rnd() - 0.5) * variance;
    img.data[i * 4] = Math.max(0, Math.min(255, baseRGB[0] + v));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, baseRGB[1] + v));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, baseRGB[2] + v));
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // Large soft blotches break up the repetition so it reads as natural stone
  for (let i = 0; i < blotches; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 8 + rnd() * 26;
    const dark = rnd() > 0.5;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, dark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.10)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return ctx.createPattern(c, 'repeat');
}

const TEX = {
  rock: makeNoisePattern(128, [88, 90, 96], 44, 11, 18),
  earth: makeNoisePattern(128, [78, 62, 48], 40, 29, 18),
  grain: makeNoisePattern(128, [128, 128, 128], 255, 7, 0)
};

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

    // Night sky stars
    this.stars = [];
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: Math.random() * (VIEW_WIDTH + 100),
        y: Math.random() * 260,
        r: Math.random() < 0.15 ? 1.6 : 1,
        a: 0.2 + Math.random() * 0.5
      });
    }
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
    this.coins.forEach((coin, idx) => {
      if (coin.update(player, particles)) {
        game.addScore(100);
        net.sendCoin(idx);
      }
      if (coin.collected) collectedCount++;
    });
    return collectedCount;
  }

  drawBackground(ctx, camera) {
    // Dusk sky: deep blue-grey fading to a muted amber horizon
    const skyGrad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    skyGrad.addColorStop(0, '#0b1220');
    skyGrad.addColorStop(0.35, '#1c2a3f');
    skyGrad.addColorStop(0.65, '#4a5568');
    skyGrad.addColorStop(0.85, '#a1805e');
    skyGrad.addColorStop(1, '#c79a6b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Faint stars in the upper sky
    for (const s of this.stars) {
      ctx.fillStyle = `rgba(230, 235, 245, ${s.a})`;
      ctx.fillRect(s.x - camera.x * 0.02, s.y, s.r, s.r);
    }

    // Low sun glow near the horizon (soft, not a cartoon disc)
    const sunX = 700 - camera.x * 0.05;
    const glow = ctx.createRadialGradient(sunX, 400, 5, sunX, 400, 330);
    glow.addColorStop(0, 'rgba(255, 190, 120, 0.55)');
    glow.addColorStop(0.4, 'rgba(210, 130, 80, 0.2)');
    glow.addColorStop(1, 'rgba(210, 130, 80, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Soft, thin cloud streaks
    for (const c of this.clouds) {
      const renderX = c.x - camera.x * 0.2;
      if (renderX + c.w > -50 && renderX < VIEW_WIDTH + 50) {
        const g = ctx.createRadialGradient(renderX, c.y, 2, renderX, c.y, c.w * 0.6);
        g.addColorStop(0, 'rgba(190, 170, 160, 0.16)');
        g.addColorStop(1, 'rgba(190, 170, 160, 0)');
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(renderX, c.y);
        ctx.scale(1, 0.16);
        ctx.translate(-renderX, -c.y);
        ctx.fillRect(renderX - c.w, c.y - c.w, c.w * 2, c.w * 2);
        ctx.restore();
      }
    }

    // Mountain layers: far -> near, colors desaturate with distance (atmospheric perspective)
    const layers = [
      { f: 0.06, base: 330, amp: 120, freq: 0.0021, color: '#5b6577', haze: 0.0 },
      { f: 0.12, base: 380, amp: 95, freq: 0.0032, color: '#3f4858', haze: 0.0 },
      { f: 0.22, base: 430, amp: 70, freq: 0.0046, color: '#2a3340', haze: 0.0 }
    ];
    for (const L of layers) {
      const off = camera.x * L.f;
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(0, VIEW_HEIGHT);
      for (let x = 0; x <= VIEW_WIDTH; x += 8) {
        const wx = x + off;
        // ridged noise for sharp, natural-looking peaks
        const n =
          Math.abs(Math.sin(wx * L.freq)) * 0.6 +
          Math.abs(Math.sin(wx * L.freq * 2.3 + 1.7)) * 0.3 +
          Math.abs(Math.sin(wx * L.freq * 5.1 + 4.2)) * 0.1;
        ctx.lineTo(x, L.base - n * L.amp);
      }
      ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Mist band at the foot of each layer
      const mist = ctx.createLinearGradient(0, L.base - 20, 0, L.base + 60);
      mist.addColorStop(0, 'rgba(170, 150, 135, 0)');
      mist.addColorStop(1, 'rgba(170, 150, 135, 0.18)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, L.base - 20, VIEW_WIDTH, 80);
    }

    // Pine tree silhouettes on the nearest hills
    const treeOff = camera.x * 0.38;
    ctx.fillStyle = '#141b24';
    for (let i = 0; i < 40; i++) {
      const wx = i * 97 + ((i * 53) % 37);
      const rx = wx - treeOff;
      const rep = ((rx % (40 * 97)) + 40 * 97) % (40 * 97) - 150;
      if (rep < -60 || rep > VIEW_WIDTH + 60) continue;
      const h = 70 + ((i * 29) % 55);
      const w = 22 + ((i * 17) % 12);
      const baseY = 470;
      ctx.beginPath();
      ctx.moveTo(rep, baseY);
      for (let t = 0; t < 4; t++) {
        const ty = baseY - (h * t) / 4;
        const tw = w * (1 - t * 0.2);
        ctx.lineTo(rep - tw, ty);
        ctx.lineTo(rep - tw * 0.4, ty - 4);
        ctx.lineTo(rep, ty - h / 4 - 4);
        ctx.lineTo(rep + tw * 0.4, ty - 4);
        ctx.lineTo(rep + tw, ty);
      }
      ctx.lineTo(rep, baseY);
      ctx.fill();
    }
    // Dark ground behind the trees
    ctx.fillStyle = '#141b24';
    ctx.fillRect(0, 468, VIEW_WIDTH, VIEW_HEIGHT - 468);
  }

  drawPlatforms(ctx, camera) {
    ctx.save();
    // Draw in world space so textures stay anchored to the terrain
    ctx.translate(-camera.x, -camera.y);

    for (const plat of this.platforms) {
      const rx = plat.x;
      const ry = plat.y;

      // Frustum culling
      if (rx + plat.w < camera.x - 100 || rx > camera.x + VIEW_WIDTH + 100) continue;

      // Contact shadow below / cast onto the background
      const sh = ctx.createLinearGradient(0, ry + plat.h, 0, ry + plat.h + 26);
      sh.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
      sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sh;
      ctx.fillRect(rx, ry + plat.h, plat.w, 26);

      // Rock body with tiled noise texture
      ctx.fillStyle = plat.type === 'grass' ? TEX.earth : TEX.rock;
      ctx.fillRect(rx, ry, plat.w, plat.h);

      // Vertical lighting: darker toward the bottom
      const shade = ctx.createLinearGradient(0, ry, 0, ry + plat.h);
      shade.addColorStop(0, 'rgba(255, 220, 170, 0.10)');
      shade.addColorStop(0.3, 'rgba(0, 0, 0, 0.05)');
      shade.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      ctx.fillStyle = shade;
      ctx.fillRect(rx, ry, plat.w, plat.h);

      // Side shading (ambient occlusion on the edges)
      const sideL = ctx.createLinearGradient(rx, 0, rx + 14, 0);
      sideL.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
      sideL.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sideL;
      ctx.fillRect(rx, ry, 14, plat.h);
      const sideR = ctx.createLinearGradient(rx + plat.w - 14, 0, rx + plat.w, 0);
      sideR.addColorStop(0, 'rgba(0, 0, 0, 0)');
      sideR.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctx.fillStyle = sideR;
      ctx.fillRect(rx + plat.w - 14, ry, 14, plat.h);

      // Cracks / stone seams (deterministic from position)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 1;
      const seed = Math.floor(plat.x + plat.y);
      for (let i = 0; i < Math.min(14, plat.w / 28); i++) {
        const cx = rx + 12 + ((seed * (i + 3) * 37) % Math.max(1, plat.w - 24));
        const cy = ry + 10 + ((seed * (i + 5) * 17) % Math.max(1, plat.h - 14));
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 6 + (i % 3) * 3, cy + 5);
        ctx.lineTo(cx + 3 + (i % 4) * 2, cy + 12);
        ctx.stroke();
      }

      if (plat.type === 'grass') {
        // Moss / dry grass cap with irregular, organic edge
        ctx.fillStyle = '#2f3b22';
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        for (let x = 0; x <= plat.w; x += 5) {
          const n = Math.sin((rx + x) * 0.31) * 2 + Math.sin((rx + x) * 0.87) * 2.2;
          ctx.lineTo(rx + x, ry + 9 + n);
        }
        ctx.lineTo(rx + plat.w, ry);
        ctx.closePath();
        ctx.fill();

        // Blades of grass in several muted tones
        const tones = ['#46592f', '#3a4a28', '#5d6b36', '#2a3520'];
        for (let x = 1; x < plat.w; x += 3) {
          const k = Math.floor(rx + x);
          const bh = 4 + ((k * 7) % 7);
          ctx.strokeStyle = tones[k % tones.length];
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(rx + x, ry + 3);
          ctx.lineTo(rx + x + (((k * 13) % 5) - 2) * 0.8, ry - bh + 3);
          ctx.stroke();
        }
      }

      // Warm rim light along the top edge (sun from the horizon)
      ctx.fillStyle = 'rgba(255, 200, 140, 0.22)';
      ctx.fillRect(rx, ry, plat.w, 1.5);
    }

    ctx.restore();

    // Springs
    for (const s of this.springs) {
      s.draw(ctx, camera);
    }

    // Coins
    for (const coin of this.coins) {
      coin.draw(ctx, camera);
    }
  }

  drawAtmosphere(ctx, camera) {
    // Low-lying fog at the bottom of the screen
    const fog = ctx.createLinearGradient(0, VIEW_HEIGHT * 0.55, 0, VIEW_HEIGHT);
    fog.addColorStop(0, 'rgba(120, 130, 140, 0)');
    fog.addColorStop(1, 'rgba(120, 130, 140, 0.22)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, VIEW_HEIGHT * 0.55, VIEW_WIDTH, VIEW_HEIGHT * 0.45);

    // Cool/warm color grade
    ctx.fillStyle = 'rgba(20, 30, 50, 0.12)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Vignette
    const vg = ctx.createRadialGradient(
      VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT * 0.45,
      VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH * 0.7
    );
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vg.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Subtle film grain (random offset each frame)
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.translate(Math.floor(Math.random() * 128), Math.floor(Math.random() * 128));
    ctx.fillStyle = TEX.grain;
    ctx.fillRect(-128, -128, VIEW_WIDTH + 256, VIEW_HEIGHT + 256);
    ctx.restore();
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

  reset(fromNet = false) {
    this.level = new Level();
    this.player.reset();
    this.score = 0;
    this.collectedCoins = 0;
    this.won = false;
    this.startTime = Date.now();
    this.updateHUD();
    victoryModal.classList.add('hidden');
    net.resetStats();
    if (!fromNet) net.sendReset();
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
    net.tick(this.player);
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

    // 3. Other online players, then the local player on top
    net.draw(ctx, this.camera);
    this.player.draw(ctx, this.camera);

    // 4. Particles
    this.particles.draw(ctx, this.camera);

    // 5. Atmospheric post-processing (low fog, vignette, film grain)
    this.level.drawAtmosphere(ctx, this.camera);
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
