const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
function create(id = 1, mode = 'normal', callbacks = {}) {
  const deterministicMath = Object.create(Math);
  let seed = 3947;
  deterministicMath.random = () => {seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;return seed / 4294967296;};
  const sandbox = {window:{devicePixelRatio:1},Math:deterministicMath,requestAnimationFrame:() => 1};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of ['levels.js','game.js']) vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'),sandbox);
  const canvas = {getContext:() => ({setTransform(){}})};
  const engine = new sandbox.Neon.Engine(canvas,callbacks);
  engine.start(id,mode);
  return {engine, Neon:sandbox.Neon};
}
function advance(engine, seconds) {for (let i = 0; i < Math.round(seconds * 120); i++) engine.step(1/120);}

test('all eight layouts are distinct, in bounds and playable at all difficulties',() => {
  const {Neon} = create();
  assert.equal(Neon.levels.length,8);
  assert.equal(new Set(Neon.levels.map(l => l.map.join(''))).size,8);
  for (const l of Neon.levels) {
    assert.ok(l.map.every(row => /^[0123XS]{10}$/.test(row)),l.name);
    for (const mode of ['easy','normal','hard']) {
      const {engine:e} = create(l.id,mode);
      assert.ok(e.total > 20);
      assert.equal(e.layout.length,18);
      assert.ok(e.layout.every(row => row.length === 10));
      assert.ok(e.bricks.every(b => b.x >= 0 && b.x + b.w <= 900 && b.y + b.h < 415));
      assert.ok(e.obstacles.every(o => o.y > 415));
      assert.equal(e.total,e.bricks.filter(b => !b.steel).length);
      e.launch();advance(e,2.2);assert.equal(e.state,'playing');
      assert.ok(e.balls.every(b => Number.isFinite(b.x) && Number.isFinite(b.vx)));
    }
  }
});
test('countdown and pause freeze simulation, effect timers and stage time',() => {
  const {engine:e} = create();
  e.launch();advance(e,1);
  const countdown = e.countdown;e.pause();advance(e,10);
  assert.equal(e.countdown,countdown);assert.equal(e.elapsed,0);
  e.resume();advance(e,1.3);assert.equal(e.state,'playing');
  e.effects.slow = 10;const elapsed = e.elapsed, y = e.balls[0].y;
  e.pause();advance(e,10);
  assert.equal(e.elapsed,elapsed);assert.equal(e.balls[0].y,y);assert.equal(e.effects.slow,10);
});
test('circle collision reflects by the contacted side and separates from the brick',() => {
  const {engine:e} = create();const rect = {x:100,y:100,w:70,h:22};
  const top = {x:120,y:96,r:7,vx:15,vy:100};
  assert.ok(e.collide(top,rect));assert.ok(top.vy < 0);assert.ok(top.y + top.r < 100);
  const left = {x:97,y:111,r:7,vx:100,vy:15};
  assert.ok(e.collide(left,rect));assert.ok(left.vx < 0);assert.ok(left.x + left.r < 100);
  assert.equal(e.collide({x:50,y:50,r:7},rect),false);
});
test('armor requires several hits, steel cannot be destroyed, explosion chains terminate',() => {
  const {engine:e} = create(8);
  const armor = e.bricks.find(b => b.hp === 3);e.hitBrick(armor);assert.equal(armor.hp,2);
  e.hitBrick(armor);e.hitBrick(armor);assert.equal(armor.hp,0);
  const before = e.destroyed;e.hitBrick(armor);assert.equal(e.destroyed,before);
  const explosive = e.bricks.find(b => b.explosive);e.hitBrick(explosive);
  assert.ok(e.destroyed > before + 1);assert.ok(e.destroyed <= e.total);
  const {engine:s} = create(7);const steel = s.bricks.find(b => b.steel);
  s.hitBrick(steel);assert.equal(steel.hp,Infinity);assert.equal(s.destroyed,0);
});
test('all five power-ups apply; multiball and extra lives are capped',() => {
  const {engine:e} = create();
  e.activate('expand');e.activate('slow');e.activate('shield');
  assert.equal(e.effects.expand,15);assert.equal(e.effects.slow,10);assert.equal(e.effects.shield,true);
  for(let i=0;i<10;i++){e.activate('life');e.activate('multi');}
  assert.equal(e.lives,6);assert.equal(e.balls.length,6);
  assert.ok(e.balls.every(b => Math.abs(Math.hypot(b.vx,b.vy) - e.level.speed) < .001));
});
test('shield saves one ball, a lost multiball breaks flawless but costs no life',() => {
  const {engine:e} = create();e.setState('playing');
  e.effects.shield = true;
  Object.assign(e.balls[0],{x:20,y:572,vy:330,vx:0});advance(e,.05);
  assert.equal(e.effects.shield,false);assert.ok(e.balls[0].vy < 0);assert.equal(e.misses,0);
  e.activate('multi');const count = e.balls.length;
  Object.assign(e.balls[1],{y:610,vy:330});advance(e,1/120);
  assert.equal(e.balls.length,count - 1);assert.equal(e.lives,3);assert.equal(e.misses,1);
});
test('slow and expand expire using play time; losing all balls ends the run',() => {
  const {engine:e} = create();e.setState('playing');
  e.activate('expand');e.activate('slow');e.effects.expand = .01;e.effects.slow = .01;
  advance(e,.04);assert.equal(e.paddle.w,120);assert.equal(e.effects.slow,0);
  e.lives = 1;Object.assign(e.balls[0],{y:610,vy:330});advance(e,1/120);
  assert.equal(e.state,'lost');assert.equal(e.lives,0);
});
test('energy pulse affects five targets and never damages steel',() => {
  const {engine:e} = create(7);e.setState('playing');
  assert.equal(e.pulse(),false);e.energy=100;
  const steel = e.bricks.filter(b => b.steel);assert.equal(e.pulse(),true);
  assert.ok(e.destroyed >= 1);assert.ok(e.energy < 100);assert.ok(steel.every(b => b.hp===Infinity));
});
test('clearing every destructible brick completes all levels exactly once and excludes steel',() => {
  for(let id=1;id<=8;id++) {
    const results=[];const {engine:e}=create(id,'normal',{finish:r=>results.push(r)});
    e.setState('playing');
    for(const brick of e.bricks) while(!brick.steel && brick.hp>0) e.hitBrick(brick);
    advance(e,1/120);assert.equal(e.state,'won',`level ${id}`);
    assert.equal(e.destroyed,e.total);assert.equal(results[0].stars,3);
    e.finish(true);assert.equal(results.length,1);
    assert.ok(results[0].score>0);
  }
});
test('star awards combine completion, time and flawless independently',() => {
  for(const [misses,time,stars] of [[0,1,3],[1,1,2],[0,10000,2],[1,10000,1]]) {
    let result;const {engine:e}=create(1,'normal',{finish:r=>result=r});
    e.setState('playing');e.misses=misses;e.elapsed=time;e.finish(true);
    assert.equal(result.stars,stars);
  }
});
test('day-night cycle uses elapsed play time and remains unchanged while paused',() => {
  const days=[];const {engine:e}=create(1,'normal',{cycle:day=>days.push(day)});
  e.setState('playing');e.elapsed=44.99;advance(e,.03);
  assert.deepEqual(days,[false,true]);
  e.pause();advance(e,50);assert.equal(days.length,2);
  e.resume();e.elapsed=89.99;advance(e,.03);assert.deepEqual(days,[false,true,false]);
});

test('random generation produces fresh 18 × 10 grids with a playable population in every row',() => {
  const {Neon} = create();
  const seen = new Set();
  for (const level of Neon.levels) for (let i=0;i<30;i++) {
    const layout = Neon.generateLayout(level);
    assert.equal(layout.length,18);
    assert.ok(layout.every(row => /^[0123XS]{10}$/.test(row)));
    assert.ok(layout.every(row => row.replace(/[0S]/g,'').length >= 3));
    for (let c=0;c<10;c++) assert.ok(layout.filter(row=>!['0','S'].includes(row[c])).length>=2);
    for(let r=0;r<18;r++) for(let c=0;c<10;c++) if(layout[r][c]==='S') {
      assert.notEqual(layout[r][c+1],'S');assert.notEqual(layout[r+1]?.[c],'S');
    }
    const serialized=layout.join('');assert.ok(!seen.has(serialized));seen.add(serialized);
  }
  assert.equal(seen.size,240);
});
test('endless mode keeps lives, score and energy across random waves and supplies a life every three clears',() => {
  const waves=[];let finishes=0;
  const {engine:e}=create('endless','normal',{waveStart:w=>waves.push(w),finish:()=>finishes++});
  assert.equal(e.endless,true);assert.equal(e.wave,1);
  const boards=new Set([e.layout.join('')]);
  for(let w=1;w<=5;w++) {
    e.setState('playing');e.score+=100;e.energy=80;
    for(const brick of e.bricks) while(!brick.steel && brick.hp>0) e.hitBrick(brick);
    advance(e,1/120);assert.equal(e.state,'waveclear');
    assert.equal(e.wave,w);const score=e.score, lives=e.lives,energy=e.energy;
    e.pause();advance(e,6);assert.equal(e.wave,w);
    e.resume();advance(e,3.1);
    assert.equal(e.wave,w+1);assert.equal(e.score,score);assert.equal(e.lives,lives);assert.equal(e.energy,energy);
    assert.ok(!boards.has(e.layout.join('')));boards.add(e.layout.join(''));
    assert.equal(e.layout.length,18);
    assert.ok(e.layout.every(row=>row.length===28));
  }
  assert.deepEqual(waves,[1,2,3,4,5,6]);assert.equal(e.lives,4);assert.equal(finishes,0);
  e.setState('playing');e.lives=1;e.balls=[e.newBall()];e.balls[0].y=620;
  advance(e,1/120);assert.equal(e.state,'lost');assert.equal(finishes,1);
});
test('endless difficulty increases but ball speed remains capped for reliable collision steps',() => {
  const {Neon}=create();
  assert.ok(Neon.endlessLevel(2).speed>Neon.endlessLevel(1).speed);
  assert.equal(Neon.endlessLevel(10000).speed,565);
  assert.equal(Neon.endlessLevel(10000).moving,true);
  assert.ok(Neon.endlessLevel(10000).obstacle);
});

test('endless random boards have exactly 18 rows × 28 columns and fit inside the arena',() => {
  const {Neon}=create();
  const seen=new Set();
  for(let wave=1;wave<=24;wave++) {
    const level=Neon.endlessLevel(wave), layout=Neon.generateLayout(level);
    assert.equal(layout.length,18);
    assert.ok(layout.every(row=>/^[0123XS]{28}$/.test(row)));
    for(let c=0;c<28;c++) assert.ok(layout.filter(row=>!['0','S'].includes(row[c])).length>=2);
    assert.ok(!seen.has(layout.join('')));seen.add(layout.join(''));
    const {engine:e}=create('endless');e.level=level;e.buildBoard(layout);
    assert.ok(e.bricks.every(b=>b.x>=0 && b.x+b.w<=900 && b.y+b.h<415));
    assert.equal(e.bricks[0].w,24);
    assert.ok(e.total>100);
  }
  const {engine:campaign}=create(1);
  assert.ok(campaign.layout.every(row=>row.length===10));
  assert.equal(campaign.bricks[0].w,70);
});
