
"use strict";

// ─── Constants ────────────────────────────────────
const CHOICES = ["rock", "paper", "scissors"];
const ICONS   = { rock: "✊", paper: "✋", scissors: "✌️" };
const BEATS   = { rock: "scissors", paper: "rock", scissors: "paper" };
const MAX_ROUNDS = 7;

const WIN_MESSAGES  = ["VICTORY", "YOU WIN!", "DOMINANT", "SUPERIOR", "FLAWLESS"];
const LOSE_MESSAGES = ["DEFEATED", "CPU WINS", "SYSTEM FAIL", "OVERRIDDEN", "CRITICAL HIT"];
const DRAW_MESSAGES = ["DEADLOCK", "STALEMATE", "TIE GAME", "NULL STATE", "MIRROR"];

// ─── State ────────────────────────────────────────
let state = {
  playerScore: 0,
  cpuScore: 0,
  round: 1,
  streak: 0,
  streakType: null, // 'win' | 'lose' | 'draw'
  isAnimating: false,
  log: []
};

// ─── DOM References ───────────────────────────────
const $ = id => document.getElementById(id);

const dom = {
  playerScore:   $("player-score"),
  cpuScore:      $("cpu-score"),
  roundNum:      $("round-num"),
  streakDisplay: $("streak-display"),
  playerDisplay: $("player-display"),
  cpuDisplay:    $("cpu-display"),
  playerBar:     $("player-bar"),
  cpuBar:        $("cpu-bar"),
  clashFx:       $("clash-fx"),
  clashText:     $("clash-text"),
  resultBanner:  $("result-banner"),
  resultText:    $("result-text"),
  resultSub:     $("result-sub"),
  logTerminal:   $("log-terminal"),
  logClear:      $("log-clear"),
  currentTime:   $("current-time"),
  modalOverlay:  $("modal-overlay"),
  modalResult:   $("modal-result"),
  modalStats:    $("modal-stats"),
  modalRestart:  $("modal-restart"),
  particles:     $("particles"),
  buttons: {
    rock:     $("btn-rock"),
    paper:    $("btn-paper"),
    scissors: $("btn-scissors")
  }
};

// ─── Utilities ────────────────────────────────────
const sleep = ms => new Promise(res => setTimeout(res, ms));
const rand  = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt2  = n => String(n).padStart(2, "0");

function getTime() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(fmt2).join(":");
}

function cpuPick() {
  return rand(CHOICES);
}

function getResult(player, cpu) {
  if (player === cpu) return "draw";
  return BEATS[player] === cpu ? "win" : "lose";
}

// ─── Clock ────────────────────────────────────────
function startClock() {
  dom.currentTime.textContent = getTime();
  setInterval(() => { dom.currentTime.textContent = getTime(); }, 1000);
}

// ─── Particles ────────────────────────────────────
function spawnParticles() {
  for (let i = 0; i < 22; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      animation-duration: ${4 + Math.random() * 10}s;
      animation-delay: ${Math.random() * 8}s;
      width: ${1 + Math.random() * 2}px;
      height: ${1 + Math.random() * 2}px;
      background: ${["#00ff9d","#00e5ff","#ff2d78","#ffe000"][Math.floor(Math.random() * 4)]};
      opacity: ${0.3 + Math.random() * 0.5};
    `;
    dom.particles.appendChild(p);
  }
}

// ─── UI Updates ───────────────────────────────────
function setChoiceIcon(side, emoji) {
  const container = side === "player" ? dom.playerDisplay : dom.cpuDisplay;
  const icon = container.querySelector(".choice-icon");
  icon.classList.remove("pending", "active");
  icon.textContent = emoji;

  // force reflow then animate
  void icon.offsetWidth;
  icon.classList.add("active");
}

function resetChoiceIcons() {
  [dom.playerDisplay, dom.cpuDisplay].forEach(container => {
    const icon = container.querySelector(".choice-icon");
    icon.classList.remove("active");
    icon.classList.add("pending");
    icon.textContent = "?";
  });
}

function updateScores() {
  dom.playerScore.textContent = fmt2(state.playerScore);
  dom.cpuScore.textContent    = fmt2(state.cpuScore);

  const total = state.playerScore + state.cpuScore;
  if (total > 0) {
    dom.playerBar.style.width = `${(state.playerScore / total) * 100}%`;
    dom.cpuBar.style.width    = `${(state.cpuScore    / total) * 100}%`;
  }
}

function popScore(side) {
  const el = side === "player" ? dom.playerScore : dom.cpuScore;
  el.classList.remove("score-pop");
  void el.offsetWidth;
  el.classList.add("score-pop");
}

function updateRound() {
  dom.roundNum.textContent = fmt2(state.round);
}

function updateStreak() {
  if (state.streak === 0 || state.streakType === null) {
    dom.streakDisplay.textContent = "—";
    dom.streakDisplay.style.color = "";
    return;
  }
  const icons = { win: "▲", lose: "▼", draw: "■" };
  const colors = { win: "var(--neon-green)", lose: "var(--neon-pink)", draw: "var(--neon-yellow)" };
  dom.streakDisplay.textContent = `${icons[state.streakType]} ${state.streak}× ${state.streakType.toUpperCase()}`;
  dom.streakDisplay.style.color = colors[state.streakType];
}

function setCPUThinking() {
  const icon = dom.cpuDisplay.querySelector(".choice-icon");
  icon.classList.remove("active");
  icon.classList.add("pending");
  icon.textContent = "···";
}

function showResult(result, playerChoice, cpuChoice) {
  const messages = { win: WIN_MESSAGES, lose: LOSE_MESSAGES, draw: DRAW_MESSAGES };
  const msg = rand(messages[result]);

  const sub = {
    win: `${ICONS[playerChoice]} beats ${ICONS[cpuChoice]}`,
    lose: `${ICONS[cpuChoice]} beats ${ICONS[playerChoice]}`,
    draw: `Both chose ${ICONS[playerChoice]}`
  };

  dom.resultText.textContent = msg;
  dom.resultText.className = `result-text ${result}`;
  dom.resultSub.textContent = sub[result];

  dom.resultBanner.classList.remove("show");
  void dom.resultBanner.offsetWidth;
  dom.resultBanner.classList.add("show");
}

function setClashText(text) {
  dom.clashText.textContent = text;
  dom.clashFx.classList.remove("clash-active");
  void dom.clashFx.offsetWidth;
  dom.clashFx.classList.add("clash-active");
}

function setButtonsDisabled(disabled) {
  Object.values(dom.buttons).forEach(btn => {
    btn.disabled = disabled;
    btn.style.pointerEvents = disabled ? "none" : "";
  });
}

// ─── Log ──────────────────────────────────────────
function addLog(result, playerChoice, cpuChoice) {
  const entry = document.createElement("div");
  entry.className = `log-entry ${result}`;

  const time = document.createElement("span");
  time.className = "log-time";
  time.textContent = getTime();

  const msg = document.createElement("span");
  msg.className = "log-msg";

  const resultLabel = { win: "WIN", lose: "LOSE", draw: "DRAW" };
  msg.textContent = `» [R${fmt2(state.round - 1)}] ${ICONS[playerChoice]} ${playerChoice.toUpperCase()} vs ${ICONS[cpuChoice]} ${cpuChoice.toUpperCase()} — ${resultLabel[result]}`;

  entry.appendChild(time);
  entry.appendChild(msg);
  dom.logTerminal.appendChild(entry);
  dom.logTerminal.scrollTop = dom.logTerminal.scrollHeight;
}

dom.logClear.addEventListener("click", () => {
  dom.logTerminal.innerHTML = "";
  const init = document.createElement("div");
  init.className = "log-entry init";
  init.innerHTML = `<span class="log-time">${getTime()}</span><span class="log-msg">» Log cleared.</span>`;
  dom.logTerminal.appendChild(init);
});

// ─── Core Round Logic ─────────────────────────────
async function playRound(playerChoice) {
  if (state.isAnimating) return;
  state.isAnimating = true;
  setButtonsDisabled(true);

  // 1) Hide previous result
  dom.resultBanner.classList.remove("show");

  // 2) Reset icons & show player choice immediately
  resetChoiceIcons();
  await sleep(80);
  setChoiceIcon("player", ICONS[playerChoice]);

  // 3) CPU thinking animation
  setCPUThinking();
  setClashText("...");
  await sleep(300);

  // 4) CPU makes choice
  const cpuChoice = cpuPick();

  // 5) Countdown feel
  const countdowns = ["3", "2", "1", "CLASH!"];
  for (const cd of countdowns) {
    dom.clashText.textContent = cd;
    await sleep(cd === "CLASH!" ? 100 : 180);
  }

  // 6) Reveal CPU
  setChoiceIcon("cpu", ICONS[cpuChoice]);
  setClashText("⚡");
  await sleep(100);

  // 7) Evaluate
  const result = getResult(playerChoice, cpuChoice);

  // 8) Update streak
  if (result === state.streakType) {
    state.streak++;
  } else {
    state.streak = 1;
    state.streakType = result;
  }

  // 9) Update scores
  if (result === "win")  { state.playerScore++; popScore("player"); }
  if (result === "lose") { state.cpuScore++;    popScore("cpu"); }
  state.round++;

  updateScores();
  updateRound();
  updateStreak();

  // 10) Clash text
  const clashWords = { win: "WIN!", lose: "LOSE", draw: "DRAW" };
  setClashText(clashWords[result]);

  // 11) Show result
  showResult(result, playerChoice, cpuChoice);
  addLog(result, playerChoice, cpuChoice);

  await sleep(400);

  // 12) Check game over (first to 4 in a 7-round match)
  const isGameOver = state.playerScore >= 4 || state.cpuScore >= 4 || state.round > MAX_ROUNDS;

  if (isGameOver) {
    await sleep(800);
    showModal();
  }

  setButtonsDisabled(false);
  state.isAnimating = false;
}

// ─── Modal ────────────────────────────────────────
function showModal() {
  const pWin = state.playerScore > state.cpuScore;
  const draw = state.playerScore === state.cpuScore;

  const outcome = draw ? "draw" : (pWin ? "win" : "lose");
  const titles = {
    win:  ["VICTORY", "CHAMPION", "SYSTEM OVERRIDE", "DOMINANT"][Math.floor(Math.random() * 4)],
    lose: ["DEFEATED", "SYSTEM FAIL", "ACCESS DENIED", "GAME OVER"][Math.floor(Math.random() * 4)],
    draw: ["DEADLOCK", "STALEMATE", "NULL RESULT"][Math.floor(Math.random() * 3)]
  };

  $("modal-title").textContent = "// MATCH COMPLETE";
  dom.modalResult.textContent = titles[outcome];
  dom.modalResult.className   = `modal-result ${outcome}`;
  dom.modalStats.innerHTML    = `
    Final Score: <strong style="color:var(--neon-green)">${state.playerScore}</strong> — 
    <strong style="color:var(--neon-pink)">${state.cpuScore}</strong><br>
    Rounds Played: ${state.round - 1}<br>
    Best Streak: ${state.streak}× ${state.streakType ? state.streakType.toUpperCase() : ""}
  `;

  dom.modalOverlay.classList.add("show");
}

dom.modalRestart.addEventListener("click", resetGame);

// ─── Reset ────────────────────────────────────────
function resetGame() {
  state = {
    playerScore: 0,
    cpuScore: 0,
    round: 1,
    streak: 0,
    streakType: null,
    isAnimating: false,
    log: []
  };

  updateScores();
  updateRound();
  updateStreak();
  resetChoiceIcons();

  dom.playerBar.style.width = "0%";
  dom.cpuBar.style.width    = "0%";

  dom.resultBanner.classList.remove("show");
  dom.clashText.textContent = "CHOOSE";
  dom.clashFx.classList.remove("clash-active");

  dom.modalOverlay.classList.remove("show");

  // Fresh log entry
  dom.logTerminal.innerHTML = "";
  const init = document.createElement("div");
  init.className = "log-entry init";
  init.innerHTML = `<span class="log-time">${getTime()}</span><span class="log-msg">» System reset. New match initialized.</span>`;
  dom.logTerminal.appendChild(init);

  setButtonsDisabled(false);
}

// ─── Event Listeners ──────────────────────────────
Object.entries(dom.buttons).forEach(([choice, btn]) => {
  btn.addEventListener("click", () => playRound(choice));
});

document.addEventListener("keydown", e => {
  const map = { "1": "rock", "2": "paper", "3": "scissors", "r": "reset", "R": "reset" };
  const action = map[e.key];
  if (!action) return;
  if (action === "reset") { resetGame(); return; }
  if (!state.isAnimating && !dom.buttons[action].disabled) {
    playRound(action);
    // Visual press effect
    dom.buttons[action].classList.add("active-press");
    setTimeout(() => dom.buttons[action].classList.remove("active-press"), 200);
  }
});

// Touch ripple effect on buttons
Object.values(dom.buttons).forEach(btn => {
  btn.addEventListener("pointerdown", function(e) {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement("span");
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px; top: ${y}px;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: rgba(0,229,255,0.6);
      transform: translate(-50%, -50%) scale(0);
      animation: ripplePop 0.5s ease-out forwards;
      pointer-events: none;
      z-index: 10;
    `;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});

// Inject ripple animation
const style = document.createElement("style");
style.textContent = `
@keyframes ripplePop {
  0%   { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(20); opacity: 0; }
}
`;
document.head.appendChild(style);

// ─── Init ─────────────────────────────────────────
startClock();
spawnParticles();
