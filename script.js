// Classic UK-style Deal or No Deal prize values (in pounds)
const amounts = [
  0.01, 0.10, 0.50,
  1, 5, 10, 50, 100, 250, 500, 750,
  1000, 3000, 5000, 10000, 15000,
  20000, 35000, 50000, 75000, 100000, 250000
];

let boxes = [];
let playerBoxNumber = null;
let gamePhase = "pick-own"; // "pick-own", "opening", "dealt", "finished"
let openedCount = 0;
let lastOpenedValue = null;
let lastOffer = null;

// Basic offer schedule (after total opened boxes reach these counts)
const offerPoints = [5, 8, 11, 14, 17, 19, 20, 21];

const statusEl = document.getElementById("status");
const boxesContainer = document.getElementById("boxes-container");
const playerBoxDisplayEl = document.getElementById("player-box-display");
const openedCountEl = document.getElementById("opened-count");
const lastOpenedEl = document.getElementById("last-opened");
const lastOfferEl = document.getElementById("last-offer");
const finalResultEl = document.getElementById("final-result");

// Utility: shuffle an array in-place
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Format currency nicely
function formatMoney(value) {
  return value.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: value < 1 ? 2 : 0
  });
}

function initGame() {
  const values = [...amounts];
  shuffle(values);

  boxes = values.map((value, index) => ({
    number: index + 1,
    value,
    opened: false,
    isPlayerBox: false
  }));

  playerBoxNumber = null;
  openedCount = 0;
  lastOpenedValue = null;
  lastOffer = null;
  gamePhase = "pick-own";

  statusEl.textContent = "First, click one box to be YOUR box.";
  playerBoxDisplayEl.textContent = "None selected";
  openedCountEl.textContent = "0";
  lastOpenedEl.textContent = "-";
  lastOfferEl.textContent = "None";
  finalResultEl.classList.add("hidden");
  finalResultEl.innerHTML = "";

  renderBoxes();
}

function renderBoxes() {
  boxesContainer.innerHTML = "";

  boxes.forEach((box) => {
    const btn = document.createElement("button");
    btn.classList.add("box-btn");
    btn.dataset.boxNumber = box.number;
    btn.textContent = box.number;

    if (box.isPlayerBox) {
      btn.classList.add("player-box");
    }

    if (box.opened) {
      btn.classList.add("opened");
      btn.textContent = box.number;
      const span = document.createElement("span");
      span.classList.add("opened-value");
      span.textContent = formatMoney(box.value);
      btn.appendChild(span);
      btn.disabled = true;
    } else if (gamePhase === "dealt" || gamePhase === "finished") {
      // After game end, stop any further clicks
      btn.disabled = true;
    }

    btn.addEventListener("click", onBoxClick);
    boxesContainer.appendChild(btn);
  });
}

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
  box.isPlayerBox = true;
  playerBoxDisplayEl.textContent = `Box ${box.number}`;
  statusEl.textContent = "Now open other boxes one by one. Banker will call after a few boxes...";
  gamePhase = "opening";
  renderBoxes();
}

function openBox(box) {
  if (box.opened || box.number === playerBoxNumber) {
    statusEl.textContent = "You can't open your own box or an already opened box.";
    return;
  }

  box.opened = true;
  openedCount++;
  lastOpenedValue = box.value;

  openedCountEl.textContent = String(openedCount);
  lastOpenedEl.textContent = formatMoney(lastOpenedValue);
  statusEl.textContent = `You opened Box ${box.number}: ${formatMoney(box.value)}`;

  renderBoxes();

  // Check if we should call the Banker
  if (offerPoints.includes(openedCount)) {
    callBanker();
  } else {
    checkEndGame();
  }
}

function callBanker() {
  const offer = calculateOffer();
  lastOffer = offer;
  lastOfferEl.textContent = formatMoney(offer);

  const deal = window.confirm(
    `📞 The Banker offers you ${formatMoney(offer)}.\n\n` +
    "Click OK to DEAL and take the money.\n" +
    "Click Cancel for NO DEAL and continue playing."
  );

  if (deal) {
    handleDeal(offer);
  } else {
    statusEl.textContent = "No Deal! Keep opening boxes…";
    checkEndGame();
  }
}

function calculateOffer() {
  // Very simple banker logic: average of remaining (including your box) * 0.9
  const remaining = boxes.filter((b) => !b.opened);
  const total = remaining.reduce((sum, b) => sum + b.value, 0);
  const average = total / remaining.length;
  return Math.round(average * 0.9);
}

function handleDeal(offer) {
  gamePhase = "dealt";

  const playerBox = boxes.find((b) => b.number === playerBoxNumber);
  const playerValue = playerBox.value;

  const resultHtml = `
    <p>You took the Banker's deal of <strong>${formatMoney(offer)}</strong>.</p>
    <p>Your own box contained: <strong>${formatMoney(playerValue)}</strong>.</p>
    <p>${
      offer > playerValue
        ? "Good deal! You beat the Banker. 😎"
        : offer < playerValue
        ? "Bad deal… the box was worth more! 😬"
        : "Perfect deal – exactly the same as your box! 🎯"
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
    // No boxes left to open apart from player’s box
    revealFinal();
  }
}

function revealFinal() {
  gamePhase = "finished";

  const playerBox = boxes.find((b) => b.number === playerBoxNumber);
  const playerValue = playerBox.value;

  const resultHtml = `
    <p>You went all the way with NO DEAL!</p>
    <p>Your box (${playerBox.number}) contained: <strong>${formatMoney(playerValue)}</strong>.</p>
  `;

  finalResultEl.innerHTML = resultHtml;
  finalResultEl.classList.remove("hidden");
  statusEl.textContent = "Game over – that was your final amount. Refresh to play again.";
  renderBoxes();
}

initGame();
