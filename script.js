/* ====== script.js (updated) ====== */

let db;
const dbName = "StreakDB";
const dbVersion = 1;

// Motivational quotes
const quotes = [
  "Keep pushing forward, one day at a time!",
  "Every streak starts with a single step.",
  "Consistency is the key to success!",
  "Small actions daily lead to big results.",
  "Stay committed, your streak will shine!"
];

// Initialize IndexedDB
const request = indexedDB.open(dbName, dbVersion);
request.onupgradeneeded = (event) => {
  db = event.target.result;
  if (!db.objectStoreNames.contains('pin')) {
    db.createObjectStore('pin', { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains('streaks')) {
    db.createObjectStore('streaks', { keyPath: 'name' });
  }
};
request.onsuccess = (event) => {
  db = event.target.result;
  checkPIN();
};
request.onerror = (event) => {
  console.error("IndexedDB error:", event.target.errorCode);
};

/* ===== PIN handling ===== */

function checkPIN() {
  const tx = db.transaction(['pin'], 'readonly');
  const store = tx.objectStore('pin');
  const getPIN = store.get(1);
  getPIN.onsuccess = () => {
    if (getPIN.result) {
      showScreen('pin-screen');
    } else {
      showScreen('set-pin-screen');
    }
  };
}

function verifyPIN() {
  const pin = document.getElementById('pin-input').value;
  if (!/^\d{4}$/.test(pin)) {
    alert('PIN must be a 4-digit number');
    return;
  }
  const tx = db.transaction(['pin'], 'readonly');
  const store = tx.objectStore('pin');
  const getPIN = store.get(1);
  getPIN.onsuccess = () => {
    if (getPIN.result && getPIN.result.value === pin) {
      showScreen('dashboard-screen');
      loadStreaks();
      showDefaultCalendar();
      showQuote();
      updateClock();
    } else {
      alert('Invalid PIN');
    }
    document.getElementById('pin-input').value = '';
  };
}

function setPIN() {
  const pin = document.getElementById('new-pin').value;
  if (!/^\d{4}$/.test(pin)) {
    alert('PIN must be a 4-digit number');
    return;
  }
  const tx = db.transaction(['pin'], 'readwrite');
  const store = tx.objectStore('pin');
  store.put({ id: 1, value: pin });
  tx.oncomplete = () => {
    alert('PIN set successfully');
    showScreen('pin-screen');
  };
  document.getElementById('new-pin').value = '';
}

function verifyOldPIN() {
  const oldPin = document.getElementById('old-pin').value;
  if (!/^\d{4}$/.test(oldPin)) {
    alert('PIN must be a 4-digit number');
    return;
  }
  const tx = db.transaction(['pin'], 'readonly');
  const store = tx.objectStore('pin');
  const getPIN = store.get(1);
  getPIN.onsuccess = () => {
    if (getPIN.result && getPIN.result.value === oldPin) {
      showScreen('new-pin-screen');
    } else {
      alert('Old PIN is incorrect');
      document.getElementById('old-pin').value = '';
    }
  };
}

function updatePIN() {
  const newPin = document.getElementById('new-edit-pin').value;
  if (!/^\d{4}$/.test(newPin)) {
    alert('PIN must be a 4-digit number');
    return;
  }
  const tx = db.transaction(['pin'], 'readwrite');
  const store = tx.objectStore('pin');
  store.put({ id: 1, value: newPin });
  tx.oncomplete = () => {
    alert('PIN updated successfully');
    showScreen('pin-screen');
  };
  document.getElementById('new-edit-pin').value = '';
}

/* ===== UI screen helper ===== */

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}
function showEditPIN() { showScreen('edit-pin-screen'); }

/* ===== Streak list & CRUD ===== */

function loadStreaks() {
  const select = document.getElementById('streak-select');
  select.innerHTML = '<option value="">Select Streak</option>';
  const tx = db.transaction(['streaks'], 'readonly');
  const store = tx.objectStore('streaks');
  store.openCursor().onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      const opt = document.createElement('option');
      opt.value = cursor.value.name;
      opt.textContent = cursor.value.name;
      select.appendChild(opt);
      cursor.continue();
    }
  };
}

function addNewStreak() {
  const name = prompt('Enter streak name:');
  if (!name) return;
  const tx = db.transaction(['streaks'], 'readwrite');
  const store = tx.objectStore('streaks');
  store.add({ name, data: {} });
  tx.oncomplete = () => {
    loadStreaks();
    document.getElementById('streak-select').value = name;
    loadStreak();
  };
}

function loadStreak() {
  const select = document.getElementById('streak-select');
  const streakName = select.value;
  const stats = document.getElementById('streak-stats');
  const quote = document.getElementById('quote');

  if (streakName) {
    stats.classList.remove('hidden');
    quote.classList.add('hidden');

    const tx = db.transaction(['streaks'], 'readonly');
    const store = tx.objectStore('streaks');
    const getStreak = store.get(streakName);
    getStreak.onsuccess = () => {
      const streakData = getStreak.result?.data || {};
      generateCalendar(streakData, streakName, true);
      calculateStats(streakData);
    };
  } else {
    stats.classList.add('hidden');
    resetBtn.classList.add('hidden');
    quote.classList.remove('hidden');
    showQuote();
    generateCalendar({}, null, false);
  }
}

/* ===== Calendar generation (DATE top, DAY under) ===== */

function generateCalendar(streakData = {}, streakName = null, interactive = false) {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    // Day name short (Mon, Tue, ...)
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const cell = document.createElement('div');
    cell.classList.add('day');
    cell.dataset.date = dateStr;

    // inner layout: date on top, day name below
    cell.innerHTML = `<div class="day-num">${day}</div><div class="day-label">${dayName}</div>`;

    // apply saved state if exists
    if (streakData && streakData[dateStr]) {
      cell.classList.add(streakData[dateStr]); // 'green' or 'red'
    }

    if (interactive && streakName) {
      cell.addEventListener('click', () => {
        showStreakPopup(dateStr, streakName, streakData[dateStr] || 'none');
      });
    }

    calendar.appendChild(cell);
  }
}

/* ===== Popup for marking a day ===== */

function showStreakPopup(dateStr, streakName, currentState) {
  // remove existing popup if any
  const existing = document.querySelector('.popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.className = 'popup';
  const content = document.createElement('div');
  content.className = 'popup-content';

  // Buttons logic:
  // - Mark Done (green), Mark Miss (red), Remove Mark (none), Cancel
  content.innerHTML = `<h3>${dateStr}</h3>`;

  const doneBtn = document.createElement('button');
  doneBtn.textContent = currentState === 'green' ? 'Mark Miss (Skip)' : 'Mark Done';
  doneBtn.onclick = () => {
    updateStreak(dateStr, streakName, currentState === 'green' ? 'red' : 'green');
    popup.remove();
  };

  const removeBtn = document.createElement('button');
  removeBtn.textContent = currentState === 'none' ? 'Mark Miss' : 'Remove Mark';
  removeBtn.onclick = () => {
    if (currentState === 'none') {
      updateStreak(dateStr, streakName, 'red');
    } else {
      updateStreak(dateStr, streakName, 'none');
    }
    popup.remove();
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => popup.remove();

  content.appendChild(doneBtn);
  content.appendChild(removeBtn);
  content.appendChild(cancelBtn);
  popup.appendChild(content);
  document.body.appendChild(popup);
}

/* ===== Update streak in IndexedDB ===== */

function updateStreak(dateStr, streakName, state) {
  const tx = db.transaction(['streaks'], 'readwrite');
  const store = tx.objectStore('streaks');
  const getReq = store.get(streakName);
  getReq.onsuccess = () => {
    const record = getReq.result || { name: streakName, data: {} };
    const data = record.data || {};
    if (state === 'none') {
      delete data[dateStr];
    } else {
      data[dateStr] = state; // 'green' or 'red'
    }
    record.data = data;
    store.put(record);
  };
  tx.oncomplete = () => {
    loadStreak(); // refresh UI after update
  };
  tx.onerror = (e) => console.error('updateStreak tx error', e);
}

/* ===== Stats calculation =====
   - currentStreak: number of consecutive green days ending at the most recent green day (or today if green)
   - longestStreak: maximum consecutive green run found in the data
*/
function calculateStats(streakData) {
  const dates = Object.keys(streakData).sort();
  if (dates.length === 0) {
    document.getElementById('current-streak').textContent = 0;
    document.getElementById('longest-streak').textContent = 0;
    return;
  }

  // Filter only green days
  const greenDates = dates
    .filter(d => streakData[d] === 'green')
    .map(d => new Date(d + 'T00:00:00'))
    .sort((a, b) => a - b);

  let longest = 0;
  let current = 0;
  let temp = 0;
  let prev = null;

  // Count consecutive green days for longest streak
  for (let dt of greenDates) {
    if (prev && (dt - prev) / (1000 * 60 * 60 * 24) === 1) {
      temp++;
    } else {
      temp = 1;
    }
    longest = Math.max(longest, temp);
    prev = dt;
  }

  // Now compute "current streak"
  // Walk backward from the most recent green day, not necessarily today
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const allDatesSet = new Set(greenDates.map(d => d.getTime()));
  let dayPtr = new Date(today);
  let currCount = 0;

  // if today is green, start from today; else start from the most recent green date
  let lastGreen = [...greenDates].pop();
  if (!lastGreen) {
    current = 0;
  } else {
    // Walk backward from lastGreen while consecutive days exist
    let ptr = new Date(lastGreen);
    while (allDatesSet.has(ptr.getTime())) {
      currCount++;
      ptr.setDate(ptr.getDate() - 1);
    }
    current = currCount;
  }

  document.getElementById('current-streak').textContent = current;
  document.getElementById('longest-streak').textContent = longest;
}


/* ===== Utilities ===== */

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}



/* ===== Default calendar (no streak selected) ===== */

function showDefaultCalendar() {
  generateCalendar({}, null, false);
}

/* ===== Clock & Quotes ===== */

function updateClock() {
  const clock = document.getElementById('clock');
  clock.textContent = new Date().toLocaleString();
  setTimeout(updateClock, 1000);
}

function showQuote() {
  const quote = document.getElementById('quote');
  quote.textContent = quotes[Math.floor(Math.random() * quotes.length)];
}


/* ===== On page load: show appropriate screen ===== */
window.addEventListener('load', () => {
  // Show either PIN or Set PIN screen is handled by checkPIN (after DB opens).
  // But if DB not ready (edge), fallback to set-pin-screen
  setTimeout(() => {
    if (!db) {
      showScreen('set-pin-screen');
    }
  }, 800);
});
