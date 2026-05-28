/**
 * Class Tracker Pro v2.0 - Core Script Logic
 * Premium productivity tracker with customized steps, archiving,
 * auto-saving notes, Pomodoro, and milestone confetti alerts.
 */

// Global State Structure
// Simulated Multi-User Session Structure
let activeUser = JSON.parse(localStorage.getItem("tracify_active_user")) || null;
let registeredUsers = JSON.parse(localStorage.getItem("tracify_users")) || [];

// Global State Structure
let tasks = {};
function loadTasksForUser() {
    if (activeUser) {
        tasks = JSON.parse(localStorage.getItem(`tracify_tasks_${activeUser.username}`)) || {};
    } else {
        tasks = JSON.parse(localStorage.getItem("class_tracker_tasks_v2")) || {};
    }
}
loadTasksForUser();

let currentTaskId = localStorage.getItem(activeUser ? `tracify_current_task_${activeUser.username}` : "class_tracker_current_task_v2") || null;
let searchQuery = "";
let selectedCategoryFilter = "all";
let sortOption = "default"; // "default", "alpha", "progress", "deadline"
let showArchivedView = false; // toggle active vs archived courses
let googleClientId = localStorage.getItem("tracify_google_client_id") || "";

// Modal variables
let activeSelectedTheme = "var(--gradient-purple-indigo)";
let activeSelectedGlow = "#8b5cf6";

// Color maps
const colorThemes = {
    "var(--gradient-purple-indigo)": { bg: "var(--gradient-purple-indigo)", glow: "#8b5cf6" },
    "var(--gradient-cyan-blue)": { bg: "var(--gradient-cyan-blue)", glow: "#06b6d4" },
    "var(--gradient-emerald-green)": { bg: "var(--gradient-emerald-green)", glow: "#10b981" },
    "var(--gradient-orange-red)": { bg: "var(--gradient-orange-red)", glow: "#f97316" },
    "var(--gradient-rose-pink)": { bg: "var(--gradient-rose-pink)", glow: "#ec4899" }
};

// Pomodoro Timer State
let pomodoroTimer = null;
let pomodoroTimeLeft = 25 * 60; // 25 minutes default
let pomodoroTotalDuration = 25 * 60;
let pomodoroIsRunning = false;
let pomodoroMode = "focus"; // "focus" or "break"
let studyHours = parseFloat(localStorage.getItem("study_hours_logged")) || 0.0;

// Debouncing variables for Auto-saving notes pad
let notesSaveTimeout = null;

// Track milestone unlocks for active session
let unlockedMilestonesThisSession = {
    "25": false,
    "50": false,
    "75": false,
    "100": false
};

// Start application
window.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    // 1. Theme Configuration
    const savedTheme = localStorage.getItem("class_tracker_theme_v2") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);

    // 2. Setup clock
    startClock();

    // 3. Spotlight tracking
    setupMouseGlow();

    // 4. Migrate old data if present and convert to v2 schemas
    migrateOldData();

    // 5. Validate integrity of selected task
    validateSelectedTask();

    // 6. Draw Dashboard elements
    renderTaskList();
    updateStreakDisplay();
    renderDashboard();

    // 7. Initialize Pomodoro UI
    updatePomodoroUI();

    // 8. Update User Profile Interface Details
    updateUserProfileUI();

    // 9. Load Google Client ID into UI if exists
    const googleIdInput = document.getElementById("googleClientIdInput");
    if (googleIdInput && googleClientId) {
        googleIdInput.value = googleClientId;
    }
    
    // 10. Initialize real Google authentication if client ID is configured
    if (typeof google !== "undefined") {
        initRealGoogleSignIn();
    } else {
        window.addEventListener("load", () => {
            initRealGoogleSignIn();
        });
    }
}

// ----------------------------------------------------
// OLD DATA SCHEMA MIGRATOR
// ----------------------------------------------------
function migrateOldData() {
    // If v1 tasks exist, convert them to v2 schema dynamically
    const oldTasks = JSON.parse(localStorage.getItem("class_tracker_tasks"));
    if (oldTasks && Object.keys(oldTasks).length > 0 && Object.keys(tasks).length === 0) {
        Object.keys(oldTasks).forEach(key => {
            const oldT = oldTasks[key];
            
            // Build completed index list from boolean array
            const completedIndices = [];
            if (Array.isArray(oldT.data)) {
                oldT.data.forEach((val, idx) => {
                    if (val) completedIndices.push(idx);
                });
            }

            tasks[key] = {
                id: key,
                name: oldT.name || "Legacy Course",
                totalCount: 71,
                completedItems: completedIndices,
                category: "Study",
                themeColor: oldT.color || "var(--gradient-purple-indigo)",
                glow: colorThemes[oldT.color]?.glow || "#8b5cf6",
                createdAt: Date.now(),
                updatedAt: Date.now(),
                deadline: "",
                notes: "",
                archived: false
            };
        });
        localStorage.removeItem("class_tracker_tasks");
        saveState();
        showToast("Successfully migrated course data to version 2.0!", "success");
    }
}

// ----------------------------------------------------
// DYNAMIC GREETING & CLOCK SYSTEM
// ----------------------------------------------------
function getActiveUserName() {
    return activeUser ? activeUser.fullname : "Guest User";
}

function startClock() {
    const clockTime = document.getElementById("clockTime");
    const clockDate = document.getElementById("clockDate");
    const greetingHeading = document.getElementById("greetingHeading");

    function updateTime() {
        const now = new Date();
        
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        const formattedHours = String(hours).padStart(2, '0');
        
        clockTime.textContent = `${formattedHours}:${minutes} ${ampm}`;

        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        clockDate.textContent = now.toLocaleDateString('en-US', options);

        const hr = now.getHours();
        const activeName = getActiveUserName();
        let greeting = `Welcome back, ${activeName}`;
        if (hr < 12) {
            greeting = `Good morning, ${activeName}`;
        } else if (hr < 18) {
            greeting = `Good afternoon, ${activeName}`;
        } else {
            greeting = `Good evening, ${activeName}`;
        }
        greetingHeading.textContent = greeting;
    }

    updateTime();
    setInterval(updateTime, 60000);
}

// ----------------------------------------------------
// SPOTLIGHT GLOW BACKGROUND EFFECT
// ----------------------------------------------------
function setupMouseGlow() {
    const mouseGlow = document.getElementById("mouse-glow");
    if (!mouseGlow) return;
    let ticking = false;
    document.addEventListener("mousemove", (e) => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                mouseGlow.style.setProperty("--mouse-x", `${e.clientX}px`);
                mouseGlow.style.setProperty("--mouse-y", `${e.clientY}px`);
                ticking = false;
            });
            ticking = true;
        }
    });
}

// ----------------------------------------------------
// LIGHT & DARK THEME SWITCHER
// ----------------------------------------------------
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("class_tracker_theme_v2", newTheme);
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}`, "info");
}

function updateThemeIcon(theme) {
    const icon = document.getElementById("theme-icon");
    const mobileIcon = document.getElementById("mobile-theme-icon");
    
    if (theme === "dark") {
        if (icon) icon.className = "fa-solid fa-moon";
        if (mobileIcon) mobileIcon.className = "fa-solid fa-moon";
    } else {
        if (icon) icon.className = "fa-solid fa-sun";
        if (mobileIcon) mobileIcon.className = "fa-solid fa-sun";
    }
}

// ----------------------------------------------------
// RESPONSIVE SIDEBAR MOBILE TOGGLE
// ----------------------------------------------------
function toggleSidebar(open) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    
    if (open) {
        sidebar.classList.add("open");
        overlay.classList.add("active");
    } else {
        sidebar.classList.remove("open");
        overlay.classList.remove("active");
    }
}

// ----------------------------------------------------
// LOCAL PERSISTENCE & DATA INTEGRITY
// ----------------------------------------------------
function saveState() {
    if (activeUser) {
        localStorage.setItem(`tracify_tasks_${activeUser.username}`, JSON.stringify(tasks));
        if (currentTaskId) {
            localStorage.setItem(`tracify_current_task_${activeUser.username}`, currentTaskId);
        } else {
            localStorage.removeItem(`tracify_current_task_${activeUser.username}`);
        }
    } else {
        localStorage.setItem("class_tracker_tasks_v2", JSON.stringify(tasks));
        if (currentTaskId) {
            localStorage.setItem("class_tracker_current_task_v2", currentTaskId);
        } else {
            localStorage.removeItem("class_tracker_current_task_v2");
        }
    }
}

function validateSelectedTask() {
    const keys = Object.keys(tasks);
    
    // Filters based on active vs archived views and selected category
    let filteredTasks = keys.filter(k => tasks[k].archived === showArchivedView);
    
    if (selectedCategoryFilter !== "all") {
        filteredTasks = filteredTasks.filter(k => tasks[k].category === selectedCategoryFilter);
    }
    
    const savedKey = activeUser ? `tracify_current_task_${activeUser.username}` : "class_tracker_current_task_v2";
    currentTaskId = localStorage.getItem(savedKey) || null;

    if (filteredTasks.length === 0) {
        currentTaskId = null;
    } else if (!currentTaskId || !tasks[currentTaskId] || tasks[currentTaskId].archived !== showArchivedView || (selectedCategoryFilter !== "all" && tasks[currentTaskId].category !== selectedCategoryFilter)) {
        currentTaskId = filteredTasks[0];
    }
}

// ----------------------------------------------------
// SEARCH, SORT AND CATEGORY FILTERS
// ----------------------------------------------------
function handleSearch() {
    searchQuery = document.getElementById("searchInput").value.trim().toLowerCase();
    renderTaskList();
}

function setCategoryFilter(category) {
    selectedCategoryFilter = category;
    
    // update pill colors
    const pills = document.querySelectorAll("#categoryPills .pill");
    pills.forEach(pill => {
        if (pill.textContent.includes(category) || (category === 'all' && pill.textContent === 'All')) {
            pill.classList.add("active");
        } else {
            pill.classList.remove("active");
        }
    });

    validateSelectedTask();
    renderTaskList();
    renderDashboard();
}

function toggleArchiveView(archive) {
    showArchivedView = archive;
    
    // Toggle active classes on tab headers
    const tabActive = document.getElementById("tabActiveCourses");
    const tabArchived = document.getElementById("tabArchivedCourses");
    
    if (archive) {
        tabArchived.classList.add("active");
        tabActive.classList.remove("active");
        showToast("Viewing Archived Courses", "info");
    } else {
        tabActive.classList.add("active");
        tabArchived.classList.remove("active");
        showToast("Viewing Active Courses", "info");
    }
    
    validateSelectedTask();
    renderTaskList();
    renderDashboard();
}

function toggleSort() {
    const btnSort = document.getElementById("btnSort");
    if (sortOption === "default") {
        sortOption = "alpha";
        btnSort.innerHTML = '<i class="fa-solid fa-arrow-down-a-z"></i>';
        showToast("Sorting Courses Alphabetically", "info");
    } else if (sortOption === "alpha") {
        sortOption = "progress";
        btnSort.innerHTML = '<i class="fa-solid fa-arrow-down-1-9"></i>';
        showToast("Sorting Courses by Progress %", "info");
    } else if (sortOption === "progress") {
        sortOption = "deadline";
        btnSort.innerHTML = '<i class="fa-solid fa-calendar-days"></i>';
        showToast("Sorting Courses by Deadline", "info");
    } else {
        sortOption = "default";
        btnSort.innerHTML = '<i class="fa-solid fa-arrow-down-wide-short"></i>';
        showToast("Reset Sorting Order", "info");
    }
    renderTaskList();
}

// Calculate percentages dynamically
function calculatePercentage(task) {
    if (!task.totalCount || task.totalCount === 0) return 0;
    return Math.round((task.completedItems.length / task.totalCount) * 100);
}

// Draw scrollable task cards list in sidebar
function renderTaskList() {
    const taskList = document.getElementById("taskList");
    const archiveCountBadge = document.getElementById("archiveCountBadge");
    
    taskList.innerHTML = "";
    
    let taskArr = Object.values(tasks);
    
    // Count archived items overall
    const archivedCount = taskArr.filter(t => t.archived).length;
    archiveCountBadge.textContent = archivedCount;
    
    // Filter active vs archived
    taskArr = taskArr.filter(t => t.archived === showArchivedView);
    
    // Filter category
    if (selectedCategoryFilter !== "all") {
        taskArr = taskArr.filter(t => t.category === selectedCategoryFilter);
    }
    
    // Filter Search queries
    if (searchQuery) {
        taskArr = taskArr.filter(t => t.name.toLowerCase().includes(searchQuery));
    }
    
    // Apply Sort routines
    if (sortOption === "alpha") {
        taskArr.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "progress") {
        taskArr.sort((a, b) => calculatePercentage(b) - calculatePercentage(a));
    } else if (sortOption === "deadline") {
        taskArr.sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        });
    } else {
        // default sorting by updatedAt timestamp descending
        taskArr.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    
    if (taskArr.length === 0) {
        taskList.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary); font-size: 0.75rem; padding: 30px 10px; line-height: 1.4;">
                No courses found.<br>Click "New Course" to begin!
            </div>
        `;
        return;
    }
    
    taskArr.forEach(task => {
        const percentage = calculatePercentage(task);
        const activeClass = task.id === currentTaskId ? "active" : "";
        
        // Pick category icon
        let catIcon = '<i class="fa-solid fa-book"></i>';
        if (task.category === "Coding") catIcon = '<i class="fa-solid fa-code"></i>';
        else if (task.category === "Fitness") catIcon = '<i class="fa-solid fa-dumbbell"></i>';
        else if (task.category === "Work") catIcon = '<i class="fa-solid fa-briefcase"></i>';
        else if (task.category === "Personal") catIcon = '<i class="fa-solid fa-user"></i>';
        else if (task.category === "Habit") catIcon = '<i class="fa-solid fa-repeat"></i>';

        const card = document.createElement("div");
        card.className = `task-card ${activeClass}`;
        card.setAttribute("style", `--task-color: ${task.themeColor};`);
        card.onclick = (e) => {
            if (e.target.closest(".task-card-actions")) return;
            selectTask(task.id);
        };
        
        card.innerHTML = `
            <div class="task-card-header">
                <span class="task-card-title" title="${task.name}">${task.name}</span>
                <div class="task-card-actions">
                    <button onclick="duplicateTask('${task.id}')" title="Duplicate course/syllabus">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button onclick="toggleArchiveTask('${task.id}')" class="archive" title="${task.archived ? 'Unarchive' : 'Archive'} course">
                        <i class="fa-solid ${task.archived ? 'fa-box-open' : 'fa-box-archive'}"></i>
                    </button>
                    <button onclick="openModal('edit', '${task.id}')" title="Edit course parameters">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="delete" onclick="handleDeleteTask('${task.id}')" title="Delete course permanently">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
            <div class="task-card-meta">
                <span class="task-card-category-tag">${catIcon} ${task.category}</span>
                <span>${task.completedItems.length} / ${task.totalCount} (${percentage}%)</span>
            </div>
            <div class="task-card-progress-bar">
                <div class="task-card-progress-fill" style="width: ${percentage}%"></div>
            </div>
        `;
        
        taskList.appendChild(card);
    });
}

function selectTask(id) {
    currentTaskId = id;
    saveState();
    
    // Reset unlocking thresholds for milestone celebration on course swap
    unlockedMilestonesThisSession = { "25": false, "50": false, "75": false, "100": false };
    
    renderTaskList();
    renderDashboard();
    
    const task = tasks[id];
    if (task) {
        showToast(`Loaded "${task.name}"`, "info");
    }
}

// ----------------------------------------------------
// DUPLICATE & ARCHIVING ROUTINES
// ----------------------------------------------------
function duplicateTask(id) {
    const original = tasks[id];
    if (!original) return;
    
    const newId = "task_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    tasks[newId] = {
        id: newId,
        name: original.name + " (Copy)",
        totalCount: original.totalCount,
        completedItems: [...original.completedItems], // Duplicate checked states
        missedItems: [...(original.missedItems || [])], // Duplicate missed states
        category: original.category,
        themeColor: original.themeColor,
        glow: original.glow,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deadline: original.deadline,
        notes: original.notes,
        archived: original.archived
    };
    
    saveState();
    renderTaskList();
    selectTask(newId);
    showToast(`Duplicated "${original.name}" successfully!`, "success");
}

function toggleArchiveTask(id) {
    const task = tasks[id];
    if (!task) return;
    
    task.archived = !task.archived;
    task.updatedAt = Date.now();
    
    // Swap current selection if active course is archived
    if (currentTaskId === id) {
        currentTaskId = null;
    }
    
    saveState();
    validateSelectedTask();
    renderTaskList();
    renderDashboard();
    
    showToast(`"${task.name}" ${task.archived ? 'moved to archive' : 'restored to active courses'}`, "success");
}

function handleDeleteTask(id) {
    const name = tasks[id].name;
    if (confirm(`Delete "${name}" permanently? This clears all notes and logs.`)) {
        delete tasks[id];
        
        if (currentTaskId === id) {
            currentTaskId = null;
        }
        
        saveState();
        validateSelectedTask();
        renderTaskList();
        renderDashboard();
        showToast(`Permanently deleted "${name}"`, "danger");
    }
}

// ----------------------------------------------------
// DYNAMIC DASHBOARD WORKSPACE BUILDER
// ----------------------------------------------------
function renderDashboard() {
    const dashboardContent = document.getElementById("dashboardContent");
    const emptyState = document.getElementById("emptyState");
    
    if (!currentTaskId || !tasks[currentTaskId]) {
        dashboardContent.style.display = "none";
        emptyState.style.display = "flex";
        
        // Reset statistics counters to default when empty
        document.getElementById("statCompleted").textContent = "0";
        document.getElementById("statRemaining").textContent = "0";
        document.getElementById("statPercent").textContent = "0%";
        return;
    }
    
    dashboardContent.style.display = "flex";
    emptyState.style.display = "none";
    
    const task = tasks[currentTaskId];
    
    // Dynamic styling
    document.documentElement.style.setProperty("--active-theme-color", task.themeColor);
    document.documentElement.style.setProperty("--active-shadow-color", task.glow + "73");
    
    // Update active category display badge
    const badge = document.getElementById("activeCategoryBadge");
    badge.textContent = task.category;
    
    // 1. Calculations
    task.completedItems = task.completedItems || [];
    task.missedItems = task.missedItems || [];

    const completedCount = task.completedItems.length;
    const missedCount = task.missedItems.length;
    const remainingCount = Math.max(0, task.totalCount - completedCount - missedCount);
    const percentage = calculatePercentage(task);
    
    // Animating statistics cards row
    animateNumber("statCompleted", parseInt(document.getElementById("statCompleted").textContent) || 0, completedCount, 500);
    animateNumber("statRemaining", parseInt(document.getElementById("statRemaining").textContent) || 0, remainingCount, 500);
    animateNumber("statPercent", parseInt(document.getElementById("statPercent").textContent.replace('%','')) || 0, percentage, 500, "%");
    
    const missedEl = document.getElementById("statMissed");
    if (missedEl) {
        animateNumber("statMissed", parseInt(missedEl.textContent) || 0, missedCount, 500);
    }

    // 3. SVG Radial Progress Ring render
    document.getElementById("ringTaskTitle").textContent = task.name;
    document.getElementById("ringFractionText").textContent = `${completedCount} / ${task.totalCount}`;
    document.getElementById("ringPercentText").textContent = `${percentage}%`;
    
    const ringCircle = document.getElementById("progressRingCircle");
    ringCircle.setAttribute("style", `--gradient-glow-color: ${task.glow};`);
    
    const circumference = 439.8;
    const offset = circumference - (completedCount / task.totalCount) * circumference;
    ringCircle.style.strokeDashoffset = offset;

    // 4. Render Milestone Progression indicators
    updateMilestoneIndicators(percentage);

    // 5. Deadline Countdown Banner
    renderDeadlineBanner(task);

    // 6. Optimized Grid Checklist circles rendering
    generateAdaptiveGrid(task);

    // 7. Load auto-saving Notepad notes
    const notepad = document.getElementById("taskNotesInput");
    notepad.value = task.notes || "";
    document.getElementById("notesStatus").className = "notes-status-badge";
    document.getElementById("notesStatus").textContent = "Saved";

    // 8. Advanced overall analytics calculations
    renderAnalytics();
}

// Stats numbers counts multiplier
function animateNumber(elementId, start, end, duration, suffix = "") {
    const obj = document.getElementById(elementId);
    if (start === end) {
        obj.textContent = end + suffix;
        return;
    }
    
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.max(Math.abs(Math.floor(duration / range)), 12);
    
    const timer = setInterval(function() {
        current += increment;
        obj.textContent = current + suffix;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}

// ----------------------------------------------------
// MILESTONES LIGHT-UP & CONFETTI CELEBRATIONS
// ----------------------------------------------------
function updateMilestoneIndicators(percentage) {
    const milestones = [25, 50, 75, 100];
    
    milestones.forEach(m => {
        const pill = document.getElementById(`milestone${m}`);
        if (percentage >= m) {
            if (!pill.classList.contains("completed")) {
                pill.classList.add("completed");
                
                // Trigger dynamic confetti burst only if milestone was newly crossed in this active session
                if (!unlockedMilestonesThisSession[m]) {
                    unlockedMilestonesThisSession[m] = true;
                    
                    const rect = pill.getBoundingClientRect();
                    triggerParticleConfetti(rect.left + rect.width/2, rect.top + rect.height/2);
                    showToast(`🏆 Milestone Unlocked: Crossed the ${m}% progress mark!`, "success");
                }
            }
        } else {
            pill.classList.remove("completed");
            unlockedMilestonesThisSession[m] = false;
        }
    });
}

// High performance dynamic vanilla particles explosion (GPU accelerated via transform3d)
function triggerParticleConfetti(x, y) {
    const container = document.body;
    const particleCount = 45;
    const colors = ["#8b5cf6", "#6366f1", "#06b6d4", "#10b981", "#ec4899", "#f59e0b", "#ef4444"];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div");
        particle.className = "confetti-particle";
        
        // Random dimensions
        const size = Math.random() * 8 + 6;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Pick random color
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Define animation movement coordinates
        const duration = Math.random() * 2 + 1.5; // 1.5s - 3.5s duration
        const angle = Math.random() * Math.PI * 2; // Random flying vector direction
        const velocity = Math.random() * 150 + 80; // Distance force
        
        const destX = Math.cos(angle) * velocity;
        const destY = Math.sin(angle) * velocity + 150; // gravity drift downwards
        
        particle.style.setProperty("--start-x", `${x}px`);
        particle.style.setProperty("--start-y", `${y}px`);
        particle.style.setProperty("--dest-x", `${x + destX}px`);
        particle.style.setProperty("--dest-y", `${y + destY}px`);
        particle.style.setProperty("--duration", `${duration}s`);
        
        container.appendChild(particle);
        
        // Remove particle element from DOM after animation completes
        particle.addEventListener("animationend", () => {
            particle.remove();
        });
    }
}

// ----------------------------------------------------
// DEADLINE BANNER COUNTDOWN
// ----------------------------------------------------
function renderDeadlineBanner(task) {
    const banner = document.getElementById("deadlineBanner");
    const text = document.getElementById("deadlineText");
    
    if (!task.deadline) {
        banner.style.display = "none";
        return;
    }
    
    const targetDate = new Date(task.deadline + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    banner.style.display = "flex";
    
    if (diffDays > 0) {
        text.textContent = `Target Deadline: ${task.deadline} (${diffDays} days remaining to achieve milestone goals!)`;
        banner.style.background = "rgba(99, 102, 241, 0.12)";
        banner.style.borderColor = "rgba(99, 102, 241, 0.25)";
        banner.querySelector(".deadline-icon").innerHTML = '<i class="fa-solid fa-calendar-days" style="color: #a5b4fc;"></i>';
    } else if (diffDays === 0) {
        text.textContent = `URGENT: Today is the target deadline for "${task.name}"! Lock in remaining milestones today.`;
        banner.style.background = "rgba(245, 158, 11, 0.12)";
        banner.style.borderColor = "rgba(245, 158, 11, 0.25)";
        banner.querySelector(".deadline-icon").innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b;"></i>';
    } else {
        text.textContent = `OVERDUE: The targeted deadline for "${task.name}" passed ${Math.abs(diffDays)} days ago on ${task.deadline}.`;
        banner.style.background = "rgba(239, 68, 68, 0.12)";
        banner.style.borderColor = "rgba(239, 68, 68, 0.25)";
        banner.querySelector(".deadline-icon").innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>';
    }
}

// ----------------------------------------------------
// PERFORMANCE OPTIMIZED DYNAMIC ADAPTIVE GRID
// ----------------------------------------------------
function generateAdaptiveGrid(task) {
    const grid = document.getElementById("interactiveGrid");
    grid.innerHTML = "";
    
    // Performance: build circles inside a document fragment to prevent massive DOM reflow stutters
    const fragment = document.createDocumentFragment();
    const count = task.totalCount;
    
    task.completedItems = task.completedItems || [];
    task.missedItems = task.missedItems || [];

    for (let i = 0; i < count; i++) {
        const isCompleted = task.completedItems.includes(i);
        const isMissed = task.missedItems.includes(i);
        const circle = document.createElement("div");
        
        let stateClass = "";
        let tooltipState = "Pending";
        if (isCompleted) {
            stateClass = "completed";
            tooltipState = "Completed";
        } else if (isMissed) {
            stateClass = "missed";
            tooltipState = "Not Done / Missed";
        }

        circle.className = `checkbox-circle ${stateClass}`;
        circle.innerHTML = `
            ${i + 1}
            <span class="circle-tooltip">Checkpoint ${i + 1}: ${tooltipState}</span>
        `;
        
        circle.onclick = (e) => {
            createRipple(e, circle);
            
            // Cycle: Pending -> Completed -> Missed -> Pending
            if (!isCompleted && !isMissed) {
                task.completedItems.push(i);
            } else if (isCompleted) {
                task.completedItems = task.completedItems.filter(item => item !== i);
                task.missedItems.push(i);
            } else if (isMissed) {
                task.missedItems = task.missedItems.filter(item => item !== i);
            }
            
            task.updatedAt = Date.now();
            registerDailyActivity();
            saveState();

            // Selective DOM styling updates immediately bypasses sluggish full-grid redraw redraws!
            // Provides visual 60fps immediate click feedback
            setTimeout(() => {
                renderTaskList();
                renderDashboard();
            }, 100);
        };
        
        fragment.appendChild(circle);
    }
    
    grid.appendChild(fragment);
}

// Visual click ripple element inside dynamic circle
function createRipple(e, element) {
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.width = ripple.style.height = `${size}px`;
    
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    element.appendChild(ripple);
    
    ripple.addEventListener("animationend", () => {
        ripple.remove();
    });
}

function toggleAllGridItems(complete) {
    if (!currentTaskId || !tasks[currentTaskId]) return;
    
    const task = tasks[currentTaskId];
    task.completedItems = task.completedItems || [];
    task.missedItems = task.missedItems || [];
    
    if (complete) {
        // Checked indices from 0 to totalCount - 1
        task.completedItems = Array.from({ length: task.totalCount }, (_, i) => i);
        task.missedItems = [];
    } else {
        task.completedItems = [];
        task.missedItems = [];
    }
    
    task.updatedAt = Date.now();
    registerDailyActivity();
    saveState();
    renderTaskList();
    renderDashboard();
    
    showToast(complete ? `All ${task.totalCount} checkpoints completed!` : "Cleared all checkpoints progress", complete ? "success" : "warning");
}

function resetActiveCourse() {
    if (confirm("Reset active progress? This clears all milestones checklist checkboxes.")) {
        toggleAllGridItems(false);
    }
}

// ----------------------------------------------------
// NOTES AUTO-SAVING DEBOUNCED ENGINE
// ----------------------------------------------------
function handleNotesInput() {
    const statusBadge = document.getElementById("notesStatus");
    statusBadge.className = "notes-status-badge saving";
    statusBadge.textContent = "Saving...";
    
    // Debounce state writing: delays write until 750ms of typing silence to keep grid performance high
    clearTimeout(notesSaveTimeout);
    
    notesSaveTimeout = setTimeout(() => {
        if (!currentTaskId || !tasks[currentTaskId]) return;
        
        const notesValue = document.getElementById("taskNotesInput").value;
        tasks[currentTaskId].notes = notesValue;
        tasks[currentTaskId].updatedAt = Date.now();
        
        saveState();
        
        statusBadge.className = "notes-status-badge";
        statusBadge.textContent = "Saved";
    }, 750);
}

// ----------------------------------------------------
// GLASSMORPHIC POMODORO STUDY TIMER WIDGET
// ----------------------------------------------------
function setPomodoroMode(mode) {
    if (pomodoroIsRunning) {
        if (!confirm("Study clock is ticking down. Switch mode anyway?")) return;
        clearInterval(pomodoroTimer);
        pomodoroIsRunning = false;
    }
    
    pomodoroMode = mode;
    
    const focusBtn = document.getElementById("btnFocusMode");
    const breakBtn = document.getElementById("btnBreakMode");
    const playPauseBtn = document.getElementById("btnTimerStartPause");
    const timerIndicator = document.getElementById("timerIndicatorCircle");
    
    playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start';
    
    if (mode === "focus") {
        focusBtn.classList.add("active");
        breakBtn.classList.remove("active");
        pomodoroTimeLeft = 25 * 60; // 25 minutes
        pomodoroTotalDuration = 25 * 60;
        timerIndicator.style.stroke = "#ef4444"; // Red for focus
    } else {
        breakBtn.classList.add("active");
        focusBtn.classList.remove("active");
        pomodoroTimeLeft = 5 * 60; // 5 minutes break
        pomodoroTotalDuration = 5 * 60;
        timerIndicator.style.stroke = "#10b981"; // Green for break
    }
    
    updatePomodoroUI();
}

function togglePomodoroTimer() {
    const playPauseBtn = document.getElementById("btnTimerStartPause");
    
    if (pomodoroIsRunning) {
        // PAUSE TIMER
        clearInterval(pomodoroTimer);
        pomodoroIsRunning = false;
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
        showToast("Pomodoro timer paused", "info");
    } else {
        // START TIMER
        pomodoroIsRunning = true;
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
        showToast(`${pomodoroMode === 'focus' ? 'Focus Session' : 'Relaxing Break'} started!`, "success");
        
        pomodoroTimer = setInterval(() => {
            pomodoroTimeLeft--;
            updatePomodoroUI();
            
            if (pomodoroTimeLeft <= 0) {
                clearInterval(pomodoroTimer);
                pomodoroIsRunning = false;
                
                // Play highly premium, browser synthesized audio chime!
                playBellChime();
                
                if (pomodoroMode === "focus") {
                    // Update session logged hours
                    studyHours += 25 / 60; // Add 25 minutes fraction
                    localStorage.setItem("study_hours_logged", studyHours.toFixed(1));
                    
                    showToast("Focus duration completed! Excellent effort, take a break.", "success");
                    alert("Focus session complete! Time to take a break.");
                    setPomodoroMode("break");
                } else {
                    showToast("Relaxing break is over. Reset focus session when ready!", "success");
                    alert("Break is over! Time to focus.");
                    setPomodoroMode("focus");
                }
            }
        }, 1000);
    }
}

function resetPomodoroTimer() {
    if (pomodoroIsRunning) {
        clearInterval(pomodoroTimer);
        pomodoroIsRunning = false;
    }
    setPomodoroMode(pomodoroMode);
    showToast("Pomodoro session reset", "info");
}

function updatePomodoroUI() {
    // 1. Text display time
    const mins = Math.floor(pomodoroTimeLeft / 60);
    const secs = pomodoroTimeLeft % 60;
    document.getElementById("pomodoroTimerText").textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    // 2. SVG ring indicator math (circumference is 301.6 -> 2 * pi * 48)
    const indicator = document.getElementById("timerIndicatorCircle");
    const circumference = 301.6;
    const offset = (pomodoroTimeLeft / pomodoroTotalDuration) * circumference;
    indicator.style.strokeDashoffset = circumference - offset;
    
    // 3. Logger hours rendering
    document.getElementById("studySessionHours").textContent = `${studyHours.toFixed(1)} hrs focused`;
}

// Web Audio API Synthesized warm Bell alert. Completely asset-free!
function playBellChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 pitch chime
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5 chord ring
        
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
        
        osc.start();
        osc.stop(ctx.currentTime + 1.8);
    } catch(e) {
        console.warn("Audio Context blocked by browser auto-play policy");
    }
}

// ----------------------------------------------------
// PRODUCTIVITY METRICS CARD ANALYTICS
// ----------------------------------------------------
function renderAnalytics() {
    let maxPercent = -1;
    let highScoreTitle = "No Active Tracks";
    let highScoreVal = 0;
    
    let lastUpdatedTask = null;
    
    const allTasks = Object.values(tasks);
    
    allTasks.forEach(task => {
        const percent = calculatePercentage(task);
        if (percent > maxPercent) {
            maxPercent = percent;
            highScoreTitle = task.name;
            highScoreVal = percent;
        }
        
        if (task.updatedAt) {
            if (!lastUpdatedTask || task.updatedAt > lastUpdatedTask.updatedAt) {
                lastUpdatedTask = task;
            }
        }
    });
    
    document.getElementById("analyticsHighScoreTitle").textContent = highScoreTitle;
    document.getElementById("analyticsHighScoreTitle").title = highScoreTitle;
    document.getElementById("analyticsHighScoreValue").textContent = `${highScoreVal}%`;
    document.getElementById("analyticsHighScoreFill").style.width = `${highScoreVal}%`;
    
    const recentTitle = document.getElementById("analyticsRecentTitle");
    const recentTime = document.getElementById("analyticsRecentTime");
    
    if (lastUpdatedTask) {
        recentTitle.textContent = lastUpdatedTask.name;
        recentTitle.title = lastUpdatedTask.name;
        recentTime.textContent = formatRelativeTime(lastUpdatedTask.updatedAt);
    } else {
        recentTitle.textContent = "No recent updates";
        recentTime.textContent = "Updates will register here.";
    }
}

function formatRelativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return "Just now";
    
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

// Daily update tracker streak mechanics
function registerDailyActivity() {
    const today = new Date().toDateString();
    const lastActiveDate = localStorage.getItem("class_tracker_last_active_date_v2");
    let streak = parseInt(localStorage.getItem("class_tracker_active_streak_v2")) || 0;
    
    if (!lastActiveDate) {
        streak = 1;
        localStorage.setItem("class_tracker_last_active_date_v2", today);
        localStorage.setItem("class_tracker_active_streak_v2", streak);
    } else if (lastActiveDate !== today) {
        const lastDateObj = new Date(lastActiveDate);
        const todayObj = new Date(today);
        
        const diffHours = (todayObj - lastDateObj) / (1000 * 60 * 60);
        
        if (diffHours <= 36) { 
            streak += 1;
            showToast(`🔥 Streak continued! Day ${streak}`, "success");
        } else {
            streak = 1;
            showToast("Day missed. Let's restart a new streak!", "info");
        }
        
        localStorage.setItem("class_tracker_last_active_date_v2", today);
        localStorage.setItem("class_tracker_active_streak_v2", streak);
    }
    
    updateStreakDisplay();
}

function updateStreakDisplay() {
    const streak = parseInt(localStorage.getItem("class_tracker_active_streak_v2")) || 0;
    document.getElementById("streakNumberText").textContent = streak;
    
    const tip = document.getElementById("streakTipText");
    if (streak === 0) {
        tip.textContent = "Start tracking daily!";
    } else if (streak < 3) {
        tip.textContent = "Good start, keep it up!";
    } else if (streak < 7) {
        tip.textContent = "You're on fire! 🔥";
    } else {
        tip.textContent = "Absolute tracking legend! 👑";
    }
}

// ----------------------------------------------------
// POPUP DIALOG FORM MODAL CONTROLS
// ----------------------------------------------------
function openModal(mode, taskId = null) {
    const modal = document.getElementById("taskModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalMode = document.getElementById("modalMode");
    const modalTaskId = document.getElementById("modalTaskId");
    
    const taskNameInput = document.getElementById("taskNameInput");
    const taskCountInput = document.getElementById("taskCountInput");
    const taskCategorySelect = document.getElementById("taskCategorySelect");
    const taskDeadlineInput = document.getElementById("taskDeadlineInput");
    const btnSubmit = document.getElementById("btnSubmit");
    
    // Clear selected bubbles styling
    document.querySelectorAll(".color-option").forEach(opt => opt.classList.remove("selected"));
    
    if (mode === "add") {
        modalTitle.textContent = "Create New Course";
        modalMode.value = "add";
        modalTaskId.value = "";
        
        taskNameInput.value = "";
        taskCountInput.value = "50";
        taskCountInput.disabled = false; // Enabled for new creations
        taskCategorySelect.value = "Study";
        taskDeadlineInput.value = "";
        btnSubmit.textContent = "Create Course";
        
        const defaultColor = document.querySelector(".color-option");
        defaultColor.classList.add("selected");
        activeSelectedTheme = defaultColor.getAttribute("data-gradient");
        activeSelectedGlow = defaultColor.getAttribute("data-glow");
    } else {
        const task = tasks[taskId];
        if (!task) return;
        
        modalTitle.textContent = "Edit Course Properties";
        modalMode.value = "edit";
        modalTaskId.value = taskId;
        
        taskNameInput.value = task.name;
        taskCountInput.value = task.totalCount;
        taskCountInput.disabled = true; // Lock item count to prevent dynamic checkbox index deletions
        taskCategorySelect.value = task.category || "Study";
        taskDeadlineInput.value = task.deadline || "";
        btnSubmit.textContent = "Apply Changes";
        
        let foundOption = false;
        document.querySelectorAll(".color-option").forEach(opt => {
            if (opt.getAttribute("data-gradient") === task.themeColor) {
                opt.classList.add("selected");
                activeSelectedTheme = task.themeColor;
                activeSelectedGlow = task.glow;
                foundOption = true;
            }
        });
        
        if (!foundOption) {
            const defaultColor = document.querySelector(".color-option");
            defaultColor.classList.add("selected");
            activeSelectedTheme = defaultColor.getAttribute("data-gradient");
            activeSelectedGlow = defaultColor.getAttribute("data-glow");
        }
    }
    
    modal.classList.add("active");
    taskNameInput.focus();
}

function closeModal() {
    document.getElementById("taskModal").classList.remove("active");
}

function selectColorTheme(element) {
    document.querySelectorAll(".color-option").forEach(opt => opt.classList.remove("selected"));
    element.classList.add("selected");
    
    activeSelectedTheme = element.getAttribute("data-gradient");
    activeSelectedGlow = element.getAttribute("data-glow");
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const mode = document.getElementById("modalMode").value;
    const taskId = document.getElementById("modalTaskId").value;
    const name = document.getElementById("taskNameInput").value.trim();
    const totalCount = parseInt(document.getElementById("taskCountInput").value) || 50;
    const category = document.getElementById("taskCategorySelect").value;
    const deadline = document.getElementById("taskDeadlineInput").value;
    
    if (!name) return;
    
    if (mode === "add") {
        const newId = "task_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        
        tasks[newId] = {
            id: newId,
            name: name,
            totalCount: totalCount,
            completedItems: [], // No checklist items checked initially
            missedItems: [], // Initial empty missed items array
            category: category,
            themeColor: activeSelectedTheme,
            glow: activeSelectedGlow,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            deadline: deadline,
            notes: "",
            archived: false
        };
        
        currentTaskId = newId;
        saveState();
        showToast(`Created Course "${name}"!`, "success");
    } else {
        if (tasks[taskId]) {
            tasks[taskId].name = name;
            tasks[taskId].category = category;
            tasks[taskId].themeColor = activeSelectedTheme;
            tasks[taskId].glow = activeSelectedGlow;
            tasks[taskId].deadline = deadline;
            tasks[taskId].updatedAt = Date.now();
            
            saveState();
            showToast(`Updated Course "${name}"`, "success");
        }
    }
    
    closeModal();
    renderTaskList();
    renderDashboard();
}

// ----------------------------------------------------
// TOAST NOTIFICATIONS POPUP INJECTION
// ----------------------------------------------------
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconClass = "fa-solid fa-circle-info";
    if (type === "success") iconClass = "fa-solid fa-circle-check";
    else if (type === "warning") iconClass = "fa-solid fa-triangle-exclamation";
    else if (type === "danger") iconClass = "fa-solid fa-circle-exclamation";
    
    toast.innerHTML = `
        <span class="toast-icon"><i class="${iconClass}"></i></span>
        <span class="toast-msg">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add("show");
    }, 50);
    
    setTimeout(() => {
        toast.classList.remove("show");
        toast.addEventListener("transitionend", () => {
            toast.remove();
        });
    }, 3500);
}

// ----------------------------------------------------
// SIMULATED DATABASE-FREE FRONTEND AUTHENTICATION
// ----------------------------------------------------
function openAuthModal() {
    const modal = document.getElementById("authModal");
    if (!modal) return;

    if (activeUser) {
        // Show Profile Dashboard View
        document.getElementById("authModalTitle").textContent = "Account Control Center";
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("registerForm").style.display = "none";
        document.getElementById("profileDashboardView").style.display = "flex";

        // Set info
        const profileAvatar = document.getElementById("profileDashboardAvatar");
        if (profileAvatar) {
            if (activeUser.picture) {
                profileAvatar.innerHTML = `<img src="${activeUser.picture}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" referrerpolicy="no-referrer">`;
            } else {
                profileAvatar.textContent = getInitials(activeUser.fullname);
            }
        }
        document.getElementById("profileDashboardName").textContent = activeUser.fullname;
        document.getElementById("profileDashboardEmail").textContent = activeUser.email;

        // Statistics in profile modal
        const streak = parseInt(localStorage.getItem("class_tracker_active_streak_v2")) || 0;
        const totalTracks = Object.keys(tasks).length;
        document.getElementById("profileStatStreak").textContent = streak;
        document.getElementById("profileStatTracks").textContent = totalTracks;
    } else {
        // Show Login Form by default
        document.getElementById("authModalTitle").textContent = "Sign In to Tracify";
        document.getElementById("loginForm").style.display = "flex";
        document.getElementById("registerForm").style.display = "none";
        document.getElementById("profileDashboardView").style.display = "none";
    }

    modal.classList.add("active");
}

function closeAuthModal() {
    const modal = document.getElementById("authModal");
    if (modal) modal.classList.remove("active");
}

function switchAuthView(view) {
    const title = document.getElementById("authModalTitle");
    const login = document.getElementById("loginForm");
    const register = document.getElementById("registerForm");

    if (view === "login") {
        title.textContent = "Sign In to Tracify";
        login.style.display = "flex";
        register.style.display = "none";
    } else {
        title.textContent = "Create Tracify Account";
        login.style.display = "none";
        register.style.display = "flex";
        
        // Clear inputs
        document.getElementById("regFullName").value = "";
        document.getElementById("regUsername").value = "";
        document.getElementById("regEmail").value = "";
        document.getElementById("regPassword").value = "";
    }
}

function getInitials(name) {
    if (!name) return "GU";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function updateUserProfileUI() {
    const nameLabel = document.getElementById("userNameLabel");
    const roleLabel = document.getElementById("userRoleLabel");
    const avatarBadge = document.getElementById("userAvatarBadge");
    const greetingHeading = document.getElementById("greetingHeading");

    const activeName = getActiveUserName();
    const initials = getInitials(activeName);

    if (nameLabel) nameLabel.textContent = activeName;
    
    if (avatarBadge) {
        if (activeUser && activeUser.picture) {
            avatarBadge.innerHTML = `<img src="${activeUser.picture}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" referrerpolicy="no-referrer">`;
        } else {
            avatarBadge.innerHTML = initials;
        }
    }

    if (activeUser) {
        if (roleLabel) roleLabel.textContent = `@${activeUser.username}`;
    } else {
        if (roleLabel) roleLabel.textContent = "Click to Sign In";
    }
    
    // Trigger header clock greeting update immediately
    if (greetingHeading) {
        const hr = new Date().getHours();
        let greeting = `Welcome back, ${activeName}`;
        if (hr < 12) greeting = `Good morning, ${activeName}`;
        else if (hr < 18) greeting = `Good afternoon, ${activeName}`;
        else greeting = `Good evening, ${activeName}`;
        greetingHeading.textContent = greeting;
    }
}

function handleRegisterSubmit(e) {
    e.preventDefault();

    const fullname = document.getElementById("regFullName").value.trim();
    const username = document.getElementById("regUsername").value.trim().toLowerCase();
    const email = document.getElementById("regEmail").value.trim().toLowerCase();
    const password = document.getElementById("regPassword").value;

    if (!fullname || !username || !email || !password) return;

    // Check if username already exists
    const exists = registeredUsers.some(u => u.username === username);
    if (exists) {
        showToast("Username already registered!", "danger");
        return;
    }

    // Register user
    const newUser = { fullname, username, email, password };
    registeredUsers.push(newUser);
    localStorage.setItem("tracify_users", JSON.stringify(registeredUsers));

    // Sign in immediately
    activeUser = newUser;
    localStorage.setItem("tracify_active_user", JSON.stringify(activeUser));

    showToast(`Welcome to Tracify, ${fullname}!`, "success");
    closeAuthModal();

    // Session Switch Routing
    loadTasksForUser();
    validateSelectedTask();
    updateUserProfileUI();
    renderTaskList();
    renderDashboard();
}

function handleLoginSubmit(e) {
    e.preventDefault();

    const usernameOrEmail = document.getElementById("loginUsername").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    if (!usernameOrEmail || !password) return;

    // Find credentials
    const user = registeredUsers.find(u => 
        (u.username === usernameOrEmail || u.email === usernameOrEmail) && 
        u.password === password
    );

    if (!user) {
        showToast("Invalid credentials. Please try again.", "danger");
        return;
    }

    // Sign In
    activeUser = user;
    localStorage.setItem("tracify_active_user", JSON.stringify(activeUser));

    showToast(`Logged in as ${activeUser.fullname}`, "success");
    closeAuthModal();

    // Session Switch Routing
    loadTasksForUser();
    validateSelectedTask();
    updateUserProfileUI();
    renderTaskList();
    renderDashboard();
}

function handleLogout() {
    activeUser = null;
    localStorage.removeItem("tracify_active_user");

    showToast("Logged out of Tracify session", "info");
    closeAuthModal();

    // Session Switch Routing (Guest mode reload)
    loadTasksForUser();
    validateSelectedTask();
    updateUserProfileUI();
    renderTaskList();
    renderDashboard();
}

// ----------------------------------------------------
// SIMULATED GOOGLE OAUTH INTERFACES
// ----------------------------------------------------
// Real Google Authentication Support

function initRealGoogleSignIn() {
    if (!googleClientId) return;
    
    try {
        if (typeof google !== "undefined" && google.accounts && google.accounts.id) {
            google.accounts.id.initialize({
                client_id: googleClientId,
                callback: handleRealGoogleCredential
            });
            // Try to prompt One Tap automatically!
            google.accounts.id.prompt();
        }
    } catch (e) {
        console.error("Failed to initialize Google One Tap:", e);
    }
}

function handleGoogleSignIn() {
    // If we have a Google Client ID, trigger the real Google Sign-In selector!
    if (googleClientId) {
        try {
            if (typeof google !== "undefined" && google.accounts && google.accounts.id) {
                google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: handleRealGoogleCredential
                });
                
                // Show standard Google selector popup/prompt
                google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        // Fallback to modal if one tap is skipped or not displayed
                        showGoogleModalAsFallback();
                    }
                });
                return;
            }
        } catch (e) {
            console.warn("Real Google Sign-In failed to start, falling back:", e);
        }
    }
    
    // Fallback: show the custom simulated Google account selector modal
    showGoogleModalAsFallback();
}

function showGoogleModalAsFallback() {
    const googleModal = document.getElementById("googleAuthModal");
    if (!googleModal) return;

    // Show account selector list, hide loading spinner
    document.getElementById("googleAccountsList").style.display = "flex";
    document.getElementById("googleLoadingSpinner").style.display = "none";

    googleModal.classList.add("active");
}

function closeGoogleAuthModal() {
    const googleModal = document.getElementById("googleAuthModal");
    if (googleModal) googleModal.classList.remove("active");
}

function selectGoogleAccount(email, fullname) {
    // Hide list, show loading spinner
    document.getElementById("googleAccountsList").style.display = "none";
    document.getElementById("googleLoadingSpinner").style.display = "flex";

    // Simulate OAuth delay (1.5 seconds)
    setTimeout(() => {
        const username = email.split('@')[0];
        
        // Find or create account
        let user = registeredUsers.find(u => u.username === username || u.email === email);
        if (!user) {
            user = { 
                fullname: fullname, 
                username: username, 
                email: email, 
                password: "google_oauth_bypass" 
            };
            registeredUsers.push(user);
            localStorage.setItem("tracify_users", JSON.stringify(registeredUsers));
        }

        // Sign In
        activeUser = user;
        localStorage.setItem("tracify_active_user", JSON.stringify(activeUser));

        showToast(`Successfully signed in with Google as ${fullname}`, "success");
        
        closeGoogleAuthModal();
        closeAuthModal();

        // Reload user session tasks and UI
        loadTasksForUser();
        validateSelectedTask();
        updateUserProfileUI();
        renderTaskList();
        renderDashboard();
    }, 1500);
}

function promptCustomGoogleAccount() {
    const email = prompt("Enter your Google Account Email:");
    if (!email) return;
    
    if (!email.includes("@") || email.split("@")[0].length < 2) {
        showToast("Please enter a valid email address", "danger");
        return;
    }

    let defaultName = email.split("@")[0];
    defaultName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
    const fullname = prompt("Enter your Full Name:", defaultName);
    if (!fullname) return;

    selectGoogleAccount(email.trim().toLowerCase(), fullname.trim());
}

function handleRealGoogleCredential(response) {
    if (!response || !response.credential) {
        showToast("Google authentication failed", "danger");
        return;
    }
    
    try {
        // Decode the JWT token on the client-side
        const payload = decodeJwt(response.credential);
        
        const email = payload.email;
        const fullname = payload.name;
        const picture = payload.picture; // Real Google Profile Picture!
        const username = email.split('@')[0];
        
        // Find or create the user in our local simulated registration database
        let user = registeredUsers.find(u => u.username === username || u.email === email);
        if (!user) {
            user = { 
                fullname: fullname, 
                username: username, 
                email: email, 
                password: "google_oauth_bypass",
                picture: picture
            };
            registeredUsers.push(user);
            localStorage.setItem("tracify_users", JSON.stringify(registeredUsers));
        } else {
            user.picture = picture;
        }

        // Sign In
        activeUser = user;
        localStorage.setItem("tracify_active_user", JSON.stringify(activeUser));

        showToast(`Successfully signed in with Google as ${fullname}`, "success");
        
        closeGoogleAuthModal();
        closeAuthModal();

        // Reload user session tasks and UI
        loadTasksForUser();
        validateSelectedTask();
        updateUserProfileUI();
        renderTaskList();
        renderDashboard();
        
    } catch (e) {
        console.error("Failed to decode Google Token:", e);
        showToast("Error processing Google sign-in response", "danger");
    }
}

function decodeJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function saveGoogleClientId() {
    const input = document.getElementById("googleClientIdInput");
    const status = document.getElementById("googleClientIdStatus");
    if (!input || !status) return;

    const val = input.value.trim();
    if (val) {
        googleClientId = val;
        localStorage.setItem("tracify_google_client_id", val);
        status.textContent = "Google Client ID Saved! Initializing direct login connection...";
        status.style.color = "#34a853";
        
        // Reinitialize real Google Sign-In
        initRealGoogleSignIn();
        
        setTimeout(() => {
            closeGoogleAuthModal();
            // Trigger selector
            handleGoogleSignIn();
        }, 1200);
    } else {
        googleClientId = "";
        localStorage.removeItem("tracify_google_client_id");
        status.textContent = "Client ID cleared. Switched to demo simulated accounts.";
        status.style.color = "#ea4335";
    }
}