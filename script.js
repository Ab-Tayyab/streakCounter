let db;
const dbName = "StreakDB";
const dbVersion = 1;
let clockInterval;

const quotes = [
    "Keep pushing forward, one day at a time!",
    "Every streak starts with a single step.",
    "Consistency is the key to success!",
    "Small actions daily lead to big results.",
    "Stay committed, your streak will shine!"
];

// DOM Elements
const DOM = {
    pinInput: document.getElementById('pin-input'),
    newPin: document.getElementById('new-pin'),
    oldPin: document.getElementById('old-pin'),
    newEditPin: document.getElementById('new-edit-pin'),
    streakSelect: document.getElementById('streak-select'),
    streakStats: document.getElementById('streak-stats'),
    quote: document.getElementById('quote'),
    clock: document.getElementById('clock'),
    calendar: document.getElementById('calendar')
};

// ====================== IndexedDB Initialization ======================
function initDB() {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = ({ target }) => {
        db = target.result;
        if (!db.objectStoreNames.contains('pin')) {
            db.createObjectStore('pin', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('streaks')) {
            db.createObjectStore('streaks', { keyPath: 'name' });
        }
    };

    request.onsuccess = ({ target }) => {
        db = target.result;
        console.log("IndexedDB initialized ✅");
        checkLoginState(); // Call only after DB ready
    };

    request.onerror = ({ target }) => {
        console.error('IndexedDB error:', target.errorCode);
        alert("Database initialization failed. Please reload the page.");
    };
}

// ====================== Login Handling ======================
function checkLoginState() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const tx = db.transaction(['pin'], 'readonly');
    const store = tx.objectStore('pin');

    store.get(1).onsuccess = ({ target }) => {
        const hasPin = !!target.result;
        if (isLoggedIn && hasPin) {
            showScreen('dashboard-screen');
            loadStreaks();
            showDefaultCalendar();
            showQuote();
            updateClock();
        } else if (hasPin) {
            showScreen('pin-screen');
        } else {
            showScreen('set-pin-screen');
        }
    };
}

function validatePIN(pin) {
    return /^\d{4}$/.test(pin?.trim());
}

function checkPIN() {
    const tx = db.transaction(['pin'], 'readonly');
    const store = tx.objectStore('pin');
    store.get(1).onsuccess = ({ target }) => {
        showScreen(target.result ? 'pin-screen' : 'set-pin-screen');
    };
}

function verifyPIN() {
    const pin = DOM.pinInput.value;
    if (!validatePIN(pin)) return alert('PIN must be a 4-digit number');

    const tx = db.transaction(['pin'], 'readonly');
    const store = tx.objectStore('pin');
    store.get(1).onsuccess = ({ target }) => {
        if (target.result?.value === pin) {
            localStorage.setItem('isLoggedIn', 'true');
            showScreen('dashboard-screen');
            loadStreaks();
            showDefaultCalendar();
            showQuote();
            updateClock();
        } else {
            alert('Invalid PIN');
        }
        DOM.pinInput.value = '';
    };
}

function setPIN() {
    const pin = DOM.newPin.value;
    if (!validatePIN(pin)) return alert('PIN must be a 4-digit number');

    const tx = db.transaction(['pin'], 'readwrite');
    const store = tx.objectStore('pin');
    store.put({ id: 1, value: pin });

    tx.oncomplete = () => {
        alert('PIN set successfully');
        showScreen('pin-screen');
        DOM.newPin.value = '';
    };
}

function verifyOldPIN() {
    const oldPin = DOM.oldPin.value;
    if (!validatePIN(oldPin)) return alert('PIN must be a 4-digit number');

    const tx = db.transaction(['pin'], 'readonly');
    const store = tx.objectStore('pin');
    store.get(1).onsuccess = ({ target }) => {
        if (target.result?.value === oldPin) {
            showScreen('new-pin-screen');
            DOM.oldPin.value = '';
        } else {
            alert('Old PIN is incorrect');
            DOM.oldPin.value = '';
        }
    };
}

function showEditPIN() {
    showScreen('edit-pin-screen');
}

function updatePIN() {
    const newPin = DOM.newEditPin.value;
    if (!validatePIN(newPin)) return alert('PIN must be a 4-digit number');

    const tx = db.transaction(['pin'], 'readwrite');
    const store = tx.objectStore('pin');
    store.put({ id: 1, value: newPin });

    tx.oncomplete = () => {
        alert('PIN updated successfully');
        showScreen('pin-screen');
        DOM.newEditPin.value = '';
    };
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    clearTimeout(clockInterval);
    showScreen('pin-screen');
    DOM.pinInput.value = '';
}

// ====================== Streak Management ======================
function loadStreaks() {
    DOM.streakSelect.innerHTML = '<option value="">Select Streak</option>';
    const tx = db.transaction(['streaks'], 'readonly');
    const store = tx.objectStore('streaks');

    store.openCursor().onsuccess = ({ target }) => {
        const cursor = target.result;
        if (cursor) {
            const opt = document.createElement('option');
            opt.value = cursor.value.name;
            opt.textContent = cursor.value.name;
            DOM.streakSelect.appendChild(opt);
            cursor.continue();
        }
    };
}

function addNewStreak() {
    const name = prompt('Enter streak name:')?.trim();
    if (!name) return;

    const tx = db.transaction(['streaks'], 'readwrite');
    const store = tx.objectStore('streaks');

    store.get(name).onsuccess = ({ target }) => {
        if (target.result) {
            alert('Streak with this name already exists!');
        } else {
            store.add({ name, data: {} });
            tx.oncomplete = () => {
                loadStreaks();
                DOM.streakSelect.value = name;
                loadStreak();
            };
        }
    };
}

function deleteCurrentStreak() {
    const streakName = DOM.streakSelect.value;
    if (!streakName) return alert('Please select a streak to delete');
    if (!confirm(`Are you sure you want to delete "${streakName}"?`)) return;

    const tx = db.transaction(['streaks'], 'readwrite');
    const store = tx.objectStore('streaks');
    store.delete(streakName);
    tx.oncomplete = () => {
        loadStreaks();
        showDefaultCalendar();
        DOM.streakStats.classList.add('hidden');
        DOM.quote.classList.remove('hidden');
        showQuote();
    };
}

// ====================== Load Streak ======================
function loadStreak() {
    const streakName = DOM.streakSelect.value;
    const dashboardButtons = document.getElementById('dashboard-buttons');

    if (streakName) {
        // Hide dashboard buttons when viewing a specific streak
        dashboardButtons.style.display = 'none';
        DOM.streakStats.classList.remove('hidden');
        DOM.quote.classList.add('hidden');

        const tx = db.transaction(['streaks'], 'readonly');
        const store = tx.objectStore('streaks');
        store.get(streakName).onsuccess = ({ target }) => {
            const streakData = target.result?.data || {};
            generateCalendar(streakData, streakName, true);
            calculateStats(streakData);
        };
    } else {
        // Show buttons only on the main dashboard
        dashboardButtons.style.display = 'flex';
        DOM.streakStats.classList.add('hidden');
        DOM.quote.classList.remove('hidden');
        showQuote();
        generateCalendar({}, null, false);
        document.getElementById('current-streak').textContent = 0;
        document.getElementById('longest-streak').textContent = 0;
    }
}

// ====================== Show Screen ======================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');

    const dashboardButtons = document.getElementById('dashboard-buttons');
    // Only show buttons on main dashboard (not pin or set pin screens)
    if (id === 'dashboard-screen' && !DOM.streakSelect.value) {
        dashboardButtons.style.display = 'flex';
    } else {
        dashboardButtons.style.display = 'none';
    }
}


// ====================== Calendar ======================
function generateCalendar(streakData = {}, streakName = null, interactive = false) {
    DOM.calendar.innerHTML = '';
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const fragment = document.createDocumentFragment();

    for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const cell = document.createElement('div');
        cell.classList.add('day');
        cell.dataset.date = dateStr;
        cell.innerHTML = `<div class="day-num">${day}</div><div class="day-label">${dayName}</div>`;

        if (streakData[dateStr]) {
            cell.classList.add(streakData[dateStr]);
        }

        if (interactive && streakName) {
            cell.addEventListener('click', () => showStreakPopup(dateStr, streakName, streakData[dateStr] || 'none'));
        }

        fragment.appendChild(cell);
    }
    DOM.calendar.appendChild(fragment);
}

// ====================== Streak Popup ======================
function showStreakPopup(dateStr, streakName, currentState) {
    document.querySelector('.popup')?.remove();
    const popup = document.createElement('div');
    popup.className = 'popup';
    const content = document.createElement('div');
    content.className = 'popup-content';
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
        updateStreak(dateStr, streakName, currentState === 'none' ? 'red' : 'none');
        popup.remove();
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => popup.remove();

    content.append(doneBtn, removeBtn, cancelBtn);
    popup.appendChild(content);
    document.body.appendChild(popup);
    popup.addEventListener('click', ({ target }) => {
        if (target === popup) popup.remove();
    });
}

// ====================== Update Streak ======================
function updateStreak(dateStr, streakName, state) {
    const tx = db.transaction(['streaks'], 'readwrite');
    const store = tx.objectStore('streaks');
    store.get(streakName).onsuccess = ({ target }) => {
        const record = target.result || { name: streakName, data: {} };
        const data = record.data;
        if (state === 'none') delete data[dateStr];
        else data[dateStr] = state;
        store.put(record);
        tx.oncomplete = () => loadStreak();
    };
}

// ====================== Stats ======================
function calculateStats(streakData) {
    const dates = Object.keys(streakData).sort();
    if (!dates.length) {
        document.getElementById('current-streak').textContent = 0;
        document.getElementById('longest-streak').textContent = 0;
        return;
    }

    const greenDates = dates
        .filter(d => streakData[d] === 'green')
        .map(d => new Date(d + 'T00:00:00'))
        .sort((a, b) => a - b);

    let longest = 0, temp = 0, prev = null;
    for (let dt of greenDates) {
        if (prev && (dt - prev) / (1000 * 60 * 60 * 24) === 1) temp++;
        else temp = 1;
        longest = Math.max(longest, temp);
        prev = dt;
    }

    let current = 0;
    const lastGreen = greenDates[greenDates.length - 1];
    if (lastGreen) {
        const allDatesSet = new Set(greenDates.map(d => d.getTime()));
        let ptr = new Date(lastGreen);
        while (allDatesSet.has(ptr.getTime())) {
            current++;
            ptr.setDate(ptr.getDate() - 1);
        }
    }

    document.getElementById('current-streak').textContent = current;
    document.getElementById('longest-streak').textContent = longest;
}

// ====================== Clock & Quote ======================
function updateClock() {
    DOM.clock.textContent = new Date().toLocaleString();
    clockInterval = setTimeout(updateClock, 1000);
}

function showQuote() {
    DOM.quote.textContent = quotes[Math.floor(Math.random() * quotes.length)];
}

function showDefaultCalendar() {
    generateCalendar({}, null, false);
}

// ====================== UI Helper ======================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// ====================== Initialize ======================
window.addEventListener('load', initDB);

// ====================== Import / Export Data (Excel Only) ======================

// -------- EXPORT TO EXCEL --------
function exportDataExcel() {
    const tx = db.transaction(['streaks'], 'readonly');
    const store = tx.objectStore('streaks');
    const allData = [];

    store.openCursor().onsuccess = ({ target }) => {
        const cursor = target.result;
        if (cursor) {
            allData.push({ name: cursor.key, data: cursor.value.data });
            cursor.continue();
        } else {
            if (!allData.length) return alert("No streaks found to export.");

            const sheetData = [["Streak Name", "Date", "Status"]];
            allData.forEach(streak => {
                const { name, data } = streak;
                Object.entries(data).forEach(([date, state]) => {
                    sheetData.push([name, date, state]);
                });
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(wb, ws, "Streaks");
            XLSX.writeFile(wb, "streak_data.xlsx");
        }
    };
}

// -------- IMPORT FROM EXCEL --------
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const fileExt = file.name.split(".").pop().toLowerCase();

    if (fileExt !== "xlsx") {
        alert("Please upload a valid .xlsx file.");
        return;
    }

    reader.onload = (e) => {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        const rows = sheet.slice(1); // skip header row

        if (!rows.length) return alert("No valid data found in Excel file.");

        const tx = db.transaction(['streaks'], 'readwrite');
        const store = tx.objectStore('streaks');
        const grouped = {};

        // Group by streak name
        rows.forEach(([name, date, status]) => {
            if (!name || !date || !status) return;
            if (!grouped[name]) grouped[name] = {};
            grouped[name][date] = status;
        });

        // Save to IndexedDB
        for (const [name, data] of Object.entries(grouped)) {
            store.get(name).onsuccess = ({ target }) => {
                const existing = target.result || { name, data: {} };
                existing.data = { ...existing.data, ...data };
                store.put(existing);
            };
        }

        tx.oncomplete = () => {
            alert("Excel data imported successfully!");
            loadStreaks();
            if (DOM.streakSelect.value) loadStreak();
            document.getElementById('importFile').value = "";
        };
    };

    reader.readAsBinaryString(file);
}

