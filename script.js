// ---- Game data ----
// 22 classic-style amounts (you can tweak if you like)
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
let gamePhase = "pick-own"; // "pick-own" | "opening" | "dealt" | "finished"

// Offer after these many boxes have been opened
const offerPoints = [5, 8, 11, 14, 17, 19, 20, 21];

// ---- DOM refs ----
const statusEl = document.getElementById("status");
const boxesContainer = document.getElementById("boxes-container");
const openedCountEl = document.getElementById("opened-count");
const lastOpenedEl = document.getElementById("last-opened");
const lastOfferEl = document.getElementById("last-offer");
const chosenBoxNumberEl = document.getElementById("chosen-box-number");
const finalResultEl = document.getElementById("final-result");

const valuesLeftEl = document.getElementById("values-left");
const valuesRightEl = document.getElementById("values-right");

// Modal
const modalBackdrop = document.getElementById("banker-modal");
const modalMessageEl = document.getElementById("modal-message");
const dealBtn = document.getElementById("deal-btn");
const noDealBtn = document.getElementById("no-deal-btn");
let modalResolve = null;

// Sounds
const sndOpen = document.getElementById("snd-open");
const sndBank = document.getElementById("snd-bank");
const sndDeal = document.getElementById("snd-deal");
const sndNoDeal = document.getElementById("snd-nodeal");

// ---- Helpers ----
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
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

// ---- Setup ----
function initGame() {
  const shuffled = [...amounts];
  shuffle(shuffled);

  boxes = shuffled.map((value, idx) => ({
    number: idx + 1,
    value,
    opened: false,
    isPlayer: false
  }));

  playerBoxNumber = null;
  openedCount = 0;
  lastOffer = null;
  gamePhase = "pick-own";

  openedCountEl.textContent = "0";
  lastOpenedEl.textContent = "-";
  lastOfferEl.textContent = "None";
  chosenBoxNumberEl.textContent = "--";
  statusEl.textContent = "First, click one box to be your box.";
  finalResultEl.classList.add("hidden");
  finalResultEl.innerHTML = "";

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
  document.querySelectorAll(`.values-list li[data-amount="${valueStr}"]`)
    .forEach((li) => li.classList.add("used"));
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

// ---- Modal logic ----
function openBankerModal(offer) {
  playSound(sndBank);
  modalMessageEl.textContent = `The Banker offers you ${formatMoney(
    offer
  )}. Do you want to DEAL or NO DEAL?`;

  modalBackdrop.classList.remove("hidden");

  return new Promise((resolve) => {
    modalResolve = resolve;
  });
}

function closeBankerModal() {
  modalBackdrop.classList.add("hidden");
  modalResolve = null;
}

dealBtn.addEventListener("click", () => {
  playSound(sndDeal);
  if (modalResolve) modalResolve(true);
  closeBankerModal();
});

noDealBtn.addEventListener("click", () => {
  playSound(sndNoDeal);
  if (modalResolve) modalResolve(false);
  closeBankerModal();
});

// ---- Game actions ----
function onBoxClick(e) {
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
  statusEl.textContent = `You opened Box ${box.number}: ${formatMoney(
    box.value
  )}`;

  markAmountUsed(box.value);
  playSound(sndOpen);
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
  // tweak factor here if you want meaner/nicer Banker
  return Math.round(average * 0.9);
}

async function callBanker() {
  const offer = calculateOffer();
  lastOffer = offer;
  lastOfferEl.textContent = formatMoney(offer);
  statusEl.textContent = "📞 The Banker is calling with an offer...";

  const deal = await openBankerModal(offer);

  if (deal) {
    handleDeal(offer);
  } else {
    statusEl.textContent = "No Deal! Keep opening boxes…";
    checkEndGame();
  }
}

function handleDeal(offer) {
  gamePhase = "dealt";

  const playerBox = boxes.find((b) => b.number === playerBoxNumber);
  const playerValue = playerBox.value;

  const resultHtml = `
    <p>You accepted the Banker's deal of <strong>${formatMoney(
      offer
    )}</strong>.</p>
    <p>Your own box (${playerBox.number}) contained <strong>${formatMoney(
      playerValue
    )}</strong>.</p>
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
  statusEl.textContent = "Game over – you dealt. Refresh the page to play again.";
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
    <p>Your box (${playerBox.number}) contained <strong>${formatMoney(
      playerValue
    )}</strong>.</p>
  `;

  finalResultEl.innerHTML = resultHtml;
  finalResultEl.classList.remove("hidden");
  statusEl.textContent =
    "Game over – that was your final amount. Refresh the page to play again.";
  renderBoxes();
}

// ---- Start game ----
initGame();
