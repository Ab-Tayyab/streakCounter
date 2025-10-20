
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

        // Check if PIN is set
        function checkPIN() {
            const transaction = db.transaction(['pin'], 'readonly');
            const store = transaction.objectStore('pin');
            const getPIN = store.get(1);
            getPIN.onsuccess = () => {
                if (getPIN.result) {
                    showScreen('pin-screen');
                } else {
                    showScreen('set-pin-screen');
                }
            };
        }

        // Verify PIN
        function verifyPIN() {
            const pin = document.getElementById('pin-input').value;
            if (!/^\d{4}$/.test(pin)) {
                alert('PIN must be a 4-digit number');
                return;
            }
            const transaction = db.transaction(['pin'], 'readonly');
            const store = transaction.objectStore('pin');
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

        // Set PIN (first time only)
        function setPIN() {
            const pin = document.getElementById('new-pin').value;
            if (!/^\d{4}$/.test(pin)) {
                alert('PIN must be a 4-digit number');
                return;
            }
            const transaction = db.transaction(['pin'], 'readwrite');
            const store = transaction.objectStore('pin');
            store.put({ id: 1, value: pin });
            transaction.oncomplete = () => {
                alert('PIN set successfully');
                showScreen('pin-screen');
            };
            document.getElementById('new-pin').value = '';
        }

        // Verify old PIN for editing
        function verifyOldPIN() {
            const oldPin = document.getElementById('old-pin').value;
            if (!/^\d{4}$/.test(oldPin)) {
                alert('PIN must be a 4-digit number');
                return;
            }
            const transaction = db.transaction(['pin'], 'readonly');
            const store = transaction.objectStore('pin');
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

        // Update PIN
        function updatePIN() {
            const newPin = document.getElementById('new-edit-pin').value;
            if (!/^\d{4}$/.test(newPin)) {
                alert('PIN must be a 4-digit number');
                return;
            }
            const transaction = db.transaction(['pin'], 'readwrite');
            const store = transaction.objectStore('pin');
            store.put({ id: 1, value: newPin });
            transaction.oncomplete = () => {
                alert('PIN updated successfully');
                showScreen('pin-screen');
            };
            document.getElementById('new-edit-pin').value = '';
        }

        // Show screen
        function showScreen(screenId) {
            document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
            document.getElementById(screenId).classList.add('active');
        }

        // Show edit PIN screen
        function showEditPIN() { showScreen('edit-pin-screen'); }

        // Load streak names
        function loadStreaks() {
            const select = document.getElementById('streak-select');
            select.innerHTML = '<option value="">Select Streak</option>';
            const transaction = db.transaction(['streaks'], 'readonly');
            const store = transaction.objectStore('streaks');
            store.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const option = document.createElement('option');
                    option.value = cursor.value.name;
                    option.textContent = cursor.value.name;
                    select.appendChild(option);
                    cursor.continue();
                }
            };
        }

        // Add new streak
        function addNewStreak() {
            const name = prompt('Enter streak name:');
            if (name) {
                const transaction = db.transaction(['streaks'], 'readwrite');
                const store = transaction.objectStore('streaks');
                store.add({ name, data: {} });
                transaction.oncomplete = () => {
                    loadStreaks();
                    document.getElementById('streak-select').value = name;
                    loadStreak();
                };
            }
        }

        // Load selected streak
        function loadStreak() {
            const select = document.getElementById('streak-select');
            const streakName = select.value;
            const stats = document.getElementById('streak-stats');
            const resetBtn = document.getElementById('reset-btn');
            const quote = document.getElementById('quote');
            if (streakName) {
                stats.classList.remove('hidden');
                resetBtn.classList.remove('hidden');
                quote.classList.add('hidden');
                const transaction = db.transaction(['streaks'], 'readwrite');
                const store = transaction.objectStore('streaks');
                const getStreak = store.get(streakName);
                getStreak.onsuccess = () => {
                    const streakData = getStreak.result.data;
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

        // Generate calendar
        function generateCalendar(streakData, streakName, interactive) {
            const calendar = document.getElementById('calendar');
            calendar.innerHTML = '';
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDay = new Date(year, month, 1).getDay();

            // Weekdays
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
                const div = document.createElement('div');
                div.textContent = day;
                div.classList.add('day', 'header');
                calendar.appendChild(div);
            });

            // Empty days
            for (let i = 0; i < firstDay; i++) {
                calendar.appendChild(document.createElement('div'));
            }

            // Days
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const div = document.createElement('div');
                div.textContent = i;
                div.classList.add('day');
                div.dataset.date = dateStr;
                if (streakData[dateStr]) {
                    div.classList.add(streakData[dateStr]);
                }
                if (interactive) {
                    div.onclick = () => showStreakPopup(dateStr, streakName, streakData[dateStr] || 'none');
                }
                calendar.appendChild(div);
            }
        }

        // Show streak popup
        function showStreakPopup(date, streakName, currentState) {
            const popup = document.createElement('div');
            popup.className = 'popup';
            const content = document.createElement('div');
            content.className = 'popup-content';
            content.innerHTML = `<h3>Mark Streak for ${date}</h3>`;
            const addBtn = document.createElement('button');
            addBtn.textContent = currentState === 'green' ? 'Change to Skip' : 'Add Streak';
            addBtn.onclick = () => {
                updateStreak(date, streakName, currentState === 'green' ? 'red' : 'green');
                popup.remove();
            };
            const removeBtn = document.createElement('button');
            removeBtn.textContent = currentState !== 'none' ? 'Remove' : 'Skip';
            removeBtn.onclick = () => {
                if (currentState !== 'none') {
                    updateStreak(date, streakName, 'none');
                } else {
                    updateStreak(date, streakName, 'red');
                }
                popup.remove();
            };
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = () => popup.remove();
            content.appendChild(addBtn);
            content.appendChild(removeBtn);
            content.appendChild(cancelBtn);
            popup.appendChild(content);
            document.body.appendChild(popup);
        }

        // Update streak
        function updateStreak(date, streakName, state) {
            const transaction = db.transaction(['streaks'], 'readwrite');
            const store = transaction.objectStore('streaks');
            const getStreak = store.get(streakName);
            getStreak.onsuccess = () => {
                const streakData = getStreak.result.data;
                if (state === 'none') {
                    delete streakData[date];
                } else {
                    streakData[date] = state;
                }
                store.put(getStreak.result);
                transaction.oncomplete = () => {
                    loadStreak();
                };
            };
        }

        // Calculate stats
        function calculateStats(streakData) {
            let currentStreak = 0;
            let longestStreak = 0;
            let tempStreak = 0;
            const dates = Object.keys(streakData).sort();
            let prevDate = null;
            dates.forEach(date => {
                if (streakData[date] === 'green') {
                    if (prevDate && (new Date(date) - new Date(prevDate)) / (1000 * 60 * 60 * 24) === 1) {
                        tempStreak++;
                    } else {
                        tempStreak = 1;
                    }
                    currentStreak = tempStreak;
                    longestStreak = Math.max(longestStreak, currentStreak);
                    prevDate = date;
                } else {
                    tempStreak = 0;
                }
            });
            document.getElementById('current-streak').textContent = currentStreak;
            document.getElementById('longest-streak').textContent = longestStreak;
        }

        // Reset streak
        function resetStreak() {
            const select = document.getElementById('streak-select');
            const streakName = select.value;
            if (streakName && confirm(`Reset ${streakName}?`)) {
                const transaction = db.transaction(['streaks'], 'readwrite');
                const store = transaction.objectStore('streaks');
                const getStreak = store.get(streakName);
                getStreak.onsuccess = () => {
                    getStreak.result.data = {};
                    store.put(getStreak.result);
                    transaction.oncomplete = () => {
                        loadStreak();
                    };
                };
            }
        }

        // Show default calendar
        function showDefaultCalendar() {
            generateCalendar({}, null, false);
        }

        // Update clock
        function updateClock() {
            const clock = document.getElementById('clock');
            clock.textContent = new Date().toLocaleString();
            setTimeout(updateClock, 1000);
        }

        // Show random motivational quote
        function showQuote() {
            const quote = document.getElementById('quote');
            quote.textContent = quotes[Math.floor(Math.random() * quotes.length)];
        }

        // Initial load
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(reg => console.log('Service Worker registered'))
                .catch(err => console.error('Service Worker error:', err));
        }