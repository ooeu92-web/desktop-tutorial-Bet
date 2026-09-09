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

  function pickJockeysForRace(count = NUM_HORSES, excludeNames = []) {
    const chosen = [];
    RARE_JOCKEYS.forEach((rj) => {
      if (excludeNames.includes(rj.name)) return;
      if (Math.random() < rj.chance) chosen.push({ name: rj.name, rank: rj.rank });
    });
    const pool = JOCKEY_POOL.filter((j) => !excludeNames.includes(j.name));
    const regularNeeded = count - chosen.length;
    const regularPicked = shuffle(pool).slice(0, regularNeeded);
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

  // 馬主モードでは通常のレース番号ではなく、自厩馬の現在クラスを使う
  function currentRaceClass() {
    if (state.mode === "owner" && state.ownerHorse) {
      return OWNER_CLASSES[state.ownerHorse.classIndex];
    }
    return getRaceClass(state.raceNumber);
  }

  // 脚質：実際にどう運ぶかは毎レース変動するため、あくまで「基本の傾向」
  const RUNNING_STYLES = [
    { key: "nige", weight: 0.12, baseTendency: 90 },
    { key: "senko", weight: 0.30, baseTendency: 65 },
    { key: "sashi", weight: 0.33, baseTendency: 40 },
    { key: "oikomi", weight: 0.25, baseTendency: 15 },
  ];
  const STYLE_ICON = { nige: "逃", senko: "先", sashi: "差", oikomi: "追" };
  const STYLE_LABEL = { nige: "逃げ", senko: "先行", sashi: "差し", oikomi: "追込" };
  const STYLE_BASE_TENDENCY = Object.fromEntries(RUNNING_STYLES.map((s) => [s.key, s.baseTendency]));
  const STYLE_NOISE = 25; // 脚質どおりに運ばないことがあるためのブレ幅
  const PACE_CONTEST_THRESHOLD = 62; // このレースで先頭集団を争っているとみなす基準値
  const PACE_HIGH_COUNT = 4; // 先頭集団がこの人数以上ならハイペース
  const PACE_LOW_COUNT = 1; // 先頭集団がこの人数以下ならスローペース

  function pickRunningStyle() {
    const r = Math.random();
    let acc = 0;
    for (const s of RUNNING_STYLES) {
      acc += s.weight;
      if (r < acc) return s.key;
    }
    return RUNNING_STYLES[RUNNING_STYLES.length - 1].key;
  }

  const JOCKEY_RANK_MULT = { S: 1.4, A: 1.15, B: 1.0, C: 0.75 };
  const CONDITION_MULT = { up: 1.3, flat: 1.0, down: 0.7 };
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
    infinite: { label: "資金無限モード", goal: null, infinite: true },
  };

  // --- 馬主モード ---
  const OWNER_STAT_TOTAL = 150;
  const OWNER_STAT_MIN = 10;
  const OWNER_START_TOKENS = 3000;
  const OWNER_JOCKEY_HIRE_COST = { S: 500, A: 250, B: 100, C: 30 };
  const OWNER_CLASSES = [
    { name: "未勝利", varMin: 0.5, varMax: 1.65 },
    { name: "1勝クラス", varMin: 0.68, varMax: 1.35 },
    { name: "2勝クラス", varMin: 0.75, varMax: 1.28 },
    { name: "3勝クラス", varMin: 0.8, varMax: 1.22 },
    { name: "オープン", varMin: 0.85, varMax: 1.18 },
    { name: "重賞", varMin: 0.9, varMax: 1.15 },
  ];
  const OWNER_SAVE_KEY = "bettingDerbyOwnerSave_v1";

  function styleFromSpeed(speed) {
    if (speed >= 75) return "nige";
    if (speed >= 50) return "senko";
    if (speed >= 25) return "sashi";
    return "oikomi";
  }

  // --- コース形状（楕円トラック）のジオメトリ ---
  // より広く大きいコースにし、ゴールは直線（ホームストレート）の左側に置くことで
  // ターンを立ち上がってからゴールまでの直線を長く見せる
  const TRACK = {
    baseXLeft: 150,
    baseXRight: 900,
    baseYTop: 40,
    baseYBottom: 410,
    outerRailInset: 8,
    laneWidth: 12,
    numLanes: NUM_HORSES,
  };
  TRACK.innerRailInset = TRACK.outerRailInset + TRACK.laneWidth * TRACK.numLanes;
  const FINISH_X = 320;
  const START_X = 280;
  const MERGE_X = 420;
  const MERGE_RUN = 80;

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

  const VIEWBOX_WIDTH = 1050;
  const VIEWBOX_HEIGHT = 460;

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
    theme: "dark",
    weather: { type: "clear", trackCondition: "good" },
    horses: [],
    selectedHorseId: null,
    selectedHorseIds: [],
    tickets: [],
    raceRunning: false,
    raceFinished: false,
    raceTimeoutId: null,
    currentFinishOrder: null,
    lastPaceInfo: null,
    commentaryTimeouts: [],
    ownerHorse: null,
  };

  const el = {
    balance: document.getElementById("balance"),
    balanceLabel: document.getElementById("balanceLabel"),
    balanceUnit: document.getElementById("balanceUnit"),
    modeInfo: document.getElementById("modeInfo"),
    lobbyScreen: document.getElementById("lobbyScreen"),
    gameScreen: document.getElementById("gameScreen"),
    lobbyReturnBtn: document.getElementById("lobbyReturnBtn"),
    weatherBox: document.getElementById("weatherBox"),
    surfaceToggleBtn: document.getElementById("surfaceToggleBtn"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    continueBtn: document.getElementById("continueBtn"),
    umarenOption: document.getElementById("umarenOption"),
    ownerStableBtn: document.getElementById("ownerStableBtn"),
    ownerCreateScreen: document.getElementById("ownerCreateScreen"),
    ownerHorseName: document.getElementById("ownerHorseName"),
    statSpeed: document.getElementById("statSpeed"),
    statSpeedValue: document.getElementById("statSpeedValue"),
    statKick: document.getElementById("statKick"),
    statKickValue: document.getElementById("statKickValue"),
    statGutsBar: document.getElementById("statGutsBar"),
    statGutsValue: document.getElementById("statGutsValue"),
    ownerJockeyList: document.getElementById("ownerJockeyList"),
    ownerCreateError: document.getElementById("ownerCreateError"),
    ownerDebutBtn: document.getElementById("ownerDebutBtn"),
    ownerStableModal: document.getElementById("ownerStableModal"),
    ownerStableName: document.getElementById("ownerStableName"),
    ownerStableSpeed: document.getElementById("ownerStableSpeed"),
    ownerStableKick: document.getElementById("ownerStableKick"),
    ownerStableGuts: document.getElementById("ownerStableGuts"),
    ownerStableJockey: document.getElementById("ownerStableJockey"),
    ownerStableClass: document.getElementById("ownerStableClass"),
    ownerStableRecord: document.getElementById("ownerStableRecord"),
    ownerStableTokens: document.getElementById("ownerStableTokens"),
    ownerRetireBtn: document.getElementById("ownerRetireBtn"),
    ownerStableCloseBtn: document.getElementById("ownerStableCloseBtn"),
    raceNumber: document.getElementById("raceNumber"),
    raceClass: document.getElementById("raceClass"),
    trackSvg: document.getElementById("trackSvg"),
    raceMessage: document.getElementById("raceMessage"),
    myResultInfo: document.getElementById("myResultInfo"),
    commentary: document.getElementById("commentary"),
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
    const isOwnerRace = state.mode === "owner" && !!state.ownerHorse;
    const ownerIndex = isOwnerRace ? Math.floor(Math.random() * NUM_HORSES) : -1;
    const aiCount = isOwnerRace ? NUM_HORSES - 1 : NUM_HORSES;
    const aiNames = shuffle(HORSE_POOL).slice(0, aiCount);
    const aiJockeys = isOwnerRace
      ? pickJockeysForRace(aiCount, [state.ownerHorse.jockeyName])
      : pickJockeysForRace(aiCount);

    const names = [];
    const jockeys = [];
    let aiCursor = 0;
    for (let i = 0; i < NUM_HORSES; i++) {
      if (i === ownerIndex) {
        names.push(state.ownerHorse.name);
        jockeys.push({ name: state.ownerHorse.jockeyName, rank: state.ownerHorse.jockeyRank });
      } else {
        names.push(aiNames[aiCursor]);
        jockeys.push(aiJockeys[aiCursor]);
        aiCursor++;
      }
    }

    let heartbeatIndex = -1;
    let frontierIndex = -1;
    if (Math.random() < HEARTBEAT_CHANCE) {
      let idx;
      do { idx = Math.floor(Math.random() * NUM_HORSES); } while (idx === ownerIndex);
      heartbeatIndex = idx;
    }
    if (Math.random() < FRONTIER_CHANCE) {
      let idx;
      do { idx = Math.floor(Math.random() * NUM_HORSES); } while (idx === ownerIndex || idx === heartbeatIndex);
      frontierIndex = idx;
    }
    const isHeavyTrack = state.weather.trackCondition === "heavy";

    const raw = names.map((name, i) => {
      const isHeartbeat = i === heartbeatIndex;
      const isFrontier = i === frontierIndex;
      const isOwnerHorse = i === ownerIndex;
      let base;
      if (isHeartbeat) base = 15 + Math.random() * 10;
      else if (isOwnerHorse) base = 65 * (0.7 + (state.ownerHorse.stats.speed / 100) * 0.6);
      else base = 20 + Math.random() * 90;
      const last3 = randomLast3();
      const formMult = formMultFromLast3(last3);
      const jockey = jockeys[i];
      const jockeyMult = JOCKEY_RANK_MULT[jockey.rank];
      const runningStyle = isOwnerHorse ? styleFromSpeed(state.ownerHorse.stats.speed) : pickRunningStyle();
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

      return { name: horseName, last3, jockey, runningStyle, condition, trueStrength, marketStrength, isHeartbeat, isFrontier, isOwnerHorse };
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
        runningStyle: h.runningStyle,
        condition: h.condition,
        trueStrength: h.trueStrength,
        marketProb,
        oddsWin,
        oddsPlace,
        isHeartbeat: h.isHeartbeat,
        isFrontier: h.isFrontier,
        isOwnerHorse: h.isOwnerHorse,
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
    if (state.mode === "owner") {
      el.balanceLabel.textContent = "所持OP";
      el.balanceUnit.textContent = "OP";
      el.balance.textContent = formatMoney(state.balance);
      return;
    }
    el.balanceLabel.textContent = "所持金";
    el.balanceUnit.textContent = "円";
    el.balance.textContent = state.mode === "infinite" ? "∞" : formatMoney(state.balance);
  }

  function updateModeInfo() {
    if (state.mode === "owner") {
      if (!state.ownerHorse) {
        el.modeInfo.hidden = true;
        return;
      }
      el.modeInfo.hidden = false;
      const cls = OWNER_CLASSES[state.ownerHorse.classIndex].name;
      el.modeInfo.textContent = `🐴 ${state.ownerHorse.name}（${cls}・通算${state.ownerHorse.wins}勝）${state.ownerHorse.cleared ? " 🏆重賞制覇" : ""}`;
      return;
    }
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
    const isOwnerRace = state.mode === "owner";
    state.horses.forEach((horse) => {
      const tr = document.createElement("tr");
      tr.dataset.horseId = horse.id;
      if (isHorseSelected(horse.id)) tr.classList.add("selected");
      if (horse.isOwnerHorse) tr.classList.add("owner-horse-row");

      let selectInput;
      if (isOwnerRace) {
        selectInput = horse.isOwnerHorse ? '<span class="owner-badge">🐴 自厩馬</span>' : "-";
      } else if (umaren) {
        selectInput = `<input type="checkbox" ${isHorseSelected(horse.id) ? "checked" : ""}>`;
      } else {
        selectInput = `<input type="radio" name="horseSelect" ${isHorseSelected(horse.id) ? "checked" : ""}>`;
      }

      tr.innerHTML = `
        <td>${horse.lane}</td>
        <td>${horse.name}</td>
        <td>
          ${horse.jockeyName}
          <span class="rank-badge rank-${horse.jockeyRank}" title="${RANK_LABEL[horse.jockeyRank]}">${horse.jockeyRank}</span>
        </td>
        <td>${horse.last3.join("-")}</td>
        <td><span class="style-badge style-${horse.runningStyle}" title="${STYLE_LABEL[horse.runningStyle]}">${STYLE_ICON[horse.runningStyle]}</span></td>
        <td class="cond-${horse.condition}">${CONDITION_LABEL[horse.condition]}</td>
        <td>${horse.oddsWin.toFixed(1)}倍</td>
        <td>${horse.oddsPlace.toFixed(1)}倍</td>
        <td>${selectInput}</td>
      `;

      tr.addEventListener("click", () => {
        if (state.raceRunning || state.raceFinished) return;
        if (isOwnerRace) return; // 馬主モードでは自厩馬に選択が固定される
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

  const PACE_COMMENTARY = {
    high: "📢 ハイペースの流れ！後半に脚を使う馬が出てきそうだ",
    low: "📢 スローペースの落ち着いた流れ。前の馬に有利な展開か",
    medium: "📢 落ち着いたミドルペースの展開",
  };

  function clearCommentary() {
    state.commentaryTimeouts.forEach((id) => clearTimeout(id));
    state.commentaryTimeouts = [];
    el.commentary.textContent = "";
  }

  function resetZoom() {
    el.trackSvg.classList.remove("zoomed");
  }

  // 直線（ホームストレート）に入ったタイミングでズームインし、迫力を出す
  function scheduleZoom(totalTime) {
    const midGeom = geometryAt(cruiseInset(4.5));
    const originX = ((FINISH_X + (midGeom.xRight - FINISH_X) * 0.35) / VIEWBOX_WIDTH) * 100;
    const originY = (midGeom.yBottom / VIEWBOX_HEIGHT) * 100;
    el.trackSvg.style.transformOrigin = `${originX}% ${originY}%`;
    const zoomTimeout = setTimeout(() => {
      el.trackSvg.classList.add("zoomed");
    }, totalTime * 650);
    state.commentaryTimeouts.push(zoomTimeout);
  }

  // レース経過に合わせて、先頭集団・展開・終盤の攻防を実況する
  function scheduleCommentary(finishOrder, pace) {
    clearCommentary();
    const totalTime = RACE_BASE_TIME + (finishOrder.length - 1) * RACE_GAP_PER_RANK;
    scheduleZoom(totalTime);

    const frontRunnerNames = state.horses
      .filter((h) => pace.frontRunnerIds.includes(h.id))
      .map((h) => h.name);
    const t1 = setTimeout(() => {
      el.commentary.textContent =
        frontRunnerNames.length > 0
          ? `📢 スタートから${frontRunnerNames.slice(0, 2).join("・")}が先頭集団を形成！`
          : "📢 先頭を主張する馬がおらず、様子見の展開";
    }, totalTime * 250);

    const t2 = setTimeout(() => {
      el.commentary.textContent = PACE_COMMENTARY[pace.category];
    }, totalTime * 550);

    // 実況と映像の食い違いを防ぐため、宣言上の脚質ではなく
    // 「このレースで実際に先頭集団にいたか」で終盤の実況を決める
    const winner = state.horses.find((h) => h.id === finishOrder[0]);
    const winnerWasFrontRunner = pace.frontRunnerIds.includes(winner.id);
    const t3 = setTimeout(() => {
      el.commentary.textContent = winnerWasFrontRunner
        ? `📢 ${winner.name}が粘る！このまま押し切った！`
        : `📢 直線、${winner.name}が鋭く差してきた！`;
    }, totalTime * 850);

    state.commentaryTimeouts.push(t1, t2, t3);
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
    saveGame();
  }

  const THEME_KEY = "bettingDerbyTheme";
  const SAVE_KEY = "bettingDerbySave_v1";

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    el.themeToggleBtn.textContent = state.theme === "light" ? "☀️ ライト" : "🌙 ダーク";
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    try {
      localStorage.setItem(THEME_KEY, state.theme);
    } catch (e) {
      // localStorage unavailable（プライベートモード等）は無視する
    }
  }

  function loadThemePreference() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") state.theme = saved;
    } catch (e) {
      // localStorage unavailable（プライベートモード等）は無視する
    }
  }

  // 所持金・レース進行状況などをブラウザに保存し、次回続きから再開できるようにする
  function saveGame() {
    if (state.mode === "owner") return; // 馬主モードは専用のセーブ枠(OWNER_SAVE_KEY)を使う
    try {
      const snapshot = {
        mode: state.mode,
        goalAmount: state.goalAmount,
        attemptRaceCount: state.attemptRaceCount,
        goalAchieved: state.goalAchieved,
        totalWagered: state.totalWagered,
        totalPayout: state.totalPayout,
        totalTickets: state.totalTickets,
        totalHits: state.totalHits,
        balance: state.balance,
        raceNumber: state.raceNumber,
        surface: state.surface,
        historyHtml: el.historyBody.innerHTML,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      // localStorage unavailable（プライベートモード・容量超過等）は無視する
    }
  }

  function loadSavedGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function resumeGame(save) {
    if (!save || !save.mode) return;
    state.mode = save.mode;
    state.goalAmount = save.goalAmount ?? GAME_MODES[save.mode]?.goal ?? null;
    state.attemptRaceCount = save.attemptRaceCount || 0;
    state.goalAchieved = !!save.goalAchieved;
    state.totalWagered = save.totalWagered || 0;
    state.totalPayout = save.totalPayout || 0;
    state.totalTickets = save.totalTickets || 0;
    state.totalHits = save.totalHits || 0;
    state.balance = typeof save.balance === "number" ? save.balance : START_BALANCE;
    state.raceNumber = save.raceNumber || 1;
    state.surface = save.surface === "turf" ? "turf" : "dirt";
    el.historyBody.innerHTML = save.historyHtml || "";
    el.lobbyScreen.hidden = true;
    el.gameScreen.hidden = false;
    el.lobbyReturnBtn.hidden = false;
    renderBalance();
    updateModeInfo();
    resetForNewRace();
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
    const unit = state.mode === "owner" ? "OP" : "円";
    const lines = state.tickets.map((t) => {
      const { typeLabel, horseLabel } = ticketLabel(t);
      return `[${typeLabel}] ${horseLabel} ${formatMoney(t.amount)}${unit}`;
    });
    el.ticketInfo.innerHTML = "購入済み馬券: " + lines.join(" / ");
  }

  function addHistoryRow(raceNumber, typeLabel, horseLabel, amount, resultText, payout) {
    const unit = state.mode === "owner" ? "OP" : "円";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>第${raceNumber}R</td>
      <td>${typeLabel}</td>
      <td>${horseLabel}</td>
      <td>${formatMoney(amount)}${unit}</td>
      <td class="${payout > 0 ? "result-win" : "result-lose"}">${resultText}</td>
      <td>${payout > 0 ? formatMoney(payout) + unit : "-"}</td>
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
    if (state.mode === "owner") {
      const ownerH = state.horses.find((h) => h.isOwnerHorse);
      state.selectedHorseId = ownerH ? ownerH.id : null;
      el.umarenOption.hidden = true;
      if (el.betType.value === "umaren") el.betType.value = "win";
    } else {
      state.selectedHorseId = null;
      el.umarenOption.hidden = false;
    }
    state.selectedHorseIds = [];
    state.tickets = [];
    state.raceRunning = false;
    state.raceFinished = false;
    el.raceMessage.textContent = "馬を選んで馬券を購入してください";
    el.myResultInfo.textContent = "";
    clearCommentary();
    resetZoom();
    el.raceNumber.textContent = state.raceNumber;
    el.raceClass.textContent = currentRaceClass().name;
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
    saveGame();
  }

  function showGameOver() {
    const isOwner = state.mode === "owner";
    el.raceMessage.textContent = isOwner
      ? `所持OPが最低購入額（${MIN_BET}OP）を下回りました。ゲームオーバーです。`
      : `所持金が最低購入額（${MIN_BET}円）を下回りました。ゲームオーバーです。`;
    el.buyBtn.disabled = true;
    el.startBtn.disabled = true;
    el.watchOnlyBtn.disabled = true;
    el.skipBtn.disabled = true;
    el.nextBtn.disabled = true;
    el.restartBtn.hidden = false;
    el.restartBtn.textContent = isOwner ? "新しい馬で再挑戦" : "ゲームをリスタート";
  }

  function restartGame() {
    if (state.mode === "owner") {
      state.ownerHorse = null;
      state.balance = OWNER_START_TOKENS;
      saveOwnerState();
      el.gameScreen.hidden = true;
      el.restartBtn.hidden = true;
      showOwnerCreateScreen();
      return;
    }
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
    const currencyUnit = state.mode === "owner" ? "OP" : "円";
    const amount = parseInt(el.betAmount.value, 10);
    if (!Number.isFinite(amount) || amount < MIN_BET) {
      alert(`最低${MIN_BET}${currencyUnit}から購入できます`);
      return;
    }
    if (amount > state.balance && state.mode !== "infinite") {
      alert(state.mode === "owner" ? "所持OPが不足しています" : "所持金が不足しています");
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
    saveGame();
  }

  // 脚質から「このレースの実際の展開（ペース）」を都度シミュレートする。
  // 脚質はあくまで基本の傾向で、毎レース必ずそのとおりに運ぶわけではない
  // （ブレ幅STYLE_NOISEの分だけ先行馬が下がったり差し馬が突っかけたりする）。
  // 先頭集団を争う頭数が多いほどハイペースで前が止まりやすく、
  // 少ないほどスローペースで残った先行馬が有利になる。
  function simulatePace() {
    const rolls = state.horses.map((h) => ({
      id: h.id,
      value: STYLE_BASE_TENDENCY[h.runningStyle] + (Math.random() * 2 - 1) * STYLE_NOISE,
    }));
    const frontCount = rolls.filter((r) => r.value >= PACE_CONTEST_THRESHOLD).length;

    let category = "medium";
    if (frontCount >= PACE_HIGH_COUNT) category = "high";
    else if (frontCount <= PACE_LOW_COUNT) category = "low";

    const multiplierById = new Map();
    const frontRunnerIds = [];
    rolls.forEach((r) => {
      const isFrontThisRace = r.value >= PACE_CONTEST_THRESHOLD;
      if (isFrontThisRace) frontRunnerIds.push(r.id);
      let mult = 1.0;
      if (category === "high") mult = isFrontThisRace ? 0.85 : 1.15;
      else if (category === "low") mult = isFrontThisRace ? 1.2 : 0.9;

      // 馬主モードの自厩馬は瞬発力が「後方からの追い上げ」に効く
      if (!isFrontThisRace && state.mode === "owner" && state.ownerHorse) {
        const h = state.horses.find((hh) => hh.id === r.id);
        if (h && h.isOwnerHorse) {
          mult *= 1 + ((state.ownerHorse.stats.kick - 50) / 100) * 0.5;
        }
      }
      multiplierById.set(r.id, mult);
    });

    return { category, frontCount, multiplierById, frontRunnerIds };
  }

  function computeFinishOrder() {
    const heartbeat = state.horses.find((h) => h.isHeartbeat);
    const frontier = state.horses.find((h) => h.isFrontier);
    const { varMin, varMax } = currentRaceClass();
    const pace = simulatePace();
    state.lastPaceInfo = pace;
    const contenders = state.horses.filter((h) => h !== heartbeat && h !== frontier);
    const performances = contenders.map((h) => {
      // 馬主モードの自厩馬は勝負根性が「終盤の粘り」＝結果のブレの下限を引き上げる
      let effVarMin = varMin;
      if (h.isOwnerHorse && state.ownerHorse) {
        effVarMin = varMin + (state.ownerHorse.stats.guts / 100) * (1 - varMin) * 0.6;
      }
      return {
        id: h.id,
        score: h.trueStrength * (effVarMin + Math.random() * (varMax - effVarMin)) * pace.multiplierById.get(h.id),
      };
    });
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

  const RACE_BASE_TIME = 26.0;
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
    scheduleCommentary(finishOrder, state.lastPaceInfo);

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
    clearCommentary();

    const rankById = new Map();
    finishOrder.forEach((id, idx) => rankById.set(id, idx + 1));

    const winnerHorse = state.horses.find((h) => h.id === finishOrder[0]);
    const paceLabel = { high: "ハイペース", low: "スローペース", medium: "ミドルペース" }[state.lastPaceInfo.category];
    el.raceMessage.textContent = `🏆 1着: ${winnerHorse.name}！（展開: ${paceLabel}）`;
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

    const currencyUnit = state.mode === "owner" ? "OP" : "円";
    if (totalPayout > 0) {
      el.raceMessage.textContent += ` 払戻合計 ${formatMoney(totalPayout)}${currencyUnit}！`;
    }

    if (state.mode === "owner" && state.ownerHorse) {
      const ownerH = state.horses.find((h) => h.isOwnerHorse);
      const ownerRank = ownerH ? rankById.get(ownerH.id) : null;
      if (ownerRank === 1) {
        state.ownerHorse.wins++;
        if (state.ownerHorse.classIndex < OWNER_CLASSES.length - 1) {
          state.ownerHorse.classIndex++;
          el.raceMessage.textContent += ` 🎉クラス昇級！次走は${OWNER_CLASSES[state.ownerHorse.classIndex].name}！`;
        } else if (!state.ownerHorse.cleared) {
          state.ownerHorse.cleared = true;
          el.raceMessage.textContent += ` 🏆👑重賞制覇！${state.ownerHorse.name}、殿堂入りです！`;
        }
      }
      updateModeInfo();
      saveOwnerState();
    } else if (state.mode && state.mode !== "normal") {
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
    saveGame();
  }

  function nextRace() {
    if (state.mode === "owner") {
      // 馬主モードは通算レース数として使う（12レース制の対象外）
      state.raceNumber += 1;
    } else {
      // 1日は12レース制。12レースが終わったら1レースに戻る
      state.raceNumber = state.raceNumber >= NUM_RACES_PER_DAY ? 1 : state.raceNumber + 1;
    }
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
    el.ownerCreateScreen.hidden = true;
    el.ownerStableModal.hidden = true;
    el.lobbyScreen.hidden = false;
    el.lobbyReturnBtn.hidden = true;
    el.ownerStableBtn.hidden = true;
    el.modeInfo.hidden = true;
    document.querySelector(".app").classList.remove("owner-theme");
  }

  // ===== 馬主モード =====

  function saveOwnerState() {
    try {
      localStorage.setItem(
        OWNER_SAVE_KEY,
        JSON.stringify({
          ownerHorse: state.ownerHorse,
          balance: state.balance,
          raceNumber: state.raceNumber,
        })
      );
    } catch (e) {
      // localStorage unavailable（プライベートモード等）は無視する
    }
  }

  function loadOwnerState() {
    try {
      const raw = localStorage.getItem(OWNER_SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function updateStatSliderDisplay() {
    let speed = parseInt(el.statSpeed.value, 10);
    speed = clamp(speed, OWNER_STAT_MIN, OWNER_STAT_TOTAL - OWNER_STAT_MIN * 2);
    el.statSpeed.value = speed;

    const kickMax = OWNER_STAT_TOTAL - speed - OWNER_STAT_MIN;
    el.statKick.max = kickMax;
    let kick = parseInt(el.statKick.value, 10);
    kick = clamp(kick, OWNER_STAT_MIN, kickMax);
    el.statKick.value = kick;

    const guts = OWNER_STAT_TOTAL - speed - kick;

    el.statSpeedValue.textContent = speed;
    el.statKickValue.textContent = kick;
    el.statGutsValue.textContent = guts;
    el.statGutsBar.style.width = `${(guts / OWNER_STAT_TOTAL) * 100}%`;
  }

  function renderOwnerJockeyList() {
    el.ownerJockeyList.innerHTML = "";
    el.ownerJockeyList.dataset.selectedJockey = "";
    JOCKEY_POOL.forEach((j) => {
      const div = document.createElement("div");
      div.className = "owner-jockey-option";
      div.innerHTML = `
        <span class="owner-jockey-name">${j.name} <span class="rank-badge rank-${j.rank}">${j.rank}</span></span>
        <span class="owner-jockey-cost">雇用費 ${OWNER_JOCKEY_HIRE_COST[j.rank]}OP</span>
      `;
      div.addEventListener("click", () => {
        el.ownerJockeyList.querySelectorAll(".owner-jockey-option").forEach((d) => d.classList.remove("selected"));
        div.classList.add("selected");
        el.ownerJockeyList.dataset.selectedJockey = j.name;
      });
      el.ownerJockeyList.appendChild(div);
    });
  }

  function showOwnerCreateScreen() {
    el.lobbyScreen.hidden = true;
    el.gameScreen.hidden = true;
    el.ownerStableModal.hidden = true;
    el.ownerCreateScreen.hidden = false;
    el.lobbyReturnBtn.hidden = false;
    el.ownerStableBtn.hidden = true;
    el.ownerHorseName.value = "";
    el.statSpeed.value = 50;
    el.statKick.value = 50;
    updateStatSliderDisplay();
    renderOwnerJockeyList();
    el.ownerCreateError.textContent = "";
    document.querySelector(".app").classList.add("owner-theme");
  }

  function debutOwnerHorse() {
    const name = el.ownerHorseName.value.trim();
    if (!name) {
      el.ownerCreateError.textContent = "馬名を入力してください";
      return;
    }
    const jockeyName = el.ownerJockeyList.dataset.selectedJockey;
    if (!jockeyName) {
      el.ownerCreateError.textContent = "専属騎手を選択してください";
      return;
    }
    const jockey = JOCKEY_POOL.find((j) => j.name === jockeyName);
    const hireCost = OWNER_JOCKEY_HIRE_COST[jockey.rank];
    if (hireCost > state.balance) {
      el.ownerCreateError.textContent = "所持OPが不足しています";
      return;
    }

    const speed = parseInt(el.statSpeed.value, 10);
    const kick = parseInt(el.statKick.value, 10);
    const guts = OWNER_STAT_TOTAL - speed - kick;

    state.mode = "owner";
    state.ownerHorse = {
      name,
      stats: { speed, kick, guts },
      jockeyName: jockey.name,
      jockeyRank: jockey.rank,
      classIndex: 0,
      wins: 0,
      cleared: false,
    };
    state.balance -= hireCost;
    state.raceNumber = 1;
    saveOwnerState();

    el.ownerCreateScreen.hidden = true;
    el.gameScreen.hidden = false;
    el.ownerStableBtn.hidden = false;
    renderBalance();
    updateModeInfo();
    resetForNewRace();
  }

  function openStableModal() {
    if (!state.ownerHorse) return;
    const s = state.ownerHorse.stats;
    el.ownerStableName.textContent = state.ownerHorse.name;
    el.ownerStableSpeed.textContent = s.speed;
    el.ownerStableKick.textContent = s.kick;
    el.ownerStableGuts.textContent = s.guts;
    el.ownerStableJockey.textContent = `騎手: ${state.ownerHorse.jockeyName}（${state.ownerHorse.jockeyRank}）`;
    el.ownerStableClass.textContent = `クラス: ${OWNER_CLASSES[state.ownerHorse.classIndex].name}${
      state.ownerHorse.cleared ? "（重賞制覇済み）" : ""
    }`;
    el.ownerStableRecord.textContent = `通算成績: ${state.ownerHorse.wins}勝`;
    el.ownerStableTokens.textContent = `所持OP: ${formatMoney(state.balance)}OP`;
    el.ownerStableModal.hidden = false;
  }

  function closeStableModal() {
    el.ownerStableModal.hidden = true;
  }

  function retireOwnerHorse() {
    if (!state.ownerHorse) return;
    if (!confirm(`${state.ownerHorse.name}を引退させますか？（所持OPは引き継がれます）`)) return;
    state.ownerHorse = null;
    saveOwnerState();
    closeStableModal();
    el.gameScreen.hidden = true;
    showOwnerCreateScreen();
  }

  function enterOwnerMode() {
    const saved = loadOwnerState();
    document.querySelector(".app").classList.add("owner-theme");
    el.lobbyScreen.hidden = true;
    el.lobbyReturnBtn.hidden = false;
    state.mode = "owner";
    if (saved && saved.ownerHorse) {
      state.ownerHorse = saved.ownerHorse;
      state.balance = typeof saved.balance === "number" ? saved.balance : OWNER_START_TOKENS;
      state.raceNumber = saved.raceNumber || 1;
      el.ownerCreateScreen.hidden = true;
      el.gameScreen.hidden = false;
      el.ownerStableBtn.hidden = false;
      renderBalance();
      updateModeInfo();
      resetForNewRace();
    } else {
      state.ownerHorse = null;
      state.balance = saved && typeof saved.balance === "number" ? saved.balance : OWNER_START_TOKENS;
      showOwnerCreateScreen();
    }
  }

  el.buyBtn.addEventListener("click", buyTicket);
  el.startBtn.addEventListener("click", runRace);
  el.watchOnlyBtn.addEventListener("click", startWatchOnly);
  el.skipBtn.addEventListener("click", skipRace);
  el.nextBtn.addEventListener("click", nextRace);
  el.restartBtn.addEventListener("click", restartGame);
  el.lobbyReturnBtn.addEventListener("click", returnToLobby);
  el.surfaceToggleBtn.addEventListener("click", toggleSurface);
  el.themeToggleBtn.addEventListener("click", toggleTheme);
  el.continueBtn.addEventListener("click", () => {
    const save = loadSavedGame();
    if (save) resumeGame(save);
  });
  el.betType.addEventListener("change", () => {
    if (state.mode === "owner") {
      const ownerH = state.horses.find((h) => h.isOwnerHorse);
      state.selectedHorseId = ownerH ? ownerH.id : null;
    } else {
      state.selectedHorseId = null;
    }
    state.selectedHorseIds = [];
    renderHorseTable();
    renderComboPreview();
  });
  document.querySelectorAll(".mode-select-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.mode === "owner") enterOwnerMode();
      else selectMode(btn.dataset.mode);
    });
  });
  el.statSpeed.addEventListener("input", updateStatSliderDisplay);
  el.statKick.addEventListener("input", updateStatSliderDisplay);
  el.ownerDebutBtn.addEventListener("click", debutOwnerHorse);
  el.ownerStableBtn.addEventListener("click", openStableModal);
  el.ownerStableCloseBtn.addEventListener("click", closeStableModal);
  el.ownerRetireBtn.addEventListener("click", retireOwnerHorse);

  loadThemePreference();
  applyTheme();
  if (loadSavedGame()) {
    el.continueBtn.hidden = false;
  }
})();
