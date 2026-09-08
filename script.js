(() => {
  const HORSE_POOL = [
    "サンライズホープ", "ミッドナイトブルー", "ゴールデンアロー", "シルバースター",
    "ブレイブハート", "ウインドチェイサー", "ラッキーセブン", "クリムゾンフレイム",
    "スカイダンサー", "サンダーボルト", "ノーブルドリーム", "エメラルドキング",
    "インビクタスソード", "レインボーチェイサー", "ブラックダイヤモンド", "ホワイトフェザー",
    "スターライトクイーン", "アイアンウィル", "フェニックスファイア", "ムーンリットレイン",
    "グランプリズム", "オーロラダンス", "トリプルエース", "ヴィクトリーロード",
    "シャイニングウェーブ", "デザートストーム", "コスモウィスパー", "ロイヤルフラッシュ",
    "スパークリングスター", "タイフーンゲイル", "エターナルフレア", "ジェットストリーム",
    "パープルレイン", "ゴールドラッシュ", "シルクロード", "ワイルドカード",
    "ネオンライト", "クリスタルウィング", "サウザンドドリーム", "レッドインパルス",
    "リーヅモピンフ", "ハラキリドライブ", "インパクトラッシュ",
  ];

  // 20レースに1回ほど現れる、必ず勝つ大穴の特別な馬
  const HEARTBEAT_NAME = "ハートビート";
  const HEARTBEAT_CHANCE = 1 / 20;
  const HEARTBEAT_MIN_ODDS = 20;

  // 10レースに1回ほど現れる、必ず4着になる特別な馬（演出などは特になし）
  const FRONTIER_NAME = "フロンティア";
  const FRONTIER_CHANCE = 1 / 10;
  const FRONTIER_FIXED_RANK = 4;

  const JOCKEY_POOL = [
    { name: "C.ルメール", rank: "S" },
    { name: "武豊", rank: "S" },
    { name: "岩田望来", rank: "A" },
    { name: "松山弘平", rank: "A" },
    { name: "戸崎圭太", rank: "A" },
    { name: "丹内祐二", rank: "B" },
    { name: "鮫島克駿", rank: "B" },
    { name: "横山武史", rank: "B" },
    { name: "西村淳也", rank: "B" },
    { name: "横山和生", rank: "B" },
    { name: "荻野極", rank: "B" },
    { name: "今村聖奈", rank: "C" },
    { name: "坂井瑠星", rank: "C" },
  ];

  // 出現率が極端に低い特別な騎手（毎レースの通常抽選とは別枠で判定する）
  const RARE_JOCKEYS = [
    { name: "J.モレイラ", rank: "S", chance: 1 / 18 },
    { name: "F.デットーリ", rank: "S", chance: 1 / 50 },
  ];

  function pickJockeysForRace() {
    const chosen = [];
    RARE_JOCKEYS.forEach((rj) => {
      if (Math.random() < rj.chance) chosen.push({ name: rj.name, rank: rj.rank });
    });
    const regularNeeded = NUM_HORSES - chosen.length;
    const regularPicked = shuffle(JOCKEY_POOL).slice(0, regularNeeded);
    return shuffle([...chosen, ...regularPicked]);
  }

  // レース番号(1〜12)ごとのクラス設定。未勝利は波乱（穴馬台頭）が起きやすいよう
  // 実際のレース結果の分散（varMin〜varMax）を広めに取る
  const RACE_CLASSES = [
    { name: "未勝利", varMin: 0.5, varMax: 1.65 },
    { name: "未勝利", varMin: 0.5, varMax: 1.65 },
    { name: "未勝利", varMin: 0.5, varMax: 1.65 },
    { name: "未勝利", varMin: 0.5, varMax: 1.65 },
    { name: "未勝利", varMin: 0.5, varMax: 1.65 },
    { name: "1勝クラス", varMin: 0.68, varMax: 1.35 },
    { name: "1勝クラス", varMin: 0.68, varMax: 1.35 },
    { name: "2勝クラス", varMin: 0.75, varMax: 1.28 },
    { name: "2勝クラス", varMin: 0.75, varMax: 1.28 },
    { name: "3勝クラス", varMin: 0.8, varMax: 1.22 },
    { name: "オープン", varMin: 0.85, varMax: 1.18 },
    { name: "1勝クラス", varMin: 0.68, varMax: 1.35 },
  ];
  const NUM_RACES_PER_DAY = RACE_CLASSES.length;

  function getRaceClass(raceNumber) {
    return RACE_CLASSES[(raceNumber - 1) % NUM_RACES_PER_DAY];
  }

  const JOCKEY_RANK_MULT = { S: 1.4, A: 1.15, B: 1.0, C: 0.75 };
  const CONDITION_MULT = { up: 1.3, flat: 1.0, down: 0.7 };
  const CONDITION_ICON = { up: "↗️", flat: "➡️", down: "↘️" };
  const CONDITION_LABEL = { up: "絶好調", flat: "普通", down: "不調" };
  const RANK_LABEL = { S: "Sランク", A: "Aランク", B: "Bランク", C: "Cランク" };

  // 重馬場（雨天）の時にB・Cランク騎手の実際の走りを底上げする補正
  const HEAVY_TRACK_JOCKEY_BONUS = { S: 1.0, A: 1.0, B: 1.12, C: 1.2 };
  const RAIN_CHANCE = 0.2;

  // コース表面（ダート／芝）の色設定
  const SURFACE_COLORS = {
    dirt: { good: "#c9a86a", heavy: "#8a6f4a", label: "ダート" },
    turf: { good: "#4c9a4f", heavy: "#5f6e3f", label: "芝" },
  };

  const MIN_BET = 100;
  const START_BALANCE = 10000;
  const NUM_HORSES = 8;
  const PAYOUT_RATE = 0.8;
  const WIN_ODDS_MIN = 1.5;
  const WIN_ODDS_MAX = 120;
  const PLACE_ODDS_MIN = 1.2;
  const PLACE_ODDS_MAX = 40;
  const UMAREN_ODDS_MIN = 1.5;
  const UMAREN_ODDS_MAX = 300;
  const MAX_SINGLE_DIGIT_ODDS_HORSES = 5;

  const GAME_MODES = {
    normal: { label: "一般人モード", goal: null },
    gambler: { label: "ギャンブラーモード", goal: 100000 },
    gamblerHard: { label: "ギャンブラーモードHARD", goal: 1000000 },
    infinite: { label: "資金無限モード", goal: null, infinite: true },
  };

  // --- コース形状（楕円トラック）のジオメトリ ---
  // より広く大きいコースにし、ゴールは直線（ホームストレート）の左側に置くことで
  // ターンを立ち上がってからゴールまでの直線を長く見せる
  const TRACK = {
    baseXLeft: 170,
    baseXRight: 830,
    baseYTop: 50,
    baseYBottom: 370,
    outerRailInset: 8,
    laneWidth: 12,
    numLanes: NUM_HORSES,
  };
  TRACK.innerRailInset = TRACK.outerRailInset + TRACK.laneWidth * TRACK.numLanes;
  const FINISH_X = 320;
  const START_X = 280;
  const MERGE_X = 400;
  const MERGE_RUN = 70;

  // スタート後、外枠の馬ほど大きくインコースへ寄っていく「クルーズレーン」
  // （実際の競馬のように内に寄る動きを再現しつつ、番号の視認性を保つため
  // 車線間隔は詰めすぎない）
  const CRUISE = {
    laneWidth: 9,
    innerRailInset: TRACK.innerRailInset - 4,
  };

  function geometryAt(inset) {
    const xLeft = TRACK.baseXLeft + inset;
    const xRight = TRACK.baseXRight - inset;
    const yTop = TRACK.baseYTop + inset;
    const yBottom = TRACK.baseYBottom - inset;
    const r = (yBottom - yTop) / 2;
    return { xLeft, xRight, yTop, yBottom, r };
  }

  function stadiumPath(inset) {
    const { xLeft, xRight, yTop, yBottom, r } = geometryAt(inset);
    return `M ${xLeft} ${yTop} L ${xRight} ${yTop} A ${r} ${r} 0 0 1 ${xRight} ${yBottom} L ${xLeft} ${yBottom} A ${r} ${r} 0 0 1 ${xLeft} ${yTop} Z`;
  }

  function laneInset(waku) {
    // waku 1 = 内枠（インコース最短）、waku Nが外枠（最長距離）
    return TRACK.innerRailInset - TRACK.laneWidth * (waku - 0.5);
  }

  function cruiseInset(waku) {
    return CRUISE.innerRailInset - CRUISE.laneWidth * (waku - 0.5);
  }

  // 各馬の実際の走行経路：スタート直後は枠なりに広がっているが、
  // 序盤で内側のクルーズレーンへ寄っていき、そのままゴール（直線左側）まで走る
  function buildRunnerPath(waku) {
    const startY = geometryAt(laneInset(waku)).yTop;
    const cGeom = geometryAt(cruiseInset(waku));
    return `M ${START_X} ${startY} L ${MERGE_X} ${startY} L ${MERGE_X + MERGE_RUN} ${cGeom.yTop} L ${cGeom.xRight} ${cGeom.yTop} A ${cGeom.r} ${cGeom.r} 0 0 1 ${cGeom.xRight} ${cGeom.yBottom} L ${FINISH_X} ${cGeom.yBottom}`;
  }

  const state = {
    mode: null,
    goalAmount: null,
    attemptRaceCount: 0,
    goalAchieved: false,
    totalWagered: 0,
    totalPayout: 0,
    totalTickets: 0,
    totalHits: 0,
    balance: START_BALANCE,
    raceNumber: 1,
    surface: "dirt",
    weather: { type: "clear", trackCondition: "good" },
    horses: [],
    selectedHorseId: null,
    selectedHorseIds: [],
    tickets: [],
    raceRunning: false,
    raceFinished: false,
    raceTimeoutId: null,
    currentFinishOrder: null,
  };

  const el = {
    balance: document.getElementById("balance"),
    modeInfo: document.getElementById("modeInfo"),
    lobbyScreen: document.getElementById("lobbyScreen"),
    gameScreen: document.getElementById("gameScreen"),
    lobbyReturnBtn: document.getElementById("lobbyReturnBtn"),
    weatherBox: document.getElementById("weatherBox"),
    surfaceToggleBtn: document.getElementById("surfaceToggleBtn"),
    raceNumber: document.getElementById("raceNumber"),
    raceClass: document.getElementById("raceClass"),
    trackSvg: document.getElementById("trackSvg"),
    raceMessage: document.getElementById("raceMessage"),
    myResultInfo: document.getElementById("myResultInfo"),
    horseTableBody: document.getElementById("horseTableBody"),
    betType: document.getElementById("betType"),
    betAmount: document.getElementById("betAmount"),
    buyBtn: document.getElementById("buyBtn"),
    startBtn: document.getElementById("startBtn"),
    watchOnlyBtn: document.getElementById("watchOnlyBtn"),
    skipBtn: document.getElementById("skipBtn"),
    nextBtn: document.getElementById("nextBtn"),
    restartBtn: document.getElementById("restartBtn"),
    comboPreview: document.getElementById("comboPreview"),
    ticketInfo: document.getElementById("ticketInfo"),
    historyBody: document.getElementById("historyBody"),
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function round1(v) {
    return Math.round(v * 10) / 10;
  }

  function pickCondition() {
    const r = Math.random();
    if (r < 0.33) return "up";
    if (r < 0.66) return "flat";
    return "down";
  }

  function randomLast3() {
    return [1, 2, 3].map(() => 1 + Math.floor(Math.random() * NUM_HORSES));
  }

  function pickWeather() {
    const isRain = Math.random() < RAIN_CHANCE;
    return isRain ? { type: "rain", trackCondition: "heavy" } : { type: "clear", trackCondition: "good" };
  }

  // 直近のレースほど重く評価し、着順を強さの倍率（0.4〜1.6付近）に変換する
  function formMultFromLast3(last3) {
    const weights = [0.5, 0.3, 0.2];
    const positionScore = (pos) => (NUM_HORSES + 1) - pos;
    let weighted = 0;
    last3.forEach((pos, idx) => {
      weighted += weights[idx] * positionScore(pos);
    });
    const centered = weighted - (NUM_HORSES + 1) / 2;
    return 1 + centered / 7;
  }

  function generateHorses() {
    const names = shuffle(HORSE_POOL).slice(0, NUM_HORSES);
    const jockeys = pickJockeysForRace();
    const heartbeatIndex = Math.random() < HEARTBEAT_CHANCE ? Math.floor(Math.random() * NUM_HORSES) : -1;
    let frontierIndex = Math.random() < FRONTIER_CHANCE ? Math.floor(Math.random() * NUM_HORSES) : -1;
    if (frontierIndex === heartbeatIndex) frontierIndex = -1;
    const isHeavyTrack = state.weather.trackCondition === "heavy";

    const raw = names.map((name, i) => {
      const isHeartbeat = i === heartbeatIndex;
      const isFrontier = i === frontierIndex;
      const base = isHeartbeat ? 15 + Math.random() * 10 : 20 + Math.random() * 90;
      const last3 = randomLast3();
      const formMult = formMultFromLast3(last3);
      const jockey = jockeys[i];
      const jockeyMult = JOCKEY_RANK_MULT[jockey.rank];
      const condition = pickCondition();
      const conditionMult = CONDITION_MULT[condition];
      const heavyTrackMult = isHeavyTrack ? HEAVY_TRACK_JOCKEY_BONUS[jockey.rank] : 1.0;

      // 実際のレース結果を左右する「真の強さ」（重馬場でのB・C騎手の巻き返しも反映）
      const trueStrength = Math.max(3, base * formMult * jockeyMult * conditionMult * heavyTrackMult);

      // 世間が見積もる強さ（騎手の看板を過大評価し、馬の調子の変化や馬場適性を
      // 過小評価する傾向 + 予想の誤差）
      const marketJockeyMult = 1 + (jockeyMult - 1) * 1.6;
      const marketConditionMult = 1 + (conditionMult - 1) * 0.3;
      const noise = 1 + (Math.random() * 0.9 - 0.45);
      const marketStrength = Math.max(
        3,
        base * formMult * marketJockeyMult * marketConditionMult * noise
      );

      let horseName = name;
      if (isHeartbeat) horseName = HEARTBEAT_NAME;
      else if (isFrontier) horseName = FRONTIER_NAME;

      return { name: horseName, last3, jockey, condition, trueStrength, marketStrength, isHeartbeat, isFrontier };
    });

    const marketSum = raw.reduce((s, h) => s + h.marketStrength, 0);

    const horses = raw.map((h, i) => {
      const marketProb = h.marketStrength / marketSum;
      let oddsWin = clamp(round1(PAYOUT_RATE / marketProb), WIN_ODDS_MIN, WIN_ODDS_MAX);
      if (h.isHeartbeat) {
        oddsWin = Math.max(oddsWin, round1(HEARTBEAT_MIN_ODDS + Math.random() * 15));
      }
      const oddsPlace = clamp(round1(1 + (oddsWin - 1) / 2.8), PLACE_ODDS_MIN, PLACE_ODDS_MAX);
      return {
        id: i + 1,
        lane: i + 1,
        name: h.name,
        last3: h.last3,
        jockeyName: h.jockey.name,
        jockeyRank: h.jockey.rank,
        condition: h.condition,
        trueStrength: h.trueStrength,
        marketProb,
        oddsWin,
        oddsPlace,
        isHeartbeat: h.isHeartbeat,
        isFrontier: h.isFrontier,
      };
    });

    enforceSingleDigitOddsCap(horses);
    return horses;
  }

  // 単勝オッズが1桁（10倍未満）になる馬は最大4頭までに制限する
  function enforceSingleDigitOddsCap(horses) {
    const candidates = horses.filter((h) => !h.isHeartbeat);
    const sortedByOdds = [...candidates].sort((a, b) => a.oddsWin - b.oddsWin);
    let singleDigitCount = 0;
    sortedByOdds.forEach((h) => {
      if (h.oddsWin < 10) {
        singleDigitCount++;
        if (singleDigitCount > MAX_SINGLE_DIGIT_ODDS_HORSES) {
          h.oddsWin = clamp(round1(10 + Math.random() * 10), 10, WIN_ODDS_MAX);
          h.oddsPlace = clamp(round1(1 + (h.oddsWin - 1) / 2.8), PLACE_ODDS_MIN, PLACE_ODDS_MAX);
        }
      }
    });
  }

  // 馬連（1着・2着を着順不問で当てる）の組み合わせオッズ
  function umarenOdds(horseA, horseB) {
    const pA = horseA.marketProb;
    const pB = horseB.marketProb;
    const pairProb = pA * (pB / (1 - pA)) + pB * (pA / (1 - pB));
    return clamp(round1(PAYOUT_RATE / pairProb), UMAREN_ODDS_MIN, UMAREN_ODDS_MAX);
  }

  function formatMoney(n) {
    return Math.round(n).toLocaleString("ja-JP");
  }

  function renderBalance() {
    el.balance.textContent = state.mode === "infinite" ? "∞" : formatMoney(state.balance);
  }

  function updateModeInfo() {
    if (!state.mode || state.mode === "normal") {
      el.modeInfo.hidden = true;
      return;
    }
    el.modeInfo.hidden = false;
    if (state.mode === "infinite") {
      const recoveryRate = state.totalWagered > 0 ? (state.totalPayout / state.totalWagered) * 100 : 0;
      const hitRate = state.totalTickets > 0 ? (state.totalHits / state.totalTickets) * 100 : 0;
      el.modeInfo.textContent = `🎯 ${GAME_MODES.infinite.label}：回収率 ${recoveryRate.toFixed(1)}%／的中率 ${hitRate.toFixed(1)}%（${state.attemptRaceCount}レース経過）`;
      return;
    }
    const goalLabel = formatMoney(state.goalAmount) + "円";
    const status = state.goalAchieved ? "🎉達成済み" : `${state.attemptRaceCount}レース経過`;
    el.modeInfo.textContent = `🎯 ${GAME_MODES[state.mode].label}：目標${goalLabel}（${status}）`;
  }

  function isUmarenMode() {
    return el.betType.value === "umaren";
  }

  function isHorseSelected(horseId) {
    return isUmarenMode() ? state.selectedHorseIds.includes(horseId) : state.selectedHorseId === horseId;
  }

  function renderHorseTable() {
    el.horseTableBody.innerHTML = "";
    const umaren = isUmarenMode();
    state.horses.forEach((horse) => {
      const tr = document.createElement("tr");
      tr.dataset.horseId = horse.id;
      if (isHorseSelected(horse.id)) tr.classList.add("selected");

      const selectInput = umaren
        ? `<input type="checkbox" ${isHorseSelected(horse.id) ? "checked" : ""}>`
        : `<input type="radio" name="horseSelect" ${isHorseSelected(horse.id) ? "checked" : ""}>`;

      tr.innerHTML = `
        <td>${horse.lane}</td>
        <td>${horse.name}</td>
        <td>
          ${horse.jockeyName}
          <span class="rank-badge rank-${horse.jockeyRank}" title="${RANK_LABEL[horse.jockeyRank]}">${horse.jockeyRank}</span>
        </td>
        <td>${horse.last3.join("-")}</td>
        <td class="cond-${horse.condition}">${CONDITION_ICON[horse.condition]} ${CONDITION_LABEL[horse.condition]}</td>
        <td>${horse.oddsWin.toFixed(1)}倍</td>
        <td>${horse.oddsPlace.toFixed(1)}倍</td>
        <td>${selectInput}</td>
      `;

      tr.addEventListener("click", () => {
        if (state.raceRunning || state.raceFinished) return;
        if (isUmarenMode()) {
          const idx = state.selectedHorseIds.indexOf(horse.id);
          if (idx >= 0) {
            state.selectedHorseIds.splice(idx, 1);
          } else if (state.selectedHorseIds.length < 2) {
            state.selectedHorseIds.push(horse.id);
          } else {
            return;
          }
        } else {
          state.selectedHorseId = horse.id;
        }
        renderHorseTable();
        renderComboPreview();
      });

      el.horseTableBody.appendChild(tr);
    });
  }

  function renderComboPreview() {
    if (!isUmarenMode()) {
      el.comboPreview.textContent = "";
      return;
    }
    if (state.selectedHorseIds.length < 2) {
      el.comboPreview.textContent = `馬連は2頭選択してください（現在${state.selectedHorseIds.length}頭選択中）`;
      return;
    }
    const [a, b] = state.selectedHorseIds.map((id) => state.horses.find((h) => h.id === id));
    const odds = umarenOdds(a, b);
    el.comboPreview.textContent = `馬連候補: ${a.name} － ${b.name}　予想オッズ ${odds.toFixed(1)}倍`;
  }

  function buildTrackDefs() {
    return `
      <defs>
        <pattern id="finishPattern" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#ffffff"/>
          <rect width="5" height="5" fill="#222222"/>
          <rect x="5" y="5" width="5" height="5" fill="#222222"/>
        </pattern>
      </defs>
    `;
  }

  function buildTrackBackground() {
    const isHeavy = state.weather.trackCondition === "heavy";
    const outerFill = stadiumPath(TRACK.outerRailInset - 4);
    const innerFill = stadiumPath(TRACK.innerRailInset + 4);
    const outerRail = stadiumPath(TRACK.outerRailInset);
    const innerRail = stadiumPath(TRACK.innerRailInset);

    const dividers = [];
    for (let k = 1; k < TRACK.numLanes; k++) {
      const inset = TRACK.innerRailInset - TRACK.laneWidth * k;
      dividers.push(
        `<path d="${stadiumPath(inset)}" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1" stroke-dasharray="6 6"/>`
      );
    }

    const finishTop = geometryAt(TRACK.innerRailInset).yBottom;
    const finishBottom = geometryAt(TRACK.outerRailInset).yBottom;
    const finishRect = `<rect x="${FINISH_X - 4}" y="${finishTop}" width="8" height="${finishBottom - finishTop}" fill="url(#finishPattern)" stroke="#222" stroke-width="1"/>`;

    const startPoint = geometryAt(laneInset(Math.ceil(NUM_HORSES / 2)));
    const startLabel = `<text x="${startPoint.xLeft - 6}" y="${startPoint.yTop - 12}" text-anchor="end" font-size="14" fill="#ffe066" font-weight="bold">START</text>`;

    const colors = SURFACE_COLORS[state.surface];
    const trackColor = isHeavy ? colors.heavy : colors.good;

    return `
      <path d="${outerFill}" fill="${trackColor}"/>
      <path d="${innerFill}" fill="#1a5c31"/>
      ${dividers.join("")}
      <path d="${outerRail}" fill="none" stroke="#ffffff" stroke-width="2.5"/>
      <path d="${innerRail}" fill="none" stroke="#ffffff" stroke-width="2.5"/>
      ${finishRect}
      ${startLabel}
    `;
  }

  function buildHorseMarkers() {
    return state.horses
      .map((h) => {
        const d = buildRunnerPath(h.lane);
        return `<text id="runner-${h.id}" x="0" y="0" text-anchor="middle" dominant-baseline="central" class="horse-runner-svg" style="offset-path: path('${d}'); offset-distance: 0%;"><title>${h.name}</title>🐎${h.lane}</text>`;
      })
      .join("");
  }

  function renderTrack() {
    el.trackSvg.innerHTML = buildTrackDefs() + buildTrackBackground() + buildHorseMarkers();
  }

  function renderMyResult(finishOrder) {
    if (state.tickets.length === 0) {
      el.myResultInfo.textContent = "";
      return;
    }
    const rankById = new Map();
    finishOrder.forEach((id, idx) => rankById.set(id, idx + 1));
    const seen = new Set();
    const lines = [];
    state.tickets.forEach((ticket) => {
      const ids = ticket.type === "umaren" ? ticket.horseIds : [ticket.horseId];
      ids.forEach((id) => {
        if (seen.has(id)) return;
        seen.add(id);
        const horse = state.horses.find((h) => h.id === id);
        lines.push(`${horse.name}: ${rankById.get(id)}着`);
      });
    });
    el.myResultInfo.textContent = "あなたの馬の着順: " + lines.join(" / ");
  }

  function renderWeather() {
    const isHeavy = state.weather.trackCondition === "heavy";
    el.weatherBox.textContent = isHeavy ? "🌧️ 重馬場" : "☀️ 良馬場";
    el.weatherBox.classList.toggle("weather-heavy", isHeavy);
  }

  function renderSurfaceToggle() {
    const isTurf = state.surface === "turf";
    el.surfaceToggleBtn.textContent = isTurf ? "🌱 芝" : "🟤 ダート";
    el.surfaceToggleBtn.classList.toggle("surface-turf", isTurf);
  }

  function toggleSurface() {
    state.surface = state.surface === "dirt" ? "turf" : "dirt";
    renderSurfaceToggle();
    renderTrack();
  }

  function ticketLabel(ticket) {
    if (ticket.type === "umaren") {
      const names = ticket.horseIds.map((id) => state.horses.find((h) => h.id === id).name);
      return { typeLabel: "馬連", horseLabel: `${names.join(" － ")}（${ticket.odds.toFixed(1)}倍）` };
    }
    const horse = state.horses.find((h) => h.id === ticket.horseId);
    return { typeLabel: ticket.type === "win" ? "単勝" : "複勝", horseLabel: horse.name };
  }

  function renderTicketInfo() {
    if (state.tickets.length === 0) {
      el.ticketInfo.textContent = "";
      return;
    }
    const lines = state.tickets.map((t) => {
      const { typeLabel, horseLabel } = ticketLabel(t);
      return `[${typeLabel}] ${horseLabel} ${formatMoney(t.amount)}円`;
    });
    el.ticketInfo.innerHTML = "購入済み馬券: " + lines.join(" / ");
  }

  function addHistoryRow(raceNumber, typeLabel, horseLabel, amount, resultText, payout) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>第${raceNumber}R</td>
      <td>${typeLabel}</td>
      <td>${horseLabel}</td>
      <td>${formatMoney(amount)}円</td>
      <td class="${payout > 0 ? "result-win" : "result-lose"}">${resultText}</td>
      <td>${payout > 0 ? formatMoney(payout) + "円" : "-"}</td>
    `;
    el.historyBody.prepend(tr);
  }

  function resetForNewRace() {
    if (state.mode !== "infinite" && state.balance < MIN_BET) {
      showGameOver();
      return;
    }

    state.weather = pickWeather();
    state.horses = generateHorses();
    state.selectedHorseId = null;
    state.selectedHorseIds = [];
    state.tickets = [];
    state.raceRunning = false;
    state.raceFinished = false;
    el.raceMessage.textContent = "馬を選んで馬券を購入してください";
    el.myResultInfo.textContent = "";
    el.raceNumber.textContent = state.raceNumber;
    el.raceClass.textContent = getRaceClass(state.raceNumber).name;
    el.startBtn.disabled = true;
    el.watchOnlyBtn.disabled = false;
    el.skipBtn.disabled = true;
    el.nextBtn.disabled = true;
    el.restartBtn.hidden = true;
    updateBuyAvailability();
    renderWeather();
    renderSurfaceToggle();
    renderHorseTable();
    renderComboPreview();
    renderTrack();
    renderTicketInfo();
  }

  function showGameOver() {
    el.raceMessage.textContent = `所持金が最低購入額（${MIN_BET}円）を下回りました。ゲームオーバーです。`;
    el.buyBtn.disabled = true;
    el.startBtn.disabled = true;
    el.watchOnlyBtn.disabled = true;
    el.skipBtn.disabled = true;
    el.nextBtn.disabled = true;
    el.restartBtn.hidden = false;
  }

  function restartGame() {
    state.balance = START_BALANCE;
    state.raceNumber = 1;
    state.attemptRaceCount = 0;
    state.goalAchieved = false;
    state.totalWagered = 0;
    state.totalPayout = 0;
    state.totalTickets = 0;
    state.totalHits = 0;
    el.historyBody.innerHTML = "";
    renderBalance();
    updateModeInfo();
    resetForNewRace();
  }

  // 購入ボタンの活性/非活性のみを扱う。ゲームオーバー判定はここでは行わない
  // （全額ベットした直後にレース観戦できなくなる不具合を防ぐため）
  function updateBuyAvailability() {
    const canAfford = state.mode === "infinite" || state.balance >= MIN_BET;
    el.buyBtn.disabled = state.raceRunning || state.raceFinished || !canAfford;
  }

  function buyTicket() {
    const betType = el.betType.value;
    const amount = parseInt(el.betAmount.value, 10);
    if (!Number.isFinite(amount) || amount < MIN_BET) {
      alert(`最低${MIN_BET}円から購入できます`);
      return;
    }
    if (amount > state.balance && state.mode !== "infinite") {
      alert("所持金が不足しています");
      return;
    }

    if (betType === "umaren") {
      if (state.selectedHorseIds.length !== 2) {
        alert("馬連は2頭選択してください");
        return;
      }
      const [idA, idB] = state.selectedHorseIds;
      const horseA = state.horses.find((h) => h.id === idA);
      const horseB = state.horses.find((h) => h.id === idB);
      const odds = umarenOdds(horseA, horseB);
      state.balance -= amount;
      state.tickets.push({ type: "umaren", horseIds: [idA, idB], amount, odds });
    } else {
      if (state.selectedHorseId === null) {
        alert("馬を選択してください");
        return;
      }
      state.balance -= amount;
      state.tickets.push({ type: betType, horseId: state.selectedHorseId, amount });
    }

    state.totalWagered += amount;
    state.totalTickets++;

    renderBalance();
    renderTicketInfo();
    updateBuyAvailability();
    el.startBtn.disabled = false;
  }

  function computeFinishOrder() {
    const heartbeat = state.horses.find((h) => h.isHeartbeat);
    const frontier = state.horses.find((h) => h.isFrontier);
    const { varMin, varMax } = getRaceClass(state.raceNumber);
    const contenders = state.horses.filter((h) => h !== heartbeat && h !== frontier);
    const performances = contenders.map((h) => ({
      id: h.id,
      score: h.trueStrength * (varMin + Math.random() * (varMax - varMin)),
    }));
    performances.sort((a, b) => b.score - a.score);
    const freeOrder = performances.map((p) => p.id);

    const order = new Array(state.horses.length).fill(null);
    if (heartbeat) order[0] = heartbeat.id;
    if (frontier) order[FRONTIER_FIXED_RANK - 1] = frontier.id;

    let freeIdx = 0;
    for (let i = 0; i < order.length; i++) {
      if (order[i] === null) order[i] = freeOrder[freeIdx++];
    }
    return order;
  }

  const RACE_BASE_TIME = 21.0;
  const RACE_GAP_PER_RANK = 0.6;

  function runRace() {
    state.raceRunning = true;
    el.buyBtn.disabled = true;
    el.startBtn.disabled = true;
    el.watchOnlyBtn.disabled = true;
    el.skipBtn.disabled = false;
    el.raceMessage.textContent = "レース中...";

    const finishOrder = computeFinishOrder();
    state.currentFinishOrder = finishOrder;

    finishOrder.forEach((horseId, rank) => {
      const runner = document.getElementById(`runner-${horseId}`);
      const duration = RACE_BASE_TIME + rank * RACE_GAP_PER_RANK;
      runner.style.transition = `offset-distance ${duration}s linear`;
      // force reflow so the transition is picked up
      void runner.getBoundingClientRect();
      runner.style.offsetDistance = "100%";
    });

    const totalTime = RACE_BASE_TIME + (finishOrder.length - 1) * RACE_GAP_PER_RANK;

    state.raceTimeoutId = setTimeout(() => {
      state.raceTimeoutId = null;
      finishRace(finishOrder);
    }, totalTime * 1000 + 300);
  }

  function skipRace() {
    if (!state.raceRunning || !state.currentFinishOrder) return;
    if (state.raceTimeoutId !== null) {
      clearTimeout(state.raceTimeoutId);
      state.raceTimeoutId = null;
    }

    state.horses.forEach((horse) => {
      const runner = document.getElementById(`runner-${horse.id}`);
      runner.style.transition = "none";
      runner.style.offsetDistance = "100%";
    });

    finishRace(state.currentFinishOrder);
  }

  function finishRace(finishOrder) {
    state.raceRunning = false;
    state.raceFinished = true;

    const rankById = new Map();
    finishOrder.forEach((id, idx) => rankById.set(id, idx + 1));

    const winnerHorse = state.horses.find((h) => h.id === finishOrder[0]);
    el.raceMessage.textContent = `🏆 1着: ${winnerHorse.name}！`;
    renderMyResult(finishOrder);

    let totalPayout = 0;
    state.tickets.forEach((ticket) => {
      const { typeLabel, horseLabel } = ticketLabel(ticket);
      let payout = 0;
      let resultText = "";

      if (ticket.type === "umaren") {
        const top2 = [finishOrder[0], finishOrder[1]];
        const hit = ticket.horseIds.every((id) => top2.includes(id));
        if (hit) {
          payout = Math.round(ticket.amount * ticket.odds);
          resultText = "的中";
        } else {
          resultText = "外れ";
        }
      } else {
        const rank = rankById.get(ticket.horseId);
        const horse = state.horses.find((h) => h.id === ticket.horseId);
        if (ticket.type === "win") {
          if (rank === 1) {
            payout = Math.round(ticket.amount * horse.oddsWin);
            resultText = "的中 (1着)";
          } else {
            resultText = `外れ (${rank}着)`;
          }
        } else {
          if (rank <= 3) {
            payout = Math.round(ticket.amount * horse.oddsPlace);
            resultText = `的中 (${rank}着)`;
          } else {
            resultText = `外れ (${rank}着)`;
          }
        }
      }

      if (payout > 0) state.totalHits++;
      totalPayout += payout;
      addHistoryRow(state.raceNumber, typeLabel, horseLabel, ticket.amount, resultText, payout);
    });

    state.totalPayout += totalPayout;
    state.balance += totalPayout;
    renderBalance();

    if (totalPayout > 0) {
      el.raceMessage.textContent += ` 払戻合計 ${formatMoney(totalPayout)}円！`;
    }

    if (state.mode && state.mode !== "normal") {
      state.attemptRaceCount++;
      if (state.goalAmount && !state.goalAchieved && state.balance >= state.goalAmount) {
        state.goalAchieved = true;
        el.raceMessage.textContent += ` 🎉🏆 ${state.attemptRaceCount}レースで目標金額${formatMoney(state.goalAmount)}円を達成しました！`;
      }
      updateModeInfo();
    }

    el.nextBtn.disabled = false;
    el.buyBtn.disabled = true;
    el.watchOnlyBtn.disabled = true;
    el.skipBtn.disabled = true;
    state.currentFinishOrder = null;
  }

  function nextRace() {
    // 1日は12レース制。12レースが終わったら1レースに戻る
    state.raceNumber = state.raceNumber >= NUM_RACES_PER_DAY ? 1 : state.raceNumber + 1;
    resetForNewRace();
  }

  function startWatchOnly() {
    if (state.raceRunning || state.raceFinished) return;
    runRace();
  }

  function selectMode(mode) {
    state.mode = mode;
    state.goalAmount = GAME_MODES[mode].goal;
    state.attemptRaceCount = 0;
    state.goalAchieved = false;
    state.totalWagered = 0;
    state.totalPayout = 0;
    state.totalTickets = 0;
    state.totalHits = 0;
    state.balance = START_BALANCE;
    state.raceNumber = 1;
    el.historyBody.innerHTML = "";
    el.lobbyScreen.hidden = true;
    el.gameScreen.hidden = false;
    el.lobbyReturnBtn.hidden = false;
    renderBalance();
    updateModeInfo();
    resetForNewRace();
  }

  function returnToLobby() {
    if (state.raceTimeoutId !== null) {
      clearTimeout(state.raceTimeoutId);
      state.raceTimeoutId = null;
    }
    state.mode = null;
    el.gameScreen.hidden = true;
    el.lobbyScreen.hidden = false;
    el.lobbyReturnBtn.hidden = true;
    el.modeInfo.hidden = true;
  }

  el.buyBtn.addEventListener("click", buyTicket);
  el.startBtn.addEventListener("click", runRace);
  el.watchOnlyBtn.addEventListener("click", startWatchOnly);
  el.skipBtn.addEventListener("click", skipRace);
  el.nextBtn.addEventListener("click", nextRace);
  el.restartBtn.addEventListener("click", restartGame);
  el.lobbyReturnBtn.addEventListener("click", returnToLobby);
  el.surfaceToggleBtn.addEventListener("click", toggleSurface);
  el.betType.addEventListener("change", () => {
    state.selectedHorseId = null;
    state.selectedHorseIds = [];
    renderHorseTable();
    renderComboPreview();
  });
  document.querySelectorAll(".mode-select-btn").forEach((btn) => {
    btn.addEventListener("click", () => selectMode(btn.dataset.mode));
  });
})();
