# 🗂️ ProjectCamp — Complete Development Guide

> Is project me ab tak jo kuch naya bana, jo bugs fix hue aur jo improvements hue — **sab kuch, step by step**: kya problem thi, kya use kiya, kaise banaya, kaise test kiya.

**Live:** https://projectcamp-app.vercel.app
**Repo:** https://github.com/Aditya-321-prog/project-management

---

## 📑 Table of Contents

1. [Shuruaat: project ki halat aur kaam karne ka tareeka](#1-shuruaat-project-ki-halat-aur-kaam-karne-ka-tareeka)
2. [.env file dobara banana](#2-env-file-dobara-banana)
3. [Feature: Task ke saath Links](#3-feature-task-ke-saath-links)
4. [Feature: Edit Task me files + links manage karna](#4-feature-edit-task-me-files--links-manage-karna)
5. [Mailtrap se real emails (Gmail SMTP)](#5-mailtrap-se-real-emails-gmail-smtp)
6. [Full code review: bugs, security, UI, optimization](#6-full-code-review-bugs-security-ui-optimization)
7. [Feature: Sorting + Filters](#7-feature-sorting--filters)
8. [Feature: My Tasks page](#8-feature-my-tasks-page)
9. [Feature: Kanban Board](#9-feature-kanban-board)
10. [Feature: Project Chat](#10-feature-project-chat)
11. [Feature: Deadline Reminders](#11-feature-deadline-reminders)
12. [Feature: Analytics Dashboard](#12-feature-analytics-dashboard)
13. [Feature: Export Report (PDF / CSV)](#13-feature-export-report-pdf--csv)
14. [Feature: Cloudinary file storage](#14-feature-cloudinary-file-storage)
15. [Task Details page redesign + feedback](#15-task-details-page-redesign--feedback)
16. [Activity feed redesign + submission links](#16-activity-feed-redesign--submission-links)
17. [Landing page](#17-landing-page)
18. [Deployment (Render + Vercel) aur uske issues](#18-deployment-render--vercel-aur-uske-issues)
19. [Appendix: packages, APIs, socket events, env, files](#19-appendix)
20. [Interview me kaise explain karein](#20-interview-me-kaise-explain-karein)

---

## 1. Shuruaat: project ki halat aur kaam karne ka tareeka

### Project kya tha
Ek MERN project management app (**ProjectCamp**):
- **Backend** (`backend/`, pehle `project-management (1)/`): Node.js + Express 5 + MongoDB (Mongoose) + Socket.io + JWT
- **Frontend** (`frontend/`, pehle `project-management-frontend/`): React 19 + Vite + Tailwind CSS 4 + Zustand + Axios

Pehle se tha: login/register, projects, members, tasks (files ke saath), subtasks, comments, notes, notifications, basic dashboard.

**Problem:** laptop format hone se `.env` file chali gayi thi, aur app chal nahi rahi thi.

### Har feature par kaam karne ka tareeka (process)

Har kaam me yahi steps follow kiye gaye:

| Step | Kya kiya | Tool / command |
|---|---|---|
| 1. Code padhna | Repo clone karke related files padhi — model, controller, routes, React page | `git clone`, `grep`, `sed` |
| 2. Plan | Backend me kya badlega (model, API), frontend me kya (page, component) | — |
| 3. Backend likhna | Model field → controller logic → route | Node.js, Mongoose |
| 4. Frontend likhna | Service (API call) → component → page me jodna | React, Tailwind |
| 5. Syntax check | Har backend file ka syntax check | `node --check file.js` |
| 6. Lint + build | Frontend errors aur build check | `npx eslint src`, `npx vite build` |
| 7. Smoke test | Server start karke routes hit kiye (bina DB ke) | Node `fetch` script |
| 8. Logic test | Database ki jagah "mock" data dekar logic test | Node script, models ke functions override |
| 9. Visual test | Asli browser me screenshots (landing, PDF) | Playwright (headless Chromium), `pdftoppm` |
| 10. Delivery | Sirf badli hui files ek zip me, same folder structure ke saath | `zip` |

> **Mock testing kya hai?** Mere paas MongoDB nahi tha, isliye `Task.find = () => fakeData` jaisa karke model ke functions ko nakli data dene wala bana diya. Isse controller ka asli logic (calculation, filter, permission) bina database ke test ho gaya.

---

## 2. .env file dobara banana

### Problem
`.env` GitHub par nahi thi (achhi baat — secrets hamesha `.gitignore` me hone chahiye), aur laptop format me local copy bhi chali gayi.

### Kaise pata kiya kaunse variables chahiye
Code me jahan bhi `process.env.XYZ` likha tha, sab dhoondha:
```bash
grep -rhoE "process\.env\.[A-Z_0-9]+|import\.meta\.env\.[A-Z_0-9]+" --exclude-dir=node_modules . | sort -u
```

### Kya-kya mila aur value kahan se aayi
| Variable | Kahan se laaye |
|---|---|
| `PORT=8000` | Frontend me `localhost:8000` hardcoded tha, isliye 8000 hi rakhna pada |
| `CORS_ORIGIN`, `FRONTEND_URL` | Vite ka default `http://localhost:5173` |
| `MONGO_URI` | MongoDB Atlas → Connect → Drivers |
| `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` | Naye random banaye: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_EXPIRY` | `1d`, `10d` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials |
| `MAILTRAP_*` (baad me `GMAIL_*`) | Mailtrap inbox SMTP settings |
| Frontend: `VITE_GOOGLE_CLIENT_ID` | Same Google Client ID |

### Security points jo seekhe
- Secrets `test` jaise kamzor nahi hone chahiye — koi bhi fake login token bana sakta hai.
- `.env` ka screenshot share karte waqt values blur karo.
- Atlas me **Network Access** me IP allow karna padta hai (laptop format ke baad IP badal sakta hai).

---

## 3. Feature: Task ke saath Links

### Goal
Admin task banate waqt sirf files nahi, **links** bhi attach kar sake (Figma, Google Docs, GitHub...).

### Backend
**1. Model** — `models/task.models.js` me naya field:
```js
links: [{
  title: { type: String, trim: true, default: "" },
  url:   { type: String, required: true, trim: true },
  addedBy: { type: Schema.Types.ObjectId, ref: "User" },
  addedAt: { type: Date, default: Date.now },
}]
```

**2. Controller** — `createTask`:
- Form `multipart/form-data` hai (files ke liye), isliye array seedha nahi ja sakta. Frontend links ko **JSON string** bana ke bhejta hai: `formData.append("links", JSON.stringify(links))`.
- Backend `JSON.parse` karta hai, har URL validate karta hai (`new URL(url)`), aur agar `https://` nahi likha to khud laga deta hai.
- Baad me ye logic ek common helper `normalizeLinks()` me gaya taaki Create aur Edit dono use kar sakein.

**3. getTaskById** — ye MongoDB **aggregation** use karta hai. Aggregation ke `$project` stage me sirf wahi fields aati hain jo likhi ho, isliye `links: 1` add karna zaroori tha — warna links save hote but dikhte nahi.

### Frontend
- `ProjectDetails.jsx` → Create Task modal me "Attach Links" section: Title (optional) + URL + Add button, list me ❌ se hatana.
- Task card aur Task Details page par links dikhana (`target="_blank"`, `rel="noopener noreferrer"` — security ke liye).
- Icon ka naam `Link2` rakha kyunki `Link` pehle se `react-router-dom` se import tha (naam clash).

### Edge case
User URL type karke "Add" dabana bhool jaaye → submit karte waqt input box ka link bhi bhej diya jaata hai.

---

## 4. Feature: Edit Task me files + links manage karna

### Goal
Edit Task me: purani files hatana, nayi files jodna, links add/remove karna.

### Backend — `updateTask` dobara likha
1. Request ab `FormData` hai: `title, description, assignedTo, status, priority, dueDate, links (JSON), removedAttachments (JSON ids), attachments (files)`.
2. Steps:
   - Task dhoondo, check karo ki isi project ka hai
   - Basic fields update
   - **Assignee:** check kiya ki naya user project member hai
   - **Links:** poori final list replace; purane links ka `addedBy` same rehta hai
   - **Removed attachments:** list se hatao, paths yaad rakho
   - **Nayi files:** push karo
   - `task.save()` — **uske baad hi** purani files disk se delete (agar save fail hota to files bach jaati)
   - Error aaye to is request me upload hui files delete (`try/catch` me cleanup)
3. Naye assignee ko "New Task Assigned" notification.

### Bug jo saath me mila
Edit form me Status dropdown tha **lekin backend status ignore karta tha** — status kabhi save hi nahi hota tha. Fix kiya.

### Frontend
- `openEditTask(task)` — purani files, links sab state me load
- Files par **Remove / Undo** (laal line-through), nayi files hare rang me
- `taskService.updateTask` me multipart header: `api.js` ka default header `application/json` tha, us header ke saath **axios FormData ko JSON me badal deta hai** aur files gayab ho jaati. Isliye FormData par `Content-Type: multipart/form-data` explicitly diya.
- "Saving..." state taaki double click se do request na jaayein.

---

## 5. Mailtrap se real emails (Gmail SMTP)

### Problem
Mailtrap sirf **testing** inbox hai — asli email kisi ke paas nahi jaati.

### Kya use kiya
**Nodemailer** (pehle se installed) + **Gmail SMTP** + **App Password**.

### Steps
1. `utils/mail.js` me Mailtrap transporter **comment** kiya (hataya nahi, testing ke liye wapas la sakte hain).
2. Naya transporter:
```js
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});
```
3. `from: "Task Manager" <GMAIL_USER>` aur email footer me fake link ki jagah `FRONTEND_URL`.
4. Gmail setup: nayi Gmail → **2-Step Verification ON** → "App passwords" → 16-character password → `.env`.

### Seekh
- Normal Gmail password SMTP me kaam nahi karta, App Password chahiye.
- Google Workspace (paid, custom domain) aur free Gmail alag hain.
- Email ke links `FRONTEND_URL` se bante hain — deploy ke baad ise live URL karna zaroori.

---

## 6. Full code review: bugs, security, UI, optimization

Poore backend aur frontend ka review kiya. Tareeka:
- Har controller, middleware, model, route padha
- Frontend: `npx eslint src` (isse `fetchNotifications is not defined` jaise errors mile), `npx vite build`
- Backend: server start karke galat JSON, weak password, bina login wale routes hit kiye

### 6.1 Backend bugs (features jo toot rahe the)

| # | Problem | Wajah | Fix |
|---|---|---|---|
| B1 | Member remove nahi hota tha | `deleteMember` me project fetch comment tha par `project.name` use ho raha tha → crash | Project fetch wapas; saath me removed member ke tasks "Unassigned" |
| B2 | Note delete nahi hota tha | `projectId` `req.params` se nikala hi nahi tha | `const { projectId, noteId } = req.params` |
| B3 | Dashboard numbers galat | `TaskStatusEnum.DONE` exist nahi karta (sahi `COMPLETED`); undefined wali condition query se hat jaati thi | `COMPLETED` use kiya |
| B4 | "Members" card = projects count | Galat query | Unique teammates `ProjectMember.distinct("user")` |
| B5 | Task Details par priority/due date nahi | Aggregation `$project` me fields missing | `priority`, `dueDate`, `project` add |
| B6 | Subtask/comment activity save nahi hoti | Actions model ke `enum` me nahi the, error chup-chaap nigla jaata | Enum me add; `entityType` ka typo (`entityType:` → `enum:`) |
| B7 | Error messages frontend tak nahi aate | Global error handler hi nahi tha → Express HTML bhejta | `middlewares/error.middleware.js` — har error JSON me; Multer, CastError, ValidationError, duplicate key handle |
| B8 | `.env` late load | ES modules me imports pehle chalte hain, `dotenv.config()` baad me | Sabse upar `import "dotenv/config"` |
| B9 | Capital letters wali email se login fail | DB me lowercase, search as-is | `.toLowerCase()` login / forgot / add-member me |
| B10 | Profile update par naam gayab | `username.fullName` (username string hai) | `fullName?.trim() \|\| user.fullName` |
| B11 | Search me `(` type karne se crash | User text seedha `new RegExp()` me | `escapeRegex()` + 100 char limit |
| B12 | Subtask update crash | Null check baad me; unassigned task par `.toString()` | Check pehle, `?.` |
| B13 | Aakhri admin hat sakta tha | Koi check nahi | `countAdmins()` guard |
| B14 | Project naam poori app me unique | Galat check | Sirf apne projects me unique (`{ name, createdBy }`) |
| B15 | Project delete par notes bach jaate | Delete list me nahi | `Note.deleteMany` + `Promise.all` |
| B16 | `submittedAt: Date.now()` | Brackets se server start ka time fix | `default: Date.now` |

### 6.2 Security issues

| # | Issue | Fix |
|---|---|---|
| S1 | Search dusron ke private projects dikhata tha | Sirf member wale projects me search |
| S2 | Socket par login check nahi — koi bhi kisi ka room join karke notifications sun sakta tha | `io.use()` middleware me JWT verify; user apne aap sirf apne room me |
| S3 | Dusre project ka admin URL me apna `projectId` + tumhara `taskId` daal kar task dekh/review kar sakta tha (IDOR) | `findTaskInProject(taskId, projectId)` helper — task isi project ka hai ya nahi |
| S4 | Project members list (emails) koi bhi dekh sakta tha | Route par `validateProjectPermission` |
| S5 | `.html/.svg/.js` upload → XSS | Multer `fileFilter` se block; avatar sirf image |
| S6 | Reset/change password me `123` chal jaata | Backend `strongPassword()` validator (8+, upper, lower, number) |
| S7 | Galat id → 500 | `mongoose.isValidObjectId()` → 400 |
| S8 | Cookie settings har jagah alag | Ek `cookieOptions` (`utils/config.js`): local `lax`, production `secure + sameSite: none` |
| S9 | Koi bhi member kisi ka note edit/delete | Sirf creator ya admin |

> **IDOR** = Insecure Direct Object Reference. Matlab: sirf ID badal kar kisi aur ka data access kar lena. Interview me ye term achhi lagti hai.

### 6.3 Frontend bugs

| # | Problem | Fix |
|---|---|---|
| F1 | `fetchNotifications()` undefined → role change, task/note delete ke baad UI crash | Calls hataye (notifications socket se aati hain) |
| F2 | Profile logout crash (`setUser(null)` → `user._id`) | Store ka `logout()` |
| F3 | 1 din baad token expire → app khaali | Axios interceptor: 401 par `/auth/refresh-token`, request dobara; ek saath kai requests par refresh sirf ek baar |
| F4 | Errors sirf console me | Interceptor se mutation errors par toast |
| F5 | Add Member modal galat email par bhi band | Success par hi band |
| F6 | Real-time me duplicate tasks | Same `_id` wala hata ke jodna |
| F7 | Project delete / remove hone par user atka rehta | `project-deleted` event par redirect |
| F8 | Project ke dusre admins review nahi kar paate | Project role fetch |
| F9 | Sidebar me Dashboard hamesha active | NavLink `end` prop |
| F10 | Dead links (Tasks/Members/Notes) | Hataye (baad me My Tasks bana) |
| F11 | Dark mode auth pages par nahi | Theme `App.jsx` se |

### 6.4 UI / animations
- `index.css` me keyframes: `fade-in`, `fade-in-up`, `pop-in`, `slide-in-left`, `shimmer`
- **Saare modals par ek CSS rule** se pop-in + blur: `.fixed.inset-0.z-50.flex:not([data-slot])` (har modal edit nahi karna pada)
- Skeleton loaders (`components/common/Skeleton.jsx`), `CountUp.jsx` (numbers 0 se badhte hain)
- Mobile sidebar drawer (☰), page transition, button press effect, focus ring, `prefers-reduced-motion`

> **Ek important seekh:** animation me `animation-fill-mode: both` rakhne se animation ke baad bhi `transform` laga rehta hai, aur us div ke andar ke `position: fixed` modals screen ki jagah us div ke hisaab se position hone lagte hain. Isliye `backwards` use kiya.

### 6.5 Optimization

| Kya | Kaise | Fayda |
|---|---|---|
| Lazy loading | `React.lazy()` + `Suspense` har page par | Main JS **707 KB → 262 KB** |
| Vendor chunks | `vite.config.js` me `manualChunks` | Libraries cache hoti hain |
| Parallel API calls | `Promise.all` (ProjectDetails ki 5 calls) | Page jaldi khulta |
| DB indexes | Task, ProjectMember, Comment, Note, Notification... | Queries tez |
| `insertMany` | Kai logon ke notifications ek call me | Kam DB calls |
| `.lean()` | Read queries | Kam memory |
| `select("-submissions")` | Task list se bhaari data hataya | Chhota response |

Poori list alag file `BUG_FIXES_REPORT.md` me bhi hai.

---

## 7. Feature: Sorting + Filters

### Goal
Tasks ko priority aur deadline ke hisaab se sort karna, aur filter/search.

### Approach — frontend par hi kyun?
Project ke saare tasks pehle se frontend par aa jaate hain, isliye sort/filter **browser me** kiya: instant, koi API change nahi.

### Files
- `lib/taskUtils.js` — saara logic (baad me My Tasks aur Kanban ne bhi reuse kiya)
- `components/tasks/TaskToolbar.jsx` — search, sort dropdown, filters
- `components/tasks/DueBadge.jsx` — "Overdue by 2 days" / "Due today" badge

### Smart sort ka logic
```js
const smartCompare = (a, b) => {
  // 1. Completed sabse neeche
  // 2. Overdue sabse upar
  // 3. Priority (high=3, medium=2, low=1)
  // 4. Deadline paas wali pehle
  // 5. Naye pehle
};
```
Baaki sorts: Priority, Deadline, Newest, Oldest, Title. Priority/Deadline me bhi completed neeche (`doneLast`).

### Deadline calculation
`getDueInfo(task)` → `daysLeft` nikalta hai (aaj ki midnight se), aur `overdue / today / soon / later` state deta hai.

### Extra
- Sort choice `localStorage` me save (refresh ke baad bhi yaad)
- Header me "2 overdue" chip, overdue card par laal border
- **Test:** 5 fake tasks par har sort chala ke order check kiya.

---

## 8. Feature: My Tasks page

### Goal
Saare projects ke tasks ek jagah.

### Backend
Naya route: `GET /api/v1/tasks/my?scope=assigned|created`
```js
const projectIds = await ProjectMember.find({ user: req.user._id }).distinct("project");
Task.find({ project: { $in: projectIds }, assignedTo: req.user._id })
```
> **Route order zaroori:** `/my` ko `/:projectId` se **pehle** likhna pada, warna Express "my" ko projectId samajh leta.

### Frontend — `pages/tasks/MyTasks.jsx`
- Tabs: **Assigned to me** / **Created by me**
- 4 stat cards jo **click karne par filter** ban jaate hain: Active, Overdue, Due this week, Completed
- Same `TaskToolbar` + naya **Project filter** (`taskUtils` me `project` filter joda)
- Socket events (`task-created/updated/deleted/submitted/reviewed`) par list refresh — **debounce 400ms** (5 events ek saath aayein to API ek hi baar)
- Sidebar me link, Dashboard par "View all →"

---

## 9. Feature: Kanban Board

### Goal
Todo / In Progress / In Review / Completed columns, drag & drop se status badalna.

### Library?
**Koi nayi library nahi** — browser ka apna **HTML5 Drag and Drop API** (`draggable`, `onDragStart`, `onDragOver`, `onDrop`). Mobile par drag nahi chalta, isliye har card par **"Move to" dropdown** bhi.

### Permissions (sabse important design decision)
| Kaun | Kya kar sakta hai |
|---|---|
| Admin | Koi bhi task, koi bhi column |
| Assigned member | Sirf **Todo ↔ In Progress** |
| Baaki | Sirf dekh sakte hain (🔒) |

Kyun? "In Review" submission se aata hai aur "Completed" approval se — agar member khud Completed me daal de to review ka matlab hi khatam.

### Backend
Naya route `PATCH /tasks/:projectId/:taskId/status` (`updateTaskStatus`):
- Status valid hai? Permission rule check
- Save → dusre bande ko notification → `task-updated` socket event sab members ko → activity log

### Frontend
- `components/tasks/KanbanBoard.jsx`
- `taskUtils.getAllowedStatuses(task, {isAdmin, userId})` — same rule frontend par (galat column faded dikhta hai)
- **Optimistic update:** card turant move, API fail ho to wapas
- List | Board toggle (`localStorage` me yaad)

---

## 10. Feature: Project Chat

### Goal
Project ke members aapas me live baat kar sakein.

### Backend
**1. Model** `models/message.models.js`: `project, sender, text (max 2000), timestamps` + index `{ project: 1, _id: -1 }`.

**2. Routes** `/api/v1/messages`:
| Method | Route | Kaam |
|---|---|---|
| GET | `/:projectId?before=<id>` | 30-30 messages (pagination) |
| POST | `/:projectId` | Message bhejna |
| DELETE | `/:projectId/:messageId` | Apna (ya admin koi bhi) |
| GET | `/:projectId/unread` | Unread count |
| POST | `/:projectId/read` | Read mark |

**3. Cursor pagination:** MongoDB ObjectId time ke saath badhta hai, isliye `_id < before` = purane messages. `limit + 1` laakar pata chalta hai aur messages bache hain ya nahi (`hasMore`).

**4. Unread count:** `ProjectMember` me naya field `chatLastReadAt`; unread = uske baad ke dusron ke messages.

**5. Socket:**
- Message save → `io.to("project:<id>").emit("chat-message")`
- Typing: `chat-typing` event — sirf wahi bhej sakta hai jo project room me hai; DB me kuch save nahi
- Member remove hone par uske sockets room se bahar: `io.in(userId).socketsLeave(room)`

### Frontend — `components/chat/ProjectChat.jsx`
- Floating 💬 button + unread badge, right side slide panel
- **Optimistic send:** message turant "Sending…" ke saath; socket se asli message aaye to temp replace; fail ho to "tap to retry"
- Upar scroll → purane messages, **scroll position bachana** (`scrollHeight` ka farak)
- "↓ New messages" button agar user upar padh raha ho
- Typing: 2 sec me max ek emit (throttle), 3 sec baad "stop"
- Enter = send, Shift+Enter = new line, reconnect par room dobara join

---

## 11. Feature: Deadline Reminders

### Goal
Roz subah apne aap: kal/aaj due aur overdue tasks ka email + notification.

### Library
**`node-cron`** — server par scheduled kaam (cron job) chalane ke liye. `npm install node-cron`.

### Files
- `services/reminder.service.js` — asli logic (`runDeadlineReminders`)
- `jobs/scheduler.js` — kab chalana hai
- `controllers/reminder.controllers.js` + `routes/reminder.routes.js` — testing ke liye `POST /api/v1/reminders/run`

### Logic step by step
1. Aaj ki date **India time** me nikalo (`Intl.DateTimeFormat` + `Asia/Kolkata`) — server UTC me ho sakta hai.
2. Wo tasks laao jo completed nahi, assigned hain, aur deadline kal tak ki ya nikal chuki.
3. Har task:
   - `daysLeft` 0 ya 1 → **Due soon**
   - `daysLeft < 0` → **Overdue** (+ task dene wale admin ko alert)
4. **Duplicate rokna:** task me naya field `reminders: { dueSoonFor, overdueFor }`. Reminder bhejne ke baad deadline yahan save. Agli baar same deadline ho to skip. Admin deadline badal de → match nahi karega → naya reminder.
5. Notifications `insertMany` + socket emit.
6. Har user ko **ek hi email (digest)** — Mailgen table ke saath: "⚠️ Overdue" aur "⏰ Due soon".
7. Sab bhejne ke **baad** `Task.bulkWrite()` se "bheja gaya" mark.
8. `running` flag — ek saath do baar na chale.

### Scheduler
```js
cron.schedule("0 9 * * *", run, { timezone: "Asia/Kolkata" }); // roz 9 AM
setTimeout(run, 30000); // server start ke 30 sec baad bhi
```
> Startup run kyun? Render free server so jaata hai; 9 baje server so raha ho to reminder chhoot jaata. Duplicate ka darr nahi (step 4).

### User control
`User` me `emailReminders: Boolean`, route `PATCH /auth/preferences`, Profile page par on/off switch.

### Test
6 situations ka mock test: kal due, aaj due, overdue, pehle se bheja, deadline badli, khud ko assign. Sab sahi; jisne emails band ki thi use email nahi gayi.

---

## 12. Feature: Analytics Dashboard

### Goal
Project ka progress: completion %, on-time rate, member workload, charts.

### Library
**Chart.js + react-chartjs-2** (pehle se installed) — Line, Doughnut, Bar charts.

### Backend
Route: `GET /projects/:projectId/analytics?range=7|30|90`
- Nayi file `utils/date.js` — India time ke hisaab se din nikalna (reminders ne bhi reuse kiya)
- Task model me naya field **`completedAt`** — `pre("save")` hook se apne aap:
```js
taskSchema.pre("save", function () {
  if (this.isModified("status")) {
    this.completedAt = this.status === "completed" ? (this.completedAt || new Date()) : null;
  }
});
```
  (Kanban, Edit, Approve — teeno `task.save()` use karte hain, isliye ek jagah kaafi.) Purane tasks ke liye fallback `updatedAt`.

**Kya calculate hota hai:**
| Metric | Formula |
|---|---|
| Completion rate | completed / total × 100 |
| On-time rate | deadline se pehle complete / deadline wale complete |
| Avg days to finish | (completedAt − createdAt) ka average |
| Trend | har din (7/30) ya har hafte (90) created vs completed |
| Member stats | assigned, completed, overdue, on-time, activity count |

Baad me ye logic `buildProjectAnalytics()` function me gaya taaki Export bhi use kar sake.

### Frontend — `pages/projects/ProjectAnalytics.jsx`
8 stat cards, Line (trend), Doughnut (status), Bar (priority), horizontal stacked Bar (member workload), team table with progress bars. Dark mode me chart colors badalte hain (`useThemeStore`).

---

## 13. Feature: Export Report (PDF / CSV)

### Library
**`pdfkit`** (backend) — code se PDF banana. `npm install pdfkit`.

### Backend — `controllers/export.controllers.js`
Route: `GET /projects/:projectId/export?format=pdf|csv&range=30`

**CSV:**
- Har task ek row (title, status, priority, assignee, due, overdue, links...)
- Comma / quotes / new line wale text ko `"..."` me escape
- **UTF-8 BOM** (`\uFEFF`) — Excel Hindi/special characters sahi dikhaye
- **CSV injection protection:** `=, +, -, @` se shuru hone wali cell ke aage `'` (warna Excel formula chala deta)

**PDF (A4):**
- Blue header band, summary cards, status bar, priority bars, team table, overdue table, all tasks table
- Apna `table()` helper — naye page par header dobara, lamba text `...` se cut
- Footer "Page 1 of 3" — `bufferPages: true` + `switchToPage()`
- PDF pehle memory me (Buffer) banta hai phir bheja jaata hai — beech me error aaye to aadhi file download nahi hoti

### Bug jo test me mila
Footer likhte waqt PDFKit **naye khaali pages** bana raha tha (45 tasks par 9 pages!). Wajah: bottom margin ke andar likhne par PDFKit naya page add karta hai. **Fix:** footer likhte waqt `doc.page.margins.bottom = 0`, phir wapas. Ab 3 pages. (PDF ko `pdftoppm` se images me badal kar check kiya.)

### Frontend
- `lib/download.js` — blob ko file bana kar download (`URL.createObjectURL`)
- Error bhi blob me aata hai → `blob.text()` se JSON padh kar message
- Backend CORS me `exposedHeaders: ["Content-Disposition"]` — file ka naam frontend padh sake

---

## 14. Feature: Cloudinary file storage

### Problem
Render/Railway par server ki disk **har deploy/restart par khaali** ho jaati hai → local `public/` me rakhi files gayab.

### Library
**`cloudinary`** SDK (v2). `npm install cloudinary`.

### Design — storage layer (`utils/storage.js`)
Ek jagah se decide hota hai file kahan jaaye:
- `.env` me `CLOUDINARY_*` teeno → **Cloudinary**
- Nahi → **local `public/`** (development bina account ke chale)

Functions: `storeUploadedFile`, `storeUploadedFiles`, `deleteStoredFile`, `deleteStoredFiles`.

### Important decisions
| Decision | Kyun |
|---|---|
| Images → `image`, videos → `video`, baaki (PDF, docx, zip) → **`raw`** | Free Cloudinary PDF ko "image" type me deliver nahi karta |
| raw files ke `public_id` me extension | Download par `.pdf` lage |
| Avatar 400×400, face par crop | Bandwidth bachti hai |
| 3 me se 1 upload fail → baaki 2 bhi delete | Adhura data na bache |
| Temp local file upload ke baad delete | Server disk saaf |
| Model me `publicId`, `resourceType` fields | Delete ke liye zaroori |

Har jagah lagaya: task attachments (create/edit/delete), submissions, avatar, project delete.

### Migration script
`scripts/migrate-uploads-to-cloudinary.js` + `npm run migrate:cloudinary -- --dry` — purani local files cloud par bhej kar DB ke links update. Local copies delete nahi (backup).

---

## 15. Task Details page redesign + feedback

### Problem
Purana page 1900 lines ki ek file, feedback ka ek hi box sab submissions ke liye, layout "non useful".

### Kya kiya
Page dobara likha, chhote components me toda (`components/task-details/`):
| Component | Kaam |
|---|---|
| `StatusStepper.jsx` | Todo → In Progress → In Review → Completed |
| `SubmissionsPanel.jsx` | Submit form (drag & drop) + history timeline + review box |
| `CommentsSection.jsx` | Discussion |
| `ChecklistCard.jsx` | Subtasks + progress bar |
| `fileUtils.jsx` | File icons (PDF, image, Excel...), size format |
| `Avatar.jsx` | Photo ya naam ka pehla akshar |

### Naye features
- **"Ab kya karna hai" banner** — role aur status ke hisaab se ("Changes requested: …", "1 submission review ka intezaar")
- **Submission note** — member admin ke liye message (model me `note` field)
- **Har submission ka apna feedback box** + quick chips ("Great work! 👏")
- **Request changes me feedback zaroori** (frontend + backend dono)
- Notification me feedback bhi

### Saath me fix
- Submit/review ke baad `task-updated` sab members ko → **Kanban board sync** (pehle card purane column me rehta)
- Comments ab **sab project members** ko live (pehle sirf admin ↔ assignee)
- Page par socket events → task dobara fetch (300ms debounce)

---

## 16. Activity feed redesign + submission links

### Activity feed — `components/activity/ActivityFeed.jsx`
**Backend (`activity.controllers.js`):**
- Pagination (`before` cursor, 20 per page), `type` filter (tasks/members/notes/comments/project)
- **Privacy:** checklist (subtask) activity sirf karne wale ko:
```js
$or: [ { action: { $not: /^SUBTASK_/ } }, { user: req.user._id } ]
```
- `logActivity()` ab socket se `activity-created` bhejta hai (subtask wali sirf user ke room me)

**Frontend:** filter tabs, din ke groups (Today/Yesterday), avatar + action icon, "Only you" 🔒 tag, "Open task" link, Load more, live nayi entry highlight. Bug fix: naam do baar ("mahima mahima created...").

### Submission links
- Model: `submissions[].links: [{ title, url }]`
- `submitTask`: files **ya** links, kam se kam ek; `normalizeLinks()` reuse; max 10
- Form me Links section (URL validation), history me link cards

---

## 17. Landing page

### Goal
Logged-out visitor ko `/` par app ka intro, Register tak le jaana.

### Design choices
- **Hero me asli chalne wala board** — page khulte hi ek card "In Review" se "Done" me jaata hai + "Approved" toast. Visitor khud drag kar sakta hai.
- App ka hi blue brand color; headings ke liye **Bricolage Grotesque** font (`@fontsource-variable/bricolage-grotesque`), body Inter
- Sections: Hero → How it works (4 steps) → 4 feature rows (chhote UI vignettes) → CTA → Footer
- Sirf ek animation moment, baaki shaant; `prefers-reduced-motion` respect

### Routing
`ProtectedRoute.jsx`: agar login nahi aur path `/` hai → Landing, warna `/login`.

### Testing (Playwright)
Desktop, mobile (390px), dark mode screenshots. Bugs mile aur fix:
- Mobile par board (640px) poore page ko chauda kar raha tha → grid children par `min-w-0`
- Chart bars dikh nahi rahe the (percentage height parent ki height ke bina 0) → px height

Saath me: `index.html` title, meta description, favicon; Login/Register par "← ProjectCamp" link.

---

## 18. Deployment (Render + Vercel) aur uske issues

### Architecture
```
Browser ──► Vercel (frontend, projectcamp-app.vercel.app)
              │  /api/*  ──(rewrite/proxy)──►  Render (backend, projectcamp-api-4xiz.onrender.com)
              │                                     │
              └── Socket.io (direct, token ke saath) ┘──► MongoDB Atlas, Cloudinary, Gmail
```

### Problem 1: Cross-domain cookies
Frontend `vercel.app` par aur backend `onrender.com` par — **alag domains**. Safari/iPhone aur Brave dusre domain ki cookies block karte hain → login nahi chalta.

**Fix (2 hisse):**
1. **API proxy** — `frontend/vercel.json`:
```json
{ "rewrites": [
  { "source": "/api/:path*", "destination": "https://projectcamp-api-4xiz.onrender.com/api/:path*" },
  { "source": "/((?!api/).*)", "destination": "/index.html" }
]}
```
   Ab browser ko lagta hai API usi website se aa rahi hai → cookie "apni" (first-party). Dusra rule: kisi bhi page par refresh karne par 404 nahi (SPA fallback).
   `lib/config.js`: production me `API_BASE_URL = "/api/v1"`, local me `http://localhost:8000/api/v1`.

2. **Socket token** — socket seedha Render se judta hai (Vercel rewrites WebSocket support nahi karte). Naya route `GET /auth/socket-token` (10 minute ka JWT). Frontend socket har connect se pehle token laata hai:
```js
io(BACKEND_URL, { auth: (cb) => fetchSocketToken().then(t => cb({ token: t })) })
```
   Backend `io.use()` pehle `handshake.auth.token`, phir cookie check karta hai.

Saath me: `app.set("trust proxy", 1)` (Render proxy ke peeche https pehchaan), cookies production me `secure + sameSite: none`.

### Problem 2: Folder names
`project-management (1)` me space + brackets → hosting settings me dikkat. `git mv` se `backend/` aur `frontend/` kiya.

### Problem 3: Render deploy fail — `nodemon: not found`
- **Wajah:** Start Command `npm run dev` tha. `NODE_ENV=production` me `npm install` devDependencies (nodemon) install nahi karta.
- **Fix:** Start Command → `npm start` (`node src/index.js`). Server par nodemon ki zaroorat hi nahi.

### Problem 4: Landing ki jagah login page khulta tha
- **Wajah:** Naya visitor → `current-user` 401 → refresh fail → "session-expired" event → `navigate("/login")`. Ye rule unpar bhi lag raha tha jo kabhi login hi nahi the. Local test bina backend ke kiya tha isliye pakda nahi gaya.
- **Fix (`App.jsx`):** login page par sirf tab bhejo jab user pehle logged in tha:
```js
const wasLoggedIn = useAuthStore.getState().isAuthenticated;
clearSession();
if (wasLoggedIn) navigate("/login", { replace: true });
```
- **Test:** Ek nakli server banaya jo `/api` par 401 deta tha, purana aur naya dono build Playwright se chalaye — purana `/login` gaya, naya landing dikhaya.

### Deployment steps (summary)
| # | Kahan | Kya |
|---|---|---|
| 1 | Atlas | Network Access → `0.0.0.0/0` |
| 2 | Render | Web Service, root `backend`, build `npm install`, start `npm start`, env vars + `NODE_ENV=production` (PORT nahi) |
| 3 | `vercel.json` | Render URL daalna, push |
| 4 | Vercel | root `frontend`, Vite, env `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID` |
| 5 | Render | `CORS_ORIGIN` + `FRONTEND_URL` = Vercel URL |
| 6 | Google Console | Authorized JavaScript origins me Vercel URL |
| 7 | (Optional) UptimeRobot | Har 5 min `/api/v1/healthcheck` ping — server na soye |

---

## 19. Appendix

### A. Naye npm packages
| Package | Kahan | Kyun |
|---|---|---|
| `node-cron` | backend | Roz ke deadline reminders |
| `pdfkit` | backend | PDF report |
| `cloudinary` | backend | File storage |
| `@fontsource-variable/bricolage-grotesque` | frontend | Landing page headings font |

(Chart.js, react-chartjs-2, date-fns, lucide-react, react-hot-toast, socket.io pehle se the.)

### B. Naye / badle API endpoints
| Method | Route | Feature |
|---|---|---|
| GET | `/tasks/my?scope=` | My Tasks |
| PATCH | `/tasks/:projectId/:taskId/status` | Kanban |
| PUT | `/tasks/:projectId/:taskId` | Edit (files + links) |
| POST | `/tasks/:projectId/:taskId/submit` | Submit (files + links + note) |
| PATCH | `/tasks/:projectId/:taskId/review` | Review (feedback zaroori on reject) |
| GET/POST | `/messages/:projectId` | Chat |
| GET | `/messages/:projectId/unread` | Chat badge |
| POST | `/messages/:projectId/read` | Read mark |
| DELETE | `/messages/:projectId/:messageId` | Delete message |
| GET | `/projects/:projectId/analytics?range=` | Analytics |
| GET | `/projects/:projectId/export?format=` | PDF / CSV |
| GET | `/activities/:projectId?type=&before=` | Activity feed |
| PATCH | `/auth/preferences` | Reminder emails on/off |
| GET | `/auth/socket-token` | Deploy par socket login |
| POST | `/reminders/run` | Reminders manual test |

### C. Socket events
| Event | Kab |
|---|---|
| `join-project` / `leave-project` | Project page khulna/band (member check) |
| `task-created` / `task-updated` / `task-deleted` | Tasks, Kanban sync |
| `task-submitted` / `task-reviewed` | Review workflow |
| `comment-created` / `comment-deleted` | Discussion |
| `chat-message` / `chat-message-deleted` / `chat-typing` | Chat |
| `activity-created` | Live activity feed |
| `new-notification` | Bell |
| `member-*`, `project-updated`, `project-deleted` | Team / project changes |

### D. Environment variables
**Backend:** `PORT, NODE_ENV, CORS_ORIGIN, FRONTEND_URL, MONGO_URI, ACCESS_TOKEN_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRY, GOOGLE_CLIENT_ID, GMAIL_USER, GMAIL_APP_PASSWORD, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_FOLDER, REMINDER_CRON, REMINDER_TIMEZONE, REMINDERS_ENABLED, REMINDERS_ALLOW_MANUAL`

**Frontend:** `VITE_GOOGLE_CLIENT_ID, VITE_API_URL`

### E. Nayi files (summary)
**Backend:** `middlewares/error.middleware.js`, `utils/config.js`, `utils/date.js`, `utils/storage.js`, `models/message.models.js`, `controllers/message|analytics|export|reminder.controllers.js`, `routes/message|reminder.routes.js`, `services/reminder.service.js`, `jobs/scheduler.js`, `scripts/migrate-uploads-to-cloudinary.js`

**Frontend:** `lib/taskUtils.js`, `lib/config.js`, `lib/download.js`, `components/tasks/*` (Kanban, Toolbar, DueBadge), `components/chat/ProjectChat.jsx`, `components/activity/ActivityFeed.jsx`, `components/task-details/*`, `components/common/*` (Skeleton, PageLoader, CountUp), `pages/tasks/MyTasks.jsx`, `pages/projects/ProjectAnalytics.jsx`, `pages/landing/Landing.jsx`, `services/chatService.js`, `vercel.json`

---

## 20. Interview me kaise explain karein

**Q: Project ke baare me batao (30 sec)**
> "ProjectCamp ek real-time project management app hai small teams ke liye. Admin tasks assign karta hai deadline ke saath, members kaam submit karte hain, admin feedback ke saath approve ya reject karta hai. Isme Kanban board, Socket.io se live chat aur updates, node-cron se daily deadline reminders, analytics aur PDF reports hain. MERN stack par bana hai, Vercel aur Render par deployed hai."

**Q: Real-time kaise kiya?**
> "Socket.io se. Har user apne room me join hota hai aur project page par `project:<id>` room me. Server kuch badalne par us room ko event bhejta hai. Socket connection bhi JWT se authenticate hota hai."

**Q: Sabse mushkil problem kya thi?**
> "Deployment par cross-domain cookies — Safari dusre domain ki cookies block karta hai. Maine Vercel rewrites se API ko proxy kiya taaki cookie first-party ho, aur socket ke liye ek short-lived token endpoint banaya."

**Q: Duplicate reminders kaise roke?**
> "Har task me jis deadline ka reminder bheja, wo save karta hoon. Agli baar same deadline ho to skip. Deadline badli to naya reminder."

**Q: Security me kya dhyan rakha?**
> "IDOR fix kiya — task hamesha projectId ke saath verify hota hai. Socket authentication, file type filtering (XSS), regex escaping, CSV injection protection, strong password validation, aur role-based permissions backend par."

**Q: Performance?**
> "React.lazy se code splitting (bundle 707KB se 262KB), MongoDB indexes, Promise.all se parallel queries, cursor-based pagination chat aur activity me."

**Q: Testing kaise ki?**
> "Backend logic ko mock data se test kiya, smoke tests se routes, aur Playwright se UI ke screenshots desktop, mobile aur dark mode me."

---

<div align="center">

**ProjectCamp** · https://projectcamp-app.vercel.app

</div>
