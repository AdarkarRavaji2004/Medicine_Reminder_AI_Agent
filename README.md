# Medicine_Reminder_AI_Agent
AICTE Internship Project
# 🩺 Aegis AI – Smart Care Companion

Aegis AI is an AI-powered healthcare assistant designed to help users manage their medications, receive timely reminders, track medication adherence, and interact with an intelligent health companion. The project combines Artificial Intelligence with workflow automation using **n8n**, making medication management simple, reliable, and user-friendly.

---

## 📌 Project Overview

Missing medications can lead to serious health complications. Aegis AI solves this problem by providing an intelligent medicine reminder system that automatically schedules reminders, stores medication information, and tracks adherence through an interactive dashboard.

The system uses AI to understand natural language medicine instructions, extracts important information, stores reminders, and automatically notifies users at the correct time.

---

## ✨ Features

- 🤖 AI-powered medicine information extraction
- 💬 Natural language medicine scheduling
- ⏰ Automatic medicine reminders
- 📅 Daily medication timeline
- 📊 Adherence tracking dashboard
- 📈 Progress monitoring
- 📧 Email reminder notifications
- 🗂️ Medication management
- ✅ Mark medicine as taken
- 📉 Pending and completed reminder tracking
- 🔒 User-friendly dashboard interface
- ⚡ Workflow automation using n8n

---

## 🧠 How It Works

1. User enters medicine information in natural language.
2. AI extracts:
   - Medicine Name
   - Dosage
   - Reminder Time
   - Frequency
   - Duration
3. Information is stored in Google Sheets (or database).
4. n8n Schedule Trigger checks reminders every minute.
5. If the reminder time matches the current time:
   - Email notification is sent.
   - Dashboard is updated.
   - Reminder status is changed.
6. User marks medicine as taken.
7. Adherence statistics are automatically updated.

---

## 🏗️ System Architecture

```
User
   │
   ▼
AI Chat Interface
   │
   ▼
AI Agent (OpenAI)
   │
   ▼
Extract Medicine Details
   │
   ▼
Google Sheets Database
   │
   ▼
n8n Scheduler
   │
   ▼
Check Reminder Time
   │
   ▼
Send Email Notification
   │
   ▼
Dashboard Update
```

---

## 🛠️ Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript
- Modern Responsive UI

### Backend & Automation
- n8n
- OpenAI API
- Google Sheets API
- Gmail API

### AI
- OpenAI GPT
- Natural Language Processing (NLP)

### Database
- Google Sheets

---

## 📂 Project Structure

```
Aegis-AI/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── n8n-workflow/
│   └── medicine-reminder.json
│
├── assets/
│   ├── dashboard.png
│   └── logo.png
│
└── README.md
```

---

## ⚙️ Workflow

### Workflow 1 – AI Medicine Registration

```
Chat Trigger
      │
      ▼
AI Agent
      │
      ▼
Extract Medicine Details
      │
      ▼
Google Sheets
      │
      ▼
Confirmation Message
```

### Workflow 2 – Reminder Scheduler

```
Schedule Trigger
      │
      ▼
Google Sheets
      │
      ▼
Check Reminder Time
      │
      ▼
Send Email Reminder
      │
      ▼
Update Reminder Status
```

---

## 📊 Dashboard Features

- Next Scheduled Medication
- Timeline Schedule
- Medication List
- Adherence Summary
- Daily Progress
- Pending & Completed Medicines
- AI Safety Alerts
- Settings Panel

---

## 🎯 Future Enhancements

- 📱 WhatsApp Notifications
- 📞 Voice Call Reminders
- 📲 Mobile Application
- 🧾 Prescription OCR
- 💊 Drug Interaction Detection
- 📷 Medicine Image Recognition
- 🧠 Personalized AI Health Assistant
- 👨‍⚕️ Doctor Dashboard
- 👨‍👩‍👧 Family Member Notifications
- 🌐 Cloud Database Integration

---

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/Aegis-AI.git
```

### Install Dependencies

```bash
npm install
```

### Import n8n Workflow

1. Open n8n
2. Import the workflow JSON file
3. Configure:
   - OpenAI API Key
   - Google Sheets Credentials
   - Gmail Credentials
4. Activate the workflow

---

## 📷 Screenshots

### Dashboard

> Add your dashboard screenshot here.

---

## 🎓 Learning Outcomes

- AI Agent Development
- Workflow Automation
- Prompt Engineering
- OpenAI API Integration
- n8n Automation
- Google Sheets Integration
- Gmail Automation
- REST APIs
- Dashboard Design
- Healthcare Automation

---

## 👨‍💻 Author

**Ravaji Adarkar**

Computer Science Engineering Student

AI & Automation Enthusiast

---

## ⭐ Support

If you found this project helpful, please consider giving it a ⭐ on GitHub.

It motivates further development and improvements.

---

## 📄 License

This project is developed for educational and learning purposes.
