// --- Game data ---
const amounts = [
  0.01, 0.10, 0.50,
  1, 5, 10, 50, 100, 250, 500, 750,
  1000, 3000, 5000, 10000, 15000,
  20000, 35000, 50000, 75000, 100000, 250000
];

let boxes = [];
let playerBoxNumber = null;
let openedCount = 0;
let lastOffer = null;
let gamePhase = "pick-own";  // "pick-own" | "opening" | "dealt" | "finished"
let pendingOffer = null;

const offerPoints = [5, 8, 11, 14, 17, 19, 20, 21];

// Simple stats using localStorage
let stats = {
  games: 0,
  deals: 0,
  nodeals: 0
};

// DOM references
const statusEl = document.getElementById("status");
const boxesContainer = document.getElementById("boxes-container");
const openedCountEl = document.getElementById("opened-count");
const lastOpenedEl = document.getElementById("last-opened");
const lastOfferEl = document.getElementById("last-offer");
const chosenBoxNumberEl = document.getElementById("chosen-box-number");
const finalResultEl = document.getElementById("final-result");
const valuesLeftEl = document.getElementById("values-left");
const valuesRightEl = document.getElementById("values-right");
const quickPickBtn = document.getElementById("quick-pick-btn");
const resetBtn = document.getElementById("reset-btn");
const phoneEl = document.getElementById("phone");
const openedFlashEl = document.getElementById("opened-flash");
const statGamesEl = document.getElementById("stat-games");
const statDealsEl = document.getElementById("stat-deals");
const statNoDealsEl = document.getElementById("stat-nodeals");

const modalBackdrop = document.getElementById("banker-modal");
const modalMessageEl = document.getElementById("modal-message");
const dealBtn = document.getElementById("deal-btn");
const noDealBtn = document.getElementById("no-deal-btn");

// Sounds (optional)
const sndOpen = document.getElementById("snd-open");
const sndBank = document.getElementById("snd-bank");
const sndDeal = document.getElementById("snd-deal");
const sndNoDeal = document.getElementById("snd-nodeal");

// --- Helpers ---

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function formatMoney(value) {
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: value < 1 ? 2 : 0
  });
}

function playSound(el) {
  if (!el) return;
  try {
    el.currentTime = 0;
    el.play().catch(() => {});
  } catch (e) {
    // ignore autoplay issues
  }
}

function loadStats() {
  const raw = localStorage.getItem("dondStats");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        stats = { ...stats, ...parsed };
      }
    } catch (e) {
      // ignore
    }
  }
  renderStats();
}

function saveStats() {
  localStorage.setItem("dondStats", JSON.stringify(stats));
}

function renderStats() {
  statGamesEl.textContent = stats.games;
  statDealsEl.textContent = stats.deals;
  statNoDealsEl.textContent = stats.nodeals;
}

// --- Setup ---

function initGame() {
  const shuffled = [...amounts];
  shuffle(shuffled);

  boxes = shuffled.map((value, index) => ({
    number: index + 1,
    value,
    opened: false,
    isPlayer: false
  }));

  playerBoxNumber = null;
  openedCount = 0;
  lastOffer = null;
  pendingOffer = null;
  gamePhase = "pick-own";

  openedCountEl.textContent = "0";
  lastOpenedEl.textContent = "-";
  lastOfferEl.textContent = "None";
  chosenBoxNumberEl.textContent = "--";
  statusEl.textContent = "First, click one box to be your box, or use Quick Pick.";
  finalResultEl.classList.add("hidden");
  finalResultEl.innerHTML = "";

  openedFlashEl.classList.add("hidden");

  // Reset background
  document.body.style.background =
    "radial-gradient(circle at top, #102040, #050814 60%)";

  renderAmountLists();
  renderBoxes();
}

function renderAmountLists() {
  const sorted = [...amounts].sort((a, b) => a - b);
  const mid = Math.ceil(sorted.length / 2);
  const low = sorted.slice(0, mid);
  const high = sorted.slice(mid);

  valuesLeftEl.innerHTML = "";
  valuesRightEl.innerHTML = "";

  low.forEach((val) => {
    const li = document.createElement("li");
    li.textContent = formatMoney(val);
    li.dataset.amount = String(val);
    valuesLeftEl.appendChild(li);
  });

  high.forEach((val) => {
    const li = document.createElement("li");
    li.textContent = formatMoney(val);
    li.dataset.amount = String(val);
    li.classList.add("high");
    valuesRightEl.appendChild(li);
  });
}

function markAmountUsed(value) {
  const valueStr = String(value);
  document
    .querySelectorAll(`.values-list li[data-amount="${valueStr}"]`)
    .forEach((li) => {
      li.classList.add("used");
      // high = £1000+
      if (value >= 1000) {
        li.classList.add("big-loss");
        setTimeout(() => li.classList.remove("big-loss"), 700);
      }
    });
}

function renderBoxes() {
  boxesContainer.innerHTML = "";

  boxes.forEach((box) => {
    const btn = document.createElement("button");
    btn.className = "box-btn";
    btn.dataset.boxNumber = String(box.number);

    const numSpan = document.createElement("span");
    numSpan.className = "box-number";
    numSpan.textContent = box.number;
    btn.appendChild(numSpan);

    if (box.isPlayer) {
      btn.classList.add("player-box");
    }

    if (box.opened) {
      btn.classList.add("opened");
      const valSpan = document.createElement("span");
      valSpan.className = "box-value";
      valSpan.textContent = formatMoney(box.value);
      btn.appendChild(valSpan);
      btn.disabled = true;
    } else if (gamePhase === "dealt" || gamePhase === "finished") {
      btn.disabled = true;
    }

    btn.addEventListener("click", onBoxClick);
    boxesContainer.appendChild(btn);
  });
}

// --- Banker modal ---

function showBankerModal(offer) {
  pendingOffer = offer;
  playSound(sndBank);
  if (phoneEl) phoneEl.classList.add("ringing");

  modalMessageEl.textContent =
    `The Banker offers you ${formatMoney(offer)}. Deal or No Deal?`;
  modalBackdrop.classList.remove("hidden");
}

function hideBankerModal() {
  modalBackdrop.classList.add("hidden");
  if (phoneEl) phoneEl.classList.remove("ringing");
}

dealBtn.addEventListener("click", () => {
  hideBankerModal();
  if (pendingOffer != null && gamePhase === "opening") {
    playSound(sndDeal);
    handleDeal(pendingOffer);
    pendingOffer = null;
  }
});

noDealBtn.addEventListener("click", () => {
  hideBankerModal();
  if (pendingOffer != null && gamePhase === "opening") {
    playSound(sndNoDeal);
    pendingOffer = null;
    statusEl.textContent = "No Deal! Keep opening boxes…";
    checkEndGame();
  }
});

// --- Controls ---

quickPickBtn.addEventListener("click", () => {
  if (gamePhase !== "pick-own") return;
  const available = boxes.filter((b) => !b.opened && !b.isPlayer);
  if (!available.length) return;
  const randomBox =
    available[Math.floor(Math.random() * available.length)];
  selectPlayerBox(randomBox);
});

resetBtn.addEventListener("click", () => {
  initGame();
});

// --- Game actions ---

function onBoxClick(e) {
  // Block clicks while banker modal is open
  if (!modalBackdrop.classList.contains("hidden")) return;

  const boxNumber = parseInt(e.currentTarget.dataset.boxNumber, 10);
  const box = boxes.find((b) => b.number === boxNumber);
  if (!box) return;

  if (gamePhase === "pick-own") {
    selectPlayerBox(box);
  } else if (gamePhase === "opening") {
    openBox(box);
  }
}

function selectPlayerBox(box) {
  if (box.opened) return;
  playerBoxNumber = box.number;
  box.isPlayer = true;
  chosenBoxNumberEl.textContent = box.number;
  statusEl.textContent =
    "Your box is chosen. Now open other boxes one by one. The Banker will call after a few boxes...";
  gamePhase = "opening";
  renderBoxes();
}

function showOpenedFlash(box) {
  const isHigh = box.value >= 1000; // £1000+ is "high"

  openedFlashEl.textContent = formatMoney(box.value);
  openedFlashEl.classList.remove("hidden", "show", "low", "high");
  openedFlashEl.classList.add(isHigh ? "high" : "low");

  // restart animation
  void openedFlashEl.offsetWidth;
  openedFlashEl.classList.add("show");

  // tint the background slightly
  document.body.style.background = isHigh
    ? "radial-gradient(circle at top, #401010, #050814 70%)"
    : "radial-gradient(circle at top, #0e2a60, #050814 70%)";

  setTimeout(() => {
    openedFlashEl.classList.add("hidden");
  }, 2200);
}

function openBox(box) {
  if (box.opened || box.number === playerBoxNumber) {
    statusEl.textContent =
      "You can’t open your own box or one that’s already been opened.";
    return;
  }

  box.opened = true;
  openedCount++;
  openedCountEl.textContent = String(openedCount);
  lastOpenedEl.textContent = formatMoney(box.value);
  statusEl.textContent = `You opened Box ${box.number}: ${formatMoney(box.value)}`;

  markAmountUsed(box.value);
  playSound(sndOpen);
  showOpenedFlash(box);
  renderBoxes();

  if (offerPoints.includes(openedCount)) {
    callBanker();
  } else {
    checkEndGame();
  }
}

function calculateOffer() {
  const remaining = boxes.filter((b) => !b.opened);
  const total = remaining.reduce((sum, b) => sum + b.value, 0);
  const average = total / remaining.length;
  return Math.round(average * 0.9); // stingy banker
}

function callBanker() {
  const offer = calculateOffer();
  lastOffer = offer;
  lastOfferEl.textContent = formatMoney(offer);
  statusEl.textContent = "📞 The Banker is calling with an offer...";
  showBankerModal(offer);
}

function handleDeal(offer) {
  gamePhase = "dealt";

  const playerBox = boxes.find((b) => b.number === playerBoxNumber);
  const playerValue = playerBox.value;

  const resultHtml = `
    <p>You accepted the Banker's deal of <strong>${formatMoney(offer)}</strong>.</p>
    <p>Your own box (${playerBox.number}) contained <strong>${formatMoney(playerValue)}</strong>.</p>
    <p>${
      offer > playerValue
        ? "Great deal – you beat the Banker! 😎"
        : offer < playerValue
        ? "Bad deal… the box was worth more! 😬"
        : "Perfectly even – same as your box. 🎯"
    }</p>
  `;

  finalResultEl.innerHTML = resultHtml;
  finalResultEl.classList.remove("hidden");
  statusEl.textContent = "Game over – you dealt. Hit Reset to play again.";

  stats.games++;
  stats.deals++;
  saveStats();
  renderStats();

  renderBoxes();
}

function checkEndGame() {
  const unopenedNonPlayer = boxes.filter(
    (b) => !b.opened && b.number !== playerBoxNumber
  );

  if (unopenedNonPlayer.length === 0 && gamePhase === "opening") {
    revealFinal();
  }
}

function revealFinal() {
  gamePhase = "finished";

  const playerBox = boxes.find((b) => b.number === playerBoxNumber);
  const playerValue = playerBox.value;

  const resultHtml = `
    <p>You went all the way with NO DEAL.</p>
    <p>Your box (${playerBox.number}) contained <strong>${formatMoney(playerValue)}</strong>.</p>
  `;

  finalResultEl.innerHTML = resultHtml;
  finalResultEl.classList.remove("hidden");
  statusEl.textContent =
    "Game over – that was your final amount. Hit Reset to play again.";

  stats.games++;
  stats.nodeals++;
  saveStats();
  renderStats();

  renderBoxes();
}

// --- Start the game ---
loadStats();
initGame();
