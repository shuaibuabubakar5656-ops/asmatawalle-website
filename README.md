# A.S Matawalle Computer Business Centre Udawa — Website

Professional multi-page website for **A.S MATAWALLE COMPUTER BUSINESS CENTRE UDAWA**.

## Features Included

### Public Pages
- **Home** — Banner with logo, welcome, about, why choose us, courses, news, success stories, gallery preview, contact + map, WhatsApp float, Quick Apply
- **About Us** — Mission, vision, values, offerings
- **Computer Training** — 6 Months Diploma (₦60,000) & 3 Months Certificate (₦30,000) with full course lists
- **Online Admission Form** — Full Name, Passport photo, Gender, DOB, State, LGA, Address, Phone, Email, Parent/Guardian, Programme, Duration, Qualification
- **Payment Page** — Plan selection, bank transfer info, receipt upload
- **Business Centre Services** — Printing, Photocopy, Lamination, Binding, Passport, Typing, Graphics, Online Registration (WAEC/NECO/JAMB), PINs, Scratch cards, Internet, Scanning, Email
- **Gallery** — Placeholder grid (ready for real photos)
- **News** — Announcements
- **Contact** — Address, phone, email, form, WhatsApp, Call, Google Map
- **Result Checker**

### Portals (UI Prototypes)
- **Student Portal** — Sign Up, Login, Dashboard with: Profile, Course Registration, Admission Status, Payment History, Receipts, Materials, Assignments, Attendance, CBT, Results, Certificate Status, Notifications, Password Reset
- **Admin Portal** — Login, Dashboard with: Manage Students, Add/Edit/Delete, Approve Admission, Courses, Payments, Verify Payments, Upload Results, Materials, Attendance, News, Gallery, Announcements, Certificates, Reports, Settings

### Design
- Logo used throughout
- Navy + Gold professional colour scheme
- Fully responsive (mobile, tablet, desktop)
- Bootstrap 5 + custom CSS
- WhatsApp floating button
- Quick Apply button

## How to Use

1. Open `index.html` in any modern browser (or host the folder on any web server).
2. All navigation and forms work on the frontend.
3. **Student Portal flow:**
   - Apply on the Online Admission form.
   - Go to **Sign Up** → create account with the **same email**.
   - After successful sign-up you are **automatically logged in** and taken to the Student Dashboard.
   - Later you can log in again with the same email + password **from any phone or computer**.
4. Admin login uses the fixed CEO credentials below.

### Cross-device login (Phone A → Phone B)

Student accounts and applications are now stored in a **shared online JSON store**.  
This means:

- Register on Phone A → you can log in on Phone B with the same email + password.
- Internet connection is required when signing up or logging in (to sync).
- Data is cached locally for speed; offline falls back to the last cached data.

**Demo note:** Passwords are stored in plain text on the free shared store. This is fine for testing. For real production use a proper backend with hashed passwords (see below).


## How to Run (Proper Backend)

The site now includes a real **Node.js + SQLite** backend. Accounts are stored in a database with **hashed passwords** and **JWT tokens**, so:

- Register on Phone A → log in on Phone B (or any device)
- Works across browsers and phones

### Start the server

```bash
cd asmatawalle-website/backend
node server.js
```

Then open: **http://localhost:3000**

(Or your computer’s IP, e.g. `http://192.168.x.x:3000`, so phones on the same Wi-Fi can access it.)

### Default Admin

- Email: `shuaibuabubakar5656@gmail.com`
- Password: `Aliyu@2024`

### Student flow

1. Open the site on any phone → Online Admission → submit form  
2. Sign Up with the **same email**  
3. You are logged in and taken to the Student Dashboard  
4. On another phone: Login with the same email + password → works  

### Switching to MySQL later

The schema is standard SQL. You can replace the SQLite layer with `mysql2` or Laravel and keep the same API endpoints.

**Payment Account (live):** Opay | 8082917651 | Shuaibu Abubakar

**Primary Admin (CEO):** shuaibuabubakar5656@gmail.com  /  Aliyu@2024

## File Structure

```
asmatawalle-website/
├── index.html
├── about.html
├── computer-training.html
├── admission.html
├── payment.html
├── services.html
├── gallery.html
├── news.html
├── contact.html
├── result-checker.html
├── student-login.html
├── student-signup.html
├── student-dashboard.html
├── admin-login.html
├── admin-dashboard.html
├── css/style.css
├── js/main.js
├── images/logo.png
└── README.md
```

## Contact (from your brief)

- **Address:** No. 9 Unguwan Daudu, Udawa, Gidan Alh. Sada Haruna Mai Atampa, Udawa
- **Phone:** 08082917651
- **Email:** asmatawalle@gmail.com

---

© 2026 A.S Matawalle Computer Business Centre Udawa — Reliable Service, Lasting Solutions.
