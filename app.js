// ══════════════════════════════════════════════════════
//  ANNADATA — app.js
//  Paste your deployed Apps Script Web App URL below
// ══════════════════════════════════════════════════════

const WEB_APP_URL = "YOUR_WEB_APP_URL_HERE";
// Get this from: Apps Script → Deploy → Manage deployments → copy URL

// ── State ──
let currentFoodType = "cooked";
let userLat = null;
let userLng = null;
let ngoLat  = null;
let ngoLng  = null;

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
  loadListings();
});

// ════════════════════════════════════════════════════
//  TAB & NAV SWITCHING
// ════════════════════════════════════════════════════

function switchTab(tab) {
  ["ngo", "give", "notif"].forEach(t => {
    const panel = document.getElementById("panel-" + t);
    const btn   = document.getElementById("tab-" + t);
    if (panel) panel.classList.toggle("active", t === tab);
    if (btn)   btn.classList.toggle("active", t === tab);
  });

  const fab = document.getElementById("fab-post");
  if (fab) fab.style.display = tab === "ngo" ? "flex" : "none";
}

function switchNav(navId, tab) {
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  document.getElementById("nav-" + navId).classList.add("active");
  if (tab) switchTab(tab);
}

function openNotifPanel() {
  ["ngo", "give"].forEach(t => {
    const p = document.getElementById("panel-" + t);
    if (p) p.classList.remove("active");
  });
  const notif = document.getElementById("panel-notif");
  if (notif) notif.classList.add("active");

  const fab = document.getElementById("fab-post");
  if (fab) fab.style.display = "none";
}

// ════════════════════════════════════════════════════
//  MODAL
// ════════════════════════════════════════════════════

function openRegisterModal() {
  document.getElementById("registerModal").classList.add("open");
}

function closeModal() {
  document.getElementById("registerModal").classList.remove("open");
}

document.addEventListener("click", e => {
  const overlay = document.getElementById("registerModal");
  if (e.target === overlay) closeModal();
});

// ════════════════════════════════════════════════════
//  FOOD TYPE TOGGLE
// ════════════════════════════════════════════════════

function selectFoodType(type) {
  currentFoodType = type;
  document.getElementById("ft-cooked").classList.toggle("selected", type === "cooked");
  document.getElementById("ft-packet").classList.toggle("selected", type === "packet");

  const hint = document.getElementById("expiry-hint");
  if (type === "packet") {
    hint.style.background = "var(--amber-soft)";
    hint.style.borderColor = "#F0C97A";
    hint.innerHTML = `<span class="hint-icon">📦</span>
      <span><strong>Packed food:</strong> listing stays active for <strong>30 days</strong>. Great for shelf-stable items!</span>`;
  } else {
    hint.style.background = "var(--red-soft)";
    hint.style.borderColor = "#F5C5A8";
    hint.innerHTML = `<span class="hint-icon">⏱</span>
      <span><strong>Cooked food:</strong> listing stays active for <strong>12 hours</strong>. Auto-expires for safety.</span>`;
  }
}

// ════════════════════════════════════════════════════
//  GEOLOCATION
// ════════════════════════════════════════════════════

function getLocation() {
  const statusEl = document.getElementById("location-status");
  statusEl.textContent = "Getting location…";

  if (!navigator.geolocation) {
    statusEl.textContent = "Location not supported on this browser";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
      statusEl.textContent = `📍 Got it: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`;
      statusEl.classList.add("got-location");
      document.getElementById("food-lat").value = userLat;
      document.getElementById("food-lng").value = userLng;
    },
    err => {
      statusEl.textContent = "Could not get location. Try again.";
      console.warn("Geolocation error:", err.message);
    }
  );
}

function getNGOLocation() {
  const statusEl = document.getElementById("ngo-location-status");
  statusEl.textContent = "Getting location…";

  if (!navigator.geolocation) {
    statusEl.textContent = "Location not supported on this browser";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      ngoLat = pos.coords.latitude;
      ngoLng = pos.coords.longitude;
      statusEl.textContent = `📍 Got it: ${ngoLat.toFixed(4)}, ${ngoLng.toFixed(4)}`;
      statusEl.classList.add("got-location");
      document.getElementById("ngo-lat").value = ngoLat;
      document.getElementById("ngo-lng").value = ngoLng;
    },
    err => {
      statusEl.textContent = "Could not get location. Try again.";
    }
  );
}

// ════════════════════════════════════════════════════
//  SUBMIT FOOD LISTING
// ════════════════════════════════════════════════════

async function submitFood() {
  const name     = document.getElementById("food-desc").value.trim();
  const giverName= document.getElementById("giver-name").value.trim();
  const qty      = document.getElementById("food-qty").value.trim();
  const notes    = document.getElementById("food-notes").value.trim();
  const lat      = document.getElementById("food-lat").value;
  const lng      = document.getElementById("food-lng").value;

  if (!giverName) { showToast("Please enter your name and contact."); return; }
  if (!name)      { showToast("Please describe the food."); return; }
  if (!qty)       { showToast("Please enter how many people it can feed."); return; }
  if (!lat || !lng) { showToast("Please get your location first."); return; }

  const btn = document.querySelector("#panel-give .btn-primary");
  btn.textContent = "Posting…";
  btn.disabled = true;

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action:    "postFood",
        name:      giverName,
        foodDesc:  name,
        quantity:  qty,
        foodType:  currentFoodType,
        lat:       parseFloat(lat),
        lng:       parseFloat(lng),
        notes:     notes
      })
    });

    const data = await res.json();

    if (data.success) {
      showToast("✅ Posted! Nearby NGOs notified.");
      clearFoodForm();
      loadListings();
    } else {
      showToast("Error: " + (data.error || "Something went wrong."));
    }

  } catch (err) {
    console.error(err);
    // Fallback demo mode if backend not connected yet
    showToast("✅ Posted! (Demo mode — connect backend for live alerts)");
    clearFoodForm();
  } finally {
    btn.textContent = "🌾 Post food now";
    btn.disabled = false;
  }
}

function clearFoodForm() {
  document.getElementById("giver-name").value = "";
  document.getElementById("food-desc").value  = "";
  document.getElementById("food-qty").value   = "";
  document.getElementById("food-notes").value = "";
  document.getElementById("food-lat").value   = "";
  document.getElementById("food-lng").value   = "";
  document.getElementById("location-status").textContent = "Tap to get your location";
  document.getElementById("location-status").classList.remove("got-location");
}

// ════════════════════════════════════════════════════
//  SUBMIT NGO REGISTRATION
// ════════════════════════════════════════════════════

async function submitNGO() {
  const orgName       = document.getElementById("ngo-name").value.trim();
  const contactPerson = document.getElementById("ngo-contact").value.trim();
  const phone         = document.getElementById("ngo-phone").value.trim();
  const email         = document.getElementById("ngo-email").value.trim();
  const capacity      = document.getElementById("ngo-capacity").value.trim();
  const lat           = document.getElementById("ngo-lat").value;
  const lng           = document.getElementById("ngo-lng").value;

  if (!orgName)   { showToast("Please enter organisation name."); return; }
  if (!phone)     { showToast("Please enter a phone number."); return; }
  if (!email)     { showToast("Please enter an email address."); return; }
  if (!capacity)  { showToast("Please enter shelter capacity."); return; }
  if (!lat || !lng) { showToast("Please get your shelter location."); return; }

  const btn = document.querySelector("#registerModal .btn-primary");
  btn.textContent = "Registering…";
  btn.disabled = true;

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action:        "registerNGO",
        orgName,
        contactPerson,
        phone,
        email,
        capacity:      parseInt(capacity),
        lat:           parseFloat(lat),
        lng:           parseFloat(lng),
        hasTransport:  "yes"
      })
    });

    const data = await res.json();

    if (data.success) {
      showToast("🏠 Shelter registered! Alerts are now live.");
      closeModal();
    } else {
      showToast(data.message || "Registration failed.");
    }

  } catch (err) {
    console.error(err);
    showToast("🏠 Registered! (Demo mode — connect backend for live alerts)");
    closeModal();
  } finally {
    btn.textContent = "Register shelter →";
    btn.disabled = false;
  }
}

// ════════════════════════════════════════════════════
//  LOAD LISTINGS (NGO tab)
// ════════════════════════════════════════════════════

async function loadListings() {
  const container = document.getElementById("listings-container");
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Finding food near you…</p>
    </div>`;

  // Use device location if available, else default to Jaipur center
  let lat = 26.9124, lng = 75.7873;
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
    );
    lat = pos.coords.latitude;
    lng = pos.coords.longitude;
  } catch (_) {}

  try {
    const res  = await fetch(`${WEB_APP_URL}?action=getListings&lat=${lat}&lng=${lng}`);
    const data = await res.json();
    renderListings(data.listings || []);
  } catch (_) {
    // Demo fallback
    renderListings(DEMO_LISTINGS);
  }
}

function renderListings(listings) {
  const container = document.getElementById("listings-container");
  const count     = document.getElementById("listing-count");
  const statActive= document.getElementById("stat-active");
  const statDist  = document.getElementById("stat-dist");

  if (!listings || listings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <p>No food listings near you right now.<br>Check back soon or post your own surplus.</p>
      </div>`;
    count.textContent      = "0 active listings";
    statActive.textContent = "0";
    statDist.textContent   = "—";
    document.getElementById("stat-meals").textContent = "—";
    return;
  }

  count.textContent      = `${listings.length} active listing${listings.length !== 1 ? "s" : ""} right now`;
  statActive.textContent = listings.length;
  statDist.textContent   = listings[listings.length - 1].distanceKm + " km";
  document.getElementById("stat-meals").textContent = listings.reduce((s, l) => s + (parseInt(l.quantity) || 0), 0);

  container.innerHTML = listings.map(l => listingCard(l)).join("");
}

function listingCard(l) {
  const isCooked  = l.foodType === "cooked";
  const pct       = isCooked ? Math.max(5, Math.round((l.hoursLeft / 12) * 100)) : 90;
  const fillClass = isCooked && l.hoursLeft < 3 ? "urgent" : isCooked ? "mid" : "ok";
  const badgeClass= isCooked ? "badge--cooked" : "badge--packet";
  const badgeText = isCooked ? "Cooked" : "Packed";
  const iconClass = isCooked ? "card-icon--red" : "card-icon--amber";
  const iconEmoji = isCooked ? "🍛" : "📦";

  const timeLabel = isCooked
    ? `${l.hoursLeft}h ${l.minutesLeft}m left`
    : `${l.daysLeft !== undefined ? l.daysLeft : "28"} days remaining`;

  const timeCls = fillClass === "urgent" ? "timer-value--urgent"
                : fillClass === "mid"    ? "timer-value--mid"
                : "timer-value--ok";

  return `
    <div class="listing-card">
      <div class="card-header">
        <div class="card-header-left">
          <div class="card-icon ${iconClass}">${iconEmoji}</div>
          <div>
            <div class="card-title">${escHtml(l.foodDesc || "Food available")}</div>
            <div class="card-meta">${escHtml(l.name || "Donor")} · ${l.distanceKm} km away · Posted recently</div>
          </div>
        </div>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>

      <div class="card-divider"></div>

      <div class="info-row">
        <span class="info-icon">👥</span>
        <span class="info-text">Enough for <strong>~${escHtml(String(l.quantity))} people</strong></span>
      </div>
      ${l.notes ? `
      <div class="info-row">
        <span class="info-icon">📝</span>
        <span class="info-text">${escHtml(l.notes)}</span>
      </div>` : ""}
      <div class="info-row">
        <span class="info-icon">📍</span>
        <span class="info-text"><strong>${l.distanceKm} km</strong> from your location</span>
        <span class="distance-badge">📍 ${l.distanceKm} km</span>
      </div>

      <div class="timer-bar">
        <div class="timer-label">
          <span class="timer-label-left">⏱ ${isCooked ? "Expires in" : "Valid until"}</span>
          <span class="timer-value ${timeCls}">${timeLabel}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill progress-fill--${fillClass}" style="width:${pct}%"></div>
        </div>
      </div>

      <button class="btn btn-accept" onclick="acceptListing('${escHtml(l.id)}', this)">Accept &amp; Get Directions</button>
    </div>`;
}

// ════════════════════════════════════════════════════
//  ACCEPT LISTING
// ════════════════════════════════════════════════════

async function acceptListing(listingId, btn) {
  const ngoName  = prompt("Your NGO/shelter name:");
  if (!ngoName) return;
  const ngoPhone = prompt("Your contact number:");
  if (!ngoPhone) return;

  btn.textContent = "Accepting…";
  btn.disabled    = true;

  try {
    const res  = await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        action:   "acceptFood",
        listingId,
        ngoName,
        ngoPhone
      })
    });
    const data = await res.json();

    if (data.success) {
      showToast("✅ Accepted! Donor has been notified.");
      btn.textContent = "✅ Accepted";
      btn.style.background = "#2D6A4F";
    } else {
      showToast(data.message || "Could not accept.");
      btn.textContent = "Accept & Get Directions";
      btn.disabled    = false;
    }
  } catch (_) {
    showToast("✅ Accepted! (Demo mode)");
    btn.textContent = "✅ Accepted";
    btn.style.background = "#2D6A4F";
  }
}

// ════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════

let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

// ════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ════════════════════════════════════════════════════
//  DEMO DATA (shown when backend not yet connected)
// ════════════════════════════════════════════════════

const DEMO_LISTINGS = [
  {
    id: "F001", name: "Sharma Wedding Caterers", foodDesc: "Dal makhani, rice, paneer sabzi, rotis",
    quantity: 100, foodType: "cooked", distanceKm: 7.4,
    hoursLeft: 2, minutesLeft: 14, daysLeft: null, notes: "Gate 2, call before arriving"
  },
  {
    id: "F002", name: "Hotel Clarks — Kitchen", foodDesc: "Sealed biscuits, juice packs, bread loaves",
    quantity: 40, foodType: "packet", distanceKm: 11.2,
    hoursLeft: 720, minutesLeft: 0, daysLeft: 28, notes: ""
  },
  {
    id: "F003", name: "JNU Hostel Canteen", foodDesc: "Khichdi, curd, pickle, chapati",
    quantity: 25, foodType: "cooked", distanceKm: 18.3,
    hoursLeft: 9, minutesLeft: 20, daysLeft: null, notes: "Contact warden first"
  }
];
