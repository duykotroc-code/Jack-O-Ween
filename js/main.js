'use strict';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('btn-restart');
const startBtn = document.getElementById('btn-start');
const exitBtn = document.getElementById('btn-exit');
const lobbyScreen = document.getElementById('lobby-screen');
const gameShell = document.querySelector('.game-shell');
const enterGameBtn = document.getElementById('btn-enter-game');

const player = {
  x: 180,
  y: canvas.height / 2,
  radius: 24,
  vy: 0,
  gravity: 0.42,
  flap: -8.8
};

const state = {
  score: 0,
  gameOver: false,
  houses: [],
  fireball: null,
  explosion: null,
  lastStamp: 0,
  spawnTimer: 1100
};

function showLobby() {
  lobbyScreen.classList.remove('hidden');
  gameShell.classList.add('hidden');
  resetGame();
}

function showGame() {
  lobbyScreen.classList.add('hidden');
  gameShell.classList.remove('hidden');
  resetGame();
}

function resetGame() {
  player.x = 180;
  player.y = canvas.height / 2;
  player.vy = 0;
  state.score = 0;
  state.gameOver = false;
  state.houses = [];
  state.fireball = null;
  state.explosion = null;
  state.spawnTimer = 800;
  overlay.classList.add('hidden');
  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(state.score);
}

function spawnHouse() {
  const width = 48 + Math.random() * 10;
  const gap = 175 + Math.random() * 18;
  const topHeight = 70 + Math.random() * (canvas.height - 100 - gap);

  return {
    x: canvas.width + 85,
    width: 85,
    gap,
    topHeight,
    scored: false
  };
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#180d1d');
  gradient.addColorStop(0.55, '#0f1424');
  gradient.addColorStop(1, '#130d18');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffcd66';
  ctx.beginPath();
  ctx.arc(canvas.width - 120, 90, 42, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 32; i += 1) {
    const x = (i * 93 + 32) % canvas.width;
    const y = (i * 59 + 18) % 180;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,210,120,0.7)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = '#2d1122';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(0, canvas.height - 120);
  ctx.quadraticCurveTo(canvas.width * 0.22, canvas.height - 200, canvas.width * 0.42, canvas.height - 135);
  ctx.quadraticCurveTo(canvas.width * 0.7, canvas.height - 195, canvas.width, canvas.height - 110);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();
}

function drawHouseBlock(x, y, width, height, inverted = false) {
  if (height <= 0) return;
  const roofHeight = Math.max(20, width * 0.75);

  ctx.fillStyle = '#352333';
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();

  if (inverted) {
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width / 2, y + height + roofHeight);
    ctx.lineTo(x + width, y + height);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + width / 2, y - roofHeight);
    ctx.lineTo(x + width, y);
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#3d2435';
  ctx.fillRect(x + 8, y, width - 16, height);

  const windowW = 12;
  const windowH = 14;
  const startX = x + 14;
  const windowGap = (width - 30) / 2;

  for (let i = 0; i < 2; i += 1) {
    const wx = startX + i * (windowGap + 8);
    const wy = y + Math.max(18, height * 0.22);

    ctx.fillStyle = 'rgba(255, 231, 114, 0.92)';
    ctx.fillRect(wx, wy, windowW, windowH);
    ctx.fillStyle = 'rgba(255, 202, 85, 0.55)';
    ctx.fillRect(wx + 2, wy + 2, windowW - 4, windowH - 4);
  }

  if (inverted) {
    const doorW = Math.min(18, width * 0.22);
    const doorH = Math.min(28, height * 0.45);
    const doorX = x + width / 2 - doorW / 2;
    const doorY = y + height - doorH;

    ctx.fillStyle = '#ffc857';
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.fillStyle = 'rgba(255, 241, 168, 0.9)';
    ctx.fillRect(doorX + 4, doorY + 5, doorW - 8, doorH - 8);
    ctx.fillStyle = '#f7c948';
    ctx.fillRect(doorX + doorW * 0.5 - 2, doorY + 10, 4, 4);

    ctx.fillStyle = 'rgba(255, 241, 168, 0.95)';
    ctx.fillRect(x + width * 0.2, y + height * 0.24, 10, 12);
    ctx.fillRect(x + width * 0.68, y + height * 0.24, 10, 12);
  }

  ctx.fillStyle = '#1b1014';
  ctx.fillRect(x + width * 0.43, y + height - 22, 12, 22);
}

function drawHouse(house) {
  const groundY = canvas.height - 60;
  drawHouseBlock(house.x, 0, house.width, house.topHeight, true);
  const bottomY = house.topHeight + house.gap;
  const bottomHeight = groundY - bottomY;
  drawHouseBlock(house.x, bottomY, house.width, bottomHeight, false);
}

function drawGround() {
  ctx.fillStyle = '#1b0d17';
  ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
  ctx.fillStyle = '#2c1a24';
  for (let i = 0; i < canvas.width; i += 20) {
    ctx.fillRect(i, canvas.height - 60, 10, 5);
  }
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;
  const r = player.radius;

  ctx.save();
  ctx.translate(x, y);

  ctx.save();
  ctx.translate(-r * 1.14, r * 0.68);
  ctx.fillStyle = 'rgba(255, 120, 40, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 6; i += 1) {
    const sparkX = -7 + i * 3.1;
    const sparkY = -18 - (i % 2 === 0 ? 8 : 0) + Math.sin((Date.now() / 160) + i) * 5;
    ctx.fillStyle = i % 2 === 0 ? '#fff1a8' : '#ffb347';
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(0, -8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#f28a24';
  ctx.strokeStyle = '#b35512';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 1.15, -r * 0.78);
  ctx.bezierCurveTo(-r * 1.32, -r * 0.1, -r * 1.2, r * 0.96, -r * 0.66, r * 1.06);
  ctx.bezierCurveTo(-r * 0.2, r * 1.18, r * 0.2, r * 1.18, r * 0.66, r * 1.06);
  ctx.bezierCurveTo(r * 1.2, r * 0.96, r * 1.32, -r * 0.12, r * 1.15, -r * 0.78);
  ctx.bezierCurveTo(r * 0.9, -r * 1.12, -r * 0.9, -r * 1.12, -r * 1.15, -r * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#c85c16';
  ctx.beginPath();
  ctx.moveTo(-r * 0.94, -r * 0.02);
  ctx.lineTo(-r * 0.28, -r * 0.7);
  ctx.lineTo(r * 0.28, -r * 0.7);
  ctx.lineTo(r * 0.94, -r * 0.02);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#9c4d15';
  ctx.lineWidth = 2.5;
  for (let i = -2; i <= 2; i += 1) {
    const offsetX = i * 8.4;
    ctx.beginPath();
    ctx.moveTo(offsetX, -r * 0.82);
    ctx.lineTo(offsetX, r * 0.82);
    ctx.stroke();
  }

  ctx.fillStyle = '#120b0a';
  ctx.beginPath();
  ctx.moveTo(-r * 0.86, -r * 0.18);
  ctx.lineTo(-r * 0.42, -r * 0.34);
  ctx.lineTo(-r * 0.08, -r * 0.18);
  ctx.lineTo(-r * 0.42, r * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(r * 0.86, -r * 0.18);
  ctx.lineTo(r * 0.42, -r * 0.34);
  ctx.lineTo(r * 0.08, -r * 0.18);
  ctx.lineTo(r * 0.42, r * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-r * 0.38, r * 0.2);
  ctx.quadraticCurveTo(0, r * 0.56, r * 0.38, r * 0.2);
  ctx.quadraticCurveTo(0, r * 0.8, -r * 0.38, r * 0.2);
  ctx.fill();

  ctx.fillStyle = '#f9d9a5';
  ctx.beginPath();
  ctx.moveTo(-r * 0.18, r * 0.22);
  ctx.lineTo(0, r * 0.38);
  ctx.lineTo(r * 0.18, r * 0.22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0f0f12';
  ctx.fillRect(-r * 0.34, r * 0.46, r * 0.68, 3.5);

  ctx.fillStyle = '#3fbf4a';
  ctx.beginPath();
  ctx.moveTo(-r * 0.28, -r * 1.18);
  ctx.quadraticCurveTo(0, -r * 1.52, r * 0.28, -r * 1.18);
  ctx.quadraticCurveTo(0, -r * 1.02, -r * 0.28, -r * 1.18);
  ctx.fill();

  ctx.fillStyle = '#2c9a38';
  ctx.fillRect(-r * 0.12, -r * 1.18, 8, r * 0.24);

  ctx.restore();
}

function drawFireball() {
  if (!state.fireball) return;
  const f = state.fireball;
  const pulse = 18 + Math.sin(Date.now() / 110) * 4;

  ctx.save();
  ctx.translate(f.x, f.y);

  ctx.fillStyle = 'rgba(255,120,40,0.18)';
  ctx.beginPath();
  ctx.arc(0, 0, f.radius + pulse + 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fb4d1d';
  ctx.beginPath();
  ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(-f.radius * 0.2, -f.radius * 0.25, 8, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6 + Date.now() / 320;
    const px = Math.cos(angle) * (f.radius + 10);
    const py = Math.sin(angle) * (f.radius + 10);
    ctx.fillStyle = i % 2 === 0 ? '#fff1a8' : '#ffb347';
    ctx.beginPath();
    ctx.arc(px, py, 3 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawExplosion() {
  if (!state.explosion) return;
  const e = state.explosion;
  ctx.fillStyle = `rgba(255, 160, 50, ${0.4 + e.life})`;
  ctx.beginPath();
  ctx.arc(e.x, e.y, 18 + (1 - e.life) * 45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 240, 140, ${0.8 * e.life})`;
  ctx.beginPath();
  ctx.arc(e.x, e.y, 9 + (1 - e.life) * 25, 0, Math.PI * 2);
  ctx.fill();
}

function endGame() {
  if (state.gameOver) return;
  state.gameOver = true;
  state.explosion = state.explosion || { x: player.x, y: player.y, life: 1 };
  finalScoreEl.textContent = String(state.score);
  overlay.classList.remove('hidden');
}

function checkCrashWithHouse(house) {
  const left = house.x;
  const right = house.x + house.width;
  const hitX = player.x + player.radius > left && player.x - player.radius < right;
  const hitTop = hitX && player.y - player.radius < house.topHeight;
  const hitBottom = hitX && player.y + player.radius > house.topHeight + house.gap;
  return hitTop || hitBottom;
}

function fireballHit() {
  if (!state.fireball) return false;
  const dx = player.x - state.fireball.x;
  const dy = player.y - state.fireball.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < player.radius + state.fireball.radius;
}

function update(dt) {
  if (state.gameOver) return;

  player.vy += player.gravity * (dt / 16.67);
  player.y += player.vy * (dt / 16.67);

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    state.houses.push(spawnHouse());
    state.spawnTimer = 1250 - Math.min(350, state.score * 8);
  }

  for (const house of state.houses) {
    house.x -= 4.3 * (dt / 16.67);
    if (!house.scored && house.x + house.width < player.x) {
      house.scored = true;
      state.score += 1;
      updateHud();
    }
  }

  if (state.score >= 100) {
    if (!state.fireball) {
      state.fireball = {
        x: canvas.width + 60,
        y: 120 + Math.random() * (canvas.height - 260),
        radius: 24,
        speed: 4.6 + state.score * 0.02
      };
    }

    state.fireball.x -= state.fireball.speed * (dt / 16.67);
    if (state.fireball.x + state.fireball.radius < -20) {
      state.fireball = null;
    }
  }

  state.houses = state.houses.filter((house) => house.x + house.width > -30);

  for (const house of state.houses) {
    if (checkCrashWithHouse(house)) {
      state.explosion = { x: player.x, y: player.y, life: 1 };
      endGame();
      return;
    }
  }

  if (fireballHit()) {
    state.explosion = { x: player.x, y: player.y, life: 1 };
    endGame();
    return;
  }

  if (player.y - player.radius < 0 || player.y + player.radius > canvas.height - 60) {
    state.explosion = { x: player.x, y: player.y, life: 1 };
    endGame();
    return;
  }

  if (state.explosion) {
    state.explosion.life -= 0.04;
    if (state.explosion.life <= 0) {
      state.explosion = null;
    }
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  for (const house of state.houses) {
    drawHouse(house);
  }

  drawFireball();
  drawPlayer();
  drawGround();
  drawExplosion();
}

function gameLoop(timestamp) {
  if (!state.lastStamp) state.lastStamp = timestamp;
  const dt = Math.min(32, timestamp - state.lastStamp);
  state.lastStamp = timestamp;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function flap() {
  if (state.gameOver) {
    resetGame();
    return;
  }
  player.vy = player.flap;
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW' || event.code === 'KeyE') {
    event.preventDefault();
    flap();
  }
});

canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (state.gameOver) {
    resetGame();
    return;
  }
  flap();
});

restartBtn.addEventListener('click', () => {
  resetGame();
  gameShell.classList.remove('hidden');
  lobbyScreen.classList.add('hidden');
});
startBtn.addEventListener('click', () => {
  showGame();
});
enterGameBtn.addEventListener('click', () => {
  showGame();
});
exitBtn.addEventListener('click', () => {
  showLobby();
});

showLobby();
requestAnimationFrame(gameLoop);
