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
    "アストラルビート", "クイックシルバー", "バーニングソウル",
    "ミラクルヴォイス", "ダイヤモンドクロス", "セイントグロリア",
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
    { name: "古川吉洋", rank: "A" },
    { name: "丹内祐二", rank: "B" },
    { name: "鮫島克駿", rank: "B" },
    { name: "横山武史", rank: "B" },
    { name: "西村淳也", rank: "B" },
    { name: "横山和生", rank: "B" },
    { name: "荻野極", rank: "B" },
    { name: "坂井瑠星", rank: "B" },
    { name: "津村明秀", rank: "B" },
    { name: "三浦皇成", rank: "B" },
    { name: "M.デムーロ", rank: "B" },
    { name: "今村聖奈", rank: "C" },
    { name: "丸山元気", rank: "C" },
    { name: "菱田裕二", rank: "C" },
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
  const PLACE_ODDS_MAX = 25;
  const PLACE_ODDS_DIVISOR = 3.5;
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
  const OWNER_JOCKEY_HIRE_COST = { S: 800, A: 400, B: 160, C: 50 };
  // 騎手ランクごとの「毎レース」固定依頼料（緊張感を出すための継続コスト）
  const OWNER_JOCKEY_RACE_FEE = { S: 200, A: 100, B: 40, C: 15 };
  const OWNER_CLASSES = [
    { name: "未勝利", varMin: 0.5, varMax: 1.65 },
    { name: "1勝クラス", varMin: 0.68, varMax: 1.35 },
    { name: "2勝クラス", varMin: 0.75, varMax: 1.28 },
    { name: "3勝クラス", varMin: 0.8, varMax: 1.22 },
    { name: "オープン", varMin: 0.85, varMax: 1.18 },
    { name: "重賞", varMin: 0.9, varMax: 1.15 },
    { name: "GI", varMin: 0.93, varMax: 1.1 },
  ];
  const STAKES_WINS_FOR_GI = 2; // 重賞を何勝したらGIに挑戦できるか
  const OWNER_SAVE_KEY = "bettingDerbyOwnerSave_v1";

  // クラスごとの1着賞金（OP）
  const OWNER_CLASS_PRIZE = {
    未勝利: 50,
    "1勝クラス": 50,
    "2勝クラス": 100,
    "3勝クラス": 100,
    オープン: 150,
    重賞: 200,
    GI: 500,
  };

  // 馬主モードの1回あたりの馬券購入上限（アイテムで一時的に引き上げ可能）
  const OWNER_MAX_BET = 300;
  const OWNER_MAX_BET_BOOSTED = 500;

  // OPを消費してあらかじめ能力の仕上がった馬を購入できる馬市場
  const HORSE_MARKET = [
    { rank: "C", statTotal: 165, price: 450 },
    { rank: "B", statTotal: 190, price: 1300 },
    { rank: "A", statTotal: 220, price: 2800 },
    { rank: "S", statTotal: 260, price: 5500 },
  ];

  // OPアイテムショップ
  const OWNER_ITEMS = [
    {
      id: "peakCondition",
      name: "絶好調ドリンク",
      desc: "次のレース、愛馬が必ず絶好調になる",
      price: 220,
    },
    {
      id: "betCapBoost",
      name: "資金限度アップ",
      desc: `次のレースだけ、1回の購入上限が${OWNER_MAX_BET_BOOSTED}OPに上がる`,
      price: 50,
    },
  ];

  // 隠しコマンド：この馬名＋騎手の組み合わせでデビューすると、全レース1倍台で勝利する
  const SECRET_HORSE_NAME = "イクイノックス";
  const SECRET_JOCKEY_NAME = "C.ルメール";

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
    ownerBetCapBoostActive: false,
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
    freshStartBtn: document.getElementById("freshStartBtn"),
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
    ownerJockeyChangeList: document.getElementById("ownerJockeyChangeList"),
    ownerRaceLog: document.getElementById("ownerRaceLog"),
    ownerItemShop: document.getElementById("ownerItemShop"),
    ownerMarketBtn: document.getElementById("ownerMarketBtn"),
    ownerMarketModal: document.getElementById("ownerMarketModal"),
    ownerMarketList: document.getElementById("ownerMarketList"),
    ownerMarketCloseBtn: document.getElementById("ownerMarketCloseBtn"),
    raceNumber: document.getElementById("raceNumber"),
    raceClass: document.getElementById("raceClass"),
    trackSvg: document.getElementById("trackSvg"),
    raceMessage: document.getElementById("raceMessage"),
    myResultInfo: document.getElementById("myResultInfo"),
    commentary: document.getElementById("commentary"),
    horseTableBody: document.getElementById("horseTableBody"),
    betType: document.getElementById("betType"),
    betAmount: document.getElementById("betAmount"),
    betLimitHint: document.getElementById("betLimitHint"),
    buyBtn: document.getElementById("buyBtn"),
    startBtn: document.getElementById("startBtn"),
    watchOnlyBtn: document.getElementById("watchOnlyBtn"),
    stretchSkipBtn: document.getElementById("stretchSkipBtn"),
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
    const isGIRace = isOwnerRace && currentRaceClass().name === "GI";
    const isSecretHorse =
      isOwnerRace &&
      state.ownerHorse.name === SECRET_HORSE_NAME &&
      state.ownerHorse.jockeyName === SECRET_JOCKEY_NAME;
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
      const isSecretWinner = isOwnerHorse && isSecretHorse;
      let base;
      if (isHeartbeat) base = 15 + Math.random() * 10;
      else if (isOwnerHorse) base = 65 * (0.82 + (state.ownerHorse.stats.speed / 100) * 0.36);
      else base = 20 + Math.random() * 90;

      // 自厩馬の近3走は実際の過去レース結果を使う（未消化分は影響が中立になる値で埋める）
      let last3, formLast3;
      if (isOwnerHorse) {
        const history = state.ownerHorse.recentResults || [];
        const neutral = (NUM_HORSES + 1) / 2;
        last3 = [];
        formLast3 = [];
        for (let k = 0; k < 3; k++) {
          const histIdx = history.length - 3 + k;
          if (histIdx >= 0) {
            last3.push(history[histIdx]);
            formLast3.push(history[histIdx]);
          } else {
            last3.push(null);
            formLast3.push(neutral);
          }
        }
      } else {
        last3 = randomLast3();
        formLast3 = last3;
      }
      const formMult = formMultFromLast3(formLast3);

      const jockey = jockeys[i];
      // GIレースに限り、全騎手の実際の能力がAランク以上になる（Sランクはそのまま）
      const effJockeyRank = isGIRace ? (jockey.rank === "S" ? "S" : "A") : jockey.rank;
      const jockeyMult = JOCKEY_RANK_MULT[effJockeyRank];
      const runningStyle = isOwnerHorse ? styleFromSpeed(state.ownerHorse.stats.speed) : pickRunningStyle();
      const condition = isOwnerHorse && state.ownerHorse.nextConditionBoost ? "up" : pickCondition();
      const conditionMult = CONDITION_MULT[condition];
      const heavyTrackMult = isHeavyTrack ? HEAVY_TRACK_JOCKEY_BONUS[jockey.rank] : 1.0;

      // 実際のレース結果を左右する「真の強さ」（重馬場でのB・C騎手の巻き返しも反映）
      const trueStrength = Math.max(3, base * formMult * jockeyMult * conditionMult * heavyTrackMult);

      // 世間が見積もる強さ（騎手の看板を過大評価し、馬の調子の変化や馬場適性を
      // 過小評価する傾向 + 予想の誤差）。GIの実力補正は織り込まれないため妙味が生まれる
      const marketJockeyMult = 1 + (JOCKEY_RANK_MULT[jockey.rank] - 1) * 1.6;
      const marketConditionMult = 1 + (conditionMult - 1) * 0.3;
      const noise = 1 + (Math.random() * 0.9 - 0.45);
      const marketStrength = Math.max(
        3,
        base * formMult * marketJockeyMult * marketConditionMult * noise
      );

      let horseName = name;
      if (isHeartbeat) horseName = HEARTBEAT_NAME;
      else if (isFrontier) horseName = FRONTIER_NAME;

      return { name: horseName, last3, jockey, runningStyle, condition, trueStrength, marketStrength, isHeartbeat, isFrontier, isOwnerHorse, isSecretWinner };
    });

    const marketSum = raw.reduce((s, h) => s + h.marketStrength, 0);

    const horses = raw.map((h, i) => {
      const marketProb = h.marketStrength / marketSum;
      let oddsWin = clamp(round1(PAYOUT_RATE / marketProb), WIN_ODDS_MIN, WIN_ODDS_MAX);
      if (h.isHeartbeat) {
        oddsWin = Math.max(oddsWin, round1(HEARTBEAT_MIN_ODDS + Math.random() * 15));
      }
      if (h.isSecretWinner) {
        oddsWin = round1(1.1 + Math.random() * 0.8);
      }
      const oddsPlace = clamp(round1(1 + (oddsWin - 1) / PLACE_ODDS_DIVISOR), PLACE_ODDS_MIN, PLACE_ODDS_MAX);
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
        isSecretWinner: h.isSecretWinner,
      };
    });

    enforceSingleDigitOddsCap(horses);
    return horses;
  }

  // 単勝オッズが1桁（10倍未満）になる馬は最大5頭までに制限する
  function enforceSingleDigitOddsCap(horses) {
    const candidates = horses.filter((h) => !h.isHeartbeat && !h.isSecretWinner);
    const sortedByOdds = [...candidates].sort((a, b) => a.oddsWin - b.oddsWin);
    let singleDigitCount = 0;
    sortedByOdds.forEach((h) => {
      if (h.oddsWin < 10) {
        singleDigitCount++;
        if (singleDigitCount > MAX_SINGLE_DIGIT_ODDS_HORSES) {
          h.oddsWin = clamp(round1(10 + Math.random() * 10), 10, WIN_ODDS_MAX);
          h.oddsPlace = clamp(round1(1 + (h.oddsWin - 1) / PLACE_ODDS_DIVISOR), PLACE_ODDS_MIN, PLACE_ODDS_MAX);
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
      el.modeInfo.textContent = `🐴 ${state.ownerHorse.name}（${cls}・通算${state.ownerHorse.wins}勝）${state.ownerHorse.cleared ? " 🏆殿堂入り" : ""}`;
      return;
    }
    if (!state.mode) {
      el.modeInfo.hidden = true;
      return;
    }
    el.modeInfo.hidden = false;
    const recoveryRate = state.totalWagered > 0 ? (state.totalPayout / state.totalWagered) * 100 : 0;
    const hitRate = state.totalTickets > 0 ? (state.totalHits / state.totalTickets) * 100 : 0;
    const statsLabel = `回収率 ${recoveryRate.toFixed(1)}%／的中率 ${hitRate.toFixed(1)}%`;
    if (state.mode === "infinite") {
      el.modeInfo.textContent = `🎯 ${GAME_MODES.infinite.label}：${statsLabel}（${state.attemptRaceCount}レース経過）`;
      return;
    }
    if (state.mode === "normal") {
      el.modeInfo.textContent = `📊 ${GAME_MODES.normal.label}：${statsLabel}（${state.attemptRaceCount}レース経過）`;
      return;
    }
    const goalLabel = formatMoney(state.goalAmount) + "円";
    const status = state.goalAchieved ? "🎉達成済み" : `${state.attemptRaceCount}レース経過`;
    el.modeInfo.textContent = `🎯 ${GAME_MODES[state.mode].label}：目標${goalLabel}（${status}）／${statsLabel}`;
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
        <td>${horse.last3.every((v) => v === null) ? "戦績なし" : horse.last3.map((v) => (v === null ? "-" : v)).join("-")}</td>
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
        const cls = h.isOwnerHorse ? "horse-runner-svg owner-horse-runner-svg" : "horse-runner-svg";
        return `<text id="runner-${h.id}" x="0" y="0" text-anchor="middle" dominant-baseline="central" class="${cls}" style="offset-path: path('${d}'); offset-distance: 0%;"><title>${h.name}</title>🐎${h.lane}</text>`;
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

  // レース進行のタイミング（totalTimeに対する割合）。「直線までスキップ」もこの値を共有する
  const COMMENTARY_T1_FRACTION = 0.25;
  const COMMENTARY_T2_FRACTION = 0.55;
  const COMMENTARY_T3_FRACTION = 0.85;
  const HOME_STRETCH_FRACTION = 0.65; // ズームイン＝直線入り口のタイミング

  // 直線（ホームストレート）に入ったタイミングでズームインし、迫力を出す
  function scheduleZoom(totalTime) {
    const midGeom = geometryAt(cruiseInset(4.5));
    const originX = ((FINISH_X + (midGeom.xRight - FINISH_X) * 0.35) / VIEWBOX_WIDTH) * 100;
    const originY = (midGeom.yBottom / VIEWBOX_HEIGHT) * 100;
    el.trackSvg.style.transformOrigin = `${originX}% ${originY}%`;
    const zoomTimeout = setTimeout(() => {
      el.trackSvg.classList.add("zoomed");
    }, totalTime * HOME_STRETCH_FRACTION * 1000);
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
    }, totalTime * COMMENTARY_T1_FRACTION * 1000);

    const t2 = setTimeout(() => {
      el.commentary.textContent = PACE_COMMENTARY[pace.category];
    }, totalTime * COMMENTARY_T2_FRACTION * 1000);

    // 実況と映像の食い違いを防ぐため、宣言上の脚質ではなく
    // 「このレースで実際に先頭集団にいたか」で終盤の実況を決める
    const winner = state.horses.find((h) => h.id === finishOrder[0]);
    const winnerWasFrontRunner = pace.frontRunnerIds.includes(winner.id);
    const t3 = setTimeout(() => {
      el.commentary.textContent = winnerWasFrontRunner
        ? `📢 ${winner.name}が粘る！このまま押し切った！`
        : `📢 直線、${winner.name}が鋭く差してきた！`;
    }, totalTime * COMMENTARY_T3_FRACTION * 1000);

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

  // 馬主モードの現在の馬券購入上限（アイテムで一時的に引き上げられていればそちらを返す）
  function ownerMaxBet() {
    return state.ownerBetCapBoostActive ? OWNER_MAX_BET_BOOSTED : OWNER_MAX_BET;
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
      if (state.ownerHorse) {
        state.ownerHorse.nextConditionBoost = false;
        state.ownerBetCapBoostActive = !!state.ownerHorse.nextBetCapBoost;
        state.ownerHorse.nextBetCapBoost = false;
      }
      el.betAmount.max = String(ownerMaxBet());
      el.betLimitHint.textContent = `（1回の購入上限 ${ownerMaxBet()}OP${state.ownerBetCapBoostActive ? "・ブースト中" : ""}）`;
    } else {
      state.selectedHorseId = null;
      el.umarenOption.hidden = false;
      el.betAmount.removeAttribute("max");
      el.betLimitHint.textContent = "";
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
    el.stretchSkipBtn.disabled = true;
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
    el.stretchSkipBtn.disabled = true;
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
    if (state.mode === "owner" && amount > ownerMaxBet()) {
      alert(`馬主モードでは1回の購入上限は${ownerMaxBet()}OPです`);
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
          mult *= 1 + ((state.ownerHorse.stats.kick - 50) / 100) * 0.65;
        }
      }
      multiplierById.set(r.id, mult);
    });

    return { category, frontCount, multiplierById, frontRunnerIds };
  }

  function computeFinishOrder() {
    // シークレット機能：イクイノックス＋C.ルメールの組み合わせは必ず1着になる
    const secretWinner = state.horses.find((h) => h.isSecretWinner);
    const heartbeat = !secretWinner ? state.horses.find((h) => h.isHeartbeat) : null;
    const frontier = state.horses.find((h) => h.isFrontier);
    const { varMin, varMax } = currentRaceClass();
    const pace = simulatePace();
    state.lastPaceInfo = pace;
    const contenders = state.horses.filter((h) => h !== heartbeat && h !== frontier && h !== secretWinner);
    const performances = contenders.map((h) => {
      // 馬主モードの自厩馬は勝負根性が「終盤の粘り」＝結果のブレの下限を引き上げる
      let effVarMin = varMin;
      if (h.isOwnerHorse && state.ownerHorse) {
        effVarMin = varMin + (state.ownerHorse.stats.guts / 100) * (1 - varMin) * 0.75;
      }
      return {
        id: h.id,
        score: h.trueStrength * (effVarMin + Math.random() * (varMax - effVarMin)) * pace.multiplierById.get(h.id),
      };
    });
    performances.sort((a, b) => b.score - a.score);
    const freeOrder = performances.map((p) => p.id);

    const order = new Array(state.horses.length).fill(null);
    if (secretWinner) order[0] = secretWinner.id;
    else if (heartbeat) order[0] = heartbeat.id;
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
    el.stretchSkipBtn.disabled = false;
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

  // 序盤〜中盤を早送りし、直線（ホームストレート）からを通常速度で見せる
  function skipToStretch() {
    if (!state.raceRunning || !state.currentFinishOrder) return;
    if (state.raceTimeoutId !== null) {
      clearTimeout(state.raceTimeoutId);
      state.raceTimeoutId = null;
    }
    state.commentaryTimeouts.forEach((id) => clearTimeout(id));
    state.commentaryTimeouts = [];

    const finishOrder = state.currentFinishOrder;
    const totalTime = RACE_BASE_TIME + (finishOrder.length - 1) * RACE_GAP_PER_RANK;
    const tSkip = totalTime * HOME_STRETCH_FRACTION;

    finishOrder.forEach((horseId, rank) => {
      const runner = document.getElementById(`runner-${horseId}`);
      const duration = RACE_BASE_TIME + rank * RACE_GAP_PER_RANK;
      const pct = Math.min(100, (tSkip / duration) * 100);
      const remaining = Math.max(0.3, duration - tSkip);
      runner.style.transition = "none";
      runner.style.offsetDistance = `${pct}%`;
      // force reflow so the transition is picked up
      void runner.getBoundingClientRect();
      runner.style.transition = `offset-distance ${remaining}s linear`;
      runner.style.offsetDistance = "100%";
    });

    el.trackSvg.classList.add("zoomed");
    el.commentary.textContent = PACE_COMMENTARY[state.lastPaceInfo.category];

    // 終盤の実況（元のタイムラインから直線入り以降の分だけ再スケジュールする）
    const winner = state.horses.find((h) => h.id === finishOrder[0]);
    const winnerWasFrontRunner = state.lastPaceInfo.frontRunnerIds.includes(winner.id);
    const t3Delay = Math.max(0, (COMMENTARY_T3_FRACTION - HOME_STRETCH_FRACTION) * totalTime * 1000);
    const t3 = setTimeout(() => {
      el.commentary.textContent = winnerWasFrontRunner
        ? `📢 ${winner.name}が粘る！このまま押し切った！`
        : `📢 直線、${winner.name}が鋭く差してきた！`;
    }, t3Delay);
    state.commentaryTimeouts.push(t3);

    el.startBtn.disabled = true;
    el.watchOnlyBtn.disabled = true;
    el.stretchSkipBtn.disabled = true;

    const remainingTime = totalTime - tSkip;
    state.raceTimeoutId = setTimeout(() => {
      state.raceTimeoutId = null;
      finishRace(finishOrder);
    }, remainingTime * 1000 + 300);
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
      const raceClassName = currentRaceClass().name;

      if (ownerRank !== null && ownerRank !== undefined) {
        state.ownerHorse.recentResults = state.ownerHorse.recentResults || [];
        state.ownerHorse.recentResults.push(ownerRank);
        if (state.ownerHorse.recentResults.length > 3) state.ownerHorse.recentResults.shift();

        state.ownerHorse.raceLog = state.ownerHorse.raceLog || [];
        state.ownerHorse.raceLog.push({ raceNumber: state.raceNumber, className: raceClassName, rank: ownerRank });
        if (state.ownerHorse.raceLog.length > 50) state.ownerHorse.raceLog.shift();
      }

      if (ownerRank === 1) {
        const prize = OWNER_CLASS_PRIZE[raceClassName] || 0;
        if (prize > 0) {
          state.balance += prize;
          renderBalance();
          el.raceMessage.textContent += ` 💰賞金 ${prize}OP獲得！`;
        }
        state.ownerHorse.wins++;
        const classIdx = state.ownerHorse.classIndex;
        if (raceClassName === "重賞") {
          state.ownerHorse.stakesWins = (state.ownerHorse.stakesWins || 0) + 1;
          if (state.ownerHorse.stakesWins >= STAKES_WINS_FOR_GI && classIdx < OWNER_CLASSES.length - 1) {
            state.ownerHorse.classIndex++;
            el.raceMessage.textContent += ` 🎉重賞${state.ownerHorse.stakesWins}勝達成！次走はGIに挑戦！`;
          } else {
            el.raceMessage.textContent += ` 🏆重賞制覇！（重賞${state.ownerHorse.stakesWins}勝）`;
          }
        } else if (raceClassName === "GI") {
          if (!state.ownerHorse.cleared) {
            state.ownerHorse.cleared = true;
            el.raceMessage.textContent += ` 🏆👑GI制覇！${state.ownerHorse.name}、殿堂入りです！`;
          } else {
            el.raceMessage.textContent += ` 🏆GI制覇！`;
          }
        } else if (classIdx < OWNER_CLASSES.length - 1) {
          state.ownerHorse.classIndex++;
          el.raceMessage.textContent += ` 🎉クラス昇級！次走は${OWNER_CLASSES[state.ownerHorse.classIndex].name}！`;
        }
      }
      updateModeInfo();
      saveOwnerState();
    } else if (state.mode) {
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
    el.stretchSkipBtn.disabled = true;
    el.skipBtn.disabled = true;
    state.currentFinishOrder = null;
    saveGame();
  }

  function nextRace() {
    if (state.mode === "owner") {
      // 馬主モードは通算レース数として使う（12レース制の対象外）
      state.raceNumber += 1;
      const fee = chargeOwnerJockeyFee();
      resetForNewRace();
      if (fee > 0 && el.restartBtn.hidden) {
        el.raceMessage.textContent = `馬を選んで馬券を購入してください（騎手依頼料 ${fee}OP を支払いました）`;
      }
      return;
    }
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
    el.ownerCreateScreen.hidden = true;
    el.ownerStableModal.hidden = true;
    el.ownerMarketModal.hidden = true;
    el.lobbyScreen.hidden = false;
    el.lobbyReturnBtn.hidden = true;
    el.ownerStableBtn.hidden = true;
    el.modeInfo.hidden = true;
    document.querySelector(".app").classList.remove("owner-theme");
    refreshLobbySaveButtons();
  }

  // ロビーの「続きから再開」「最初から始める」ボタンの表示・非表示を、実際のセーブ有無に合わせて更新する
  function refreshLobbySaveButtons() {
    const hasNormalSave = !!loadSavedGame();
    const savedOwnerState = loadOwnerState();
    const hasOwnerSave = !!(savedOwnerState && savedOwnerState.ownerHorse);
    el.continueBtn.hidden = !hasNormalSave;
    el.freshStartBtn.hidden = !(hasNormalSave || hasOwnerSave);
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
    el.ownerMarketModal.hidden = true;
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
      stakesWins: 0,
      recentResults: [],
      raceLog: [],
      nextConditionBoost: false,
      nextBetCapBoost: false,
    };
    state.balance -= hireCost;
    state.raceNumber = 1;
    const fee = chargeOwnerJockeyFee();
    saveOwnerState();

    el.ownerCreateScreen.hidden = true;
    el.gameScreen.hidden = false;
    el.ownerStableBtn.hidden = false;
    renderBalance();
    updateModeInfo();
    resetForNewRace();
    if (fee > 0 && el.restartBtn.hidden) {
      el.raceMessage.textContent = `馬を選んで馬券を購入してください（騎手依頼料 ${fee}OP を支払いました）`;
    }
  }

  // レースごとに騎手ランクに応じた固定の依頼料を所持OPから差し引く
  function chargeOwnerJockeyFee() {
    if (state.mode !== "owner" || !state.ownerHorse) return 0;
    const fee = OWNER_JOCKEY_RACE_FEE[state.ownerHorse.jockeyRank] || 0;
    state.balance -= fee;
    return fee;
  }

  function openStableModal() {
    if (!state.ownerHorse) return;
    const s = state.ownerHorse.stats;
    el.ownerStableName.textContent = state.ownerHorse.name;
    el.ownerStableSpeed.textContent = s.speed;
    el.ownerStableKick.textContent = s.kick;
    el.ownerStableGuts.textContent = s.guts;
    el.ownerStableJockey.textContent = `騎手: ${state.ownerHorse.jockeyName}（${state.ownerHorse.jockeyRank}） 依頼料 ${
      OWNER_JOCKEY_RACE_FEE[state.ownerHorse.jockeyRank]
    }OP/レース`;
    el.ownerStableClass.textContent = `クラス: ${OWNER_CLASSES[state.ownerHorse.classIndex].name}${
      state.ownerHorse.cleared ? "（殿堂入り済み）" : ""
    }`;
    el.ownerStableRecord.textContent = `通算成績: ${state.ownerHorse.wins}勝（重賞${state.ownerHorse.stakesWins || 0}勝）`;
    el.ownerStableTokens.textContent = `所持OP: ${formatMoney(state.balance)}OP`;
    renderOwnerJockeyChangeList();
    renderOwnerRaceLog();
    renderOwnerItemShop();
    el.ownerStableModal.hidden = false;
  }

  function closeStableModal() {
    el.ownerStableModal.hidden = true;
  }

  // 厩舎モーダルから専属騎手をいつでも変更できる（毎レースの依頼料はランクに応じて変動する）
  function renderOwnerJockeyChangeList() {
    if (!state.ownerHorse) return;
    el.ownerJockeyChangeList.innerHTML = "";
    JOCKEY_POOL.forEach((j) => {
      const div = document.createElement("div");
      div.className = "owner-jockey-option";
      if (state.ownerHorse.jockeyName === j.name) div.classList.add("selected");
      div.innerHTML = `
        <span class="owner-jockey-name">${j.name} <span class="rank-badge rank-${j.rank}">${j.rank}</span></span>
        <span class="owner-jockey-cost">依頼料 ${OWNER_JOCKEY_RACE_FEE[j.rank]}OP/R</span>
      `;
      div.addEventListener("click", () => {
        if (state.raceRunning) {
          alert("レース中は騎手を変更できません");
          return;
        }
        if (state.ownerHorse.jockeyName === j.name) return;
        state.ownerHorse.jockeyName = j.name;
        state.ownerHorse.jockeyRank = j.rank;
        saveOwnerState();
        openStableModal();
      });
      el.ownerJockeyChangeList.appendChild(div);
    });
  }

  function renderOwnerRaceLog() {
    if (!state.ownerHorse) return;
    const log = state.ownerHorse.raceLog || [];
    if (log.length === 0) {
      el.ownerRaceLog.textContent = "まだレース実績がありません";
      return;
    }
    el.ownerRaceLog.innerHTML = log
      .slice(-10)
      .reverse()
      .map((entry) => {
        const resultClass = entry.rank === 1 ? "result-win" : "result-lose";
        const resultText = entry.rank === 1 ? "勝利" : `${entry.rank}着`;
        return `<div class="owner-race-log-row"><span>第${entry.raceNumber}戦（${entry.className}）</span><span class="${resultClass}">${resultText}</span></div>`;
      })
      .join("");
  }

  function isOwnerItemActive(item) {
    if (item.id === "peakCondition") return !!state.ownerHorse.nextConditionBoost;
    if (item.id === "betCapBoost") return !!state.ownerHorse.nextBetCapBoost;
    return false;
  }

  function renderOwnerItemShop() {
    if (!state.ownerHorse) return;
    el.ownerItemShop.innerHTML = OWNER_ITEMS.map((item) => {
      const active = isOwnerItemActive(item);
      const disabled = active || state.balance < item.price;
      return `
        <div class="owner-item-row">
          <span>${item.name}<br><small>${item.desc}</small></span>
          <button data-item-id="${item.id}" ${disabled ? "disabled" : ""}>${active ? "予約済み" : `${item.price}OPで購入`}</button>
        </div>
      `;
    }).join("");
    el.ownerItemShop.querySelectorAll("button[data-item-id]").forEach((btn) => {
      btn.addEventListener("click", () => buyOwnerItem(btn.dataset.itemId));
    });
  }

  function buyOwnerItem(itemId) {
    const item = OWNER_ITEMS.find((i) => i.id === itemId);
    if (!item || !state.ownerHorse) return;
    if (isOwnerItemActive(item)) return;
    if (state.balance < item.price) {
      alert("所持OPが不足しています");
      return;
    }
    state.balance -= item.price;
    if (item.id === "peakCondition") state.ownerHorse.nextConditionBoost = true;
    if (item.id === "betCapBoost") state.ownerHorse.nextBetCapBoost = true;
    renderBalance();
    saveOwnerState();
    el.ownerStableTokens.textContent = `所持OP: ${formatMoney(state.balance)}OP`;
    renderOwnerItemShop();
  }

  function openMarketModal() {
    renderOwnerMarketList();
    el.ownerMarketModal.hidden = false;
  }

  function closeMarketModal() {
    el.ownerMarketModal.hidden = true;
  }

  function renderOwnerMarketList() {
    el.ownerMarketList.innerHTML = HORSE_MARKET.map((tier) => {
      const each = Math.floor(tier.statTotal / 3);
      const affordable = state.balance >= tier.price;
      return `
        <div class="owner-market-card">
          <h4><span class="rank-badge rank-${tier.rank}">${tier.rank}</span>ランク馬</h4>
          <p>能力値合計 ${tier.statTotal}（各能力 約${each}）</p>
          <p>価格: ${formatMoney(tier.price)}OP</p>
          <button data-rank="${tier.rank}" ${affordable ? "" : "disabled"}>購入する</button>
        </div>
      `;
    }).join("");
    el.ownerMarketList.querySelectorAll("button[data-rank]").forEach((btn) => {
      btn.addEventListener("click", () => buyMarketHorse(btn.dataset.rank));
    });
  }

  function buyMarketHorse(rank) {
    const tier = HORSE_MARKET.find((t) => t.rank === rank);
    if (!tier || !state.ownerHorse) return;
    if (state.balance < tier.price) {
      alert("所持OPが不足しています");
      return;
    }
    if (!confirm(`${tier.rank}ランク馬を購入すると、現在の${state.ownerHorse.name}と入れ替わります（進行中のクラス・戦績はリセットされます）。よろしいですか？`)) {
      return;
    }
    const defaultName = `${tier.rank}級の新星`;
    const inputName = typeof prompt === "function" ? prompt("新しい馬名を入力してください", defaultName) : defaultName;
    const newName = (inputName || defaultName).trim().slice(0, 12) || defaultName;
    const each = Math.floor(tier.statTotal / 3);
    const remainder = tier.statTotal - each * 3;

    state.balance -= tier.price;
    state.ownerHorse = {
      name: newName,
      stats: { speed: each + remainder, kick: each, guts: each },
      jockeyName: state.ownerHorse.jockeyName,
      jockeyRank: state.ownerHorse.jockeyRank,
      classIndex: 0,
      wins: 0,
      cleared: false,
      stakesWins: 0,
      recentResults: [],
      raceLog: [],
      nextConditionBoost: false,
      nextBetCapBoost: false,
    };
    saveOwnerState();
    closeMarketModal();
    closeStableModal();
    renderBalance();
    updateModeInfo();
    resetForNewRace();
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
      // 旧セーブ形式との互換性のため、新フィールドが無ければ補完する
      state.ownerHorse.recentResults = state.ownerHorse.recentResults || [];
      state.ownerHorse.raceLog = state.ownerHorse.raceLog || [];
      state.ownerHorse.stakesWins = state.ownerHorse.stakesWins || 0;
      state.ownerHorse.nextConditionBoost = !!state.ownerHorse.nextConditionBoost;
      state.ownerHorse.nextBetCapBoost = !!state.ownerHorse.nextBetCapBoost;
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
  el.stretchSkipBtn.addEventListener("click", skipToStretch);
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
  el.freshStartBtn.addEventListener("click", () => {
    if (!confirm("すべてのセーブデータ（通常モード・馬主モード）を削除し、最初から始めます。よろしいですか？")) return;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    try { localStorage.removeItem(OWNER_SAVE_KEY); } catch (e) { /* ignore */ }
    refreshLobbySaveButtons();
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
  el.ownerMarketBtn.addEventListener("click", openMarketModal);
  el.ownerMarketCloseBtn.addEventListener("click", closeMarketModal);

  loadThemePreference();
  applyTheme();
  refreshLobbySaveButtons();
})();
