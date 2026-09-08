(() => {
  const HORSE_POOL = [
    "サンライズホープ", "ミッドナイトブルー", "ゴールデンアロー", "シルバースター",
    "ブレイブハート", "ウインドチェイサー", "ラッキーセブン", "クリムゾンフレイム",
    "スカイダンサー", "サンダーボルト", "ノーブルドリーム", "エメラルドキング"
  ];

  const MIN_BET = 100;
  const START_BALANCE = 10000;
  const NUM_HORSES = 8;

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
    track: document.getElementById("track"),
    raceMessage: document.getElementById("raceMessage"),
    horseTableBody: document.getElementById("horseTableBody"),
    betType: document.getElementById("betType"),
    betAmount: document.getElementById("betAmount"),
    buyBtn: document.getElementById("buyBtn"),
    startBtn: document.getElementById("startBtn"),
    nextBtn: document.getElementById("nextBtn"),
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

  function generateHorses() {
    const names = shuffle(HORSE_POOL).slice(0, NUM_HORSES);
    const strengths = names.map(() => 40 + Math.random() * 60);
    const sum = strengths.reduce((a, b) => a + b, 0);

    return names.map((name, i) => {
      const prob = strengths[i] / sum;
      const oddsWin = Math.max(1.1, Math.round((0.75 / prob) * 10) / 10);
      const oddsPlace = Math.max(1.1, Math.round((1 + (oddsWin - 1) / 2.6) * 10) / 10);
      return {
        id: i + 1,
        lane: i + 1,
        name,
        strength: strengths[i],
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

  function renderTrack() {
    el.track.innerHTML = "";
    state.horses.forEach((horse) => {
      const lane = document.createElement("div");
      lane.className = "lane";
      lane.innerHTML = `
        <span class="lane-label">${horse.lane}</span>
        <div class="finish-line"></div>
        <div class="horse-runner" id="runner-${horse.id}" style="left:4px;" title="${horse.name}">🐎 ${horse.lane}</div>
      `;
      el.track.appendChild(lane);
    });
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
    state.horses = generateHorses();
    state.selectedHorseId = null;
    state.tickets = [];
    state.raceRunning = false;
    state.raceFinished = false;
    el.raceMessage.textContent = "馬を選んで馬券を購入してください";
    el.raceNumber.textContent = state.raceNumber;
    el.startBtn.disabled = true;
    el.nextBtn.disabled = true;
    updateBuyAvailability();
    renderHorseTable();
    renderTrack();
    renderTicketInfo();
  }

  function updateBuyAvailability() {
    const canAfford = state.balance >= MIN_BET;
    el.buyBtn.disabled = state.raceRunning || state.raceFinished || !canAfford;
    if (!canAfford && !state.raceRunning) {
      el.raceMessage.textContent = "所持金が不足しています。ゲームオーバーです。";
    }
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
      score: h.strength * (0.7 + Math.random() * 0.6),
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
    const trackWidth = el.track.clientWidth;
    const runnerWidth = 34;
    const finishOffset = 40;
    const maxLeft = Math.max(50, trackWidth - runnerWidth - finishOffset);

    const baseTime = 3.2;
    const gapPerRank = 0.35;

    finishOrder.forEach((horseId, rank) => {
      const runner = document.getElementById(`runner-${horseId}`);
      const duration = baseTime + rank * gapPerRank;
      runner.style.transition = `left ${duration}s ease-out`;
      // force reflow so transition applies
      void runner.offsetWidth;
      runner.style.left = `${maxLeft}px`;
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

  resetForNewRace();
  renderBalance();
})();
