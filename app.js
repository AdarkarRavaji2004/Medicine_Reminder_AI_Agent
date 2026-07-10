/**
 * Aegis AI Medicine Reminder Agent - Main Controller
 * Coordinates application state, view rendering, reminder scheduling,
 * notifications alerts, local storage syncing, and Gemini chatbot flows.
 */

// Application State
const state = {
    userName: "User",
    reminders: [],
    history: [], // Adherence log items
    currentTab: "dashboard",
    currentDate: new Date().toISOString().split('T')[0],
    calendarMonth: new Date().getMonth(), // 0-11
    calendarYear: new Date().getFullYear(),
    alertedTimes: {}, // To track which alarms triggered today: { "2026-07-10_reminderId_HH:MM": true }
    activeAlarmEvent: null, // Holds the active alarm event { reminder, time }
    attachedImage: null // Base64 image data for prescription scan
};

// Config Defaults
const config = {
    apiKey: "",
    voiceEnabled: true,
    chimeEnabled: true,
    selectedVoiceURI: ""
};

// DOM Elements Cache
let elements = {};

/**
 * Initialize application when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", async () => {
    cacheElements();
    loadStateFromStorage();
    initDateTime();
    initNavigation();
    initEventListeners();
    initVoices();
    renderAll();
    
    // Check if API key exists, otherwise alert user in chat/settings
    checkApiKeyStatus();

    // Start Alarm Scheduler Polling loop (runs every 10 seconds)
    setInterval(pollAlarms, 10000);
});

/**
 * Cache all required DOM references
 */
function cacheElements() {
    elements = {
        // Navigation
        navButtons: document.querySelectorAll(".nav-btn"),
        tabContents: document.querySelectorAll(".tab-content"),
        
        // Progress Widget
        sidebarProgressCircle: document.getElementById("sidebar-progress-circle"),
        sidebarPercentage: document.getElementById("sidebar-percentage"),
        sidebarTakenCount: document.getElementById("sidebar-taken-count"),
        sidebarTotalCount: document.getElementById("sidebar-total-count"),
        
        // Dashboard Tab
        dashboardDate: document.getElementById("dashboard-date"),
        headerUserName: document.getElementById("header-user-name"),
        nextPillBanner: document.getElementById("next-pill-banner"),
        nextPillTitle: document.getElementById("next-pill-title"),
        nextPillTime: document.getElementById("next-pill-time"),
        nextPillActionContainer: document.getElementById("next-pill-action-container"),
        btnTakeNext: document.getElementById("btn-take-next"),
        timelineList: document.getElementById("timeline-list"),
        timelineFilters: document.querySelectorAll(".btn-timeline-filter"),
        statsTaken: document.getElementById("stats-taken"),
        statsPending: document.getElementById("stats-pending"),
        statsMissed: document.getElementById("stats-missed"),
        motivationalText: document.getElementById("motivational-text"),
        alertStatusBadge: document.getElementById("alert-status-badge"),
        alertsList: document.getElementById("alerts-list"),
        
        // Medications Tab
        medicationsGrid: document.getElementById("medications-grid"),
        btnAddMedDashboard: document.getElementById("btn-add-med-dashboard"),
        btnAddMedPage: document.getElementById("btn-add-med-page"),
        
        // Calendar Tab
        calendarMonthYear: document.getElementById("calendar-month-year"),
        calendarDays: document.getElementById("calendar-days"),
        btnPrevMonth: document.getElementById("btn-prev-month"),
        btnNextMonth: document.getElementById("btn-next-month"),
        historyList: document.getElementById("history-list"),
        
        // AI Chat Tab
        chatMessages: document.getElementById("chat-messages"),
        chatInput: document.getElementById("chat-input"),
        btnSendMessage: document.getElementById("btn-send-message"),
        btnClearChat: document.getElementById("btn-clear-chat"),
        chatSuggestions: document.getElementById("chat-suggestions"),
        imagePreviewContainer: document.getElementById("image-preview-container"),
        attachedImage: document.getElementById("attached-image"),
        previewFilename: document.getElementById("preview-filename"),
        btnRemoveImage: document.getElementById("btn-remove-image"),
        prescriptionUploadInput: document.getElementById("prescription-upload-input"),
        
        // Settings Tab
        inputApiKey: document.getElementById("input-api-key"),
        btnToggleKeyVisibility: document.getElementById("btn-toggle-key-visibility"),
        btnSaveKey: document.getElementById("btn-save-key"),
        btnClearKey: document.getElementById("btn-clear-key"),
        settingsUserName: document.getElementById("settings-user-name"),
        btnSaveProfile: document.getElementById("btn-save-profile"),
        settingsToggleVoice: document.getElementById("settings-toggle-voice"),
        settingsVoiceSelect: document.getElementById("settings-voice-select"),
        settingsToggleChime: document.getElementById("settings-toggle-chime"),
        btnTestAlert: document.getElementById("btn-test-alert"),
        btnLoadDemoData: document.getElementById("btn-load-demo-data"),
        btnResetApp: document.getElementById("btn-reset-app"),
        
        // Medication Modal
        modalMedication: document.getElementById("modal-medication"),
        formMedication: document.getElementById("form-medication"),
        modalTitle: document.getElementById("modal-title"),
        inputMedId: document.getElementById("input-med-id"),
        inputMedName: document.getElementById("input-med-name"),
        inputMedDosage: document.getElementById("input-med-dosage"),
        inputMedFrequency: document.getElementById("input-med-frequency"),
        inputMedTimes: document.getElementById("input-med-times"),
        inputMedStart: document.getElementById("input-med-start"),
        inputMedEnd: document.getElementById("input-med-end"),
        inputMedInstructions: document.getElementById("input-med-instructions"),
        btnCloseModal: document.getElementById("btn-close-modal"),
        btnCancelModal: document.getElementById("btn-cancel-modal"),
        
        // Alarm Modal
        modalAlarm: document.getElementById("modal-alarm"),
        alarmMedName: document.getElementById("alarm-med-name"),
        alarmMedDosage: document.getElementById("alarm-med-dosage"),
        alarmMedInstructions: document.getElementById("alarm-med-instructions"),
        alarmTimeDisplay: document.getElementById("alarm-time-display"),
        btnAlarmTake: document.getElementById("btn-alarm-take"),
        btnAlarmSnooze: document.getElementById("btn-alarm-snooze"),
        btnAlarmSkip: document.getElementById("btn-alarm-skip")
    };
}

/**
 * Load settings and data arrays from LocalStorage
 */
function loadStateFromStorage() {
    // Load reminders
    const savedReminders = localStorage.getItem("aegis_reminders");
    state.reminders = savedReminders ? JSON.parse(savedReminders) : [];

    // Load adherence history logs
    const savedHistory = localStorage.getItem("aegis_history");
    state.history = savedHistory ? JSON.parse(savedHistory) : [];

    // Load configs
    config.apiKey = localStorage.getItem("aegis_gemini_api_key") || "";
    config.voiceEnabled = localStorage.getItem("aegis_voice_enabled") !== "false";
    config.chimeEnabled = localStorage.getItem("aegis_chime_enabled") !== "false";
    config.selectedVoiceURI = localStorage.getItem("aegis_selected_voice_uri") || "";
    
    state.userName = localStorage.getItem("aegis_user_name") || "User";

    // Load alerted times to prevent double alarm notifications after refreshes
    const savedAlerts = localStorage.getItem("aegis_alerted_times");
    state.alertedTimes = savedAlerts ? JSON.parse(savedAlerts) : {};

    // Sync settings views with loaded config values
    elements.inputApiKey.value = config.apiKey;
    elements.settingsUserName.value = state.userName;
    elements.settingsToggleVoice.checked = config.voiceEnabled;
    elements.settingsToggleChime.checked = config.chimeEnabled;
}

/**
 * Save Reminders & History state to LocalStorage
 */
function saveStateToStorage() {
    localStorage.setItem("aegis_reminders", JSON.stringify(state.reminders));
    localStorage.setItem("aegis_history", JSON.stringify(state.history));
    localStorage.setItem("aegis_alerted_times", JSON.stringify(state.alertedTimes));
    localStorage.setItem("aegis_user_name", state.userName);
}

/**
 * Initialize current date strings in headers
 */
function initDateTime() {
    const today = new Date();
    state.currentDate = today.toISOString().split('T')[0];
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elements.dashboardDate.innerText = today.toLocaleDateString('en-US', options);
}

/**
 * Initialize Speech Synthesis voices dropdown list
 */
async function initVoices() {
    const voices = await AudioService.getVoices();
    elements.settingsVoiceSelect.innerHTML = "";
    
    voices.forEach(voice => {
        const option = document.createElement("option");
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (voice.voiceURI === config.selectedVoiceURI) {
            option.selected = true;
        }
        elements.settingsVoiceSelect.appendChild(option);
    });
}

/**
 * Check if the Gemini API Key is missing and alerts the user
 */
function checkApiKeyStatus() {
    if (!config.apiKey || config.apiKey.length < 10) {
        addChatMessage("system", `⚠️ **API Key Missing**: To enable the AI scheduling companion, prescription scanner, and safety alerts, please navigate to the **Settings** tab and configure your Google Gemini API Key. It takes 1 minute to get a free key from Google AI Studio!`);
    } else {
        // Run safety analysis check in the background
        runBackgroundInteractionsCheck();
    }
}

/**
 * Setup Tab Navigation handling
 */
function initNavigation() {
    elements.navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            
            // Update active buttons
            elements.navButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            // Switch tab content views
            elements.tabContents.forEach(tc => {
                tc.classList.remove("active");
                if (tc.id === `tab-${targetTab}`) {
                    tc.classList.add("active");
                }
            });

            state.currentTab = targetTab;
            
            // Context specific renders
            if (targetTab === "dashboard") {
                renderDashboard();
            } else if (targetTab === "medications") {
                renderMedications();
            } else if (targetTab === "calendar") {
                renderCalendar();
            }
        });
    });
}

/**
 * Initialize click listeners for buttons, modals, and uploaders
 */
function initEventListeners() {
    // Add Medicine Modals
    const openAddMed = () => {
        openMedicationModal();
    };
    elements.btnAddMedDashboard.addEventListener("click", openAddMed);
    elements.btnAddMedPage.addEventListener("click", openAddMed);
    elements.btnCloseModal.addEventListener("click", closeMedicationModal);
    elements.btnCancelModal.addEventListener("click", closeMedicationModal);
    elements.formMedication.addEventListener("submit", handleSaveMedication);
    
    // Toggle manual frequency fields
    elements.inputMedFrequency.addEventListener("change", (e) => {
        const val = e.target.value;
        const customTimesDiv = document.getElementById("group-custom-times");
        
        // Auto fill defaults or toggle instruction labels
        if (val === "daily") {
            elements.inputMedTimes.value = "09:00";
        } else if (val === "twice_daily") {
            elements.inputMedTimes.value = "09:00, 21:00";
        } else if (val === "thrice_daily") {
            elements.inputMedTimes.value = "09:00, 14:00, 21:00";
        } else if (val === "weekly") {
            elements.inputMedTimes.value = "09:00";
        }
    });

    // Calendar navigation
    elements.btnPrevMonth.addEventListener("click", () => shiftCalendarMonth(-1));
    elements.btnNextMonth.addEventListener("click", () => shiftCalendarMonth(1));

    // Settings Configuration actions
    elements.btnToggleKeyVisibility.addEventListener("click", toggleApiKeyVisibility);
    elements.btnSaveKey.addEventListener("click", saveApiKey);
    elements.btnClearKey.addEventListener("click", clearApiKey);
    elements.btnSaveProfile.addEventListener("click", saveProfileInfo);
    elements.btnTestAlert.addEventListener("click", triggerDemoAlert);
    elements.btnLoadDemoData.addEventListener("click", loadDemoAdherenceData);
    elements.btnResetApp.addEventListener("click", resetAppConfirmation);
    
    elements.settingsToggleVoice.addEventListener("change", (e) => {
        config.voiceEnabled = e.target.checked;
        localStorage.setItem("aegis_voice_enabled", config.voiceEnabled);
    });
    
    elements.settingsToggleChime.addEventListener("change", (e) => {
        config.chimeEnabled = e.target.checked;
        localStorage.setItem("aegis_chime_enabled", config.chimeEnabled);
    });
    
    elements.settingsVoiceSelect.addEventListener("change", (e) => {
        config.selectedVoiceURI = e.target.value;
        localStorage.setItem("aegis_selected_voice_uri", config.selectedVoiceURI);
    });

    // AI Chat Messaging actions
    elements.btnSendMessage.addEventListener("click", sendUserChatMessage);
    elements.chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendUserChatMessage();
        }
    });
    elements.chatInput.addEventListener("input", () => {
        const text = elements.chatInput.value.trim();
        elements.btnSendMessage.disabled = !text && !state.attachedImage;
    });

    elements.btnClearChat.addEventListener("click", () => {
        elements.chatMessages.innerHTML = "";
        addChatMessage("system", `Chat history cleared. I'm ready to manage your medications!`);
    });

    // Chat suggestions clicks
    document.querySelectorAll(".suggestion-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            elements.chatInput.value = chip.getAttribute("data-text");
            elements.chatInput.focus();
            elements.btnSendMessage.disabled = false;
        });
    });

    // Prescription OCR upload actions
    elements.prescriptionUploadInput.addEventListener("change", handlePrescriptionUpload);
    elements.btnRemoveImage.addEventListener("click", clearAttachedImage);

    // Alarm Modal actions
    elements.btnAlarmTake.addEventListener("click", () => executeAlarmAction("taken"));
    elements.btnAlarmSnooze.addEventListener("click", () => executeAlarmAction("snoozed"));
    elements.btnAlarmSkip.addEventListener("click", () => executeAlarmAction("skipped"));

    // Next Pill Banner mark-taken shortcut
    elements.btnTakeNext.addEventListener("click", handleTakeNextShortcut);

    // Timeline Filter triggers
    elements.timelineFilters.forEach(btn => {
        btn.addEventListener("click", () => {
            elements.timelineFilters.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderDashboard();
        });
    });
}

/**
 * Toggles Gemini Key visibility inside settings input field
 */
function toggleApiKeyVisibility() {
    const isPass = elements.inputApiKey.type === "password";
    elements.inputApiKey.type = isPass ? "text" : "password";
    elements.btnToggleKeyVisibility.querySelector(".icon-show").style.display = isPass ? "none" : "block";
    elements.btnToggleKeyVisibility.querySelector(".icon-hide").style.display = isPass ? "block" : "none";
}

/**
 * Saves the Gemini API key from input to system settings
 */
function saveApiKey() {
    const key = elements.inputApiKey.value.trim();
    if (!key) {
        alert("Please enter a valid key first.");
        return;
    }
    
    config.apiKey = key;
    AIService.saveApiKey(key);
    alert("Gemini AI API Key saved successfully!");
    
    // Background interaction review
    runBackgroundInteractionsCheck();
}

/**
 * Clears the API Key
 */
function clearApiKey() {
    config.apiKey = "";
    elements.inputApiKey.value = "";
    AIService.clearApiKey();
    alert("Gemini AI API Key cleared from local storage.");
    renderAll();
}

/**
 * Updates profile username
 */
function saveProfileInfo() {
    const name = elements.settingsUserName.value.trim();
    if (name) {
        state.userName = name;
        localStorage.setItem("aegis_user_name", name);
        elements.headerUserName.innerText = name;
        alert("Profile name updated!");
        renderDashboard();
    }
}

/**
 * General trigger to rebuild layouts
 */
function renderAll() {
    elements.headerUserName.innerText = state.userName;
    renderDashboard();
    renderMedications();
    renderCalendar();
}

/**
 * Calculate timeline events list for a given date
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Array} List of timeline events sorted chronologically
 */
function getEventsForDate(dateStr) {
    const targetDate = new Date(dateStr);
    const dayOfWeek = targetDate.getDay(); // 0 (Sun) - 6 (Sat)
    const events = [];

    state.reminders.forEach(med => {
        // Validate dates boundaries
        if (med.startDate > dateStr) return;
        if (med.endDate && med.endDate < dateStr) return;

        // Validate frequency recurrence rules
        if (med.frequency === "weekly") {
            const startDay = new Date(med.startDate).getDay();
            if (startDay !== dayOfWeek) return;
        }

        // Add events for scheduled times
        med.times.forEach(time => {
            // Find existing log state
            const log = state.history.find(h => 
                h.reminderId === med.id && 
                h.date === dateStr && 
                h.scheduledTime === time
            );

            events.push({
                reminder: med,
                time: time,
                date: dateStr,
                status: log ? log.status : "pending",
                takenTime: log ? log.takenTime : null,
                logId: log ? log.id : null
            });
        });
    });

    // Sort chronologically
    return events.sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Renders the dashboard panels: timeline list, statistics, next pill banner
 */
function renderDashboard() {
    // 1. Get Filters
    let activeFilter = "all";
    elements.timelineFilters.forEach(btn => {
        if (btn.classList.contains("active")) {
            activeFilter = btn.getAttribute("data-filter");
        }
    });

    // 2. Fetch today's events
    const todayEvents = getEventsForDate(state.currentDate);

    // 3. Render Timeline List
    elements.timelineList.innerHTML = "";
    let filteredEvents = todayEvents;
    
    if (activeFilter === "taken") {
        filteredEvents = todayEvents.filter(e => e.status === "taken");
    } else if (activeFilter === "pending") {
        filteredEvents = todayEvents.filter(e => e.status === "pending" || e.status === "snoozed");
    }

    if (filteredEvents.length === 0) {
        elements.timelineList.innerHTML = `
            <div class="no-alerts-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="opacity: 0.4;">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <p>No medications matching this filter today.</p>
            </div>
        `;
    } else {
        filteredEvents.forEach(evt => {
            const item = document.createElement("div");
            item.className = `timeline-item ${evt.status}`;
            
            // Format time display (12-hour clock format)
            const [hours, minutes] = evt.time.split(':');
            const hrsNum = parseInt(hours);
            const period = hrsNum >= 12 ? 'PM' : 'AM';
            const formattedHrs = hrsNum % 12 === 0 ? 12 : hrsNum % 12;
            const timeDisplay = `${formattedHrs}:${minutes}<span class="period">${period}</span>`;

            // Action button check
            const checkButtonHtml = evt.status === "taken" 
                ? `<button class="btn-circle-check" onclick="toggleTakeEvent('${evt.reminder.id}', '${evt.time}', false)" title="Mark Pending">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                   </button>`
                : `<button class="btn-circle-check" onclick="toggleTakeEvent('${evt.reminder.id}', '${evt.time}', true)" title="Mark Taken">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                   </button>`;

            item.innerHTML = `
                <div class="timeline-time">${timeDisplay}</div>
                <div class="timeline-bar"></div>
                <div class="timeline-item-info">
                    <h4>${escapeHtml(evt.reminder.name)} <span style="font-size:0.85rem; font-weight:400; color:var(--text-muted);">(${escapeHtml(evt.reminder.dosage)})</span></h4>
                    <p>${escapeHtml(evt.reminder.instructions || 'No guidelines')}</p>
                    <span class="timeline-item-label label-${evt.status}">${evt.status}</span>
                </div>
                <div class="timeline-actions">
                    ${checkButtonHtml}
                </div>
            `;
            elements.timelineList.appendChild(item);
        });
    }

    // 4. Update Adherence Stats
    const totalPills = todayEvents.length;
    const takenPills = todayEvents.filter(e => e.status === "taken").length;
    const missedPills = todayEvents.filter(e => e.status === "missed").length;
    const pendingPills = totalPills - takenPills - missedPills;

    elements.statsTaken.innerText = takenPills;
    elements.statsPending.innerText = pendingPills;
    elements.statsMissed.innerText = missedPills;

    // Adherence Percentage Ring Widget
    const adherenceRate = totalPills > 0 ? Math.round((takenPills / totalPills) * 100) : 0;
    
    // Sidebar widget values
    elements.sidebarPercentage.innerText = adherenceRate;
    elements.sidebarTakenCount.innerText = takenPills;
    elements.sidebarTotalCount.innerText = totalPills;

    // Animate circular SVG ring. Circular perimeter is 2 * PI * r = 2 * 3.14159 * 32 = 201
    const offset = 201 - (adherenceRate / 100) * 201;
    elements.sidebarProgressCircle.style.strokeDashoffset = offset;

    // Motivational quote selector
    if (totalPills === 0) {
        elements.motivationalText.innerText = "No medicines scheduled for today. Keep up the healthy lifestyle!";
    } else if (adherenceRate === 100) {
        elements.motivationalText.innerText = "🎉 Fantastic! 100% adherence today. Keep it up!";
    } else if (adherenceRate > 50) {
        elements.motivationalText.innerText = "Good job! You're on track with your health schedule today.";
    } else if (takenPills > 0) {
        elements.motivationalText.innerText = "Nice start! Take your remaining medications on schedule.";
    } else {
        elements.motivationalText.innerText = "You have medications pending. Take them to log your progress!";
    }

    // 5. Update Next Pill Banner
    updateNextPillBanner(todayEvents);
}

/**
 * Finds and updates the Next Pill display box
 * @param {Array} todayEvents - Daily events sorted chronologically
 */
function updateNextPillBanner(todayEvents) {
    const nowTime = new Date().toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"
    
    // Find next pending or snoozed pill
    const nextEvent = todayEvents.find(e => 
        e.status !== "taken" && e.status !== "skipped" && e.time >= nowTime
    ) || todayEvents.find(e => e.status !== "taken" && e.status !== "skipped"); // fallback to earliest if all today passed but not taken

    if (nextEvent) {
        elements.nextPillBanner.style.background = "linear-gradient(135deg, rgba(0, 242, 254, 0.08) 0%, rgba(79, 172, 254, 0.08) 100%)";
        elements.nextPillTitle.innerText = `${nextEvent.reminder.name} (${nextEvent.reminder.dosage})`;
        
        // format 12 hour
        const [h, m] = nextEvent.time.split(':');
        const period = parseInt(h) >= 12 ? 'PM' : 'AM';
        const formattedHour = parseInt(h) % 12 === 0 ? 12 : parseInt(h) % 12;
        
        elements.nextPillTime.innerText = `Scheduled for today at ${formattedHour}:${m} ${period} — ${nextEvent.reminder.instructions || 'No special directions'}`;
        elements.nextPillActionContainer.style.display = "block";

        // Store references on the take shortcut button
        elements.btnTakeNext.onclick = () => {
            toggleTakeEvent(nextEvent.reminder.id, nextEvent.time, true);
        };
    } else {
        elements.nextPillBanner.style.background = "rgba(255, 255, 255, 0.02)";
        elements.nextPillTitle.innerText = "No pending medications";
        elements.nextPillTime.innerText = todayEvents.length > 0 
            ? "You have completed all schedules for today! Great job."
            : "No medications are configured for today's schedule.";
        elements.nextPillActionContainer.style.display = "none";
    }
}

/**
 * Handle shortcut taken action from dashboard banner
 */
function handleTakeNextShortcut() {
    // Handled dynamically via click binder inside updateNextPillBanner
}

/**
 * Toggle a medication status as taken or pending
 * @param {string} reminderId 
 * @param {string} timeStr 
 * @param {boolean} isTaken 
 */
function toggleTakeEvent(reminderId, timeStr, isTaken) {
    const dateStr = state.currentDate;
    
    // Find index of existing log
    const index = state.history.findIndex(h => 
        h.reminderId === reminderId && 
        h.date === dateStr && 
        h.scheduledTime === timeStr
    );

    if (isTaken) {
        if (index > -1) {
            state.history[index].status = "taken";
            state.history[index].takenTime = new Date().toISOString();
        } else {
            const med = state.reminders.find(m => m.id === reminderId);
            state.history.push({
                id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
                reminderId: reminderId,
                medName: med ? med.name : "Medication",
                dosage: med ? med.dosage : "",
                scheduledTime: timeStr,
                date: dateStr,
                status: "taken",
                takenTime: new Date().toISOString()
            });
        }
        
        // Adherence splash check - If today's adherence reaches 100%, pop confetti!
        const todayEvents = getEventsForDate(state.currentDate);
        const total = todayEvents.length;
        const taken = todayEvents.filter(e => e.status === "taken" || (e.reminder.id === reminderId && e.time === timeStr)).length;
        if (total > 0 && taken === total) {
            triggerConfettiSplash();
        }
    } else {
        // Toggle back to pending (delete history entry)
        if (index > -1) {
            state.history.splice(index, 1);
        }
    }

    saveStateToStorage();
    renderDashboard();
    renderCalendar();
}
// Exporting toggleTakeEvent so onclick triggers from HTML work correctly
window.toggleTakeEvent = toggleTakeEvent;

/**
 * Pops canvas confetti particles when adherence score hits 100%
 */
function triggerConfettiSplash() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00f2fe', '#4facfe', '#10b981', '#ffffff']
        });
    }
}

/**
 * Render list of configured medications
 */
function renderMedications() {
    elements.medicationsGrid.innerHTML = "";
    
    if (state.reminders.length === 0) {
        elements.medicationsGrid.innerHTML = `
            <div class="glass-panel" style="grid-column: span 3; text-align: center; color: var(--text-inactive); padding: 50px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="64" height="64" style="margin-bottom:15px; color: var(--text-inactive)">
                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44l-2-10A2.5 2.5 0 0 1 7.08 6H9.5z"/>
                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44l2-10A2.5 2.5 0 0 0 16.92 6H14.5z"/>
                </svg>
                <h3>No active prescriptions scheduled yet</h3>
                <p style="font-size:0.88rem; margin-top:5px; max-width:400px; margin: 5px auto 20px;">Use the AI Care Companion Chat or click "Add Medicine" to configure your medical schedule.</p>
                <button class="btn btn-primary" onclick="openMedicationModal()">Configure Manually</button>
            </div>
        `;
        return;
    }

    state.reminders.forEach(med => {
        const card = document.createElement("div");
        card.className = "medication-card";

        // Display labels for frequencies
        let freqLabel = med.frequency.replace('_', ' ');
        freqLabel = freqLabel.charAt(0).toUpperCase() + freqLabel.slice(1);

        card.innerHTML = `
            <div class="med-card-header">
                <div class="med-card-title">
                    <h3>${escapeHtml(med.name)}</h3>
                    <span>${escapeHtml(med.dosage)}</span>
                </div>
                <span class="badge badge-pulse">${freqLabel}</span>
            </div>
            <div class="med-card-meta">
                <div class="med-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>Times: <strong>${med.times.join(', ')}</strong></span>
                </div>
                <div class="med-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>Period: <strong>${med.startDate}</strong> to <strong>${med.endDate || 'Ongoing'}</strong></span>
                </div>
                <div class="med-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span>Guidelines: <strong>${escapeHtml(med.instructions || 'None')}</strong></span>
                </div>
            </div>
            <div class="med-card-actions">
                <button class="btn btn-outline" onclick="openMedicationModal('${med.id}')">Edit</button>
                <button class="btn btn-danger-outline" onclick="deleteMedication('${med.id}')">Delete</button>
            </div>
        `;
        elements.medicationsGrid.appendChild(card);
    });
}
window.openMedicationModal = openMedicationModal;
window.deleteMedication = deleteMedication;

/**
 * Opens modal dialog to add or edit manual medication entry
 * @param {string} editId - Optional reminder ID to edit
 */
function openMedicationModal(editId = null) {
    elements.formMedication.reset();
    
    // Default dates
    elements.inputMedStart.value = new Date().toISOString().split('T')[0];
    elements.inputMedEnd.value = "";
    
    if (editId) {
        // Edit Mode
        const med = state.reminders.find(m => m.id === editId);
        if (med) {
            elements.modalTitle.innerText = "Edit Medication";
            elements.inputMedId.value = med.id;
            elements.inputMedName.value = med.name;
            elements.inputMedDosage.value = med.dosage;
            elements.inputMedFrequency.value = med.frequency;
            elements.inputMedTimes.value = med.times.join(', ');
            elements.inputMedStart.value = med.startDate;
            elements.inputMedEnd.value = med.endDate || "";
            elements.inputMedInstructions.value = med.instructions || "";
        }
    } else {
        // Create Mode
        elements.modalTitle.innerText = "Add Medication";
        elements.inputMedId.value = "";
        elements.inputMedTimes.value = "09:00";
    }

    elements.modalMedication.classList.add("active");
}

/**
 * Closes manual add/edit modal
 */
function closeMedicationModal() {
    elements.modalMedication.classList.remove("active");
}

/**
 * Deletes a reminder from memory database
 * @param {string} id 
 */
function deleteMedication(id) {
    if (confirm("Are you sure you want to delete this medication schedule? It will remove all pending reminders for this item.")) {
        state.reminders = state.reminders.filter(m => m.id !== id);
        // Clean history logs associated with it as well if needed? Usually we keep history but clean pending ones
        
        saveStateToStorage();
        renderAll();
        
        // Re-analyze drug safety interactions in the background
        runBackgroundInteractionsCheck();
    }
}

/**
 * Form submit callback for saving medication details
 */
function handleSaveMedication(e) {
    e.preventDefault();

    const id = elements.inputMedId.value;
    const name = elements.inputMedName.value.trim();
    const dosage = elements.inputMedDosage.value.trim();
    const frequency = elements.inputMedFrequency.value;
    
    // Parse times (strip whitespaces, ensure HH:MM format)
    const timesRaw = elements.inputMedTimes.value.split(',');
    const times = timesRaw.map(t => {
        const cleaned = t.trim();
        // Basic HH:MM validator check, pad with zero if needed
        if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
            const parts = cleaned.split(':');
            return `${parts[0].padStart(2, '0')}:${parts[1]}`;
        }
        return "09:00";
    });

    const startDate = elements.inputMedStart.value;
    const endDate = elements.inputMedEnd.value || null;
    const instructions = elements.inputMedInstructions.value.trim();

    if (id) {
        // Update medication
        const index = state.reminders.findIndex(m => m.id === id);
        if (index > -1) {
            state.reminders[index] = {
                ...state.reminders[index],
                name, dosage, frequency, times, startDate, endDate, instructions
            };
        }
    } else {
        // Create new medication
        const newMed = {
            id: "med_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            name, dosage, frequency, times, startDate, endDate, instructions
        };
        state.reminders.push(newMed);
    }

    saveStateToStorage();
    closeMedicationModal();
    renderAll();

    // Trigger drug interactions checking background agent
    runBackgroundInteractionsCheck();
}

/**
 * Triggers background call to evaluate active medication conflicts
 */
async function runBackgroundInteractionsCheck() {
    if (state.reminders.length < 2) {
        elements.alertStatusBadge.innerText = "Verified";
        elements.alertsList.innerHTML = `
            <div class="no-alerts-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <p>No drug interactions checks needed. Schedule at least two medications to evaluate compatibility.</p>
            </div>
        `;
        return;
    }

    if (!AIService.hasApiKey()) {
        elements.alertStatusBadge.innerText = "Setup Required";
        elements.alertsList.innerHTML = `
            <div class="alert-item alert-warning" style="cursor: pointer;" onclick="document.querySelector('[data-tab=settings]').click()">
                <div class="alert-item-icon">⚠️</div>
                <div class="alert-item-content">
                    <h5>API Key Needed for Safety Check</h5>
                    <p>Enter your Gemini API key inside Settings to enable automatic drug-to-drug safety interactions check.</p>
                </div>
            </div>
        `;
        return;
    }

    elements.alertStatusBadge.innerText = "Analyzing...";

    try {
        const conflicts = await AIService.checkInteractions(state.reminders);
        
        elements.alertStatusBadge.innerText = conflicts.length > 0 ? `${conflicts.length} Warning(s)` : "Verified Safe";
        elements.alertStatusBadge.className = conflicts.length > 0 ? "badge badge-pulse danger" : "badge badge-pulse success";

        if (conflicts.length === 0) {
            elements.alertsList.innerHTML = `
                <div class="no-alerts-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36" style="color:var(--success)">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <p style="color:var(--success)">Verified Safe: Gemini evaluated active list and found no warnings!</p>
                </div>
            `;
        } else {
            elements.alertsList.innerHTML = "";
            conflicts.forEach(alert => {
                const isHigh = alert.severity.toLowerCase() === "high";
                const item = document.createElement("div");
                item.className = `alert-item ${isHigh ? 'alert-danger' : 'alert-warning'}`;
                
                item.innerHTML = `
                    <div class="alert-item-icon">${isHigh ? '🛑' : '⚠️'}</div>
                    <div class="alert-item-content">
                        <h5>${isHigh ? 'High Risk Interaction' : 'Moderate Safety Warning'}</h5>
                        <p><strong>Meds:</strong> ${alert.medicines.join(' + ')}</p>
                        <p>${escapeHtml(alert.description)}</p>
                    </div>
                `;
                elements.alertsList.appendChild(item);
            });

            // Audio Alert if high risk interaction is detected
            if (conflicts.some(c => c.severity.toLowerCase() === 'high')) {
                AudioService.playWarningSound();
            }
        }
    } catch (e) {
        console.error(e);
        elements.alertStatusBadge.innerText = "Error";
    }
}

/**
 * Navigates calendar month forward/backward
 * @param {number} direction -1 or 1 
 */
function shiftCalendarMonth(direction) {
    state.calendarMonth += direction;
    if (state.calendarMonth < 0) {
        state.calendarMonth = 11;
        state.calendarYear--;
    } else if (state.calendarMonth > 11) {
        state.calendarMonth = 0;
        state.calendarYear++;
    }
    renderCalendar();
}

/**
 * Render calendar adherence logs
 */
function renderCalendar() {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    elements.calendarMonthYear.innerText = `${monthNames[state.calendarMonth]} ${state.calendarYear}`;

    elements.calendarDays.innerHTML = "";

    const firstDayIndex = new Date(state.calendarYear, state.calendarMonth, 1).getDay(); // 0-6
    const totalDays = new Date(state.calendarYear, state.calendarMonth + 1, 0).getDate(); // 28-31
    const prevMonthTotalDays = new Date(state.calendarYear, state.calendarMonth, 0).getDate();

    const today = new Date();
    const todayDateStr = today.toISOString().split('T')[0];

    // Render cells of previous month padding
    for (let i = firstDayIndex; i > 0; i--) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell other-month";
        cell.innerText = prevMonthTotalDays - i + 1;
        elements.calendarDays.appendChild(cell);
    }

    // Render active days cells
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        cell.innerText = day;

        const cellDate = new Date(state.calendarYear, state.calendarMonth, day);
        const cellDateStr = cellDate.toISOString().split('T')[0];

        if (cellDateStr === todayDateStr) {
            cell.classList.add("today");
        }

        // Evaluate adherence statistics for this day cell
        const dayEvents = getEventsForDate(cellDateStr);
        if (dayEvents.length > 0) {
            const taken = dayEvents.filter(e => e.status === "taken").length;
            const missed = dayEvents.filter(e => e.status === "missed").length;
            const pending = dayEvents.length - taken - missed;

            // Apply color coding
            if (taken === dayEvents.length) {
                cell.classList.add("perf-perfect");
            } else if (taken > 0) {
                cell.classList.add("perf-some");
            } else if (missed > 0 || cellDateStr < todayDateStr) {
                // If it is in the past and they took 0, it's poor adherence
                cell.classList.add("perf-none");
            }

            // Draw status dots underneath numbers
            const dotsContainer = document.createElement("div");
            dotsContainer.className = "calendar-cell-dots";
            
            dayEvents.forEach(evt => {
                const dot = document.createElement("span");
                dot.className = `dot-indicator dot-${evt.status}`;
                dotsContainer.appendChild(dot);
            });
            cell.appendChild(dotsContainer);

            // Click cell to populate History Feed on side
            cell.addEventListener("click", () => {
                renderDetailedHistoryForDate(cellDateStr, dayEvents);
            });
        }

        elements.calendarDays.appendChild(cell);
    }

    // Initialize side history log for selected/today's date
    const todaysEvents = getEventsForDate(todayDateStr);
    renderDetailedHistoryForDate(todayDateStr, todaysEvents);
}

/**
 * Render granular event history details list on the side of calendar
 * @param {string} dateStr 
 * @param {Array} events 
 */
function renderDetailedHistoryForDate(dateStr, events) {
    const formattedDate = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    
    elements.historyList.innerHTML = `
        <div style="font-weight:600; margin-bottom:10px; font-size:0.9rem; color:var(--primary)">
            Schedule logs for ${formattedDate}
        </div>
    `;

    if (events.length === 0) {
        elements.historyList.innerHTML += `
            <div class="history-empty-placeholder">
                <p>No medications scheduled for this date.</p>
            </div>
        `;
        return;
    }

    events.forEach(evt => {
        const item = document.createElement("div");
        item.className = `history-item ${evt.status}`;
        
        const isTaken = evt.status === "taken";
        const iconSymbol = isTaken ? '✓' : evt.status === 'snoozed' ? '⏳' : '✗';
        
        let subText = "";
        if (isTaken && evt.takenTime) {
            const timePart = new Date(evt.takenTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            subText = `Taken at ${timePart}`;
        } else if (evt.status === "snoozed") {
            subText = `Snoozed alert`;
        } else {
            subText = `Scheduled for ${evt.time}`;
        }

        item.innerHTML = `
            <div class="history-item-icon">${iconSymbol}</div>
            <div class="history-item-details">
                <h5>${escapeHtml(evt.reminder.name)} <span style="font-weight:400; color:var(--text-muted)">${escapeHtml(evt.reminder.dosage)}</span></h5>
                <p>${subText}</p>
            </div>
            <div class="history-item-time">${evt.time}</div>
        `;
        elements.historyList.appendChild(item);
    });
}

/**
 * Background clock loop check to trigger active medicine reminder popup alerts
 */
function pollAlarms() {
    if (state.activeAlarmEvent) return; // Wait if another alarm modal is already open!

    const now = new Date();
    const todayDateStr = now.toISOString().split('T')[0];
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentHM = `${currentHours}:${currentMinutes}`; // "HH:MM"

    // Fetch active schedule entries
    const todayEvents = getEventsForDate(todayDateStr);

    todayEvents.forEach(evt => {
        // Only trigger if pending/snoozed and time matches exactly
        if (evt.status === "taken" || evt.status === "skipped") return;

        // Snooze duration logic
        let isAlarmTriggerTime = evt.time === currentHM;

        // If snoozed, handle snooze timer. We can check if log says "snoozed"
        // and if it was set 10 minutes ago.
        const log = state.history.find(h => 
            h.reminderId === evt.reminder.id && 
            h.date === todayDateStr && 
            h.scheduledTime === evt.time
        );
        
        if (log && log.status === "snoozed" && log.snoozeUntil) {
            const snoozeTime = new Date(log.snoozeUntil);
            if (now >= snoozeTime) {
                isAlarmTriggerTime = true;
            }
        }

        if (isAlarmTriggerTime) {
            // Check if alert was already triggered in the current minute (to prevent double alarms)
            const alertKey = `${todayDateStr}_${evt.reminder.id}_${evt.time}_${currentHM}`;
            if (state.alertedTimes[alertKey]) return;

            // Trigger alarm!
            state.alertedTimes[alertKey] = true;
            localStorage.setItem("aegis_alerted_times", JSON.stringify(state.alertedTimes));
            
            triggerAlarmModal(evt);
        }
    });
}

/**
 * Triggers visual popup alert, synthesized alerts and chime sounds
 * @param {Object} evt - Timeline Event 
 */
function triggerAlarmModal(evt) {
    state.activeAlarmEvent = evt;

    // Set layout texts
    elements.alarmMedName.innerText = evt.reminder.name;
    elements.alarmMedDosage.innerText = evt.reminder.dosage;
    elements.alarmMedInstructions.innerText = evt.reminder.instructions || "No custom guidelines.";
    
    // Time display
    const timeDisplay = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    elements.alarmTimeDisplay.innerText = timeDisplay;

    // Open Alarm modal Backdrop
    elements.modalAlarm.classList.add("active");

    // Audio & voice announce trigger
    if (config.chimeEnabled) {
        AudioService.playChime();
    }

    if (config.voiceEnabled) {
        // Wait 1 second after chime before speaking the prescription
        setTimeout(() => {
            const announcement = `Attention! It is time to take your medication: ${evt.reminder.name}, ${evt.reminder.dosage}. ${evt.reminder.instructions || ''}`;
            AudioService.speak(announcement, config.selectedVoiceURI);
        }, 1200);
    }
}

/**
 * Handles actions from the alarm popup (take, snooze, skip)
 * @param {string} action - 'taken' | 'snoozed' | 'skipped'
 */
function executeAlarmAction(action) {
    const evt = state.activeAlarmEvent;
    if (!evt) return;

    const dateStr = state.currentDate;
    
    // Find index of existing log if any
    const index = state.history.findIndex(h => 
        h.reminderId === evt.reminder.id && 
        h.date === dateStr && 
        h.scheduledTime === evt.time
    );

    if (action === "taken") {
        const logData = {
            id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            reminderId: evt.reminder.id,
            medName: evt.reminder.name,
            dosage: evt.reminder.dosage,
            scheduledTime: evt.time,
            date: dateStr,
            status: "taken",
            takenTime: new Date().toISOString()
        };

        if (index > -1) {
            state.history[index] = logData;
        } else {
            state.history.push(logData);
        }
        
        triggerConfettiSplash();
        
    } else if (action === "snoozed") {
        // Calculate 10 minute offset snooze date
        const snoozeDate = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        const logData = {
            id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            reminderId: evt.reminder.id,
            medName: evt.reminder.name,
            dosage: evt.reminder.dosage,
            scheduledTime: evt.time,
            date: dateStr,
            status: "snoozed",
            snoozeUntil: snoozeDate.toISOString()
        };

        if (index > -1) {
            state.history[index] = logData;
        } else {
            state.history.push(logData);
        }
        
    } else if (action === "skipped") {
        const logData = {
            id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            reminderId: evt.reminder.id,
            medName: evt.reminder.name,
            dosage: evt.reminder.dosage,
            scheduledTime: evt.time,
            date: dateStr,
            status: "missed" // mapped to missed in calendar
        };

        if (index > -1) {
            state.history[index] = logData;
        } else {
            state.history.push(logData);
        }
    }

    saveStateToStorage();
    
    // Close Alarm Modal
    elements.modalAlarm.classList.remove("active");
    state.activeAlarmEvent = null;

    // Cancel active TTS speaking
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    renderDashboard();
    renderCalendar();
}

/**
 * Triggers mock chime & speech alert triggers for verification inside settings
 */
function triggerDemoAlert() {
    AudioService.playChime();
    setTimeout(() => {
        AudioService.speak("This is a demo audio transmission testing the Aegis Care voice synthesis engine. If you hear this, your alerts are fully functional.", config.selectedVoiceURI);
    }, 1200);
}

/**
 * UI Chat window builders
 * @param {string} sender - 'user' | 'ai' | 'system'
 * @param {string} text - Message text (markdown support mapped)
 */
function addChatMessage(sender, text, imageUrl = null) {
    const msg = document.createElement("div");
    msg.className = `message ${sender}-message`;
    
    let processedText = formatMarkdown(text);
    
    let imgHtml = "";
    if (imageUrl) {
        imgHtml = `<img src="${imageUrl}" class="chat-msg-img" alt="prescription attachment">`;
    }

    msg.innerHTML = `
        <div class="message-bubble">
            ${processedText}
            ${imgHtml}
        </div>
    `;
    elements.chatMessages.appendChild(msg);
    
    // Scroll chat to bottom
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

/**
 * Handles processing User's Chat submission (Text or Image OCR query)
 */
async function sendUserChatMessage() {
    const text = elements.chatInput.value.trim();
    const imageAttached = state.attachedImage;

    if (!text && !imageAttached) return;

    if (!AIService.hasApiKey()) {
        alert("Please set up your Gemini API Key in the Settings tab to communicate with the AI companion.");
        return;
    }

    // Append User Message to UI Chat
    let imgPreviewUrl = null;
    if (imageAttached) {
        imgPreviewUrl = `data:${imageAttached.mimeType};base64,${imageAttached.base64}`;
    }

    addChatMessage("user", text || "Analyzing uploaded prescription prescription...", imgPreviewUrl);
    
    // Clear Input
    elements.chatInput.value = "";
    elements.btnSendMessage.disabled = true;
    clearAttachedImage();

    // Append AI Thinking Indicator bubble
    const thinkingId = appendThinkingBubble();

    // Prepare Context state packet to pass to Gemini API
    const context = {
        currentDate: state.currentDate,
        userName: state.userName,
        activeMedications: state.reminders
    };

    try {
        const response = await AIService.analyze(text, context, imageAttached);
        
        // Remove thinking placeholder
        removeThinkingBubble(thinkingId);

        // Process Response
        addChatMessage("ai", response.reply);

        // Parse Reminders import if present
        if (response.reminders && response.reminders.length > 0) {
            response.reminders.forEach(newMed => {
                // Ensure unique ID
                newMed.id = "med_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
                state.reminders.push(newMed);
            });
            saveStateToStorage();
            renderAll();
            
            // Pop confetti indicating new reminders schedule saved
            triggerConfettiSplash();
            
            addChatMessage("system", `✅ **Success**: Scheduled **${response.reminders.length}** new medication reminders from Gemini API.`);
            
            // Re-run drug interaction safety checker
            runBackgroundInteractionsCheck();
        }

        // Highlight interactions warnings if returned in chat scope
        if (response.drugInteractions && response.drugInteractions.length > 0) {
            let interactionSummary = `⚠️ **Drug Safety Warning**: Gemini API flagged potential safety alerts:\n`;
            response.drugInteractions.forEach(alert => {
                interactionSummary += `- **[${alert.severity.toUpperCase()}]** meds (${alert.medicines.join(' + ')}): ${alert.description}\n`;
            });
            addChatMessage("ai", interactionSummary);
            
            // Play alert sound for high interactions
            if (response.drugInteractions.some(c => c.severity.toLowerCase() === 'high')) {
                AudioService.playWarningSound();
            }
        }

    } catch (error) {
        removeThinkingBubble(thinkingId);
        addChatMessage("system", `❌ **Error**: Failed to complete request. ${error.message}`);
        AudioService.playWarningSound();
    }
}

/**
 * Helper to display thinking status bubble
 */
function appendThinkingBubble() {
    const id = "think_" + Date.now();
    const msg = document.createElement("div");
    msg.className = "message thinking-message";
    msg.id = id;
    
    msg.innerHTML = `
        <div class="message-bubble">
            <div class="thinking-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    elements.chatMessages.appendChild(msg);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    return id;
}

/**
 * Remove thinking bubble
 */
function removeThinkingBubble(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

/**
 * Image attachment (OCR Prescriptions)
 */
function handlePrescriptionUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert("Please upload an image file (PNG/JPG).");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const base64Content = event.target.result.split(',')[1];
        state.attachedImage = {
            base64: base64Content,
            mimeType: file.type
        };

        // Render UI Image attachments
        elements.attachedImage.src = event.target.result;
        elements.previewFilename.innerText = file.name;
        elements.imagePreviewContainer.style.display = "flex";
        
        elements.btnSendMessage.disabled = false;
    };
    reader.readAsDataURL(file);
}

/**
 * Clears files attachments references
 */
function clearAttachedImage() {
    state.attachedImage = null;
    elements.prescriptionUploadInput.value = "";
    elements.imagePreviewContainer.style.display = "none";
    
    // Check send button state
    const text = elements.chatInput.value.trim();
    elements.btnSendMessage.disabled = !text;
}

/**
 * Inject mock demonstration database routines
 */
function loadDemoAdherenceData() {
    if (confirm("This will load mock history and 3 active medications (including potential Aspirin/Ibuprofen drug warning interactions). Proceed?")) {
        // Clear old database
        state.reminders = [];
        state.history = [];
        state.alertedTimes = {};
        
        const today = new Date();
        const getOffsetDateStr = (daysOffset) => {
            const d = new Date();
            d.setDate(today.getDate() - daysOffset);
            return d.toISOString().split('T')[0];
        };

        // Set Active Medications
        // 1. Lisinopril (Blood pressure)
        const med1Id = "med_lisinopril_10mg";
        state.reminders.push({
            id: med1Id,
            name: "Lisinopril",
            dosage: "10mg",
            frequency: "daily",
            times: ["08:00"],
            startDate: getOffsetDateStr(10), // started 10 days ago
            endDate: null,
            instructions: "Take once daily in the morning on an empty stomach."
        });

        // 2. Aspirin (Heart protection)
        const med2Id = "med_aspirin_81mg";
        state.reminders.push({
            id: med2Id,
            name: "Aspirin",
            dosage: "81mg",
            frequency: "daily",
            times: ["09:00"],
            startDate: getOffsetDateStr(10),
            endDate: null,
            instructions: "Take once daily with food."
        });

        // 3. Ibuprofen (Arthritis pain relief - Mock interaction conflict)
        const med3Id = "med_ibuprofen_400mg";
        state.reminders.push({
            id: med3Id,
            name: "Ibuprofen",
            dosage: "400mg",
            frequency: "twice_daily",
            times: ["09:00", "21:00"],
            startDate: getOffsetDateStr(5),
            endDate: getOffsetDateStr(-5), // runs until 5 days from now
            instructions: "Take twice daily after meals. Avoid combining directly with other NSAIDs."
        });

        // Generate Logs for the last 5 days (historics logs)
        // Day -5: Perfect
        state.history.push(
            { id: "log_d5_1", reminderId: med1Id, medName: "Lisinopril", dosage: "10mg", scheduledTime: "08:00", date: getOffsetDateStr(5), status: "taken", takenTime: getOffsetDateStr(5) + "T08:05:00.000Z" },
            { id: "log_d5_2", reminderId: med2Id, medName: "Aspirin", dosage: "81mg", scheduledTime: "09:00", date: getOffsetDateStr(5), status: "taken", takenTime: getOffsetDateStr(5) + "T09:15:00.000Z" },
            { id: "log_d5_3", reminderId: med3Id, medName: "Ibuprofen", dosage: "400mg", scheduledTime: "09:00", date: getOffsetDateStr(5), status: "taken", takenTime: getOffsetDateStr(5) + "T09:15:00.000Z" },
            { id: "log_d5_4", reminderId: med3Id, medName: "Ibuprofen", dosage: "400mg", scheduledTime: "21:00", date: getOffsetDateStr(5), status: "taken", takenTime: getOffsetDateStr(5) + "T21:10:00.000Z" }
        );

        // Day -4: Partial (missed one ibuprofen)
        state.history.push(
            { id: "log_d4_1", reminderId: med1Id, medName: "Lisinopril", dosage: "10mg", scheduledTime: "08:00", date: getOffsetDateStr(4), status: "taken", takenTime: getOffsetDateStr(4) + "T08:00:00.000Z" },
            { id: "log_d4_2", reminderId: med2Id, medName: "Aspirin", dosage: "81mg", scheduledTime: "09:00", date: getOffsetDateStr(4), status: "taken", takenTime: getOffsetDateStr(4) + "T09:02:00.000Z" },
            { id: "log_d4_3", reminderId: med3Id, medName: "Ibuprofen", dosage: "400mg", scheduledTime: "09:00", date: getOffsetDateStr(4), status: "taken", takenTime: getOffsetDateStr(4) + "T09:02:00.000Z" },
            { id: "log_d4_4", reminderId: med3Id, medName: "Ibuprofen", dosage: "400mg", scheduledTime: "21:00", date: getOffsetDateStr(4), status: "missed" }
        );

        // Day -3: Perfect
        state.history.push(
            { id: "log_d3_1", reminderId: med1Id, medName: "Lisinopril", dosage: "10mg", scheduledTime: "08:00", date: getOffsetDateStr(3), status: "taken", takenTime: getOffsetDateStr(3) + "T08:12:00.000Z" },
            { id: "log_d3_2", reminderId: med2Id, medName: "Aspirin", dosage: "81mg", scheduledTime: "09:00", date: getOffsetDateStr(3), status: "taken", takenTime: getOffsetDateStr(3) + "T09:08:00.000Z" },
            { id: "log_d3_3", reminderId: med3Id, medName: "Ibuprofen", dosage: "400mg", scheduledTime: "09:00", date: getOffsetDateStr(3), status: "taken", takenTime: getOffsetDateStr(3) + "T09:08:00.000Z" },
            { id: "log_d3_4", reminderId: med3Id, medName: "Ibuprofen", dosage: "400mg", scheduledTime: "21:00", date: getOffsetDateStr(3), status: "taken", takenTime: getOffsetDateStr(3) + "T21:00:00.000Z" }
        );

        // Day -2: Poor (Forgot morning routine)
        state.history.push(
            { id: "log_d2_1", reminderId: med1Id, medName: "Lisinopril", dosage: "10mg", scheduledTime: "08:00", date: getOffsetDateStr(2), status: "missed" },
            { id: "log_d2_2", reminderId: med2Id, medName: "Aspirin", dosage: "81mg", scheduledTime: "09:00", date: getOffsetDateStr(2), status: "missed" },
            { id: "log_d2_3", reminderId: med3Id, medName: "Ibuprofen", dosage: "400mg", scheduledTime: "09:00", date: getOffsetDateStr(2), status: "missed" },
            { id: "log_d2_4", reminderId: med3Id, medName: "Ibuprofen", dosage: "400mg", scheduledTime: "21:00", date: getOffsetDateStr(2), status: "taken", takenTime: getOffsetDateStr(2) + "T21:20:00.000Z" }
        );

        // Day -1: Perfect
        state.history.push(
            { id: "log_d1_1", reminderId: med1Id, medName: "Lisinopril", dosage: "10mg", scheduledTime: "08:00", date: getOffsetDateStr(1), status: "taken", takenTime: getOffsetDateStr(1) + "T08:01:00.000Z" },
            { id: "log_d1_2", reminderId: med2Id, medName: "Aspirin", dosage: "81mg", scheduledTime: "09:00", date: getOffsetDateStr(1), status: "taken", takenTime: getOffsetDateStr(1) + "T09:00:00.000Z" },
            { id: "log_d1_3", reminderId: med3Id, medName: "Ibuprofen", dosage: "400mg", scheduledTime: "09:00", date: getOffsetDateStr(1), status: "taken", takenTime: getOffsetDateStr(1) + "T09:00:00.000Z" },
            { id: "log_d1_4", reminderId: med3Id, medName: "Ibuprofen", dosage: "400mg", scheduledTime: "21:00", date: getOffsetDateStr(1), status: "taken", takenTime: getOffsetDateStr(1) + "T21:05:00.000Z" }
        );

        // Today: Mark earliest Lisinopril as taken automatically for visual flavor
        state.history.push({
            id: "log_today_1",
            reminderId: med1Id,
            medName: "Lisinopril",
            dosage: "10mg",
            scheduledTime: "08:00",
            date: state.currentDate,
            status: "taken",
            takenTime: new Date().toISOString()
        });

        // Set Demo User Name
        state.userName = "Sarah Connor";
        elements.settingsUserName.value = "Sarah Connor";

        saveStateToStorage();
        renderAll();
        
        // Re-analyze interactions check
        runBackgroundInteractionsCheck();
        
        alert("Demo medical profile loaded! Go to the Dashboard and Calendar tabs to check today's timeline, adherence statistics, monthly grids, and active safety alerts.");
    }
}

/**
 * Resets local database
 */
function resetAppConfirmation() {
    if (confirm("WARNING: This will clear your entire medication schedule, API keys, and adherence history logs. This cannot be undone. Proceed?")) {
        localStorage.clear();
        loadStateFromStorage();
        renderAll();
        
        elements.chatMessages.innerHTML = "";
        addChatMessage("system", `Database reset completed. All schedules cleared.`);
        
        alert("Aegis database successfully reset.");
    }
}

/**
 * Helper to escape HTML tags to avoid XSS injections
 * @param {string} text 
 * @returns {string}
 */
function escapeHtml(text) {
    if (!text) return "";
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Simple parser to render basic bold, italic, list markers, and breaklines in chatbot chat window
 * @param {string} text 
 * @returns {string}
 */
function formatMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Bullet lines
    html = html.replace(/^\s*-\s+(.*?)$/gm, '• $1');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
}
