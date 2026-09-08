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
  ];

  // 20レースに1回ほど現れる、必ず勝つ大穴の特別な馬
  const HEARTBEAT_NAME = "ハートビート";
  const HEARTBEAT_CHANCE = 1 / 20;
  const HEARTBEAT_MIN_ODDS = 20;

  const JOCKEY_POOL = [
    { name: "C.ルメール", rank: "S" },
    { name: "武豊", rank: "S" },
    { name: "岩田望来", rank: "A" },
    { name: "松山弘平", rank: "A" },
    { name: "戸崎圭太", rank: "A" },
    { name: "丹内祐二", rank: "B" },
    { name: "鮫島克駿", rank: "B" },
    { name: "横山武史", rank: "B" },
    { name: "今村聖奈", rank: "C" },
    { name: "坂井瑠星", rank: "C" },
  ];

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
  const MAX_SINGLE_DIGIT_ODDS_HORSES = 4;

  const GAME_MODES = {
    normal: { label: "一般人モード", goal: null },
    gambler: { label: "ギャンブラーモード", goal: 100000 },
    gamblerHard: { label: "ギャンブラーモードHARD", goal: 1000000 },
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

  function finishOffsetPercent(inset) {
    const { xLeft, xRight, r } = geometryAt(inset);
    const straight = xRight - xLeft;
    const lap = 2 * straight + 2 * Math.PI * r;
    const distanceToFinish = straight + Math.PI * r + (xRight - FINISH_X);
    return (distanceToFinish / lap) * 100;
  }

  const state = {
    mode: null,
    goalAmount: null,
    attemptRaceCount: 0,
    goalAchieved: false,
    balance: START_BALANCE,
    raceNumber: 1,
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
    raceNumber: document.getElementById("raceNumber"),
    raceClass: document.getElementById("raceClass"),
    trackSvg: document.getElementById("trackSvg"),
    raceMessage: document.getElementById("raceMessage"),
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
    const jockeys = shuffle(JOCKEY_POOL).slice(0, NUM_HORSES);
    const heartbeatIndex = Math.random() < HEARTBEAT_CHANCE ? Math.floor(Math.random() * NUM_HORSES) : -1;
    const isHeavyTrack = state.weather.trackCondition === "heavy";

    const raw = names.map((name, i) => {
      const isHeartbeat = i === heartbeatIndex;
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

      return { name: isHeartbeat ? HEARTBEAT_NAME : name, last3, jockey, condition, trueStrength, marketStrength, isHeartbeat };
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
    el.balance.textContent = formatMoney(state.balance);
  }

  function updateModeInfo() {
    if (!state.mode || state.mode === "normal") {
      el.modeInfo.hidden = true;
      return;
    }
    el.modeInfo.hidden = false;
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
      if (horse.isHeartbeat) tr.classList.add("heartbeat-row");

      const selectInput = umaren
        ? `<input type="checkbox" ${isHorseSelected(horse.id) ? "checked" : ""}>`
        : `<input type="radio" name="horseSelect" ${isHorseSelected(horse.id) ? "checked" : ""}>`;

      tr.innerHTML = `
        <td>${horse.lane}</td>
        <td>${horse.name}${horse.isHeartbeat ? ' <span class="heartbeat-badge">💓</span>' : ""}</td>
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

    const trackColor = isHeavy ? "#8a6f4a" : "#c9a86a";

    return `
      <path d="${outerFill}" fill="${trackColor}"/>
      <path d="${innerFill}" fill="#2f7d3c"/>
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
        const d = stadiumPath(laneInset(h.lane));
        return `<text id="runner-${h.id}" x="0" y="0" text-anchor="middle" dominant-baseline="central" class="horse-runner-svg" style="offset-path: path('${d}'); offset-distance: 0%;"><title>${h.name}</title>🐎${h.lane}</text>`;
      })
      .join("");
  }

  function renderTrack() {
    el.trackSvg.innerHTML = buildTrackDefs() + buildTrackBackground() + buildHorseMarkers();
  }

  function renderWeather() {
    const isHeavy = state.weather.trackCondition === "heavy";
    el.weatherBox.textContent = isHeavy ? "🌧️ 重馬場" : "☀️ 良馬場";
    el.weatherBox.classList.toggle("weather-heavy", isHeavy);
  }

  function ticketLabel(ticket) {
    if (ticket.type === "umaren") {
      const names = ticket.horseIds.map((id) => state.horses.find((h) => h.id === id).name);
      return { typeLabel: "馬連", horseLabel: names.join(" － ") };
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
    if (state.balance < MIN_BET) {
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
    el.raceNumber.textContent = state.raceNumber;
    el.raceClass.textContent = getRaceClass(state.raceNumber).name;
    el.startBtn.disabled = true;
    el.watchOnlyBtn.disabled = false;
    el.skipBtn.disabled = true;
    el.nextBtn.disabled = true;
    el.restartBtn.hidden = true;
    updateBuyAvailability();
    renderWeather();
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
    el.historyBody.innerHTML = "";
    renderBalance();
    updateModeInfo();
    resetForNewRace();
  }

  // 購入ボタンの活性/非活性のみを扱う。ゲームオーバー判定はここでは行わない
  // （全額ベットした直後にレース観戦できなくなる不具合を防ぐため）
  function updateBuyAvailability() {
    const canAfford = state.balance >= MIN_BET;
    el.buyBtn.disabled = state.raceRunning || state.raceFinished || !canAfford;
  }

  function buyTicket() {
    const betType = el.betType.value;
    const amount = parseInt(el.betAmount.value, 10);
    if (!Number.isFinite(amount) || amount < MIN_BET) {
      alert(`最低${MIN_BET}円から購入できます`);
      return;
    }
    if (amount > state.balance) {
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

    renderBalance();
    renderTicketInfo();
    updateBuyAvailability();
    el.startBtn.disabled = false;
  }

  function computeFinishOrder() {
    const heartbeat = state.horses.find((h) => h.isHeartbeat);
    const { varMin, varMax } = getRaceClass(state.raceNumber);
    const contenders = state.horses.filter((h) => !heartbeat || h.id !== heartbeat.id);
    const performances = contenders.map((h) => ({
      id: h.id,
      score: h.trueStrength * (varMin + Math.random() * (varMax - varMin)),
    }));
    performances.sort((a, b) => b.score - a.score);
    const order = performances.map((p) => p.id);
    if (heartbeat) order.unshift(heartbeat.id);
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
      const horse = state.horses.find((h) => h.id === horseId);
      const runner = document.getElementById(`runner-${horseId}`);
      const duration = RACE_BASE_TIME + rank * RACE_GAP_PER_RANK;
      const targetPercent = finishOffsetPercent(laneInset(horse.lane));
      runner.style.transition = `offset-distance ${duration}s linear`;
      // force reflow so the transition is picked up
      void runner.getBoundingClientRect();
      runner.style.offsetDistance = `${targetPercent}%`;
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
      const targetPercent = finishOffsetPercent(laneInset(horse.lane));
      runner.style.transition = "none";
      runner.style.offsetDistance = `${targetPercent}%`;
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
    if (winnerHorse.isHeartbeat) {
      el.raceMessage.textContent += " 💓 大穴の奇跡的な激走！";
    }

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

      totalPayout += payout;
      addHistoryRow(state.raceNumber, typeLabel, horseLabel, ticket.amount, resultText, payout);
    });

    state.balance += totalPayout;
    renderBalance();

    if (totalPayout > 0) {
      el.raceMessage.textContent += ` 払戻合計 ${formatMoney(totalPayout)}円！`;
    }

    if (state.mode && state.mode !== "normal") {
      state.attemptRaceCount++;
      if (!state.goalAchieved && state.balance >= state.goalAmount) {
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
