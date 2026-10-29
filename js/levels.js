/* Stage motifs feed fresh boards: 18 × 10 campaign, 18 × 28 endless. */
window.Neon = window.Neon || {};
Neon.levels = [
  {id:1,name:'初始頻率',english:'FIRST FREQUENCY',color:'#6bd8d2',day:false,tag:'經典啟程',time:130,speed:330,description:'用最熟悉的節奏暖身。瞄準擋板邊緣，把球送進磚塊上方，開啟你的第一串連擊。',map:['1111111111','1111111111','1111111111','0111111110','0011111100']},
  {id:2,name:'日光稜鏡',english:'SOLAR PRISM',color:'#e9be79',day:true,tag:'稜鏡陣列',time:145,speed:345,description:'日光折射成一道菱形陣列。中央的爆破磚是捷徑，擊中它，讓光線向外擴散。',map:['0000110000','0001221000','0011XX1100','0111111110','0011221100','0001111000','0000110000']},
  {id:3,name:'潮汐迴廊',english:'TIDAL PASSAGE',color:'#70b7ed',day:true,tag:'迴廊穿梭',time:160,speed:360,obstacle:'tide',description:'潮汐擋板在下方來回移動。抓住空隙穿過雙側迴廊，利用鋼磚反彈出意想不到的角度。',map:['1111001111','1221001221','1111001111','0011SS1100','0111001110','0111001110']},
  {id:4,name:'暮色雙塔',english:'TWILIGHT TOWERS',color:'#ba9be5',day:false,tag:'強化裝甲',time:175,speed:375,description:'暮色中，兩座強化磚塔等待突破。白點代表剩餘裝甲，善用爆破磚，一層一層拆解防線。',map:['0330000330','0220000220','1221001221','12X1001X21','1221001221','1111001111','0110000110']},
  {id:5,name:'霓虹脈衝',english:'NEON PULSE',color:'#eb95b3',day:false,tag:'移動磚陣',time:180,speed:385,moving:true,description:'霓虹磚陣像音軌般左右流動。預判下一個落點，接住多球道具，讓整個球場一起共振。',map:['0122112210','0111001110','001XXXX100','0111111110','0122002210','0011111100']},
  {id:6,name:'星環軌道',english:'ORBITAL RING',color:'#8dbde6',day:false,tag:'軌道守衛',time:195,speed:395,obstacle:'orbit',description:'星環守衛沿軌道滑行，中央鋼磚會改變球的航線。繞進環內引爆核心，找到自己的運行軌跡。',map:['0002222000','0011111100','0120000210','0120SS0210','0120000210','0011XX1100','0002222000']},
  {id:7,name:'極夜矩陣',english:'MIDNIGHT MATRIX',color:'#94b493',day:false,tag:'鋼鐵迷陣',time:215,speed:410,moving:true,description:'極夜矩陣把強化磚與鋼磚交錯排列。保持冷靜，找出通道，用滿格脈衝打開僵局。',map:['0222SS2220','01X1001X10','0112SS2110','0S110011S0','0222XX2220','0S110011S0','0111111110']},
  {id:8,name:'破曉核心',english:'DAWN CORE',color:'#e1a77c',day:true,tag:'終極挑戰',time:240,speed:425,moving:true,obstacle:'dawn',description:'最後一束光，藏在層層裝甲之中。移動磚陣、巡航守衛與連鎖爆破，在這裡迎來最後的共演。',map:['0011331100','0122332210','122XXXX221','12X3333X21','122XXXX221','0122332210','0011111100']}
];
Neon.difficulties = {easy:{name:'休閒',speed:.8,paddle:150,lives:5,time:1.4,points:.8},normal:{name:'標準',speed:1,paddle:120,lives:3,time:1,points:1},hard:{name:'挑戰',speed:1.22,paddle:96,lives:3,time:.85,points:1.4}};
Neon.powerups = {expand:{name:'延長擋板',short:'寬',color:'#6bd8d2',description:'持續 15 秒'},multi:{name:'多球分裂',short:'3',color:'#e8c377',description:'最多 6 顆球'},life:{name:'生命補給',short:'♥',color:'#e895a7',description:'生命 +1，上限 6'},slow:{name:'慢速時空',short:'◷',color:'#b5a0e6',description:'持續 10 秒'},shield:{name:'底線護盾',short:'▱',color:'#8cbce7',description:'接住一次落球'}};
Neon.achievements = [
  {id:'first',name:'第一道回響',description:'首次完成任意關卡。',icon:'bolt',target:1,metric:'cleared',unit:'關'},
  {id:'combo',name:'不落地的節奏',description:'達成一次 10 連擊。',icon:'bolt',target:10,metric:'combo',unit:'連擊'},
  {id:'collector',name:'幸運接球員',description:'累積接住 10 個道具。',icon:'heart',target:10,metric:'powerups',unit:'個'},
  {id:'perfect',name:'完美的弧線',description:'在任一難度獲得一關三星評價。',icon:'star',target:1,metric:'perfect',unit:'關'},
  {id:'traveler',name:'穿越晝夜',description:'完成全部 8 個不同關卡。',icon:'moon',target:8,metric:'cleared',unit:'關'},
  {id:'master',name:'全頻率共振',description:'在同一難度收集全部 24 顆星。',icon:'trophy',target:24,metric:'stars',unit:'顆'}
];

Neon.grid = Object.freeze({rows:18,columns:10,x:63,y:58,brickWidth:70,brickHeight:14,pitchX:78,pitchY:19});
Neon.endlessGrid = Object.freeze({...Neon.grid,columns:28,x:46.5,brickWidth:24,pitchX:29});
Neon.generateLayout = function(level, random = Math.random) {
  const grid = level.endless ? Neon.endlessGrid : Neon.grid;
  const rows = grid.rows, cols = grid.columns;
  const matrix = [];
  const tier = level.endless ? Math.min(12,level.wave) : level.id;
  for (let r = 0; r < rows; r++) {
    const row = [];
    const motif = level.map[Math.floor(r / rows * level.map.length)];
    for (let c = 0; c < cols; c++) {
      const source = motif[Math.floor(c / cols * motif.length)];
      const density = source === '0' ? .13 : .82 + Math.min(.12,tier * .012);
      if (random() > density) {row.push('0');continue;}
      const roll = random();
      const canSteel = tier >= 3 && source === 'S' && c > 0 && c < cols - 1 && r < rows - 2 && row[c - 1] !== 'S' && matrix[r - 1]?.[c] !== 'S';
      if (canSteel && roll < .42) row.push('S');
      else if (tier >= 2 && (source === 'X' ? roll < .55 : roll < .025 + tier * .003)) row.push('X');
      else if (tier >= 4 && roll > 1 - Math.min(.25,tier * .022)) row.push('3');
      else if (tier >= 2 && roll > 1 - Math.min(.48,tier * .055)) row.push('2');
      else row.push('1');
    }
    // Every row has at least three breakable bricks; no steel wall seals a region.
    let count = row.filter(cell => !['0','S'].includes(cell)).length;
    const start = Math.floor(random() * cols);
    for (let i = 0; count < 3 && i < cols; i++) {
      const c = (start + i) % cols;
      if (row[c] === '0' || row[c] === 'S') {row[c] = '1';count++;}
    }
    matrix.push(row);
  }
  // Represent every column, including all 28 columns in endless mode.
  for (let c = 0; c < cols; c++) {
    let count = matrix.filter(row => !['0','S'].includes(row[c])).length;
    const start = Math.floor(random() * rows);
    for (let i = 0; count < 2 && i < rows; i++) {
      const r = (start + i) % rows;
      if (['0','S'].includes(matrix[r][c])) {matrix[r][c] = '1';count++;}
    }
  }
  return matrix.map(row => row.join(''));
};
Neon.endlessLevel = function(wave) {
  const motif = Neon.levels[(wave - 1) % Neon.levels.length];
  return {...motif,id:0,name:'無盡頻率',english:'ENDLESS FREQUENCY',endless:true,wave,
    speed:Math.min(565,330 + (wave - 1) * 14),
    moving:wave >= 4,obstacle:wave >= 3 ? ['tide','orbit','dawn'][(wave - 3) % 3] : null,
    day:Math.floor((wave - 1) / 2) % 2 === 1};
};
// Longer random boards need a larger time target than the original small motifs.
Neon.levels.forEach(level => {level.time += 180;});
