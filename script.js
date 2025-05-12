// 📈 BAZOWE CENY – edytuj swobodnie
const BASE_PRICES = {
  BTC: 30000,
  KTY: 1.0,
  ZAZ: 2.5,
  DGC: 0.0001,
  XTR: 10.0
};

let currentUser = null;
let state = null;
let chartData = {};
let activeChart = null;
let autosellBot = { active: false, coin: "", trigger: 0 };
let clickCombo = 0;
let sellStreak = 0;

// Sprawdź daily bonus (na starcie)
function checkDailyBonus() {
  const last = localStorage.getItem("dailyBonus_" + currentUser);
  const today = new Date().toDateString();
  if (last !== today) {
    state.balance += 100;
    logEvent("🎁 Dzienny bonus +$100!");
    localStorage.setItem("dailyBonus_" + currentUser, today);
  }
}

function login() {
  const name = document.getElementById("loginName").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  const err = document.getElementById("loginError");

  if (name.length < 3 || name.length > 20 || pass.length < 3 || pass.length > 20) {
    err.textContent = "Nick i hasło: 3–20 znaków.";
    return;
  }

  const key = "cryptoUser_" + name;
  const saved = localStorage.getItem(key);

  if (saved) {
    const obj = JSON.parse(saved);
    if (obj.password !== pass) {
      err.textContent = "Złe hasło.";
      return;
    }
    state = validateState(obj.state);
  } else {
    state = validateState(null);
  }

  currentUser = name;
  document.getElementById("userDisplay").textContent = currentUser;
  document.getElementById("loginPanel").classList.add("hidden");
  document.getElementById("gamePanel").classList.remove("hidden");

  save();
  initCharts();
  updateUI();
  switchCoin(state.active);
  checkDailyBonus();

  setInterval(updatePrices, 1000);
  setInterval(autoBot, 5000);
  setInterval(mysteryBox, 60000);
  setInterval(newsTicker, 15000);
  setInterval(marketReport, 60000);
  setInterval(microBonus, 30000);
}

function validateState(s) {
  const def = {
    balance: 100,
    wallet: { KTY: 0, ZAZ: 0, DGC: 0, BTC: 0, XTR: 0 },
    prices: { ...BASE_PRICES },
    trend: { KTY: "up", ZAZ: "down", DGC: "flat", BTC: "flat", XTR: "flat" },
    active: "KTY",
    hasBot: false,
    prestige: 0
  };
  if (!s) return def;
  for (let key in def) if (!(key in s)) s[key] = def[key];
  ["KTY", "ZAZ", "DGC", "BTC", "XTR"].forEach(c => {
    if (!s.wallet[c]) s.wallet[c] = 0;
    if (!s.prices[c]) s.prices[c] = BASE_PRICES[c];
    if (!s.trend[c]) s.trend[c] = "flat";
  });
  return s;
}

function logout() {
  currentUser = null;
  state = null;
  location.reload();
}

function save() {
  localStorage.setItem("cryptoUser_" + currentUser, JSON.stringify({
    password: document.getElementById("loginPass").value,
    state
  }));
}
function initCharts() {
  chartData = {};
  ["KTY", "ZAZ", "DGC", "BTC", "XTR"].forEach(c => {
    chartData[c] = { labels: [], data: [], colors: [] };
  });

  const ctx = document.getElementById("chart").getContext("2d");
  activeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Cena',
        data: [],
        backgroundColor: [],
        borderSkipped: false
      }]
    },
    options: {
      scales: {
        y: { ticks: { color: '#ccc' } },
        x: { ticks: { color: '#ccc' } }
      },
      plugins: {
        legend: { labels: { color: '#ccc' } }
      }
    }
  });
}

function switchCoin(coin) {
  state.active = coin;
  ["KTY", "ZAZ", "DGC", "BTC", "XTR"].forEach(id => {
    document.getElementById("tab-" + id).classList.remove("active-tab");
  });
  document.getElementById("tab-" + coin).classList.add("active-tab");

  const icon = document.getElementById("coinIcon");
  icon.src = `${coin}.png`;
  icon.style.display = "inline";

  document.getElementById("coinLabel").textContent = coin;
  const d = chartData[coin];
  activeChart.data.labels = d.labels;
  activeChart.data.datasets[0].data = d.data;
  activeChart.data.datasets[0].backgroundColor = d.colors;
  activeChart.update();
}

function updateUI() {
  document.getElementById("balance").textContent = `$${state.balance.toFixed(2)}`;
  document.getElementById("price").textContent = `$${state.prices[state.active].toFixed(6)}`;
  document.getElementById("kty").textContent = state.wallet.KTY;
  document.getElementById("zaz").textContent = state.wallet.ZAZ;
  document.getElementById("dgc").textContent = state.wallet.DGC;
  document.getElementById("btc").textContent = state.wallet.BTC;
  document.getElementById("xtr").textContent = state.wallet.XTR;
  document.getElementById("prestige").textContent = state.prestige;

  if (state.hasBot) {
    document.getElementById("botPanel").classList.add("hidden");
    document.getElementById("botConfig").classList.remove("hidden");
  }
}

function updateChartData(coin) {
  const d = chartData[coin];
  const price = state.prices[coin];
  const now = new Date().toLocaleTimeString();
  const last = d.data.length ? d.data[d.data.length - 1] : price;
  d.labels.push(now);
  d.data.push(price);
  d.colors.push(price >= last ? 'lime' : 'red');
  if (d.labels.length > 80) {
    d.labels.shift(); d.data.shift(); d.colors.shift();
  }
  if (coin === state.active) activeChart.update();
}
function updatePrices() {
  const coins = ["KTY", "ZAZ", "DGC", "BTC", "XTR"];
  coins.forEach(coin => {
    let p = state.prices[coin];
    let t = state.trend[coin];
    let dir = t === "up" ? 1 : t === "down" ? -1 : 0;

    let vol = {
      KTY: 0.5,
      ZAZ: 1.5,
      DGC: 0.0001,
      BTC: 50,
      XTR: p * 0.5
    }[coin];

    let delta = dir * vol * 0.2 + (Math.random() - 0.5) * vol;
    p += delta;

    if (coin === "BTC" && Math.random() < 0.01) {
      let mult = Math.random() < 0.5 ? 5 : 0.1;
      p *= mult;
      logEvent(`🪙 BTC: ${mult > 1 ? "TO THE MOON 🚀" : "REKT 💥"}`);
    }

    if (coin === "XTR") {
      if (Math.random() < 0.3) p *= 1 + (Math.random() - 0.5);
    }

    state.prices[coin] = Math.max(coin === "DGC" ? 0.00001 : 0.1, parseFloat(p.toFixed(6)));

    if (Math.random() < 0.05) {
      const trends = ["up", "down", "flat"];
      state.trend[coin] = trends[Math.floor(Math.random() * trends.length)];
    }

    updateChartData(coin);
  });

  updateUI();
  save();
  checkBotTrigger();
}

function buyCoin(qty) {
  const c = state.active;
  const price = state.prices[c];
  const cost = price * qty;
  if (state.balance >= cost) {
    state.balance -= cost;
    let multiplier = 1;
    if (Math.random() < 0.05) {
      multiplier = 2;
      logEvent("💥 KRYTYCZNY ZAKUP! x2");
    }
    if (clickCombo >= 5) {
      multiplier *= 1.2;
      logEvent("⚡ Trade Frenzy bonus!");
      clickCombo = 0;
    }
    state.wallet[c] += qty * multiplier;
    clickCombo++;
    updateUI(); save();
  } else showMsg("Za mało hajsu");
}

function sellCoin(qty) {
  const c = state.active;
  if (state.wallet[c] >= qty) {
    const price = state.prices[c];
    let bonus = 1 + 0.05 * state.prestige;
    if (Math.random() < 0.05) {
      bonus *= 2;
      logEvent("💥 KRYTYCZNA SPRZEDAŻ! x2");
    }
    sellStreak++;
    if (sellStreak % 3 === 0) {
      bonus *= 1.2;
      logEvent("🔥 COMBO SPRZEDAŻ x1.2");
    }

    const gain = qty * price * bonus;
    state.wallet[c] -= qty;
    state.balance += gain;

    updateUI(); save();
  } else showMsg("Brak monet");
}

function sellAll() {
  sellCoin(state.wallet[state.active]);
}

function buyMax() {
  const c = state.active;
  const qty = Math.floor(state.balance / state.prices[c]);
  if (qty > 0) buyCoin(qty);
  else showMsg("Zbyt biedny");
}

function mysteryBox() {
  const rewards = [
    () => { state.balance += 50; logEvent("🎁 Bonus $50"); },
    () => { state.wallet[state.active] += 5; logEvent(`🎁 +5 ${state.active}`); },
    () => { state.prices[state.active] *= 1.5; logEvent(`💸 ${state.active} pump x1.5`); }
  ];
  rewards[Math.floor(Math.random() * rewards.length)]();
  updateUI(); save();
}

function newsTicker() {
  const fakeNews = [
    "💬 Elon tweetuje o DOGECASH!",
    "📉 Rząd zakazuje KTY w Europie!",
    "📈 Goldman Sachs inwestuje w BTC",
    "🛠️ Hackerzy atakują giełdę BTC",
    "📊 NFTX ogłasza nową walutę XTR!"
  ];
  logEvent(fakeNews[Math.floor(Math.random() * fakeNews.length)]);
}

function marketReport() {
  const entries = Object.entries(state.prices);
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const top = sorted[0], low = sorted[sorted.length - 1];
  logEvent(`📈 Najdroższy: ${top[0]} $${top[1].toFixed(2)}, 📉 Najtańszy: ${low[0]} $${low[1].toFixed(2)}`);
}

function microBonus() {
  const bonusType = Math.random();
  if (bonusType < 0.5) {
    state.balance += 5;
    logEvent("💸 Znalazłeś $5 na ulicy!");
  } else {
    state.wallet.BTC += 0.01;
    logEvent("🪙 Stary portfel BTC wrócił! +0.01 BTC");
  }
  updateUI(); save();
}

function spinSlot() {
  const roll = Math.random();
  if (roll < 0.2) {
    state.balance += 100;
    logEvent("🎰 SLOT: $100!");
  } else if (roll < 0.4) {
    state.wallet[state.active] += 10;
    logEvent(`🎰 SLOT: +10 ${state.active}`);
  } else if (roll < 0.6) {
    state.prices[state.active] *= 2;
    logEvent(`🎰 SLOT: CENA ${state.active} x2!`);
  } else {
    state.balance = Math.max(0, state.balance - 50);
    logEvent("🎰 SLOT: Przegrana $50...");
  }
  updateUI(); save();
}

function claimDaily() {
  const today = new Date().toDateString();
  if (localStorage.getItem("dailyBonus_" + currentUser) !== today) {
    state.balance += 100;
    logEvent("🎁 Dzienny bonus $100 odebrany!");
    localStorage.setItem("dailyBonus_" + currentUser, today);
    updateUI(); save();
  } else {
    showMsg("Już odebrane dziś!");
  }
}

function resetPrestige() {
  if (state.balance >= 1000000) {
    state.prestige += 1;
    state.balance = 100;
    ["KTY", "ZAZ", "DGC", "BTC", "XTR"].forEach(c => state.wallet[c] = 0);
    logEvent("🔁 Prestige aktywowany! +5% stały zysk");
    updateUI(); save();
  } else showMsg("Potrzeba $1,000,000");
}

function buyBot() {
  if (state.balance >= 100000) {
    state.balance -= 100000;
    state.hasBot = true;
    logEvent("🤖 Bot kupiony!");
    updateUI(); save();
  } else showMsg("Potrzebujesz $100,000");
}

function setBot() {
  const coin = document.getElementById("botCoin").value;
  const val = parseFloat(document.getElementById("botTrigger").value);
  if (isNaN(val) || val <= 0) {
    showMsg("Podaj poprawną cenę");
    return;
  }
  autosellBot = { active: true, coin, trigger: val };
  logEvent(`🤖 Bot aktywowany: ${coin} ≥ $${val}`);
}

function checkBotTrigger() {
  if (!autosellBot.active || !state.hasBot) return;
  const c = autosellBot.coin;
  const p = state.prices[c];
  if (p >= autosellBot.trigger && state.wallet[c] > 0) {
    const qty = state.wallet[c];
    state.wallet[c] = 0;
    const total = qty * p;
    state.balance += total;
    logEvent(`🤖 Bot sprzedał ${qty} ${c} po $${p.toFixed(2)}`);
    autosellBot.active = false;
    updateUI(); save();
  }
}

function showMsg(msg) {
  const el = document.getElementById("message");
  el.textContent = msg;
  setTimeout(() => el.textContent = "", 3000);
}

function logEvent(txt) {
  const log = document.getElementById("eventLog");
  const entry = document.createElement("div");
  entry.textContent = `${new Date().toLocaleTimeString()} — ${txt}`;
  log.prepend(entry);
  if (log.childNodes.length > 40) log.removeChild(log.lastChild);
}
