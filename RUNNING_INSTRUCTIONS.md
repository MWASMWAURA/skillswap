# How to Run SkillSwap Frontend & Backend

## Prerequisites
- Node.js installed (v16 or higher)
- npm or yarn package manager

## Running the Application

### Option 1: Using Docker (Recommended)
1. **Start the entire stack:**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```
   This will start both frontend and backend containers.

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

### Option 2: Running Services Separately

#### Backend Setup
1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database:**
   ```bash
   npm run db:setup
   ```

5. **Start backend server:**
   ```bash
   npm run dev
   ```
   Backend will be available at http://localhost:5000

#### Frontend Setup
1. **Navigate to frontend directory:**
   ```bash
   cd frontend_betterux
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   ```

4. **Start frontend development server:**
   ```bash
   npm run dev
   ```
   Frontend will be available at http://localhost:5173

## Current Status
- ✅ Frontend development server is **already running** at http://localhost:5173
- 🔄 Backend needs to be started (follow backend setup steps above)

## Testing the Connection
1. Start the backend server
2. Open http://localhost:5173 in your browser
3. Try logging in or browsing skills to test the API connection

## Troubleshooting
- If you get CORS errors, ensure backend is running on port 5000
- If login fails, check that the backend auth endpoints are working
- For database issues, run `npm run db:setup` in the backend directory

## Production Build
To create a production build:
```bash
cd frontend_betterux
npm run build
```
The built files will be in the `dist/` directory.