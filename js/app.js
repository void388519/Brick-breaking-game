/* UI, local records, accessible dialogs, synthesized audio and input routing. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const pad = n => String(n).padStart(2,'0');
  const formatTime = seconds => `${pad(Math.floor(seconds / 60))}:${pad(Math.floor(seconds % 60))}`;
  const number = n => Math.floor(n).toLocaleString('en-US');
  const key = 'neon_breakout_v2';
  const defaults = {theme:'auto',difficulty:'normal',sound:true,volume:35,reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches};
  let persistent = true, audio, view = 'levels', selectedId = 1, themeDay = false;
  let saveTimer, lastCombo = 0, shownScore = 0, targetScore = 0, scoreRAF = 0;
  const pendingLayouts = new Map(Neon.levels.map(l => [l.id,Neon.generateLayout(l)]));
  const freshData = () => ({version:2,settings:{...defaults},records:{},endless:{},metrics:{combo:0,powerups:0},unlocked:[],legacyHigh:0});
  let data = freshData();
  // Validate saved values: malformed / unavailable storage must not stop the game.
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && saved.version === 2) {
      const s = saved.settings || {};
      data.settings.theme = ['auto','day','night'].includes(s.theme) ? s.theme : defaults.theme;
      data.settings.difficulty = ['easy','normal','hard'].includes(s.difficulty) ? s.difficulty : defaults.difficulty;
      for (const name of ['sound','reduced']) if (typeof s[name] === 'boolean') data.settings[name] = s[name];
      if (Number.isFinite(s.volume)) data.settings.volume = Math.max(0,Math.min(100,s.volume));
      data.unlocked = Array.isArray(saved.unlocked) ? saved.unlocked.filter(id => Neon.achievements.some(a => a.id === id)) : [];
      for (const metric of ['combo','powerups']) data.metrics[metric] = Math.max(0,Number(saved.metrics?.[metric]) || 0);
      for (const mode of Object.keys(Neon.difficulties)) {
        const endless = saved.endless?.[mode];
        data.endless[mode] = {score:Math.max(0,Number(endless?.score) || 0),wave:Math.max(0,Math.floor(Number(endless?.wave) || 0))};
        data.records[mode] = {};
        for (const level of Neon.levels) {
          const r = saved.records?.[mode]?.[level.id];
          if (!r || typeof r !== 'object') continue;
          data.records[mode][level.id] = {score:Math.max(0,Number(r.score) || 0),stars:Math.max(0,Math.min(3,Math.floor(Number(r.stars) || 0))),time:Number.isFinite(r.time) && r.time >= 0 ? r.time : null};
        }
      }
    }
    data.legacyHigh = Math.max(0,Number(saved?.legacyHigh) || 0,Number(localStorage.getItem('neon_breakout_highscore')) || 0);
  } catch { persistent = false; }

  function save() {
    clearTimeout(saveTimer);
    try { localStorage.setItem(key,JSON.stringify(data)); persistent = true; }
    catch { persistent = false; }
    $('saveStatus').textContent = persistent ? '進度會自動儲存在這台裝置' : '儲存空間無法使用，紀錄暫存至關閉頁面為止';
  }
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(save,400); }
  function record(mode, id) { return data.records[mode]?.[id] || {score:0,stars:0,time:null}; }
  function nextStage() { return Neon.levels.find(l => record(data.settings.difficulty,l.id).stars === 0)?.id || 1; }
  function starHTML(count, large = false) {
    return `<span class="stars${large ? ' result-stars' : ''}" role="img" aria-label="${count} / 3 顆星">${[0,1,2].map(i => `<svg class="icon ${i < count ? 'earned' : ''}" style="--star:${i}" aria-hidden="true"><use href="#i-star"/></svg>`).join('')}</span>`;
  }
  function preview(level, detail = false) {
    let blocks = '';
    const bw = 15.2, gap = 2.5, x0 = 42.5, y0 = 30, bh = 2.9, gy = 1.35;
    const layout = pendingLayouts.get(level.id) || Neon.generateLayout(level);
    layout.forEach((row,r) => [...row].forEach((cell,c) => {
      if (cell === '0') return;
      const x = x0 + c * (bw + gap), y = y0 + r * (bh + gy);
      const color = cell === 'S' ? '#637382' : cell === 'X' ? '#dcb87b' : level.color;
      blocks += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="1" fill="${color}" opacity="${cell === '3' ? 1 : cell === '2' ? .9 : .65}"/>`;
      if (cell === 'X') blocks += `<path d="m${x + 6} ${y + 1.5}h3m-1.5-1v2" stroke="#25343b" stroke-width=".5"/>`;
      if (cell === '2' || cell === '3') blocks += `<circle cx="${x + bw / 2}" cy="${y + 1.5}" r=".5" fill="#25343b"/>`;
    }));
    return `<svg class="preview-svg" viewBox="0 0 260 130" aria-hidden="true">${blocks}<rect x="99" y="121" width="37" height="3" rx="1.5" fill="${level.color}" opacity=".8"/><circle class="preview-ball" cx="149" cy="114" r="2"/>${level.obstacle ? `<rect x="96" y="110" width="34" height="2" rx="1" fill="#7f97a3" opacity=".65"/>` : ''}</svg>`;
  }

  function renderLobby() {
    const mode = data.settings.difficulty, recs = Neon.levels.map(l => record(mode,l.id));
    const cleared = recs.filter(r => r.stars > 0).length;
    const stars = recs.reduce((sum,r) => sum + r.stars,0);
    const best = Math.max(data.legacyHigh,...Object.values(data.records).flatMap(rows => Object.values(rows).map(r => r.score)),0);
    $('completedStat').innerHTML = `${pad(cleared)}<span>/ 08</span>`;
    $('starsStat').innerHTML = `${pad(stars)}<span>/ 24</span>`;
    $('bestStat').textContent = number(best);
    $('endlessWaveRecord').textContent = pad(data.endless[mode]?.wave || 0);
    $('endlessScoreRecord').textContent = number(data.endless[mode]?.score || 0);
    $('progressLabel').textContent = `${Math.round(cleared / 8 * 100)}%`;
    $('journeyBar').style.width = `${cleared / 8 * 100}%`;
    $('journeyCaption').textContent = cleared === 8 ? '八段頻率，已經全部點亮。' : '每一次反彈，都是新的可能。';
    $('quickLabel').textContent = cleared === 8 ? '再次出發' : cleared ? '繼續旅程' : '開始旅程';
    $('quickLevel').textContent = pad(nextStage());
    document.querySelectorAll('[data-action="difficulty"]').forEach(b => {
      const selected = b.dataset.value === mode;
      b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));
    });
    $('levelGrid').innerHTML = Neon.levels.map((l,i) => {
      const r = record(mode,l.id), recommended = l.id === nextStage();
      return `<button class="level-card ${recommended ? 'recommended' : ''}" style="--level-color:${l.color};--order:${i}" data-action="detail" data-id="${l.id}" aria-label="第 ${l.id} 關 ${l.name}，${r.stars} 顆星，${l.tag}"><div class="level-preview">${preview(l)}<span class="stage-number">${pad(l.id)} / 08</span><span class="environment-tag">${icon(l.day ? 'sun' : 'moon')}${l.day ? 'DAY' : 'NIGHT'}</span></div><div class="level-info"><div class="level-topline"><h3>${l.name}</h3>${icon(r.stars ? 'check' : 'arrow')}</div><p class="level-subtitle">${l.english}</p><div class="level-bottomline">${starHTML(r.stars)}<span class="level-tag"><span class="tag-dot"></span>${l.tag}</span></div></div></button>`;
    }).join('');
  }
  function achievementMetrics() {
    const all = Object.values(data.records).flatMap(rows => Object.values(rows));
    return {combo:data.metrics.combo,powerups:data.metrics.powerups,cleared:Neon.levels.filter(l => Object.keys(Neon.difficulties).some(mode => record(mode,l.id).stars > 0)).length,perfect:all.filter(r => r.stars === 3).length,stars:Math.max(0,...Object.keys(Neon.difficulties).map(mode => Neon.levels.reduce((sum,l) => sum + record(mode,l.id).stars,0)))};
  }
  function checkAchievements() {
    const metrics = achievementMetrics();
    let changed = false;
    for (const a of Neon.achievements) if (metrics[a.metric] >= a.target && !data.unlocked.includes(a.id)) {
      data.unlocked.push(a.id);changed = true;
      toast(`成就解鎖：${a.name}`,'trophy');
      $('achievementDot').hidden = false;
    }
    if (changed) saveSoon();
  }
  function renderAchievements() {
    const metrics = achievementMetrics();
    $('achievementCount').textContent = `${data.unlocked.length} / ${Neon.achievements.length}`;
    $('achievementGrid').innerHTML = Neon.achievements.map(a => {
      const earned = data.unlocked.includes(a.id), current = Math.min(a.target,metrics[a.metric]);
      return `<article class="achievement-card ${earned ? 'earned' : ''}"><div class="achievement-symbol">${icon(a.icon)}</div><h3>${a.name}</h3><p>${a.description}</p><div class="progress-track"><div style="width:${current / a.target * 100}%"></div></div><div class="achievement-meta"><span>${earned ? '已解鎖 '+ '✓' : '等待下一次突破'}</span><span>${current} / ${a.target} ${a.unit}</span></div></article>`;
    }).join('');
  }
  function showDetail(id) {
    const l = Neon.levels.find(l => l.id === id);if (!l) return;
    selectedId = id;
    const r = record(data.settings.difficulty,id), config = Neon.difficulties[data.settings.difficulty];
    const count = pendingLayouts.get(l.id).join('').replace(/[0S]/g,'').length;
    $('levelDetail').style.setProperty('--level-color',l.color);
    $('levelDetail').innerHTML = `<div class="detail-preview">${preview(l,true)}<span class="stage-number">STAGE ${pad(l.id)} / 08</span><span class="environment-tag">${icon(l.day ? 'sun' : 'moon')}${l.day ? 'DAY' : 'NIGHT'}</span></div><div class="detail-body"><div class="eyebrow">${l.english} / ${l.tag}</div><div class="detail-title-row"><h2 id="detailTitle">${l.name}</h2>${starHTML(r.stars)}</div><p>${l.description}</p><div class="detail-facts"><div><small>可破壞磚塊</small><strong>${count}</strong></div><div><small>${config.name} · 最佳得分</small><strong>${number(r.score)}</strong></div><div><small>最快通關</small><strong>${r.time === null ? '— —' : formatTime(r.time)}</strong></div></div><div class="detail-goals"><span>${icon('star')}清除全部可破壞磚塊</span><span>${icon('star')}全程不讓任何一顆球落下</span><span>${icon('star')}${formatTime(Math.round(l.time * config.time))} 內完成關卡</span></div><button class="button primary full-width" data-action="start" data-id="${id}">${icon('play')}開始挑戰 · ${config.name}${icon('arrow')}</button><div class="detail-note">18 列 × 10 欄 · 每次重新生成 · ${config.lives} 點生命</div></div>`;
    openDialog('levelDialog');
  }

  function tone(name) {
    if (!data.settings.sound || data.settings.volume === 0) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!audio) audio = new Audio();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      const frequencies = {paddle:[330,470],brick:[600,820],steel:[170,220],tick:[440,440],launch:[360,720],power:[520,1040],lose:[210,80],pulse:[120,760],win:[523,1046],gameover:[190,65]};
      const [from,to] = frequencies[name] || [440,660];
      const long = ['win','gameover','pulse'].includes(name), duration = long ? .36 : .09;
      const osc = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
      osc.type = name === 'brick' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(from,now);osc.frequency.exponentialRampToValueAtTime(to,now + duration);
      gain.gain.setValueAtTime(data.settings.volume / 100 * .14,now);
      gain.gain.exponentialRampToValueAtTime(.0001,now + duration);
      osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now + duration + .01);
      osc.onended = () => { osc.disconnect();gain.disconnect(); };
    } catch { /* Audio is optional; browser autoplay restrictions must not block play. */ }
  }
  function toast(message, symbol = 'check') {
    const el = document.createElement('div');el.className = 'toast';
    el.innerHTML = icon(symbol);
    const span = document.createElement('span');span.textContent = message;el.append(span);
    if ($('toastStack').children.length >= 3) $('toastStack').firstElementChild.remove();
    $('toastStack').append(el);
    setTimeout(() => { el.classList.add('exiting');setTimeout(() => el.remove(),300); },3100);
  }
  function updateTheme(day = themeDay) {
    themeDay = data.settings.theme === 'auto' ? day : data.settings.theme === 'day';
    document.documentElement.dataset.theme = themeDay ? 'day' : 'night';
    const automatic = data.settings.theme === 'auto';
    $('themeBtn').innerHTML = `${icon(themeDay ? 'sun' : 'moon')}<span>${automatic ? '自動 · ' : ''}${themeDay ? '日間' : '夜間'}</span>`;
    $('themeBtn').setAttribute('aria-label',`目前${automatic ? '自動' : ''}${themeDay ? '日間' : '夜間'}，切換至${themeDay ? '夜間' : '日間'}`);
    $('environmentLabel').textContent = themeDay ? 'DAYLIGHT FREQUENCY' : 'NIGHT FREQUENCY';
    document.querySelector('meta[name="theme-color"]').content = themeDay ? '#f3f3ec' : '#0c1017';
    engine.setTheme(themeDay);
  }
  function syncSettings() {
    const s = data.settings;
    $('themeSelect').value = s.theme;$('soundSetting').checked = s.sound;
    $('motionSetting').checked = s.reduced;$('volumeSetting').value = s.volume;
    $('soundBtn').innerHTML = icon(s.sound ? 'volume' : 'muted');
    $('soundBtn').setAttribute('aria-pressed',String(s.sound));
    $('soundBtn').setAttribute('aria-label',s.sound ? '關閉音效' : '開啟音效');
    const reduced = s.reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.toggle('reduce-motion',reduced);
    engine.setReduced(reduced);
    updateTheme();
  }
  const engine = new Neon.Engine($('gameCanvas'),{
    hud:updateHUD,state:onGameState,countdown:showCountdown,sound:tone,
    notice:message => toast(message,'bolt'),
    shake:() => {
      if (engine.settings.reduced) return;
      $('arena').classList.remove('shake');void $('arena').offsetWidth;$('arena').classList.add('shake');
    },
    combo:value => { if (value > data.metrics.combo) { data.metrics.combo = value;checkAchievements();saveSoon(); } },
    powerup:() => { data.metrics.powerups++;checkAchievements();saveSoon(); },
    cycle:day => { if (data.settings.theme === 'auto') updateTheme(day); },
    finish:onFinish,
    waveStart:wave => {
      $('stageTitle').textContent = `無盡頻率 · 第 ${pad(wave)} 波`;
      $('stageEyebrow').textContent = 'ENDLESS FREQUENCY / RANDOM 18 × 28';
      $('stageDescription').textContent = `第 ${wave} 波全新隨機磚陣。清空後自動進入下一波；總分與生命保留，每完成 3 波補給 1 點生命。`;
      const old = data.endless[engine.difficulty] || {score:0,wave:0};
      data.endless[engine.difficulty] = {score:Math.max(old.score,engine.score),wave:Math.max(old.wave,wave)};
      saveSoon();
    },
    waveClear:result => {
      showOverlay(`<span class="overlay-badge">${icon('bolt')}</span><h2>第 ${pad(result.wave)} 波，突破。</h2><p>波次獎勵 +${number(result.bonus)}${result.lifeup ? ' · 生命補給 +1' : ''}<br>3 秒後自動進入下一波，分數與生命持續累積。</p><div class="overlay-buttons"><button class="button primary" data-action="next-wave">立即迎接下一波${icon('arrow')}</button><button class="button secondary" data-action="pause">暫停一下</button></div>`);
    }
  });

  function updateHUD(h) {
    targetScore = h.score;
    if (!scoreRAF) scoreRAF = requestAnimationFrame(animateScore);
    $('livesVal').textContent = '♥ '.repeat(Math.max(0,h.lives)).trim() || '—';
    $('livesVal').setAttribute('aria-label',`${h.lives} 點生命`);
    $('timeVal').textContent = formatTime(h.elapsed);
    $('comboVal').textContent = `×${h.combo}`;
    if (h.combo !== lastCombo && h.combo > 1 && !engine.settings.reduced) {
      $('comboWrap').classList.remove('hot');void $('comboWrap').offsetWidth;$('comboWrap').classList.add('hot');
    }
    lastCombo = h.combo;
    $('energyBar').style.width = `${h.energy}%`;$('energyVal').textContent = `${Math.floor(h.energy)}%`;
    $('pulseBtn').disabled = h.energy < 100 || h.state !== 'playing';
    $('brickCount').textContent = `${h.destroyed} / ${h.total}`;
    $('brickBar').style.width = `${h.destroyed / h.total * 100}%`;
    const effects = [];
    if (h.effects.expand > 0) effects.push(`寬板 ${Math.ceil(h.effects.expand)}s`);
    if (h.effects.slow > 0) effects.push(`慢速 ${Math.ceil(h.effects.slow)}s`);
    if (h.effects.shield) effects.push('護盾 ×1');
    const effectMarkup = effects.length ? effects.map(e => `<span class="effect-pill">${e}</span>`).join('') : '尚無生效中的道具';
    if ($('activeEffects').innerHTML !== effectMarkup) $('activeEffects').innerHTML = effectMarkup;
  }
  function animateScore() {
    shownScore += (targetScore - shownScore) * .24;
    if (Math.abs(targetScore - shownScore) < 1 || engine.settings.reduced) shownScore = targetScore;
    $('scoreVal').textContent = String(Math.floor(shownScore)).padStart(6,'0');
    scoreRAF = shownScore === targetScore ? 0 : requestAnimationFrame(animateScore);
  }
  function showCountdown(count) {
    $('countdown').hidden = false;$('countdown').textContent = count;
    if (!engine.settings.reduced) $('countdown').animate([{opacity:.2,transform:'scale(1.3)'},{opacity:1,transform:'scale(1)'}],{duration:280,easing:'ease-out'});
  }
  function onGameState(state) {
    $('launchHint').hidden = state !== 'ready';
    $('countdown').hidden = state !== 'countdown';
    $('pauseBtn').disabled = !['playing','ready','countdown','waveclear','paused'].includes(state);
    $('pauseBtn').innerHTML = icon(state === 'paused' ? 'play' : 'pause');
    $('pauseBtn').setAttribute('aria-label',state === 'paused' ? '繼續遊戲' : '暫停遊戲');
    if (state === 'ready') $('launchTitle').textContent = engine.misses ? '調整呼吸，再來一球。' : '準備好進入頻率了嗎？';
    if (['playing','ready','countdown','waveclear','idle'].includes(state)) $('gameOverlay').hidden = true;
  }
  function showOverlay(markup) {
    $('overlayContent').innerHTML = markup;$('gameOverlay').hidden = false;
    $('overlayContent').querySelector('button')?.focus({preventScroll:true});
  }
  function pauseGame() {
    if (!engine.pause()) return;
    showOverlay(`<span class="overlay-badge">${icon('pause')}</span><h2>留一點時間，給呼吸。</h2><p>球場已暫停。準備好時，我們再繼續。</p><div class="overlay-buttons"><button class="button primary" data-action="resume">${icon('play')}繼續遊戲</button><button class="button secondary" data-action="restart">${icon('restart')}重新挑戰</button></div><button class="overlay-secondary" data-action="leave">返回關卡大廳</button>`);
  }
  function startGame(id) {
    if (document.querySelector('dialog[open]')) document.querySelector('dialog[open]').close();
    selectedId = id;
    const endless = id === 'endless';
    const l = endless ? Neon.endlessLevel(1) : Neon.levels.find(l => l.id === id);if (!l) return;
    view = 'game';$('lobbyView').hidden = true;$('gameView').hidden = false;
    $('stageTitle').textContent = l.name;$('stageEyebrow').textContent = endless ? 'ENDLESS FREQUENCY / RANDOM 18 × 28' : `STAGE ${pad(id)} / 08 · ${l.english}`;
    $('stageDescription').textContent = l.description;
    const config = Neon.difficulties[data.settings.difficulty];
    $('gameDifficulty').textContent = `${endless ? '無盡 · ' : ''}${config.name}`;
    $('starGoals').innerHTML = (endless ? ['18 列 × 28 欄，逐波隨機','每完成 3 波，生命 +1','分數與生命跨波保留'] : [`清除全部可破壞磚塊`,'全程不讓任何球落下',`${formatTime(Math.round(l.time * config.time))} 內完成關卡`]).map(s => `<li>${icon(endless ? 'bolt' : 'star')}${s}</li>`).join('');
    shownScore = 0;targetScore = 0;$('scoreVal').textContent = '000000';
    engine.start(id,data.settings.difficulty,endless ? null : pendingLayouts.get(id));
    if (!endless) pendingLayouts.set(id,Neon.generateLayout(l));
    tone('tick');
    $('gameCanvas').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
    document.querySelectorAll('.nav-link[data-tab]').forEach(b => {b.classList.remove('active');b.removeAttribute('aria-current');});
  }
  function onFinish(result) {
    const {id,difficulty,won,stars,score,elapsed} = result;
    if (result.endless) {
      const old = data.endless[difficulty] || {score:0,wave:0};
      data.endless[difficulty] = {score:Math.max(old.score,score),wave:Math.max(old.wave,result.wave)};
      checkAchievements();save();
      showOverlay(`<span class="overlay-badge"><span class="result-infinity">∞</span></span><h2>抵達第 ${pad(result.wave)} 波。</h2><p>${score > old.score ? '新的無盡模式最高分！' : '下一次，看看能走得更遠嗎？'}</p><div class="result-stats"><div><small>累積得分</small><strong>${number(score)}</strong></div><div><small>存活時間</small><strong>${formatTime(elapsed)}</strong></div><div><small>最高連擊</small><strong>×${result.maxCombo}</strong></div></div><div class="overlay-buttons"><button class="button primary" data-action="endless">${icon('restart')}再次挑戰</button><button class="button secondary" data-action="leave">回到選關</button></div>`);
      return;
    }
    data.records[difficulty] ||= {};
    const old = record(difficulty,id);
    data.records[difficulty][id] = {score:Math.max(old.score,score),stars:Math.max(old.stars,stars),time:won ? Math.min(old.time ?? Infinity,elapsed) : old.time};
    checkAchievements();save();
    const last = id === Neon.levels.length;
    const title = won ? last ? '破曉了。你做到了！' : '漂亮，又突破一關。' : '這一球，留給下次。';
    const description = won ? `第 ${pad(id)} 關完成${score > old.score ? ' · 刷新個人最高分！' : ''}` : '每一次嘗試，都讓下一次更靠近。';
    const buttons = won && !last ? `<button class="button primary" data-action="next">下一個頻率${icon('arrow')}</button><button class="button secondary" data-action="leave">回到選關</button>` : `<button class="button primary" data-action="${won ? 'leave' : 'restart'}">${icon(won ? 'grid' : 'restart')}${won ? '回到關卡大廳' : '再次挑戰'}</button><button class="button secondary" data-action="${won ? 'restart' : 'leave'}">${won ? '重玩本關' : '回到選關'}</button>`;
    showOverlay(`<span class="overlay-badge">${icon(won ? 'trophy' : 'heart')}</span><h2>${title}</h2><p>${description}</p>${won ? starHTML(stars,true) : ''}<div class="result-stats"><div><small>本次得分</small><strong>${number(score)}</strong></div><div><small>遊戲時間</small><strong>${formatTime(elapsed)}</strong></div><div><small>最高連擊</small><strong>×${result.maxCombo}</strong></div></div><div class="overlay-buttons">${buttons}</div>${won && stars < 3 ? `<button class="overlay-secondary" data-action="restart">${result.misses > 0 ? '不失誤' : '在目標時間內完成'}，再多拿一顆星</button>` : ''}`);
  }
  function goLobby(tab = 'levels') {
    saveEndlessRun();
    engine.stop();save();view = tab;
    $('lobbyView').hidden = false;$('gameView').hidden = true;
    $('levelsPanel').hidden = tab !== 'levels';$('achievementsPanel').hidden = tab !== 'achievements';
    document.querySelectorAll('.nav-link[data-tab]').forEach(b => {
      const selected = b.dataset.tab === tab;b.classList.toggle('active',selected);
      if (selected) b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    });
    renderLobby();if (tab === 'achievements') {renderAchievements();$('achievementDot').hidden = true;}
    if (data.settings.theme === 'auto') updateTheme(false);
    window.scrollTo({top:0,behavior:'instant'});
  }
  function saveEndlessRun() {
    if (!engine.endless || !engine.level) return;
    const old = data.endless[engine.difficulty] || {score:0,wave:0};
    data.endless[engine.difficulty] = {score:Math.max(old.score,engine.score),wave:Math.max(old.wave,engine.wave)};
  }
  // Leaving / restarting pauses first and offers a reversible in-game choice.
  function confirmGameAction(action) {
    if (view !== 'game' || ['idle','won','lost','ready'].includes(engine.state)) {
      if (action === 'restart') startGame(selectedId);else goLobby(action === 'achievements' ? action : 'levels');
      return;
    }
    if (engine.state !== 'paused') engine.pause();
    const restart = action === 'restart';
    showOverlay(`<span class="overlay-badge">${icon(restart ? 'restart' : 'back')}</span><h2>${restart ? '再試一種可能？' : '先在這一站休息？'}</h2><p>${restart ? '本次分數將重新計算，已儲存的紀錄會保留。' : '本次進度尚未通關；離開後，下次會從關卡開頭開始。'}</p><div class="overlay-buttons"><button class="button primary" data-action="${restart ? 'restart-confirm' : 'leave-confirm'}" data-tab="${action}">${restart ? '重新開始本關' : '返回大廳'}</button><button class="button secondary" data-action="resume">繼續遊戲</button></div>`);
  }
  function openDialog(id) {
    if (document.querySelector('dialog[open]')) return;
    if (view === 'game' && ['ready','countdown','playing','waveclear'].includes(engine.state)) pauseGame();
    if (id === 'settingsDialog') syncSettings();
    $(id).showModal();
  }
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click',e => {
      if (e.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
    });
  });

  document.addEventListener('click',async event => {
    const b = event.target.closest('[data-action]');if (!b || b.disabled) return;
    const action = b.dataset.action;
    if (action === 'home') {event.preventDefault();confirmGameAction('levels');}
    else if (action === 'tab') {if (view === 'game') confirmGameAction(b.dataset.tab);else goLobby(b.dataset.tab);}
    else if (action === 'difficulty') {data.settings.difficulty = b.dataset.value;renderLobby();save();tone('tick');}
    else if (action === 'detail') showDetail(Number(b.dataset.id));
    else if (action === 'start') startGame(Number(b.dataset.id));
    else if (action === 'quickstart') startGame(nextStage());
    else if (action === 'endless') {saveEndlessRun();startGame('endless');}
    else if (action === 'next-wave') engine.nextWave();
    else if (action === 'close-dialog') b.closest('dialog')?.close();
    else if (action === 'guide') openDialog('guideDialog');
    else if (action === 'settings') openDialog('settingsDialog');
    else if (action === 'theme') {
      data.settings.theme = themeDay ? 'night' : 'day';syncSettings();save();
      toast(`已切換至${themeDay ? '日間' : '夜間'}模式；設定中可開啟自動晝夜`,themeDay ? 'sun' : 'moon');
    }
    else if (action === 'sound') {data.settings.sound = !data.settings.sound;syncSettings();save();tone('tick');}
    else if (action === 'pause') {if (engine.state === 'paused') engine.resume();else pauseGame();}
    else if (action === 'resume') {engine.resume();$('gameCanvas').focus({preventScroll:true});}
    else if (action === 'restart') confirmGameAction('restart');
    else if (action === 'restart-confirm') startGame(selectedId);
    else if (action === 'leave') confirmGameAction('levels');
    else if (action === 'leave-confirm') goLobby(b.dataset.tab === 'achievements' ? 'achievements' : 'levels');
    else if (action === 'next') {if (selectedId < Neon.levels.length) startGame(selectedId + 1);}
    else if (action === 'pulse' || action === 'launch') engine.launch();
    else if (action === 'fullscreen') {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if ($('gameView').requestFullscreen) await $('gameView').requestFullscreen();
        else toast('此瀏覽器不支援全螢幕模式');
      } catch { toast('無法開啟全螢幕；仍可正常遊玩'); }
    }
  });
  for (const [id,setting] of [['themeSelect','theme'],['soundSetting','sound'],['motionSetting','reduced'],['volumeSetting','volume']]) {
    $(id).addEventListener('input',e => {
      data.settings[setting] = setting === 'volume' ? Number(e.target.value) : ['sound','reduced'].includes(setting) ? e.target.checked : e.target.value;
      if (setting === 'theme' && data.settings.theme === 'auto' && engine.level && view === 'game') themeDay = engine.cycle % 2 === 0 ? engine.level.day : !engine.level.day;
      syncSettings();save();
    });
  }
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',syncSettings);
  const canvas = $('gameCanvas');
  canvas.addEventListener('pointermove',e => {
    if (e.pointerType !== 'mouse' && !canvas.hasPointerCapture(e.pointerId)) return;
    const rect = canvas.getBoundingClientRect();engine.setTarget((e.clientX - rect.left) * 900 / rect.width);
  });
  canvas.addEventListener('pointerdown',e => {
    if (!['playing','ready'].includes(engine.state)) return;
    if (e.pointerType !== 'mouse') canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();engine.setTarget((e.clientX - rect.left) * 900 / rect.width);
    canvas.focus({preventScroll:true});
    if (engine.state === 'ready') engine.launch();
  });
  for (const [action,side] of [['move-left','left'],['move-right','right']]) {
    const b = document.querySelector(`[data-action="${action}"]`);
    b.addEventListener('pointerdown',e => {if (view === 'game') {b.setPointerCapture(e.pointerId);engine.keys[side] = true;}});
    for (const name of ['pointerup','pointercancel','lostpointercapture']) b.addEventListener(name,() => {engine.keys[side] = false;});
  }
  document.addEventListener('keydown',e => {
    if (view !== 'game' || document.querySelector('dialog[open]') || ['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
    const key = e.key.toLowerCase();
    if (key === ' ' && ['BUTTON','A'].includes(e.target.tagName)) return;
    if (['arrowleft','arrowright',' ','a','d','p','escape'].includes(key)) e.preventDefault();
    if (key === 'arrowleft' || key === 'a') engine.keys.left = true;
    if (key === 'arrowright' || key === 'd') engine.keys.right = true;
    if (e.repeat) return;
    if (key === ' ' && !['BUTTON','A'].includes(e.target.tagName)) engine.launch();
    if (key === 'p' || key === 'escape') {if (engine.state === 'paused') engine.resume();else pauseGame();}
  });
  document.addEventListener('keyup',e => {
    if (['arrowleft','a'].includes(e.key.toLowerCase())) engine.keys.left = false;
    if (['arrowright','d'].includes(e.key.toLowerCase())) engine.keys.right = false;
  });
  const autoPause = () => {engine.clearInput();if (view === 'game' && ['playing','countdown','waveclear'].includes(engine.state)) pauseGame();saveEndlessRun();save();};
  window.addEventListener('blur',autoPause);
  document.addEventListener('visibilitychange',() => {if (document.hidden) autoPause();});
  window.addEventListener('pagehide',() => {saveEndlessRun();save();});
  window.addEventListener('resize',() => engine.resize());
  document.addEventListener('fullscreenchange',() => {
    $('gameView').classList.toggle('is-fullscreen',Boolean(document.fullscreenElement));
    if (view === 'game' && engine.state === 'playing') pauseGame();
  });
  const powerMarkup = Object.values(Neon.powerups).map(p => `<div class="power-row"><span class="power-symbol" style="--power-color:${p.color}">${p.short}</span>${p.name}<small>${p.description}</small></div>`).join('');
  $('powerLegend').innerHTML = powerMarkup;
  $('guidePowers').innerHTML = Object.values(Neon.powerups).map(p => `<div class="power-row"><span class="power-symbol" style="--power-color:${p.color}">${p.short}</span>${p.name}</div>`).join('');
  renderLobby();renderAchievements();syncSettings();save();
})();
