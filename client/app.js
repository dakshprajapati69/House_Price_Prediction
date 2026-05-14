/* ============================================================
   app.js
   FastAPI backend:
     GET  http://127.0.0.1:8000/get_location_names
     POST http://127.0.0.1:8000/get_estimate_price
   ============================================================ */

"use strict";

/* ── CONSTANTS ─────────────────────────────────────────────── */
const API_BASE     = "http://127.0.0.1:8000";
// const API_BASE     = "/api";

const HISTORY_KEY  = "estateiq_history";
const MAX_HISTORY  = 12;
const TOAST_DURATION = 3800;

/* ── DOM REFERENCES ────────────────────────────────────────── */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const form        = $("#predictForm");
const sqftInput   = $("#sqft");
const bhkInput    = $("#bhk");
const bathInput   = $("#bath");
const locationSel = $("#location");
const submitBtn   = $("#submitBtn");
const btnText     = submitBtn.querySelector(".btn-text");
const btnLoader   = $("#btnLoader");
const btnArrow    = submitBtn.querySelector(".btn-arrow");
const resultPanel = $("#resultPanel");
const resultAmount= $("#resultAmount");
const resultNote  = $("#resultNote");
const resetBtn    = $("#resetBtn");
const historyGrid = $("#historyGrid");
const historyEmpty= $("#historyEmpty");
const clearHistBtn= $("#clearHistoryBtn");
const themeToggle = $("#themeToggle");
const themeIcon   = $("#themeIcon");
const navbar      = $("#navbar");
const toastCont   = $("#toastContainer");

/* ── THEME ─────────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem("estateiq_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  themeIcon.textContent = saved === "dark" ? "☽" : "☀";
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("estateiq_theme", next);
  themeIcon.textContent = next === "dark" ? "☽" : "☀";
});

/* ── NAVBAR SCROLL ─────────────────────────────────────────── */
window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 30);
}, { passive: true });

/* ── ANIMATED STAT COUNTERS ────────────────────────────────── */
function animateCounters() {
  const counters = $$(".stat-num[data-target]");
  counters.forEach((el) => {
    const target   = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const step     = 16;
    const steps    = duration / step;
    let current    = 0;
    const increment = target / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        el.textContent = target.toLocaleString();
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(current).toLocaleString();
      }
    }, step);
  });
}

// Trigger when hero is visible
const heroObserver = new IntersectionObserver(
  (entries) => { if (entries[0].isIntersecting) { animateCounters(); heroObserver.disconnect(); } },
  { threshold: 0.3 }
);
heroObserver.observe($(".stat-row"));

/* ── FETCH LOCATIONS ───────────────────────────────────────── */
async function fetchLocations() {
  try {
    const res = await fetch(`${API_BASE}/get_location_names`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Expected: { locations: ["1st Phase JP Nagar", ...] }
    const locations = data.locations || data;

    locationSel.innerHTML = `<option value="" disabled selected>Select a location</option>`;
    locations.sort().forEach((loc) => {
      const opt = document.createElement("option");
      opt.value = loc;
      opt.textContent = loc;
      locationSel.appendChild(opt);
    });

    showToast("Locations loaded successfully", "success");
  } catch (err) {
    console.error("Location fetch error:", err);
    locationSel.innerHTML = `<option value="" disabled selected>Failed to load — enter manually</option>`;

    // Allow manual text entry as fallback
    locationSel.setAttribute("disabled", "true");
    const input = document.createElement("input");
    input.type = "text";
    input.id   = "locationFallback";
    input.className = "field-input";
    input.placeholder = "Type location manually…";
    locationSel.parentElement.replaceChild(input, locationSel);

    showToast("Could not reach backend. Make sure FastAPI is running.", "error");
  }
}

/* ── VALIDATION ────────────────────────────────────────────── */
function showError(inputId, message) {
  const el = $(`#${inputId}Error`);
  const inp = $(`#${inputId}`);
  if (el)  el.textContent = message;
  if (inp) inp.classList.add("input-error");
}

function clearErrors() {
  $$(".field-error").forEach((el) => { el.textContent = ""; });
  $$(".field-input").forEach((el) => { el.classList.remove("input-error"); });
}

function validateInputs(sqft, bhk, bath, location) {
  let valid = true;
  clearErrors();

  if (!sqft || isNaN(sqft) || sqft < 100 || sqft > 50000) {
    showError("sqft", "Enter a valid area (100 – 50,000 sq.ft)");
    valid = false;
  }
  if (!bhk || isNaN(bhk) || bhk < 1 || bhk > 10 || !Number.isInteger(+bhk)) {
    showError("bhk", "Enter BHK between 1 and 10");
    valid = false;
  }
  if (!bath || isNaN(bath) || bath < 1 || bath > 10 || !Number.isInteger(+bath)) {
    showError("bath", "Enter bathrooms between 1 and 10");
    valid = false;
  }
  if (!location || location.trim() === "") {
    showError("location", "Please select a location");
    valid = false;
  }
  return valid;
}

/* ── LOADING STATE ─────────────────────────────────────────── */
function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.hidden     = loading;
  btnArrow.hidden    = loading;
  btnLoader.hidden   = !loading;
}

/* ── PREDICT PRICE ─────────────────────────────────────────── */
async function predictPrice(sqft, bhk, bath, location) {
  const payload = {
    total_sqft: parseFloat(sqft),
    location:   location.trim(),
    bhk:        parseInt(bhk, 10),
    bath:       parseInt(bath, 10),
  };

  const res = await fetch(`${API_BASE}/get_estimate_price`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error ${res.status}`);
  }

  const data = await res.json();
  // Expected: { estimated_price: 75.32 } (in Lakhs)
  return data.estimated_price ?? data.price ?? data;
}

/* ── DISPLAY RESULT ─────────────────────────────────────────── */
function showResult(price, { sqft, bhk, bath, location }) {
  const formatted = parseFloat(price).toFixed(2);
  resultAmount.textContent = formatted;
  resultNote.textContent =
    `${bhk} BHK · ${bath} Bath · ${Number(sqft).toLocaleString()} sq.ft · ${location}`;
  resultPanel.hidden = false;

  // Save to history
  saveHistory({ price: formatted, sqft, bhk, bath, location, date: new Date().toISOString() });
  renderHistory();

  showToast(`Estimated ₹${formatted} Lakhs for ${location}`, "success");
}

/* ── FORM SUBMIT ────────────────────────────────────────────── */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const sqft     = sqftInput.value.trim();
  const bhk      = bhkInput.value.trim();
  const bath     = bathInput.value.trim();

  // Support both select and fallback text input
  const locEl    = $("#location") || $("#locationFallback");
  const location = locEl ? locEl.value : "";

  if (!validateInputs(sqft, bhk, bath, location)) return;

  // Hide previous result
  resultPanel.hidden = true;

  setLoading(true);
  try {
    const price = await predictPrice(sqft, bhk, bath, location);
    showResult(price, { sqft, bhk, bath, location });
  } catch (err) {
    console.error("Prediction error:", err);
    showToast(`Error: ${err.message}`, "error");
  } finally {
    setLoading(false);
  }
});

/* ── RESET ──────────────────────────────────────────────────── */
resetBtn.addEventListener("click", () => {
  form.reset();
  clearErrors();
  resultPanel.hidden = true;
  sqftInput.focus();
});

/* ── HISTORY (localStorage) ─────────────────────────────────── */
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch { return []; }
}

function saveHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function renderHistory() {
  const history = loadHistory();

  if (!history.length) {
    historyEmpty.hidden = false;
    // Remove old cards
    $$(".history-card").forEach((c) => c.remove());
    return;
  }

  historyEmpty.hidden = true;

  // Clear existing cards
  $$(".history-card").forEach((c) => c.remove());

  history.forEach((entry, i) => {
    const card = document.createElement("div");
    card.className = "history-card";
    card.style.animationDelay = `${i * 0.05}s`;

    const date = new Date(entry.date);
    const dateStr = date.toLocaleDateString("en-IN", {
      day:   "numeric",
      month: "short",
      year:  "numeric",
      hour:  "2-digit",
      minute:"2-digit",
    });

    card.innerHTML = `
      <div class="hc-location" title="${entry.location}">${entry.location}</div>
      <div class="hc-specs">${entry.bhk} BHK · ${entry.bath} Bath · ${Number(entry.sqft).toLocaleString()} sq.ft</div>
      <div class="hc-price"><span>₹</span> ${entry.price} <small style="font-size:13px;font-weight:400;color:var(--text-muted)">Lakhs</small></div>
      <div class="hc-date">${dateStr}</div>
    `;

    historyGrid.appendChild(card);
  });
}

clearHistBtn.addEventListener("click", () => {
  if (!loadHistory().length) return showToast("History is already empty", "info");
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast("History cleared", "info");
});

/* ── TOAST NOTIFICATIONS ────────────────────────────────────── */
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-dot"></span><span>${message}</span>`;
  toastCont.appendChild(toast);

  // Auto-remove
//   const timer = setTimeout(() => dismissToast(toast), TOAST_DURATION);
//   toast.addEventListener("click", () => { clearTimeout(timer); dismissToast(toast); });
  setTimeout(() => {
        toast.remove();
    }, 3000);
}

function dismissToast(toast) {
  toast.classList.add("toast-out");
  toast.addEventListener("transitionend", () => toast.remove(), { once: true });
}

/* ── INPUT REAL-TIME VALIDATION HINTS ──────────────────────── */
[sqftInput, bhkInput, bathInput].forEach((input) => {
  input.addEventListener("input", () => {
    const errorEl = $(`#${input.id}Error`);
    if (errorEl && errorEl.textContent) {
      // Clear error as soon as user starts typing a valid value
      if (input.value && !isNaN(input.value) && input.value >= +input.min) {
        errorEl.textContent = "";
        input.classList.remove("input-error");
      }
    }
  });
});

locationSel?.addEventListener("change", () => {
  const errorEl = $("#locationError");
  if (errorEl) errorEl.textContent = "";
  locationSel.classList.remove("input-error");
});

/* ── INIT ────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  fetchLocations();
  renderHistory();
});