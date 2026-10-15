# 🎮 2D Platformer Web Game

A responsive, polished 2D platformer web game built with vanilla HTML5 Canvas, modern CSS, and the Web Audio API.

## 🚀 How to Play

Simply open `index.html` in any web browser (Chrome, Edge, Firefox, Safari):
- **Double click `index.html`** in your file explorer, OR
- Run `Start-Process index.html` in PowerShell.

---

## 🕹️ Controls

| Action | Keys |
| :--- | :--- |
| **Move Left / Right** | `A` / `D` or `←` / `→` |
| **Jump** | `Space` or `W` or `↑` |
| **Double Jump** | Press Jump again while in mid-air |
| **Variable Jump Height** | Release the jump key early for a shorter hop |
| **Reset / Restart** | `R` (or click 🔄 Reset) |
| **Toggle Sound** | `M` (or click 🔊 Sound) |

---

## ✨ Features

- **Responsive Game Feel**:
  - **Coyote Time**: Allows jumping for a brief fraction of a second even after stepping off a platform edge.
  - **Jump Buffering**: Inputs right before touching the ground are smoothly remembered.
  - **Variable Jump Height**: Tap for small hops or hold for maximum vertical reach.
  - **Squash & Stretch**: Juicy visual squash on landing and stretch during jumps.
- **Spring Launchers**: Jump on the red bouncy springs to launch high into secret sky islands!
- **Procedural Sound Engine**:
  - Uses native **Web Audio API** — zero external audio assets required.
  - Custom procedural synthesizers for jumps, double jumps, bounces, landing thuds, and coin sparkles.
- **Juicy Particle Effects**: Footstep dust, launch bursts, double-jump rings, landing clouds, and coin pickup sparks.
- **Dynamic Parallax Backgrounds**: Multi-layer rolling hills and drifting clouds with smooth camera tracking.
- **Collectibles & Goal**: 17 spinning gold coins to collect across the level with a completion victory modal.
