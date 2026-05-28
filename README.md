# 📊 TRACIFY — Premium Progress Tracking & Productivity Dashboard

> A premium, interactive glassmorphic progress tracking dashboard with dynamic counters, category grids, a Pomodoro focus widget, and milestone celebrations to build daily momentum.

---

## ✨ Features

TRACIFY is designed to be a premium, responsive, and aesthetically stunning dashboard to manage courses, syllabus elements, coding sheets, daily routines, or gym workouts. It comes packed with features designed to build daily momentum and keep you highly focused:

### 🎨 Visual & UI Excellence
- **Harmonious Dark Theme**: A custom tailored, sleek modern dark mode palette (`#090d16`) with gorgeous glowing gradients.
- **Glassmorphic Cards**: Beautiful glassmorphic components utilizing premium backdrop-filter blurs, subtle borders, and inner shadows.
- **Floating Background Blobs**: Fluid, animating neon background gradient blobs that breathe life into the dashboard.
- **Interactive Mouse Spotlight**: A high-end interactive mouse glow effect that tracks cursor movements across the main dashboard.
- **Smooth Micro-Animations**: Refined transitions and click/hover states for an ultra-premium user experience.
- **Fully Responsive**: Perfectly adapts to any viewport width, including a slide-out drawer menu for mobile and tablet devices.

### 📈 Adaptive Tracking & Analytics
- **Multi-Category Filter**: Easily organize tracks under **Study**, **Coding**, **Fitness**, **Work**, **Self (Personal)**, or **Habit**.
- **Sleek Dynamic Sidebar**: Search, sort by progress, filter active/archived courses, and quickly create new tracks.
- **SVG Radial Progress Ring**: Beautiful vector circle that dynamically updates the percentage and fraction of milestones completed for the selected course.
- **Adaptive Completion Matrix**: An auto-fitting grid supporting anywhere from **10 to 500+ milestone items** with smooth scrolling, supporting quick actions to check all or reset.
- **Progress Milestones**: Highlights key milestone targets at **25%**, **50%**, **75%**, and **100%**.
- **Advanced Productivity Analytics**:
  - 🔥 **Daily Streak Counter** tracking daily update consistency.
  - 🏆 **Highest Percentage Course** banner demonstrating your peak achievement.
  - ⏱️ **Recently Updated Tracker** logging which item was changed and when.

### ⏱️ Focused Productivity Utilities
- **Pomodoro Focus Timer**: 
  - Switch between **Focus** (25 min) and **Break** (5 min) sessions.
  - Fully integrated circular SVG radial countdown.
  - Keeps track of focused study hours in real-time.
- **Auto-saving Notes**: 
  - Rich sidebar notepad to store course links, references, cheatsheets, or notes.
  - Automatically saves draft changes locally as you type.

### 🔑 Security & Simulated Auth
- **Simulated Accounts**: Full-featured sign-in and sign-up dialogs to support user switching.
- **Google Sign-In Simulation**: Experience premium OAuth flows with simulated login windows.
- **Real Google Identity Services SDK Support**: Input a Google OAuth Client ID directly into the application to switch from simulation to standard Google OAuth verification.

---

## 🛠️ Built With

- **HTML5**: Structured semantically and utilizing modern SVG vectors.
- **CSS3 (Vanilla)**: Curated CSS variables, custom keyframe animations, glassmorphic filters, and fully responsive layouts.
- **JavaScript (Vanilla)**: Clean, high-performance logic with robust state management, modular components, and `localStorage` persistence.
- **FontAwesome**: High-quality vector iconography.

---

## 🚀 Getting Started

Since TRACIFY is a vanilla frontend application, you do not need to install complex build tools or runtime environments. 

### 1. Prerequisites
- Any modern web browser (Google Chrome, Firefox, Microsoft Edge, Safari).

### 2. Local Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/Anmisha2006/TRACIFY.git
   ```
2. Navigate into the project directory:
   ```bash
   cd TRACIFY
   ```

### 3. Running the Project
Simply open the `index.html` file in your favorite browser, or run a local development server for the best experience:

- **Using VS Code**: Right-click `index.html` and select **Open with Live Server**.
- **Using Python**:
  ```bash
  python -m http.server 8000
  ```
  Then open `http://localhost:8000` in your browser.
- **Using Node.js (`http-server`)**:
  ```bash
  npx http-server .
  ```

---

## 💾 Local Storage Persistence

All your created courses, checked matrix items, Pomodoro history, current theme, active filters, and custom notes are stored locally in the browser's `localStorage`. You won't lose your data even if you refresh or close the tab!

---

## 📄 License

This project is licensed under the MIT License. Feel free to use, modify, and distribute it.

---

*Built with passion to help you track everything and build momentum daily. 🚀*
