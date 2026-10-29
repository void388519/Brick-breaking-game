/* Canvas engine. Positions use a fixed 900 × 600 world; simulation runs at 120 Hz. */
(() => {
  'use strict';
  const W = 900, H = 600, STEP = 1 / 120;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function mixColor(a, b, t) {
    const parts = [0, 2, 4].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t));
    return `rgb(${parts.join(',')})`;
  }
  function rounded(ctx, x, y, w, h, r = 4) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  class Engine {
    constructor(canvas, callbacks = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.callbacks = callbacks;
      this.state = 'idle';
      this.keys = {left:false, right:false};
      this.settings = {reduced:false};
      this.dayTarget = 0;
      this.dayBlend = 0;
      this.previous = 0;
      this.accumulator = 0;
      this.hudTime = 0;
      this.visualTime = 0;
      this.frame = this.frame.bind(this);
      this.resize();
      this.raf = requestAnimationFrame(this.frame);
    }

    emit(name, data) { this.callbacks[name]?.(data); }
    resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = W * ratio;
      this.canvas.height = H * ratio;
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    setTheme(day) {
      this.dayTarget = day ? 1 : 0;
      if (this.state === 'idle' || this.settings.reduced) this.dayBlend = this.dayTarget;
    }
    setReduced(reduced) {
      this.settings.reduced = reduced;
      if (reduced) this.particles = [];
    }
    setTarget(x) {
      if (!this.paddle || !['ready','countdown','playing'].includes(this.state)) return;
      this.paddle.target = clamp(x - this.paddle.w / 2, 12, W - this.paddle.w - 12);
    }
    clearInput() { this.keys.left = this.keys.right = false; }

    start(id, difficulty = 'normal', layout = null) {
      this.endless = id === 'endless';
      this.wave = this.endless ? 1 : 0;
      this.level = this.endless ? Neon.endlessLevel(1) : Neon.levels.find(level => level.id === id) || Neon.levels[0];
      this.difficulty = difficulty in Neon.difficulties ? difficulty : 'normal';
      this.config = Neon.difficulties[this.difficulty];
      this.score = 0;
      this.lives = this.config.lives;
      this.elapsed = 0;
      this.misses = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.energy = 0;
      this.collected = 0;
      this.destroyed = 0;
      this.cycle = 0;
      this.effects = {expand:0, slow:0, shield:false};
      this.particles = [];
      this.floats = [];
      this.drops = [];
      this.rings = [];
      this.clearInput();
      this.paddle = {x:W / 2 - this.config.paddle / 2, y:550, w:this.config.paddle, h:13, target:W / 2 - this.config.paddle / 2};
      this.buildBoard(layout);
      this.accumulator = 0;
      this.visualTime = 0;
      this.setState('ready');
      this.emit('cycle', this.level.day);
      if (this.endless) this.emit('waveStart', this.wave);
      this.emitHUD();
    }

    buildBoard(layout = null) {
      const grid = this.endless ? Neon.endlessGrid : Neon.grid;
      this.layout = layout || Neon.generateLayout(this.level);
      this.bricks = [];
      this.layout.forEach((row, r) => [...row].forEach((cell, c) => {
        if (cell === '0') return;
        const hp = cell === 'S' ? Infinity : cell === 'X' ? 1 : Number(cell);
        this.bricks.push({x:grid.x + c * grid.pitchX, baseX:grid.x + c * grid.pitchX, y:grid.y + r * grid.pitchY, w:grid.brickWidth, h:grid.brickHeight, hp, initialHP:hp, row:r, col:c, explosive:cell === 'X', steel:cell === 'S', flash:0});
      }));
      this.total = this.bricks.filter(b => !b.steel).length;
      this.obstacles = [];
      if (this.level.obstacle) {
        this.obstacles.push({x:W / 2 - 56, y:445, w:112, h:12});
        if (this.level.obstacle === 'dawn') this.obstacles.push({x:W / 2 - 48, y:487, w:96, h:11});
      }
      this.balls = [this.newBall()];
      this.destroyed = 0;
      this.drops = [];
    }

    nextWave() {
      if (!this.endless || this.state !== 'waveclear') return;
      this.wave++;
      this.level = Neon.endlessLevel(this.wave);
      this.combo = 0;
      this.effects.expand = 0;
      this.effects.slow = 0;
      this.paddle.w = this.config.paddle;
      this.paddle.x = W / 2 - this.paddle.w / 2;
      this.paddle.target = this.paddle.x;
      this.buildBoard();
      this.setState('ready');
      this.cycle = Math.floor(this.elapsed / 45);
      this.emit('cycle', this.cycle % 2 === 0 ? this.level.day : !this.level.day);
      this.emit('waveStart', this.wave);
      this.emitHUD();
      this.launch();
    }

    completeWave() {
      if (this.state !== 'playing') return;
      const bonus = 250 + this.wave * 80;
      this.score += bonus;
      const lifeup = this.wave % 3 === 0 && this.lives < 6;
      if (lifeup) this.lives++;
      this.waveDelay = 3;
      this.setState('waveclear');
      this.emit('sound','win');
      this.emitHUD();
      this.emit('waveClear',{wave:this.wave,bonus,lifeup});
    }

    newBall(x, y, angle = -.26) {
      const speed = this.level.speed * this.config.speed;
      return {x:x ?? this.paddle.x + this.paddle.w / 2, y:y ?? this.paddle.y - 10, r:7, vx:Math.sin(angle) * speed, vy:-Math.cos(angle) * speed, trail:[], trailTick:0};
    }
    setState(state) { this.state = state; this.emit('state', state); }
    launch() {
      if (this.state === 'ready') {
        this.countdown = 2.1;
        this.lastCount = 3;
        this.setState('countdown');
        this.emit('countdown', 3);
        this.emit('sound', 'launch');
      } else if (this.state === 'playing') this.pulse();
    }
    pause() {
      if (!['ready','countdown','playing','waveclear'].includes(this.state)) return false;
      this.beforePause = this.state;
      this.clearInput();
      this.setState('paused');
      return true;
    }
    resume() {
      if (this.state !== 'paused') return;
      this.accumulator = 0;
      this.setState(this.beforePause || 'playing');
      if (this.state === 'countdown') this.emit('countdown', this.lastCount);
    }
    stop() { this.clearInput(); this.setState('idle'); }

    frame(now) {
      const dt = Math.min((now - (this.previous || now)) / 1000, .05);
      this.previous = now;
      if (this.state !== 'idle') {
        if (this.state !== 'paused') this.visualTime += dt;
        this.dayBlend += (this.dayTarget - this.dayBlend) * Math.min(1, dt * 3);
        this.accumulator += dt;
        while (this.accumulator >= STEP) {
          this.step(STEP);
          this.accumulator -= STEP;
        }
        this.hudTime += dt;
        if (this.hudTime >= .09) { this.emitHUD(); this.hudTime = 0; }
        this.draw();
      }
      this.raf = requestAnimationFrame(this.frame);
    }

    step(dt) {
      if (['idle','paused'].includes(this.state)) return;
      this.updateVisualEffects(dt);
      if (['won','lost'].includes(this.state)) return;
      if (this.state === 'waveclear') {
        this.waveDelay -= dt;
        if (this.waveDelay <= 0) this.nextWave();
        return;
      }
      const p = this.paddle;
      if (this.keys.left) p.target -= 680 * dt;
      if (this.keys.right) p.target += 680 * dt;
      p.w = this.effects.expand > 0 ? this.config.paddle + 65 : this.config.paddle;
      p.target = clamp(p.target, 12, W - p.w - 12);
      p.x = clamp(p.x + (p.target - p.x) * (1 - Math.exp(-22 * dt)), 12, W - p.w - 12);

      if (this.state === 'ready' || this.state === 'countdown') {
        this.balls[0].x = p.x + p.w / 2;
        this.balls[0].y = p.y - 10;
        if (this.state === 'countdown') {
          this.countdown -= dt;
          const count = Math.ceil(this.countdown / .7);
          if (count > 0 && count !== this.lastCount) {
            this.lastCount = count;
            this.emit('countdown', count);
            this.emit('sound', 'tick');
          }
          if (this.countdown <= 0) this.setState('playing');
        }
        return;
      }

      this.elapsed += dt;
      const cycle = Math.floor(this.elapsed / 45);
      if (cycle !== this.cycle) {
        this.cycle = cycle;
        this.emit('cycle', cycle % 2 === 0 ? this.level.day : !this.level.day);
      }
      this.effects.expand = Math.max(0, this.effects.expand - dt);
      this.effects.slow = Math.max(0, this.effects.slow - dt);
      for (const b of this.bricks) {
        if (this.level.moving && !b.steel) b.x = b.baseX + Math.sin(this.elapsed * .85 + b.row * .9) * 24;
        b.flash = Math.max(0, b.flash - dt * 5);
      }
      this.obstacles.forEach((o, i) => {
        const orbit = this.level.obstacle === 'orbit';
        o.x = W / 2 - o.w / 2 + Math.sin(this.elapsed * (orbit ? .9 : .7) + i * Math.PI) * (orbit ? 220 : 190);
        if (orbit) o.y = 445 + Math.cos(this.elapsed * .9) * 14;
      });

      const slow = this.effects.slow > 0 ? .68 : 1;
      for (const ball of [...this.balls]) {
        if (!this.balls.includes(ball)) continue;
        ball.trailTick += dt;
        if (ball.trailTick > .016) {
          if (!this.settings.reduced) {
            ball.trail.push({x:ball.x, y:ball.y});
            if (ball.trail.length > 11) ball.trail.shift();
          }
          ball.trailTick = 0;
        }
        const previousY = ball.y;
        ball.x += ball.vx * dt * slow;
        ball.y += ball.vy * dt * slow;
        if (ball.x < ball.r + 7) { ball.x = ball.r + 7; ball.vx = Math.abs(ball.vx); }
        if (ball.x > W - ball.r - 7) { ball.x = W - ball.r - 7; ball.vx = -Math.abs(ball.vx); }
        if (ball.y < ball.r + 7) { ball.y = ball.r + 7; ball.vy = Math.abs(ball.vy); }
        if (ball.vy > 0 && previousY + ball.r <= p.y + 3 && ball.y + ball.r >= p.y && ball.x + ball.r > p.x && ball.x - ball.r < p.x + p.w) {
          ball.y = p.y - ball.r - .1;
          let hit = clamp((ball.x - (p.x + p.w / 2)) / (p.w / 2), -.95, .95);
          if (Math.abs(hit) < .07) hit = hit < 0 ? -.07 : .07;
          const speed = Math.hypot(ball.vx, ball.vy);
          ball.vx = Math.sin(hit * 1.1) * speed;
          ball.vy = -Math.abs(Math.cos(hit * 1.1) * speed);
          this.combo = 0;
          this.burst(ball.x, p.y, this.level.color, 6);
          this.emit('sound', 'paddle');
        }
        if (this.effects.shield && ball.vy > 0 && ball.y + ball.r >= 580 && previousY + ball.r < 580) {
          ball.y = 580 - ball.r;
          ball.vy = -Math.abs(ball.vy);
          this.effects.shield = false;
          this.rings.push({x:ball.x, y:578, radius:15, life:.7, color:'#8cbce7'});
          this.emit('notice', '護盾接住了這一球！');
          this.emit('sound', 'power');
        }
        let collided = false;
        for (const b of this.bricks) {
          if (b.hp <= 0) continue;
          if (this.collide(ball, b)) {
            if (!b.steel) this.hitBrick(b);
            else this.emit('sound', 'steel');
            collided = true;
            break;
          }
        }
        if (!collided) for (const o of this.obstacles) {
          if (this.collide(ball, o)) { this.emit('sound','steel'); break; }
        }
        if (ball.y - ball.r > H) {
          this.balls.splice(this.balls.indexOf(ball), 1);
          this.combo = 0;
          // Every dropped ball counts as a miss for the flawless star.
          this.misses++;
          if (this.balls.length === 0) {
            this.lives--;
            this.emit('sound', 'lose');
            this.emit('shake');
            this.drops = [];
            this.effects.expand = 0;
            this.effects.slow = 0;
            if (this.lives <= 0) { this.finish(false); return; }
            this.balls = [this.newBall()];
            this.setState('ready');
            this.emitHUD();
            return;
          }
        }
      }
      if (this.destroyed >= this.total) { if (this.endless) this.completeWave(); else this.finish(true); return; }
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const drop = this.drops[i];
        drop.y += 133 * dt;
        if (drop.y + 13 >= p.y && drop.y - 13 <= p.y + p.h && drop.x + 13 > p.x && drop.x - 13 < p.x + p.w) {
          this.activate(drop.type);
          this.drops.splice(i, 1);
        } else if (drop.y > H + 20) this.drops.splice(i, 1);
      }
    }

    collide(ball, rect) {
      const closestX = clamp(ball.x, rect.x, rect.x + rect.w);
      const closestY = clamp(ball.y, rect.y, rect.y + rect.h);
      const dx = ball.x - closestX, dy = ball.y - closestY;
      if (dx * dx + dy * dy >= ball.r * ball.r) return false;
      const left = ball.x + ball.r - rect.x;
      const right = rect.x + rect.w - ball.x + ball.r;
      const top = ball.y + ball.r - rect.y;
      const bottom = rect.y + rect.h - ball.y + ball.r;
      const depth = Math.min(left, right, top, bottom);
      if (depth === left) { ball.x = rect.x - ball.r - .1; ball.vx = -Math.abs(ball.vx); }
      else if (depth === right) { ball.x = rect.x + rect.w + ball.r + .1; ball.vx = Math.abs(ball.vx); }
      else if (depth === top) { ball.y = rect.y - ball.r - .1; ball.vy = -Math.abs(ball.vy); }
      else { ball.y = rect.y + rect.h + ball.r + .1; ball.vy = Math.abs(ball.vy); }
      return true;
    }

    hitBrick(b, blast = false) {
      if (b.steel || b.hp <= 0) return;
      b.hp--;
      b.flash = 1;
      this.energy = Math.min(100, this.energy + 3);
      if (b.hp > 0) { this.burst(b.x + b.w / 2, b.y + b.h / 2, this.level.color, 4); this.emit('sound','steel'); return; }
      this.destroyed++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      const multiplier = Math.min(5, 1 + Math.floor(this.combo / 5));
      const points = Math.round((50 + b.initialHP * 20) * multiplier * this.config.points);
      this.score += points;
      this.energy = Math.min(100, this.energy + 3);
      this.burst(b.x + b.w / 2, b.y + b.h / 2, b.explosive ? '#e6c683' : this.level.color, b.explosive ? 19 : 11);
      if (!this.settings.reduced) this.floats.push({x:b.x + b.w / 2, y:b.y, text:`+${points}`, life:.8});
      this.emit('combo', this.maxCombo);
      if (!blast) this.emit('sound', b.explosive ? 'power' : 'brick');
      if (this.destroyed % 7 === 3 || Math.random() < .12) {
        const types = ['expand','multi','slow','shield','life'];
        this.drops.push({x:b.x + b.w / 2, y:b.y + b.h / 2, type:types[Math.floor(Math.random() * types.length)]});
      }
      if (b.explosive) {
        this.rings.push({x:b.x + b.w / 2, y:b.y + b.h / 2, radius:4, life:.55, color:'#e6c683'});
        // Mark this brick dead before recursively chaining explosions.
        for (const neighbor of this.bricks) {
          if (neighbor !== b && neighbor.hp > 0 && !neighbor.steel && Math.abs(neighbor.row - b.row) <= 1 && Math.abs(neighbor.col - b.col) <= 1) this.hitBrick(neighbor, true);
        }
      }
    }

    activate(type) {
      if (!(type in Neon.powerups)) return;
      this.collected++;
      if (type === 'expand') this.effects.expand = 15;
      if (type === 'slow') this.effects.slow = 10;
      if (type === 'shield') this.effects.shield = true;
      if (type === 'life') this.lives = Math.min(6, this.lives + 1);
      if (type === 'multi' && this.balls.length) {
        const parent = this.balls[0];
        const base = Math.atan2(parent.vx, -parent.vy);
        for (const offset of [-.4, .4]) {
          if (this.balls.length >= 6) break;
          const child = this.newBall(parent.x, parent.y, base + offset);
          if (Math.abs(child.vy) < 110) child.vy = (child.vy < 0 ? -1 : 1) * 110;
          const length = Math.hypot(child.vx, child.vy);
          const target = this.level.speed * this.config.speed;
          child.vx *= target / length;
          child.vy *= target / length;
          this.balls.push(child);
        }
      }
      this.emit('powerup', type);
      this.emit('notice', `獲得 ${Neon.powerups[type].name}！`);
      this.emit('sound', 'power');
      this.emitHUD();
    }

    pulse() {
      if (this.state !== 'playing' || this.energy < 100) return false;
      this.energy = 0;
      const candidates = this.bricks.filter(b => b.hp > 0 && !b.steel).sort((a, b) => b.y - a.y || Math.abs(a.x - this.paddle.x) - Math.abs(b.x - this.paddle.x)).slice(0, 5);
      this.rings.push({x:this.paddle.x + this.paddle.w / 2, y:this.paddle.y, radius:10, life:1.1, color:this.level.color});
      candidates.forEach(b => this.hitBrick(b, true));
      this.emit('sound', 'pulse');
      this.emit('notice', '能量脈衝！對 5 塊磚造成傷害');
      this.emit('shake');
      if (this.destroyed >= this.total) {if (this.endless) this.completeWave();else this.finish(true);}
      this.emitHUD();
      return true;
    }

    finish(won) {
      if (['won','lost','idle'].includes(this.state)) return;
      const targetTime = Math.round(this.level.time * this.config.time);
      const stars = won ? 1 + Number(this.misses === 0) + Number(this.elapsed <= targetTime) : 0;
      const bonus = won ? this.lives * 100 + Math.max(0, targetTime - Math.floor(this.elapsed)) * 5 : 0;
      this.score += bonus;
      this.setState(won ? 'won' : 'lost');
      if (won && !this.settings.reduced) {
        for (let i = 0; i < 7; i++) this.burst(120 + Math.random() * 660, 110 + Math.random() * 220, [this.level.color,'#bde8a1','#e6c683'][i % 3], 20);
      }
      this.emitHUD();
      this.emit('sound', won ? 'win' : 'gameover');
      this.emit('finish', {won, endless:this.endless, wave:this.wave, id:this.level.id, difficulty:this.difficulty, score:this.score, stars, elapsed:this.elapsed, maxCombo:this.maxCombo, misses:this.misses, collected:this.collected, bonus});
    }
    snapshot() {
      return {state:this.state, endless:this.endless, wave:this.wave, score:this.score || 0, lives:this.lives || 0, elapsed:this.elapsed || 0, combo:this.combo || 0, energy:this.energy || 0, destroyed:this.destroyed || 0, total:this.total || 1, effects:this.effects || {}};
    }
    emitHUD() { this.emit('hud', this.snapshot()); }
    burst(x, y, color, count) {
      if (this.settings.reduced) return;
      for (let i = 0; i < count && this.particles.length < 380; i++) {
        const angle = Math.random() * Math.PI * 2, speed = 30 + Math.random() * 160;
        this.particles.push({x, y, vx:Math.cos(angle) * speed, vy:Math.sin(angle) * speed, life:.35 + Math.random() * .35, maxLife:.7, size:2 + Math.random() * 3, color});
      }
    }
    updateVisualEffects(dt) {
      for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt; p.life -= dt; }
      this.particles = this.particles.filter(p => p.life > 0);
      for (const f of this.floats) { f.y -= 35 * dt; f.life -= dt; }
      this.floats = this.floats.filter(f => f.life > 0);
      for (const r of this.rings) { r.radius += 460 * dt; r.life -= dt; }
      this.rings = this.rings.filter(r => r.life > 0);
    }

    draw() {
      const c = this.ctx, day = this.dayBlend;
      c.clearRect(0, 0, W, H);
      c.fillStyle = mixColor('0c141f','eef3e9',day);
      c.fillRect(0, 0, W, H);
      c.strokeStyle = mixColor('1b2937','dbe3d4',day);
      c.lineWidth = .6;
      c.globalAlpha = .6;
      for (let x = 20; x < W; x += 40) {
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
      }
      for (let y = 25; y < H; y += 40) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
      }
      c.globalAlpha = 1;
      // A small sun / moon makes the day-night change visible inside the arena too.
      c.save();
      c.globalAlpha = .18;
      c.fillStyle = day > .5 ? '#d09e44' : '#adc8e3';
      c.beginPath(); c.arc(820, 43, 14, 0, Math.PI * 2); c.fill();
      if (day < .5) { c.fillStyle = mixColor('0c141f','eef3e9',day); c.beginPath(); c.arc(827, 38, 13, 0, Math.PI * 2); c.fill(); }
      c.restore();
      if (day < .8) {
        c.fillStyle = '#adc8e3';
        for (let i = 0; i < 28; i++) {
          c.globalAlpha = (1 - day) * (.12 + (i % 4) * .045);
          c.fillRect((i * 137 + 33) % W, (i * 67 + 22) % 430, 1.5, 1.5);
        }
        c.globalAlpha = 1;
      }
      const palette = [this.level.color, '#76b9b6', '#8da7c9', '#b5a0ca', this.level.color, '#81bfa6', '#c2b48c'];
      const dayPalette = ['238b87','509e98','577b9f','8a6a9a','328c84','548c6d','9c8b50'];
      for (const b of this.bricks) {
        if (b.hp <= 0) continue;
        const baseColor = b.steel ? '#596676' : b.explosive ? '#d6aa63' : palette[b.row % palette.length];
        const color = mixColor(baseColor.slice(1),b.steel ? '83917e' : b.explosive ? 'b48135' : dayPalette[b.row % dayPalette.length],day);
        c.save();
        c.fillStyle = color;
        c.globalAlpha = b.steel ? .55 : .68 + Math.min(b.hp, 3) * .08;
        rounded(c,b.x,b.y,b.w,b.h,4); c.fill();
        c.globalAlpha = 1;
        c.fillStyle = '#ffffff27'; rounded(c,b.x + 3,b.y + 2,b.w - 6,2,1); c.fill();
        if (b.flash > 0) { c.globalAlpha = b.flash * .65; c.fillStyle = '#fff'; rounded(c,b.x,b.y,b.w,b.h,4); c.fill(); c.globalAlpha = 1; }
        c.fillStyle = day > .5 ? '#243632' : '#0c1820';
        if (b.explosive) {
          c.fillRect(b.x + b.w / 2 - 4,b.y + b.h / 2 - 1,8,2);
          c.fillRect(b.x + b.w / 2 - 1,b.y + b.h / 2 - 4,2,8);
        } else if (b.steel) {
          c.strokeStyle = '#ffffff40';c.lineWidth = 1;
          c.beginPath();c.moveTo(b.x + 8,b.y + 4);c.lineTo(b.x + 13,b.y + 10);c.moveTo(b.x + b.w - 13,b.y + 4);c.lineTo(b.x + b.w - 8,b.y + 10);c.stroke();
        } else if (b.initialHP > 1) {
          for (let i = 0; i < b.hp; i++) { c.beginPath();c.arc(b.x + b.w / 2 + (i - (b.hp - 1) / 2) * 7,b.y + 8,1.3,0,Math.PI * 2);c.fill(); }
        }
        c.restore();
      }
      for (const o of this.obstacles) {
        c.fillStyle = mixColor('4b6273','8ca69a',day);rounded(c,o.x,o.y,o.w,o.h,6);c.fill();
        c.fillStyle = mixColor('a1bacc','dbe9d6',day);rounded(c,o.x + 8,o.y + 3,o.w - 16,2,1);c.fill();
      }
      if (this.effects.shield) {
        c.save();c.strokeStyle = '#8cbce7';c.shadowColor = '#8cbce7';c.shadowBlur = 12;c.lineWidth = 3;
        c.setLineDash([12,6]);c.beginPath();c.moveTo(12,580);c.lineTo(W - 12,580);c.stroke();c.restore();
      }
      const p = this.paddle;
      c.save();
      c.fillStyle = day > .5 ? '#3c7263' : this.level.color;
      c.shadowColor = this.level.color;c.shadowBlur = this.settings.reduced ? 0 : 17;
      rounded(c,p.x,p.y,p.w,p.h,6);c.fill();
      c.shadowBlur = 0;c.fillStyle = '#ffffff70';rounded(c,p.x + 9,p.y + 3,p.w - 18,2,1);c.fill();
      c.fillStyle = '#ffffff35';rounded(c,p.x + p.w / 2 - 8,p.y + 7,16,2,1);c.fill();c.restore();
      for (const ball of this.balls) {
        for (let i = 0; i < ball.trail.length; i++) {
          const t = ball.trail[i];c.globalAlpha = (i / ball.trail.length) * .2;c.fillStyle = this.level.color;
          c.beginPath();c.arc(t.x,t.y,ball.r * (i / ball.trail.length),0,Math.PI * 2);c.fill();
        }
        c.globalAlpha = 1;c.save();c.shadowColor = this.level.color;c.shadowBlur = this.settings.reduced ? 0 : 16;
        c.fillStyle = day > .5 ? '#356e60' : '#e3fff0';c.beginPath();c.arc(ball.x,ball.y,ball.r,0,Math.PI * 2);c.fill();c.restore();
      }
      for (const drop of this.drops) {
        const def = Neon.powerups[drop.type];c.save();c.translate(drop.x,drop.y);c.fillStyle = def.color;
        c.shadowColor = def.color;c.shadowBlur = this.settings.reduced ? 0 : 12;rounded(c,-13,-13,26,26,7);c.fill();c.shadowBlur = 0;
        c.fillStyle = '#17252c';c.font = 'bold 13px "Microsoft JhengHei", sans-serif';c.textAlign = 'center';c.textBaseline = 'middle';c.fillText(def.short,0,1);c.restore();
      }
      for (const particle of this.particles) {
        c.globalAlpha = clamp(particle.life / particle.maxLife,0,1);c.fillStyle = particle.color;
        c.fillRect(particle.x,particle.y,particle.size,particle.size);
      }
      c.globalAlpha = 1;
      for (const ring of this.rings) {
        c.save();c.globalAlpha = Math.min(1,ring.life);c.strokeStyle = ring.color;c.lineWidth = 2;
        c.beginPath();c.arc(ring.x,ring.y,ring.radius,0,Math.PI * 2);c.stroke();c.restore();
      }
      c.textAlign = 'center';c.font = '12px Consolas, monospace';c.fillStyle = day > .5 ? '#356e60' : '#d5edbd';
      for (const f of this.floats) { c.globalAlpha = Math.min(1,f.life * 2);c.fillText(f.text,f.x,f.y); }
      c.globalAlpha = 1;
    }
  }
  Neon.Engine = Engine;
})();
