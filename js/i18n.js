/* Offline localization. Traditional Chinese is the canonical source language.
 * Text nodes retain their source in a WeakMap so switching is reversible.
 * Only changed subtrees are translated; game state, canvas and focus stay intact.
 */
(() => {
  'use strict';
  const entries = [
    ['語言 / Language','Language','语言 / Language'],
    ['介面語言','Interface language','界面语言'],
    ['即時切換，保留目前遊戲進度','Switch instantly without restarting your game','即时切换，保留当前游戏进度'],
    ['自動晝夜切換','Automatic day / night','自动昼夜切换'],
    ['每 45 秒切換；關閉後固定目前主題','Switch every 45 seconds; turn off to keep the current theme','每 45 秒切换；关闭后固定当前主题'],
    ['選擇主題也會關閉自動切換','Selecting a theme also turns off automatic switching','选择主题也会关闭自动切换'],
    ['Neon Breakout 首頁','Neon Breakout home','Neon Breakout 首页'],
    ['主要導覽','Main navigation','主要导航'],
    ['關卡大廳','Levels','关卡大厅'],['成就收藏','Achievements','成就收藏'],['遊戲指南','How to play','游戏指南'],
    ['切換日夜主題','Switch day / night theme','切换日夜主题'],['夜間','Night','夜间'],['日間','Day','日间'],
    ['關閉音效','Mute sound','关闭音效'],['開啟音效','Enable sound','开启音效'],['遊戲設定','Settings','游戏设置'],
    ['八段頻率，一場旅程。','Eight frequencies. One journey.','八段频率，一场旅程。'],
    ['再一球，','One more ball. ','再一球，'],['突破下一關。','Break through.','突破下一关。'],
    ['從第一道霓虹，到最後一束曙光。','From the first neon glow to the last ray of dawn. ','从第一道霓虹，到最后一束曙光。'],
    ['找回那種「再玩一次」的純粹快感。','Rediscover the joy of just one more round.','找回那种“再玩一次”的纯粹快感。'],
    ['開始旅程','Start journey','开始旅程'],['繼續旅程','Continue','继续旅程'],['再次出發','Play again','再次出发'],
    ['全部關卡，自由挑戰','Every level. Your choice.','全部关卡，自由挑战'],
    ['旅程紀錄','Journey records','旅程记录'],['你的旅程','Your journey','你的旅程'],
    ['每一次反彈，都是新的可能。','Every bounce opens a new possibility.','每一次反弹，都是新的可能。'],
    ['八段頻率，已經全部點亮。','All eight frequencies are now alight.','八段频率，已经全部点亮。'],
    ['關卡完成','Levels cleared','关卡完成'],['收集星星','Stars collected','收集星星'],['單關最高分','Best level score','单关最高分'],
    ['探索進度','Progress','探索进度'],['無盡模式','Endless mode','无尽模式'],
    ['沒有終點，只有下一波。','No finish line. Just the next wave.','没有终点，只有下一波。'],
    ['18 列 × 28 欄隨機磚陣 · 逐波升級 · 每 3 波生命補給','18 rows × 28 columns · Tougher waves · +1 life every 3 waves','18 行 × 28 列随机砖阵 · 逐波升级 · 每 3 波生命补给'],
    ['最高到達 / 最高分','Best wave / High score','最高到达 / 最高分'],['波','waves','波'],['進入無盡模式','Play endless','进入无尽模式'],
    ['選擇你的下一站','Choose your next stop','选择你的下一站'],
    ['8 個場景 · 18 列 × 10 欄 · 每次開局，全新隨機磚陣。','8 stages · 18 rows × 10 columns · A fresh random board every run.','8 个场景 · 18 行 × 10 列 · 每次开局，全新随机砖阵。'],
    ['遊戲難度（同時套用一般與無盡模式）','Difficulty (applies to campaign and endless)','游戏难度（同时应用于普通与无尽模式）'],
    ['休閒','Relaxed','休闲'],['標準','Normal','标准'],['挑戰','Expert','挑战'],['八個可遊玩關卡','Eight playable levels','八个可玩关卡'],
    ['進度會自動儲存在這台裝置','Progress is saved automatically on this device','进度会自动保存在这台设备'],
    ['儲存空間無法使用，紀錄暫存至關閉頁面為止','Storage unavailable. Records last until this page is closed.','存储空间无法使用，记录暂存至关闭页面为止'],
    ['移動','Move','移动'],['發球 / 能量脈衝','Launch / Energy pulse','发球 / 能量脉冲'],['暫停','Pause','暂停'],
    ['每一次突破，','Every breakthrough ','每一次突破，'],['都有回響。','leaves an echo.','都有回响。'],
    ['不只為了高分。把那些值得紀念的瞬間，收進你的收藏。','More than a high score. Collect the moments that made your journey.','不只为了高分。把那些值得纪念的瞬间，收进你的收藏。'],
    ['成就跨難度累積；各關卡的最佳分數與星級依難度分開記錄。','Achievements span all difficulties. Level scores and stars are tracked separately for each difficulty.','成就跨难度累计；各关卡的最佳分数与星级按难度分别记录。'],
    ['回到關卡大廳','Back to levels','回到关卡大厅'],['返回關卡大廳','Back to levels','返回关卡大厅'],
    ['遊戲畫面','Game screen','游戏画面'],['暫停遊戲','Pause game','暂停游戏'],['繼續遊戲','Resume','继续游戏'],
    ['重新挑戰','Retry','重新挑战'],['切換全螢幕','Toggle fullscreen','切换全屏'],
    ['SCORE / 得分','SCORE','SCORE / 得分'],['COMBO / 連擊','COMBO','COMBO / 连击'],['TIME / 時間','TIME','TIME / 时间'],['LIVES / 生命','LIVES','LIVES / 生命'],
    ['打磚塊球場，使用左右方向鍵移動，空白鍵發球，P 暫停','Breakout arena. Move with arrow keys, launch with Space, pause with P.','打砖块球场，使用左右方向键移动，空格键发球，P 暂停'],
    ['準備好進入頻率了嗎？','Ready to tune in?','准备好进入频率了吗？'],['調整呼吸，再來一球。','Take a breath. One more ball.','调整呼吸，再来一球。'],
    ['點擊球場或按','Click the arena or press','点击球场或按'],['發球','to launch','发球'],
    ['能量脈衝','Energy pulse','能量脉冲'],['釋放脈衝','Fire pulse','释放脉冲'],['向左移動','Move left','向左移动'],['向右移動','Move right','向右移动'],['發球 / 脈衝','Launch / Pulse','发球 / 脉冲'],
    ['這一站的小目標','Your mission','这一站的小目标'],['磚塊清除','Bricks cleared','砖块清除'],['接住一點好運','Catch a little luck','接住一点好运'],
    ['尚無生效中的道具','No active power-ups','暂无生效中的道具'],['移動擋板','Move paddle','移动挡板'],['發球 / 蓄滿後脈衝','Launch / Charged pulse','发球 / 蓄满后脉冲'],
    ['也支援滑鼠移動與觸控拖曳。','Mouse movement and touch dragging work too.','也支持鼠标移动与触控拖动。'],
    ['慢慢來，好玩的還在下一關。','Take your time. More fun awaits.','慢慢来，好玩的还在下一关。'],
    ['關閉關卡詳情','Close level details','关闭关卡详情'],['關閉設定','Close settings','关闭设置'],
    ['調整你的遊戲節奏','Find your rhythm','调整你的游戏节奏'],['找一個舒服的光線、一個剛好的速度。','Find the right light and a pace that feels good.','找一个舒服的光线、一个刚好的速度。'],
    ['環境主題','Theme','环境主题'],['自動模式：每 45 秒切換晝夜','Auto mode: day / night changes every 45 seconds','自动模式：每 45 秒切换昼夜'],
    ['自動晝夜','Auto day / night','自动昼夜'],['街機音效','Arcade sound','街机音效'],['反彈、碎裂與通關的合成音效','Synthesized bounce, break and victory sounds','反弹、碎裂与通关的合成音效'],
    ['減少動態效果','Reduce motion','减少动态效果'],['減少粒子、畫面震動與介面動畫','Fewer particles, screen shakes and UI animations','减少粒子、画面震动与界面动画'],
    ['音量','Volume','音量'],['設定即時套用，自動儲存。','Settings apply instantly and save automatically.','设置即时应用，自动保存。'],['調整好了，繼續','Done. Keep playing.','调整好了，继续'],
    ['關閉遊戲指南','Close guide','关闭游戏指南'],['很簡單，也很上癮。','Easy to learn. Hard to put down.','很简单，也很上瘾。'],
    ['移動擋板、接住球，把所有可破壞的磚塊清空。','Move the paddle, keep the ball in play and clear every breakable brick.','移动挡板、接住球，把所有可破坏的砖块清空。'],
    ['找到你的角度','Find your angle','找到你的角度'],
    ['方向鍵 / A、D、滑鼠或觸控拖曳來移動。球打在擋板邊緣，反彈角度就越大。點擊球場或空白鍵發球。','Move with arrow keys, A / D, your mouse or touch. Hitting near the paddle edge creates a wider bounce. Click the arena or press Space to launch.','方向键 / A、D、鼠标或触控拖动来移动。球打在挡板边缘，反弹角度就越大。点击球场或空格键发球。'],
    ['連擊，讓分數加速','Chain hits. Boost your score.','连击，让分数加速'],
    ['連續擊碎磚塊會累積連擊，最高 5 倍得分。碰到擋板或失去一顆球會中斷連擊；蓄滿能量後，空白鍵釋放脈衝。','Chain brick breaks for up to 5× points. Touching the paddle or losing any ball resets the combo. Once energy is full, press Space to fire a pulse.','连续击碎砖块会累计连击，最高 5 倍得分。碰到挡板或失去一颗球会中断连击；蓄满能量后，空格键释放脉冲。'],
    ['認識你的對手','Know your bricks','认识你的对手'],
    ['帶有白點的強化磚需擊中多次；帶十字的爆破磚會引爆周圍磚塊；灰色鋼磚無法破壞，不計入通關目標。','Dotted armor bricks take multiple hits. Cross-marked blast bricks damage their neighbors. Gray steel bricks are indestructible and do not count toward clearing a level.','带有白点的强化砖需击中多次；带十字的爆破砖会引爆周围砖块；灰色钢砖无法破坏，不计入通关目标。'],
    ['收集三顆星','Collect all three stars','收集三颗星'],
    ['完成關卡獲得一星、全程不失誤再一星、目標時間內通關再一星。目標依難度調整。每關可自由挑戰或重玩。','Earn one star for clearing the level, one for losing no balls and one for beating the time target. Targets scale with difficulty. Play or replay any level freely.','完成关卡获得一星、全程不失误再一星、目标时间内通关再一星。目标按难度调整。每关可自由挑战或重玩。'],
    ['按 P / Esc 暫停；切換分頁、離開視窗或開啟設定時也會自動暫停。自動晝夜只改變氛圍，不影響碰撞規則。','Press P / Esc to pause. Switching tabs, leaving the window or opening settings also pauses the game. Day / night changes the atmosphere without changing collisions.','按 P / Esc 暂停；切换标签页、离开窗口或打开设置时也会自动暂停。自动昼夜只改变氛围，不影响碰撞规则。'],
    ['了解，準備開打','Got it. Ready to play.','了解，准备开打'],
    ['初始頻率','First Frequency','初始频率'],['日光稜鏡','Solar Prism','日光棱镜'],['潮汐迴廊','Tidal Passage','潮汐回廊'],['暮色雙塔','Twilight Towers','暮色双塔'],
    ['霓虹脈衝','Neon Pulse','霓虹脉冲'],['星環軌道','Orbital Ring','星环轨道'],['極夜矩陣','Midnight Matrix','极夜矩阵'],['破曉核心','Dawn Core','破晓核心'],
    ['經典啟程','Classic start','经典启程'],['稜鏡陣列','Prism array','棱镜阵列'],['迴廊穿梭','Tidal corridors','回廊穿梭'],['強化裝甲','Armored towers','强化装甲'],
    ['移動磚陣','Moving bricks','移动砖阵'],['軌道守衛','Orbital guards','轨道守卫'],['鋼鐵迷陣','Steel maze','钢铁迷阵'],['終極挑戰','Final challenge','终极挑战'],
    ['用最熟悉的節奏暖身。瞄準擋板邊緣，把球送進磚塊上方，開啟你的第一串連擊。','Warm up with a familiar rhythm. Aim near the paddle edge, send the ball above the bricks and start your first combo.','用最熟悉的节奏暖身。瞄准挡板边缘，把球送进砖块上方，开启你的第一串连击。'],
    ['日光折射成一道菱形陣列。中央的爆破磚是捷徑，擊中它，讓光線向外擴散。','Sunlight refracts into a diamond array. Hit the central blast bricks and let the light spread outward.','日光折射成一道菱形阵列。中央的爆破砖是捷径，击中它，让光线向外扩散。'],
    ['潮汐擋板在下方來回移動。抓住空隙穿過雙側迴廊，利用鋼磚反彈出意想不到的角度。','A tidal barrier moves below the bricks. Find the gaps through both corridors and use steel bricks to discover new bounce angles.','潮汐挡板在下方来回移动。抓住空隙穿过双侧回廊，利用钢砖反弹出意想不到的角度。'],
    ['暮色中，兩座強化磚塔等待突破。白點代表剩餘裝甲，善用爆破磚，一層一層拆解防線。','Two armored towers await in the twilight. Dots show remaining armor. Use blast bricks to dismantle each layer.','暮色中，两座强化砖塔等待突破。白点代表剩余装甲，善用爆破砖，一层一层拆解防线。'],
    ['霓虹磚陣像音軌般左右流動。預判下一個落點，接住多球道具，讓整個球場一起共振。','Neon rows flow like a soundtrack. Anticipate each landing, catch multiball and set the whole arena in motion.','霓虹砖阵像音轨般左右流动。预判下一个落点，接住多球道具，让整个球场一起共振。'],
    ['星環守衛沿軌道滑行，中央鋼磚會改變球的航線。繞進環內引爆核心，找到自己的運行軌跡。','Orbital guards glide across the field while central steel bricks redirect your ball. Enter the ring, blast the core and find your own orbit.','星环守卫沿轨道滑行，中央钢砖会改变球的航线。绕进环内引爆核心，找到自己的运行轨迹。'],
    ['極夜矩陣把強化磚與鋼磚交錯排列。保持冷靜，找出通道，用滿格脈衝打開僵局。','Armor and steel interlock in the midnight matrix. Stay calm, find a passage and use a fully charged pulse to break the deadlock.','极夜矩阵把强化砖与钢砖交错排列。保持冷静，找出通道，用满格脉冲打开僵局。'],
    ['最後一束光，藏在層層裝甲之中。移動磚陣、巡航守衛與連鎖爆破，在這裡迎來最後的共演。','The last ray of light lies behind layers of armor. Moving rows, roaming guards and chain blasts come together for the final performance.','最后一束光，藏在层层装甲之中。移动砖阵、巡航守卫与连锁爆破，在这里迎来最后的共演。'],
    ['延長擋板','Wide paddle','延长挡板'],['寬','W','宽'],['多球分裂','Multiball','多球分裂'],['生命補給','Extra life','生命补给'],['慢速時空','Slow time','慢速时空'],['底線護盾','Floor shield','底线护盾'],
    ['持續 15 秒','Lasts 15 seconds','持续 15 秒'],['最多 6 顆球','Up to 6 balls','最多 6 颗球'],['生命 +1，上限 6','+1 life, up to 6','生命 +1，上限 6'],['持續 10 秒','Lasts 10 seconds','持续 10 秒'],['接住一次落球','Saves one falling ball','接住一次落球'],
    ['第一道回響','First Echo','第一道回响'],['首次完成任意關卡。','Clear any level for the first time.','首次完成任意关卡。'],
    ['不落地的節奏','Unbroken Rhythm','不落地的节奏'],['達成一次 10 連擊。','Reach a combo of 10.','达成一次 10 连击。'],
    ['幸運接球員','Lucky Catcher','幸运接球员'],['累積接住 10 個道具。','Catch 10 power-ups in total.','累计接住 10 个道具。'],
    ['完美的弧線','Perfect Arc','完美的弧线'],['在任一難度獲得一關三星評價。','Earn three stars on any level at any difficulty.','在任一难度获得一关三星评价。'],
    ['穿越晝夜','Through Day and Night','穿越昼夜'],['完成全部 8 個不同關卡。','Clear all 8 different levels.','完成全部 8 个不同关卡。'],
    ['全頻率共振','Full Resonance','全频率共振'],['在同一難度收集全部 24 顆星。','Collect all 24 stars at the same difficulty.','在同一难度收集全部 24 颗星。'],
    ['已解鎖 ✓','Unlocked ✓','已解锁 ✓'],['等待下一次突破','Your next breakthrough awaits','等待下一次突破'],
    ['可破壞磚塊','Breakable bricks','可破坏砖块'],['最快通關','Best time','最快通关'],['清除全部可破壞磚塊','Clear all breakable bricks','清除全部可破坏砖块'],
    ['全程不讓任何一顆球落下','Lose no balls during this run','全程不让任何一颗球落下'],['全程不讓任何球落下','Lose no balls during this run','全程不让任何球落下'],
    ['18 列 × 28 欄，逐波隨機','18 rows × 28 columns, randomized each wave','18 行 × 28 列，逐波随机'],['每完成 3 波，生命 +1','+1 life every 3 completed waves','每完成 3 波，生命 +1'],['分數與生命跨波保留','Score and lives carry between waves','分数与生命跨波保留'],
    ['3 秒後自動進入下一波，分數與生命持續累積。','Next wave starts in 3 seconds. Score and lives carry over.','3 秒后自动进入下一波，分数与生命持续累计。'],['立即迎接下一波','Start next wave now','立即迎接下一波'],['暫停一下','Take a break','暂停一下'],
    ['護盾 ×1','Shield ×1','护盾 ×1'],['留一點時間，給呼吸。','A moment to breathe.','留一点时间，给呼吸。'],['球場已暫停。準備好時，我們再繼續。','Game paused. We will be here when you are ready.','球场已暂停。准备好时，我们再继续。'],
    ['新的無盡模式最高分！','A new endless high score!','新的无尽模式最高分！'],['下一次，看看能走得更遠嗎？','How much further can you go next time?','下一次，看看能走得更远吗？'],
    ['累積得分','Total score','累计得分'],['存活時間','Survival time','存活时间'],['最高連擊','Best combo','最高连击'],['再次挑戰','Try again','再次挑战'],['回到選關','Choose a level','回到选关'],
    ['破曉了。你做到了！','Dawn has arrived. You did it!','破晓了。你做到了！'],['漂亮，又突破一關。','Another breakthrough. Nicely done.','漂亮，又突破一关。'],['這一球，留給下次。','Save the next ball for another round.','这一球，留给下次。'],
    ['每一次嘗試，都讓下一次更靠近。','Every attempt brings you closer.','每一次尝试，都让下一次更靠近。'],['下一個頻率','Next frequency','下一个频率'],['重玩本關','Replay level','重玩本关'],['本次得分','Your score','本次得分'],['遊戲時間','Play time','游戏时间'],
    ['再試一種可能？','Try a different approach?','再试一种可能？'],['先在這一站休息？','Take a break here?','先在这一站休息？'],
    ['本次分數將重新計算，已儲存的紀錄會保留。','This run will restart. Your saved records will stay.','本次分数将重新计算，已保存的记录会保留。'],
    ['本次進度尚未通關；離開後，下次會從關卡開頭開始。','This run is unfinished. Leaving means starting the level over next time.','本次进度尚未通关；离开后，下次会从关卡开头开始。'],
    ['重新開始本關','Restart level','重新开始本关'],['返回大廳','Back to lobby','返回大厅'],['此瀏覽器不支援全螢幕模式','Fullscreen is not supported in this browser','此浏览器不支持全屏模式'],['無法開啟全螢幕；仍可正常遊玩','Could not enter fullscreen. You can keep playing.','无法开启全屏；仍可正常游玩'],
    ['護盾接住了這一球！','The shield saved that ball!','护盾接住了这一球！'],['能量脈衝！對 5 塊磚造成傷害','Energy pulse! Damaged up to 5 bricks.','能量脉冲！对最多 5 块砖造成伤害'],
    ['NEON BREAKOUT — 八段頻率，一場旅程','NEON BREAKOUT — Eight frequencies. One journey.','NEON BREAKOUT — 八段频率，一场旅程'],
    ['Neon Breakout：八段頻率、晝夜變化、道具與連擊，展開你的霓虹打磚塊旅程。','Neon Breakout: eight frequencies, day and night, power-ups and combos. Start your arcade journey.','Neon Breakout：八段频率、昼夜变化、道具与连击，展开你的霓虹打砖块旅程。']
  ];
  const dictionaries = {en:new Map(), 'zh-Hans':new Map()};
  for (const [source,en,hans] of entries) {dictionaries.en.set(source,en);dictionaries['zh-Hans'].set(source,hans);}
  const languages = Object.freeze(['en','zh-Hant','zh-Hans']);
  let language = 'zh-Hant';
  const patterns = [
    [/^(\d+) \/ 3 顆星$/, (m,t,en) => en ? `${m[1]} / 3 stars` : `${m[1]} / 3 颗星`],
    [/^第 (\d+) 關 (.*?)，(\d+) 顆星，(.*)$/, (m,t,en) => en ? `Level ${m[1]}: ${t(m[2])}, ${m[3]} stars, ${t(m[4])}` : `第 ${m[1]} 关 ${t(m[2])}，${m[3]} 颗星，${t(m[4])}`],
    [/^成就解鎖：(.*)$/, (m,t,en) => en ? `Achievement unlocked: ${t(m[1])}` : `成就解锁：${t(m[1])}`],
    [/^(\d+) \/ (\d+) (關|連擊|個|顆)$/, (m,t,en) => en ? `${m[1]} / ${m[2]} ${({'關':'levels','連擊':'combo','個':'items','顆':'stars'})[m[3]]}` : `${m[1]} / ${m[2]} ${({'關':'关','連擊':'连击','個':'个','顆':'颗'})[m[3]]}`],
    [/^(\d+) 點生命$/, (m,t,en) => en ? `${m[1]} lives` : `${m[1]} 点生命`],
    [/^(寬板|慢速) (\d+)s$/, (m,t,en) => en ? `${m[1] === '寬板' ? 'Wide' : 'Slow'} ${m[2]}s` : `${m[1] === '寬板' ? '宽板' : '慢速'} ${m[2]}s`],
    [/^自動 · (日間|夜間)$/, (m,t,en) => en ? `Auto · ${t(m[1])}` : `自动 · ${t(m[1])}`],
    [/^目前(自動)?(日間|夜間)，切換至(日間|夜間)$/, (m,t,en) => en ? `${m[1] ? 'Auto ' : ''}${t(m[2])}. Switch to ${t(m[3])}.` : `当前${m[1] ? '自动' : ''}${t(m[2])}，切换至${t(m[3])}`],
    [/^無盡 · (休閒|標準|挑戰)$/, (m,t,en) => `${en ? 'Endless' : '无尽'} · ${t(m[1])}`],
    [/^無盡頻率 · 第 (\d+) 波$/, (m,t,en) => en ? `Endless · Wave ${m[1]}` : `无尽频率 · 第 ${m[1]} 波`],
    [/^第 (\d+) 波全新隨機磚陣。清空後自動進入下一波；總分與生命保留，每完成 3 波補給 1 點生命。$/, (m,t,en) => en ? `Wave ${m[1]}: a fresh random board. Clear it to advance. Score and lives carry over, with +1 life every 3 completed waves.` : `第 ${m[1]} 波全新随机砖阵。清空后自动进入下一波；总分与生命保留，每完成 3 波补给 1 点生命。`],
    [/^第 (\d+) 波，突破。$/, (m,t,en) => en ? `Wave ${m[1]} cleared.` : `第 ${m[1]} 波，突破。`],
    [/^波次獎勵 \+([\d,]+)( · 生命補給 \+1)?$/, (m,t,en) => en ? `Wave bonus +${m[1]}${m[2] ? ' · Extra life +1' : ''}` : `波次奖励 +${m[1]}${m[2] ? ' · 生命补给 +1' : ''}`],
    [/^第 (\d+) 關完成( · 刷新個人最高分！)?$/, (m,t,en) => en ? `Level ${m[1]} complete${m[2] ? ' · New personal best!' : ''}` : `第 ${m[1]} 关完成${m[2] ? ' · 刷新个人最高分！' : ''}`],
    [/^抵達第 (\d+) 波。$/, (m,t,en) => en ? `You reached wave ${m[1]}.` : `抵达第 ${m[1]} 波。`],
    [/^(不失誤|在目標時間內完成)，再多拿一顆星$/, (m,t,en) => en ? `${m[1] === '不失誤' ? 'Lose no balls' : 'Beat the time target'} to earn another star` : `${m[1] === '不失誤' ? '不失误' : '在目标时间内完成'}，再多拿一颗星`],
    [/^(\d{2,}:\d{2}) 內完成關卡$/, (m,t,en) => en ? `Clear within ${m[1]}` : `${m[1]} 内完成关卡`],
    [/^開始挑戰 · (休閒|標準|挑戰)$/, (m,t,en) => `${en ? 'Play' : '开始挑战'} · ${t(m[1])}`],
    [/^(休閒|標準|挑戰) · 最佳得分$/, (m,t,en) => `${t(m[1])} · ${en ? 'Best score' : '最佳得分'}`],
    [/^18 列 × 10 欄 · 每次重新生成 · (\d+) 點生命$/, (m,t,en) => en ? `18 rows × 10 columns · Fresh each run · ${m[1]} lives` : `18 行 × 10 列 · 每次重新生成 · ${m[1]} 点生命`],
    [/^獲得 (.*)！$/, (m,t,en) => en ? `Power-up: ${t(m[1])}!` : `获得 ${t(m[1])}！`],
    [/^已切換至(日間|夜間)模式；設定中可開啟自動晝夜$/, (m,t,en) => en ? `${t(m[1])} mode enabled. Enable auto day / night in Settings.` : `已切换至${t(m[1])}模式；设置中可开启自动昼夜`]
  ];
  function text(source, locale = language) {
    if (typeof source !== 'string' || locale === 'zh-Hant' || !languages.includes(locale) || !/\p{Script=Han}/u.test(source)) return source;
    const clean = source.trim();
    let translated = dictionaries[locale].get(clean);
    if (translated === undefined) for (const [pattern,format] of patterns) {
      const match = clean.match(pattern);
      if (match) {translated = format(match,value => text(value,locale),locale === 'en');break;}
    }
    if (translated === undefined) return source;
    return source.slice(0,source.indexOf(clean)) + translated + source.slice(source.indexOf(clean) + clean.length);
  }

  const sources = new WeakMap(), attributes = new WeakMap();
  const translatedAttributes = ['aria-label','title','placeholder','aria-description'];
  function ignored(node) {return node.parentElement?.closest('script, style, noscript, [data-no-translate]');}
  function translateNode(node) {
    if (node.nodeType !== 3 || ignored(node) || !node.nodeValue.trim()) return;
    const old = sources.get(node);
    const source = old && node.nodeValue === old.last ? old.source : node.nodeValue;
    const value = text(source);
    sources.set(node,{source,last:value});
    if (node.nodeValue !== value) node.nodeValue = value;
  }
  function translateAttributes(element) {
    if (element.closest?.('[data-no-translate], script, style')) return;
    const cached = attributes.get(element) || {};
    for (const name of translatedAttributes) if (element.hasAttribute(name)) {
      const current = element.getAttribute(name), old = cached[name];
      const source = old && current === old.last ? old.source : current;
      const value = text(source);cached[name] = {source,last:value};
      if (value !== current) element.setAttribute(name,value);
    }
    attributes.set(element,cached);
  }
  function translateTree(root) {
    if (!root || !root.isConnected) return;
    if (root.nodeType === 3) {translateNode(root);return;}
    if (root.nodeType !== 1 || root.closest('[data-no-translate], script, style, noscript')) return;
    translateAttributes(root);
    const walker = document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === 3) translateNode(node);else translateAttributes(node);
    }
  }
  let observer, scheduled = false;
  const pending = new Set();
  const observerOptions = {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:translatedAttributes};
  function flush() {
    scheduled = false;
    observer?.disconnect();
    for (const node of pending) translateTree(node);
    pending.clear();
    observer?.observe(document.body,observerOptions);
  }
  function observe() {
    if (observer) return;
    observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') mutation.addedNodes.forEach(node => pending.add(node));
        else pending.add(mutation.target);
      }
      if (!scheduled && pending.size) {scheduled = true;queueMicrotask(flush);}
    });
    observer.observe(document.body,observerOptions);
  }
  function setLanguage(locale) {
    language = languages.includes(locale) ? locale : 'zh-Hant';
    observer?.disconnect();
    document.documentElement.lang = language;
    document.title = text('NEON BREAKOUT — 八段頻率，一場旅程');
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = text('Neon Breakout：八段頻率、晝夜變化、道具與連擊，展開你的霓虹打磚塊旅程。');
    translateTree(document.body);
    document.querySelectorAll('[data-language-select]').forEach(select => {select.value = language;});
    if (observer) observer.observe(document.body,observerOptions);else observe();
    return language;
  }
  Neon.i18n = {text,setLanguage,languages,entries,get language() {return language;}};
})();
