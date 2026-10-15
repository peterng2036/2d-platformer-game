/**
 * Online multiplayer (peer-to-peer via WebRTC / PeerJS).
 *
 * Topology: the player who creates a room is the "host". Everyone else connects
 * to the host. Each player sends their own position ~20x/second to the host, and
 * the host relays a snapshot of all players to everyone. Coin pickups and resets
 * are sent as one-off events, so the level stays in sync for the whole room.
 *
 * NOTE: this file is loaded BEFORE game.js, so it must only touch game classes
 * (Player, game, audio...) lazily, from inside functions.
 */
const net = (() => {
  const MAX_PLAYERS = 4;
  const SEND_EVERY = 3; // frames between state sends (~20 Hz at 60 fps)
  const ID_PREFIX = 'pfgame-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  let peer = null;
  let role = null; // null | 'host' | 'client'
  let myId = null;
  let roomCode = '';
  let hostConn = null;
  let frame = 0;
  let joinTimeout = null;
  const conns = new Map(); // host only: peerId -> DataConnection
  const remotes = new Map(); // peerId -> { player, tx, ty, name, hue, raw }

  // --- DOM ---
  const $ = (id) => document.getElementById(id);
  const el = {
    openBtn: $('mp-btn'),
    modal: $('lobby-modal'),
    name: $('mp-name'),
    menu: $('lobby-menu'),
    room: $('lobby-room'),
    create: $('mp-create'),
    code: $('mp-code'),
    join: $('mp-join'),
    roomCode: $('mp-room-code'),
    copy: $('mp-copy'),
    players: $('mp-players'),
    leave: $('mp-leave'),
    status: $('mp-status'),
    close: $('mp-close'),
    badge: $('room-badge'),
    badgeText: $('room-badge-text'),
    hpBadge: $('hp-badge'),
    hpText: $('hp-badge-text')
  };

  let myName = (localStorage.getItem('pf-name') || '').trim() || 'Player' + Math.floor(100 + Math.random() * 900);
  el.name.value = myName;

  // ---------- helpers ----------
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }
  const hueFor = (id) => 60 + (hash(id) % 240); // avoid the local player's default tint

  function setStatus(msg, isError = false) {
    el.status.textContent = msg || '';
    el.status.classList.toggle('error', !!isError);
  }

  function readName() {
    myName = (el.name.value || '').trim().slice(0, 12) || myName;
    el.name.value = myName;
    localStorage.setItem('pf-name', myName);
  }

  function randomCode() {
    let c = '';
    for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return c;
  }

  function collectedIndices() {
    const out = [];
    game.level.coins.forEach((c, i) => {
      if (c.collected) out.push(i);
    });
    return out;
  }

  let myKills = 0;
  let lastHpText = '';

  function localState(p) {
    return {
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
      vx: Math.round(p.vx * 100) / 100,
      vy: Math.round(p.vy * 100) / 100,
      f: p.facing,
      g: p.onGround ? 1 : 0,
      rc: Math.round(p.runCycle * 100) / 100,
      sx: Math.round(p.scaleX * 100) / 100,
      sy: Math.round(p.scaleY * 100) / 100,
      n: myName,
      hp: p.hp,
      d: p.dead ? 1 : 0,
      a: p.attackTimer,
      iv: p.invuln,
      k: myKills
    };
  }

  function safeSend(conn, msg) {
    try {
      if (conn && conn.open) conn.send(msg);
    } catch (e) {
      /* connection closing */
    }
  }

  function broadcast(msg, exceptId = null) {
    for (const [id, c] of conns) {
      if (id !== exceptId) safeSend(c, msg);
    }
  }

  // ---------- UI ----------
  function refreshUI() {
    const connected = !!role;
    el.menu.classList.toggle('hidden', connected);
    el.room.classList.toggle('hidden', !connected);
    el.badge.classList.toggle('hidden-badge', !connected);
    el.hpBadge.classList.toggle('hidden-badge', !connected);

    if (connected) {
      el.roomCode.textContent = roomCode;
      const count = remotes.size + 1;
      el.badgeText.textContent = `${roomCode} • ${count} player${count > 1 ? 's' : ''} • ⚔ ${myKills}`;

      el.players.innerHTML = '';
      const addRow = (name, hue, isYou, kills) => {
        const li = document.createElement('li');
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.background = isYou ? '#2b2f36' : `hsl(${hue}, 45%, 36%)`;
        const label = document.createElement('span');
        label.textContent = name + (isYou ? ' (you)' : '');
        const score = document.createElement('span');
        score.className = 'kills';
        score.textContent = `⚔ ${kills}`;
        li.append(dot, label, score);
        el.players.appendChild(li);
      };
      addRow(myName, 0, true, myKills);
      for (const r of remotes.values()) addRow(r.name, r.hue, false, r.kills || 0);
    }
  }

  function openLobby() {
    el.modal.classList.remove('hidden');
    refreshUI();
    if (!role) el.name.focus();
  }

  function closeLobby() {
    el.modal.classList.add('hidden');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  // ---------- state handling ----------
  function updateRemote(id, s) {
    let r = remotes.get(id);
    if (!r) {
      const player = new Player(s.x, s.y);
      r = { player, tx: s.x, ty: s.y, name: s.n || 'Player', hue: hueFor(id), raw: s };
      remotes.set(id, r);
      refreshUI();
    }
    r.raw = s;
    if (s.n && s.n !== r.name) {
      r.name = s.n;
      refreshUI();
    }
    r.tx = s.x;
    r.ty = s.y;
    const p = r.player;
    p.vx = s.vx;
    p.vy = s.vy;
    p.facing = s.f;
    p.onGround = !!s.g;
    p.runCycle = s.rc;
    p.scaleX = s.sx;
    p.scaleY = s.sy;

    // Combat state
    p.hp = typeof s.hp === 'number' ? s.hp : p.maxHp;
    r.dead = !!s.d;
    p.dead = r.dead;
    if ((s.a || 0) > p.attackTimer) p.attackTimer = s.a;
    p.invuln = s.iv || 0;
    const kills = s.k || 0;
    if (kills !== r.kills) {
      r.kills = kills;
      refreshUI();
    }
  }

  function removeRemote(id) {
    if (remotes.delete(id)) refreshUI();
  }

  function applyCoin(i) {
    const coin = game.level.coins[i];
    if (coin && !coin.collected) {
      coin.collected = true;
      audio.playCoin();
      game.particles.burst(coin.x, coin.y, 12, '#d9b24c', 3, 'star');
    }
  }

  // ---------- host ----------
  function handleIncoming(conn) {
    conn.on('open', () => {
      if (conns.size + 1 >= MAX_PLAYERS) {
        safeSend(conn, { t: 'full' });
        setTimeout(() => conn.close(), 400);
        return;
      }
      conns.set(conn.peer, conn);
      safeSend(conn, { t: 'hello', coins: collectedIndices() });
    });
    conn.on('data', (d) => hostData(conn.peer, d));
    const drop = () => {
      conns.delete(conn.peer);
      removeRemote(conn.peer);
    };
    conn.on('close', drop);
    conn.on('error', drop);
  }

  function hostData(id, d) {
    if (!d || typeof d !== 'object') return;
    switch (d.t) {
      case 's':
        if (d.s) updateRemote(id, d.s);
        break;
      case 'coin':
        applyCoin(d.i);
        broadcast({ t: 'coin', i: d.i }, id);
        break;
      case 'reset':
        game.reset(true);
        broadcast({ t: 'reset' }, id);
        break;
      case 'to':
        if (d.to === myId) onDirected(d.m);
        else safeSend(conns.get(d.to), d.m);
        break;
    }
  }

  function createRoom(attempt = 0) {
    if (typeof Peer === 'undefined') return setStatus('Multiplayer library failed to load (are you offline?)', true);
    readName();
    leave(null, true);
    setStatus('Creating room…');
    const code = randomCode();
    peer = new Peer(ID_PREFIX + code);
    peer.on('open', (id) => {
      role = 'host';
      myId = id;
      roomCode = code;
      setStatus('Room ready! Share the code or invite link with friends.');
      refreshUI();
    });
    peer.on('connection', handleIncoming);
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id' && attempt < 5) {
        peer.destroy();
        createRoom(attempt + 1);
      } else if (!role) {
        setStatus('Could not create room: ' + (err.type || err.message), true);
      }
    });
    peer.on('disconnected', () => {
      if (role === 'host') setStatus('Lost connection to the matchmaking server.', true);
    });
  }

  // ---------- client ----------
  function clientData(d) {
    if (!d || typeof d !== 'object') return;
    switch (d.t) {
      case 'hello':
        (d.coins || []).forEach(applyCoin);
        break;
      case 'snap': {
        const seen = new Set();
        for (const id in d.p) {
          if (id === myId) continue;
          seen.add(id);
          updateRemote(id, d.p[id]);
        }
        for (const id of [...remotes.keys()]) if (!seen.has(id)) removeRemote(id);
        break;
      }
      case 'coin':
        applyCoin(d.i);
        break;
      case 'reset':
        game.reset(true);
        break;
      case 'hit':
      case 'kill':
        onDirected(d);
        break;
      case 'full':
        leave('That room is full (max ' + MAX_PLAYERS + ' players).', true);
        break;
    }
  }

  function joinRoom(rawCode) {
    if (typeof Peer === 'undefined') return setStatus('Multiplayer library failed to load (are you offline?)', true);
    const code = (rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 5) return setStatus('Enter the 5-character room code.', true);
    readName();
    leave(null, true);
    setStatus('Connecting…');

    peer = new Peer();
    peer.on('open', (id) => {
      myId = id;
      hostConn = peer.connect(ID_PREFIX + code, { reliable: true });
      joinTimeout = setTimeout(() => {
        if (!role) leave('Could not reach that room. Check the code.', true);
      }, 10000);

      hostConn.on('open', () => {
        clearTimeout(joinTimeout);
        role = 'client';
        roomCode = code;
        setStatus('Connected!');
        refreshUI();
      });
      hostConn.on('data', clientData);
      hostConn.on('close', () => {
        if (role) leave('The host closed the room.', true);
      });
      hostConn.on('error', () => {
        if (role) leave('Connection lost.', true);
      });
    });
    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') leave('Room not found. Check the code.', true);
      else if (!role) leave('Could not connect: ' + (err.type || err.message), true);
    });
  }

  // ---------- leave ----------
  function leave(msg, silentReset = false) {
    clearTimeout(joinTimeout);
    const oldPeer = peer;
    // Clear state first so close handlers fired by destroy() don't re-enter leave()
    peer = null;
    hostConn = null;
    role = null;
    myId = null;
    roomCode = '';
    conns.clear();
    remotes.clear();
    try {
      if (oldPeer) oldPeer.destroy();
    } catch (e) {}
    setStatus(msg || '', !!msg && !silentReset);
    refreshUI();
  }

  // ---------- per-frame hooks (called from game.js) ----------
  function tick(player) {
    if (!role) return;
    frame++;

    // Smoothly move remote players toward their last known position
    for (const r of remotes.values()) {
      const p = r.player;
      const dx = r.tx - p.x;
      const dy = r.ty - p.y;
      if (Math.abs(dx) > 200 || Math.abs(dy) > 200) {
        p.x = r.tx;
        p.y = r.ty;
      } else {
        p.x += dx * 0.35;
        p.y += dy * 0.35;
      }
      // Idle blink variety so clones don't look robotic
      p.isBlinking = false;
      // Run remote animation timers down between network updates
      if (p.attackTimer > 0) p.attackTimer--;
      if (p.invuln > 0) p.invuln--;
    }

    // --- Melee hit detection (attacker decides, victim applies the damage) ---
    if (player.isAttackActive()) {
      const cx = player.x + player.width / 2;
      const x0 = player.facing > 0 ? cx + 2 : cx - 46;
      const x1 = x0 + 44;
      const y0 = player.y - 4;
      const y1 = player.y + player.height + 4;
      for (const [id, r] of remotes) {
        if (r.dead || player.hitSet.has(id)) continue;
        const q = r.player;
        const qx0 = q.x + 8; // visible body is narrower than the 32px hitbox
        const qx1 = q.x + q.width - 8;
        if (x1 > qx0 && x0 < qx1 && y1 > q.y && y0 < q.y + q.height) {
          player.hitSet.add(id);
          sendTo(id, { t: 'hit', from: myId, dir: player.facing });
        }
      }
    }

    // HP badge in the HUD
    const hpText = '♥'.repeat(player.hp) + '♡'.repeat(player.maxHp - player.hp);
    if (hpText !== lastHpText) {
      lastHpText = hpText;
      el.hpText.textContent = hpText;
    }

    if (frame % SEND_EVERY !== 0) return;
    const s = localState(player);
    if (role === 'host') {
      const snap = { [myId]: s };
      for (const [id, r] of remotes) snap[id] = r.raw;
      broadcast({ t: 'snap', p: snap });
    } else {
      safeSend(hostConn, { t: 's', s });
    }
  }

  function draw(ctx, camera) {
    if (!role) return;
    for (const r of remotes.values()) {
      if (r.dead) continue;
      const p = r.player;
      p.cloak = `hsl(${r.hue}, 45%, 36%)`;
      p.draw(ctx, camera);
      drawLabel(ctx, camera, p, r.name, 'rgba(235, 225, 205, 0.95)', p.hp);
    }
    const me = game.player;
    if (!me.dead) {
      drawLabel(ctx, camera, me, myName, 'rgba(255, 215, 150, 0.95)', me.hp);
    } else {
      const secs = Math.max(1, Math.ceil(me.respawnTimer / 60));
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '700 28px "Segoe UI", system-ui, sans-serif';
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillStyle = '#d98a8a';
      ctx.strokeText('You were defeated', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 10);
      ctx.fillText('You were defeated', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 10);
      ctx.font = '600 16px "Segoe UI", system-ui, sans-serif';
      ctx.lineWidth = 4;
      ctx.fillStyle = '#e8e2cf';
      ctx.strokeText(`Respawning in ${secs}…`, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 18);
      ctx.fillText(`Respawning in ${secs}…`, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 18);
      ctx.restore();
    }
  }

  function drawLabel(ctx, camera, p, text, color, hp) {
    const x = p.x + p.width / 2 - camera.x;
    const y = p.y + p.height - 46 - camera.y;
    ctx.save();
    ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    // Hearts (HP) above the name
    const max = p.maxHp || 3;
    const cur = typeof hp === 'number' ? hp : max;
    ctx.font = '14px "Segoe UI Symbol", "Segoe UI", sans-serif';
    ctx.lineWidth = 3;
    for (let i = 0; i < max; i++) {
      const hx = x + (i - (max - 1) / 2) * 13;
      ctx.strokeText('♥', hx, y - 14);
      ctx.fillStyle = i < cur ? '#c0392b' : '#4a4f58';
      ctx.fillText('♥', hx, y - 14);
    }
    ctx.restore();
  }

  function sendCoin(i) {
    if (role === 'host') broadcast({ t: 'coin', i });
    else if (role === 'client') safeSend(hostConn, { t: 'coin', i });
  }

  function sendReset() {
    if (role === 'host') broadcast({ t: 'reset' });
    else if (role === 'client') safeSend(hostConn, { t: 'reset' });
  }

  /** Send a message to one specific player (clients route it through the host). */
  function sendTo(to, m) {
    if (role === 'host') {
      if (to === myId) onDirected(m);
      else safeSend(conns.get(to), m);
    } else if (role === 'client') {
      safeSend(hostConn, { t: 'to', to, m });
    }
  }

  /** Handle a message addressed to the local player. The victim is the authority on their own HP. */
  function onDirected(m) {
    if (m.t === 'hit') {
      const result = game.player.takeHit(m.dir || 1, game.particles);
      if (result === 'dead') sendTo(m.from, { t: 'kill' });
    } else if (m.t === 'kill') {
      myKills++;
      refreshUI();
    }
  }

  function resetStats() {
    myKills = 0;
    if (role) refreshUI();
  }

  // ---------- UI events ----------
  el.openBtn.addEventListener('click', () => {
    openLobby();
  });
  el.close.addEventListener('click', closeLobby);
  el.modal.addEventListener('mousedown', (e) => {
    if (e.target === el.modal) closeLobby();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !el.modal.classList.contains('hidden')) closeLobby();
  });

  el.create.addEventListener('click', () => createRoom());
  el.join.addEventListener('click', () => joinRoom(el.code.value));
  el.code.addEventListener('input', () => {
    el.code.value = el.code.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
  el.code.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinRoom(el.code.value);
  });
  el.name.addEventListener('change', () => {
    readName();
    refreshUI();
  });
  el.leave.addEventListener('click', () => leave('You left the room.'));
  el.copy.addEventListener('click', async () => {
    const link = `${location.origin}${location.pathname}?room=${roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setStatus('Invite link copied!');
    } catch (e) {
      setStatus(link);
    }
    el.copy.blur();
  });

  // Auto-join from an invite link (?room=ABCDE)
  window.addEventListener('load', () => {
    const room = new URLSearchParams(location.search).get('room');
    if (room) {
      openLobby();
      el.code.value = room.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
      joinRoom(el.code.value);
    }
  });

  return { tick, draw, sendCoin, sendReset, resetStats, get active() { return !!role; } };
})();
