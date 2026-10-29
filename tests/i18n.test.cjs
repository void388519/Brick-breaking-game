const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const context = {};
context.window = context;
vm.createContext(context);
for (const file of ['levels.js','i18n.js']) vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'),context);
const {i18n,levels,powerups,achievements} = context.Neon;
const han = /\p{Script=Han}/u;

test('all translation entries have English and Simplified Chinese without duplicate sources',() => {
  const seen = new Set();
  for(const [source,en,hans] of i18n.entries) {
    assert.ok(source.trim());assert.ok(en.trim());assert.ok(hans.trim());
    assert.equal(seen.has(source),false,source);seen.add(source);
    assert.equal(han.test(en),false,en);
    assert.equal(i18n.text(source,'zh-Hant'),source);
    assert.equal(i18n.text(source,'en'),en);
    assert.equal(i18n.text(source,'zh-Hans'),hans);
  }
});
test('HTML text and accessible labels have complete English translations',() => {
  const html=fs.readFileSync(path.join(root,'neon_breakout_arcade.html'),'utf8').replace(/<noscript[\s\S]*?<\/noscript>/g,'');
  const literals=[...html.matchAll(/>([^<>]+)</g)].map(m=>m[1].trim());
  literals.push(...[...html.matchAll(/(?:aria-label|title)="([^"]+)"/g)].map(m=>m[1]));
  for(const literal of literals.filter(s=>han.test(s) && !['繁體中文','简体中文'].includes(s))) {
    assert.equal(han.test(i18n.text(literal,'en')),false,literal);
  }
});
test('every stage, power-up and achievement is translated',() => {
  const strings=[];
  for(const l of levels) strings.push(l.name,l.tag,l.description);
  for(const p of Object.values(powerups)) strings.push(p.name,p.short,p.description);
  for(const a of achievements) strings.push(a.name,a.description);
  for(const source of strings) {
    assert.equal(han.test(i18n.text(source,'en')),false,source);
    assert.ok(i18n.text(source,'zh-Hans'));
  }
});
test('runtime scores, wave numbers, timers and nested names translate with their values intact',() => {
  const cases=[
    ['第 8 關 破曉核心，3 顆星，終極挑戰','Level 8: Dawn Core, 3 stars, Final challenge','第 8 关 破晓核心，3 颗星，终极挑战'],
    ['無盡頻率 · 第 28 波','Endless · Wave 28','无尽频率 · 第 28 波'],
    ['第 28 波，突破。','Wave 28 cleared.','第 28 波，突破。'],
    ['波次獎勵 +2,490 · 生命補給 +1','Wave bonus +2,490 · Extra life +1','波次奖励 +2,490 · 生命补给 +1'],
    ['第 01 關完成 · 刷新個人最高分！','Level 01 complete · New personal best!','第 01 关完成 · 刷新个人最高分！'],
    ['03:25 內完成關卡','Clear within 03:25','03:25 内完成关卡'],
    ['獲得 延長擋板！','Power-up: Wide paddle!','获得 延长挡板！'],
    ['成就解鎖：第一道回響','Achievement unlocked: First Echo','成就解锁：第一道回响'],
    ['寬板 12s','Wide 12s','宽板 12s'],['5 點生命','5 lives','5 点生命'],
    ['目前自動夜間，切換至日間','Auto Night. Switch to Day.','当前自动夜间，切换至日间'],
    ['無盡 · 標準','Endless · Normal','无尽 · 标准'],
    ['開始挑戰 · 挑戰','Play · Expert','开始挑战 · 挑战'],
    ['1 / 8 關','1 / 8 levels','1 / 8 关']
  ];
  for(const [source,en,hans] of cases) {
    assert.equal(i18n.text(source,'en'),en);
    assert.equal(i18n.text(source,'zh-Hans'),hans);
    assert.equal(i18n.text(source,'zh-Hant'),source);
  }
});
test('translation preserves surrounding spacing, symbols and unknown content',() => {
  assert.equal(i18n.text('  關卡大廳  ','en'),'  Levels  ');
  assert.equal(i18n.text('000123','en'),'000123');
  assert.equal(i18n.text('♥ ◷ ▱ ×6','en'),'♥ ◷ ▱ ×6');
  assert.equal(i18n.text('關卡大廳','unsupported'),'關卡大廳');
});
