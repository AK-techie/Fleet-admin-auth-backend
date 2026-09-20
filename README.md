# 🔐 Admin Auth Backend — MERN Stack

A secure Node.js + Express + MongoDB REST API backend for single admin login with JWT authentication.

---

## 📁 Project Structure

```
├── config/
│   └── db.js               # MongoDB connection
├── controllers/
│   └── authController.js   # Login & profile logic
├── middleware/
│   └── authMiddleware.js   # JWT verification middleware
├── models/
│   └── Admin.js            # Mongoose Admin schema
├── routes/
│   └── authRoutes.js       # Auth API routes
├── seed.js                 # One-time admin seeding script
├── server.js               # Express app entry point
├── .env.example            # Environment variable template
├── .gitignore
└── package.json
```

---

## ⚙️ Setup & Installation

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd <project-folder>
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env` and fill in your values:
```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
PORT=5000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123
```

### 4. Seed the Admin user (run ONCE)
```bash
npm run seed
```
This creates the admin account in your MongoDB Atlas cluster.

### 5. Start the server
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

---

## 🌐 API Endpoints

### Base URL: `http://localhost:5000/api`

---

### ✅ POST `/api/auth/login` — Admin Login

**Request Body (JSON):**
```json
{
  "email": "admin@example.com",
  "password": "Admin@123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful. Welcome back!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "64abc123...",
    "name": "Super Admin",
    "email": "admin@example.com",
    "role": "admin",
    "lastLogin": "2024-01-01T10:00:00.000Z"
  }
}
```

**Error Response — Wrong credentials (401):**
```json
{
  "success": false,
  "message": "Invalid email or password. Please try again."
}
```

**Error Response — Missing fields (400):**
```json
{
  "success": false,
  "message": "Please provide both email and password."
}
```

---

### 🔒 GET `/api/auth/me` — Get Admin Profile (Protected)

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "admin": {
    "id": "64abc123...",
    "name": "Super Admin",
    "email": "admin@example.com",
    "role": "admin",
    "lastLogin": "2024-01-01T10:00:00.000Z",
    "createdAt": "2024-01-01T08:00:00.000Z"
  }
}
```

---

## 🔗 Frontend Integration (MERN)

In your React frontend, make the login call like this:

```js
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const data = await response.json();

if (!data.success) {
  // Show the error message
  setError(data.message); // e.g. "Invalid email or password. Please try again."
} else {
  // Save token and redirect
  localStorage.setItem('adminToken', data.token);
}
```

---

## 🛡️ Security Features

- ✅ Passwords hashed with **bcryptjs** (salt rounds: 12)
- ✅ **JWT** tokens with configurable expiry
- ✅ Password field excluded from all DB queries by default
- ✅ Consistent error messages (prevents email enumeration)
- ✅ Account active/inactive status check
- ✅ CORS configured for frontend origin

---

## 🚀 Deployment Notes

For deployment (Render, Railway, Vercel, etc.):
1. Set all `.env` variables in the hosting platform's environment settings
2. Set `CLIENT_URL` to your React frontend's deployed URL for CORS
3. Change `NODE_ENV=production`

---

## 📦 Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express.js | Web framework |
| MongoDB Atlas | Database |
| Mongoose | ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT auth |
| dotenv | Environment config |
| cors | Cross-origin support |
