(() => {
  const HORSE_POOL = [
    "サンライズホープ", "ミッドナイトブルー", "ゴールデンアロー", "シルバースター",
    "ブレイブハート", "ウインドチェイサー", "ラッキーセブン", "クリムゾンフレイム",
    "スカイダンサー", "サンダーボルト", "ノーブルドリーム", "エメラルドキング"
  ];

  const JOCKEY_POOL = [
    { name: "武藤リョウ", rank: "S" },
    { name: "石川タクミ", rank: "S" },
    { name: "斎藤ケンタ", rank: "A" },
    { name: "松本ユウキ", rank: "A" },
    { name: "小林アキラ", rank: "A" },
    { name: "中村ダイキ", rank: "B" },
    { name: "藤田ソウタ", rank: "B" },
    { name: "渡辺シュン", rank: "B" },
    { name: "岡田ヒロト", rank: "C" },
    { name: "山口レン", rank: "C" },
  ];

  const JOCKEY_RANK_MULT = { S: 1.4, A: 1.15, B: 1.0, C: 0.75 };
  const CONDITION_MULT = { up: 1.3, flat: 1.0, down: 0.7 };
  const CONDITION_ICON = { up: "↗️", flat: "➡️", down: "↘️" };
  const CONDITION_LABEL = { up: "絶好調", flat: "普通", down: "不調" };
  const RANK_LABEL = { S: "Sランク", A: "Aランク", B: "Bランク", C: "Cランク" };

  const MIN_BET = 100;
  const START_BALANCE = 10000;
  const NUM_HORSES = 8;
  const PAYOUT_RATE = 0.8;
  const WIN_ODDS_MIN = 1.5;
  const WIN_ODDS_MAX = 120;
  const PLACE_ODDS_MIN = 1.2;
  const PLACE_ODDS_MAX = 40;

  // --- コース形状（楕円トラック）のジオメトリ ---
  const TRACK = {
    baseXLeft: 150,
    baseXRight: 610,
    baseYTop: 40,
    baseYBottom: 260,
    outerRailInset: 6,
    laneWidth: 9,
    numLanes: NUM_HORSES,
  };
  TRACK.innerRailInset = TRACK.outerRailInset + TRACK.laneWidth * TRACK.numLanes;
  const FINISH_X = 460;

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
    balance: START_BALANCE,
    raceNumber: 1,
    horses: [],
    selectedHorseId: null,
    tickets: [],
    raceRunning: false,
    raceFinished: false,
  };

  const el = {
    balance: document.getElementById("balance"),
    raceNumber: document.getElementById("raceNumber"),
    trackSvg: document.getElementById("trackSvg"),
    raceMessage: document.getElementById("raceMessage"),
    horseTableBody: document.getElementById("horseTableBody"),
    betType: document.getElementById("betType"),
    betAmount: document.getElementById("betAmount"),
    buyBtn: document.getElementById("buyBtn"),
    startBtn: document.getElementById("startBtn"),
    nextBtn: document.getElementById("nextBtn"),
    restartBtn: document.getElementById("restartBtn"),
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

    const raw = names.map((name, i) => {
      const base = 20 + Math.random() * 90;
      const last3 = randomLast3();
      const formMult = formMultFromLast3(last3);
      const jockey = jockeys[i];
      const jockeyMult = JOCKEY_RANK_MULT[jockey.rank];
      const condition = pickCondition();
      const conditionMult = CONDITION_MULT[condition];

      // 実際のレース結果を左右する「真の強さ」
      const trueStrength = Math.max(3, base * formMult * jockeyMult * conditionMult);

      // 世間が見積もる強さ（騎手の看板を過大評価し、馬の調子の変化を過小評価する傾向 + 予想の誤差）
      const marketJockeyMult = 1 + (jockeyMult - 1) * 1.6;
      const marketConditionMult = 1 + (conditionMult - 1) * 0.3;
      const noise = 1 + (Math.random() * 0.9 - 0.45);
      const marketStrength = Math.max(
        3,
        base * formMult * marketJockeyMult * marketConditionMult * noise
      );

      return { name, last3, jockey, condition, trueStrength, marketStrength };
    });

    const marketSum = raw.reduce((s, h) => s + h.marketStrength, 0);

    return raw.map((h, i) => {
      const marketProb = h.marketStrength / marketSum;
      const oddsWin = clamp(round1(PAYOUT_RATE / marketProb), WIN_ODDS_MIN, WIN_ODDS_MAX);
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
        oddsWin,
        oddsPlace,
      };
    });
  }

  function formatMoney(n) {
    return Math.round(n).toLocaleString("ja-JP");
  }

  function renderBalance() {
    el.balance.textContent = formatMoney(state.balance);
  }

  function renderHorseTable() {
    el.horseTableBody.innerHTML = "";
    state.horses.forEach((horse) => {
      const tr = document.createElement("tr");
      tr.dataset.horseId = horse.id;
      if (state.selectedHorseId === horse.id) tr.classList.add("selected");

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
        <td><input type="radio" name="horseSelect" ${state.selectedHorseId === horse.id ? "checked" : ""}></td>
      `;

      tr.addEventListener("click", () => {
        if (state.raceRunning || state.raceFinished) return;
        state.selectedHorseId = horse.id;
        renderHorseTable();
      });

      el.horseTableBody.appendChild(tr);
    });
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

    return `
      <path d="${outerFill}" fill="#c9a86a"/>
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

  function renderTicketInfo() {
    if (state.tickets.length === 0) {
      el.ticketInfo.textContent = "";
      return;
    }
    const lines = state.tickets.map((t) => {
      const horse = state.horses.find((h) => h.id === t.horseId);
      const typeLabel = t.type === "win" ? "単勝" : "複勝";
      return `[${typeLabel}] ${horse.name} ${formatMoney(t.amount)}円`;
    });
    el.ticketInfo.innerHTML = "購入済み馬券: " + lines.join(" / ");
  }

  function addHistoryRow(raceNumber, ticket, horse, resultText, payout) {
    const tr = document.createElement("tr");
    const typeLabel = ticket.type === "win" ? "単勝" : "複勝";
    tr.innerHTML = `
      <td>第${raceNumber}R</td>
      <td>${typeLabel}</td>
      <td>${horse.name}</td>
      <td>${formatMoney(ticket.amount)}円</td>
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

    state.horses = generateHorses();
    state.selectedHorseId = null;
    state.tickets = [];
    state.raceRunning = false;
    state.raceFinished = false;
    el.raceMessage.textContent = "馬を選んで馬券を購入してください";
    el.raceNumber.textContent = state.raceNumber;
    el.startBtn.disabled = true;
    el.nextBtn.disabled = true;
    el.restartBtn.hidden = true;
    updateBuyAvailability();
    renderHorseTable();
    renderTrack();
    renderTicketInfo();
  }

  function showGameOver() {
    el.raceMessage.textContent = `所持金が最低購入額（${MIN_BET}円）を下回りました。ゲームオーバーです。`;
    el.buyBtn.disabled = true;
    el.startBtn.disabled = true;
    el.nextBtn.disabled = true;
    el.restartBtn.hidden = false;
  }

  function restartGame() {
    state.balance = START_BALANCE;
    state.raceNumber = 1;
    el.historyBody.innerHTML = "";
    renderBalance();
    resetForNewRace();
  }

  // 購入ボタンの活性/非活性のみを扱う。ゲームオーバー判定はここでは行わない
  // （全額ベットした直後にレース観戦できなくなる不具合を防ぐため）
  function updateBuyAvailability() {
    const canAfford = state.balance >= MIN_BET;
    el.buyBtn.disabled = state.raceRunning || state.raceFinished || !canAfford;
  }

  function buyTicket() {
    if (state.selectedHorseId === null) {
      alert("馬を選択してください");
      return;
    }
    const amount = parseInt(el.betAmount.value, 10);
    if (!Number.isFinite(amount) || amount < MIN_BET) {
      alert(`最低${MIN_BET}円から購入できます`);
      return;
    }
    if (amount > state.balance) {
      alert("所持金が不足しています");
      return;
    }

    state.balance -= amount;
    state.tickets.push({
      horseId: state.selectedHorseId,
      type: el.betType.value,
      amount,
    });

    renderBalance();
    renderTicketInfo();
    updateBuyAvailability();
    el.startBtn.disabled = false;
  }

  function computeFinishOrder() {
    const performances = state.horses.map((h) => ({
      id: h.id,
      score: h.trueStrength * (0.7 + Math.random() * 0.6),
    }));
    performances.sort((a, b) => b.score - a.score);
    return performances.map((p) => p.id);
  }

  function runRace() {
    state.raceRunning = true;
    el.buyBtn.disabled = true;
    el.startBtn.disabled = true;
    el.raceMessage.textContent = "レース中...";

    const finishOrder = computeFinishOrder();
    const baseTime = 6.0;
    const gapPerRank = 0.55;

    finishOrder.forEach((horseId, rank) => {
      const horse = state.horses.find((h) => h.id === horseId);
      const runner = document.getElementById(`runner-${horseId}`);
      const duration = baseTime + rank * gapPerRank;
      const targetPercent = finishOffsetPercent(laneInset(horse.lane));
      runner.style.transition = `offset-distance ${duration}s linear`;
      // force reflow so the transition is picked up
      void runner.getBoundingClientRect();
      runner.style.offsetDistance = `${targetPercent}%`;
    });

    const totalTime = baseTime + (finishOrder.length - 1) * gapPerRank;

    setTimeout(() => {
      finishRace(finishOrder);
    }, totalTime * 1000 + 300);
  }

  function finishRace(finishOrder) {
    state.raceRunning = false;
    state.raceFinished = true;

    const rankById = new Map();
    finishOrder.forEach((id, idx) => rankById.set(id, idx + 1));

    const winnerHorse = state.horses.find((h) => h.id === finishOrder[0]);
    el.raceMessage.textContent = `🏆 1着: ${winnerHorse.name}！`;

    let totalPayout = 0;
    state.tickets.forEach((ticket) => {
      const horse = state.horses.find((h) => h.id === ticket.horseId);
      const rank = rankById.get(ticket.horseId);
      let payout = 0;
      let resultText = "";

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

      totalPayout += payout;
      addHistoryRow(state.raceNumber, ticket, horse, resultText, payout);
    });

    state.balance += totalPayout;
    renderBalance();

    if (totalPayout > 0) {
      el.raceMessage.textContent += ` 払戻合計 ${formatMoney(totalPayout)}円！`;
    }

    el.nextBtn.disabled = false;
    el.buyBtn.disabled = true;
  }

  function nextRace() {
    state.raceNumber += 1;
    resetForNewRace();
  }

  el.buyBtn.addEventListener("click", buyTicket);
  el.startBtn.addEventListener("click", runRace);
  el.nextBtn.addEventListener("click", nextRace);
  el.restartBtn.addEventListener("click", restartGame);

  resetForNewRace();
  renderBalance();
})();
