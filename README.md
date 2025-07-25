## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/lillamayer95/gratia-analyst-availability-tracker.git
cd gratia-analyst-availability-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up PostgreSQL Database

Run PostgreSQL using Docker:

```bash
docker run --name gratia-postgres \
  -e POSTGRES_DB=gratia_availability \
  -e POSTGRES_USER=gratia_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -d postgres:15
```

### 4. Initialize Database Schema

```bash
# Connect to the database and run the schema
docker exec -i gratia-postgres psql -U gratia_user -d gratia_availability < server/schema.sql
```

### 5. Environment Configuration

Create a `.env` file in the root directory (see `.env.template` for reference):

```bash
cp .env.template .env
```

Edit the `.env` file with your actual values.

### 6. Start the Application

#### Development Mode

```bash
# Start the React frontend (runs on port 3001)
npm start

# In a separate terminal, start the backend server
cd server
node server.js
```

#### Production Mode

```bash
# Build the React app
npm run build

# Start the backend server
cd server
node server.js
```

## 🌐 Application URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5000
- **Onboarding**: http://localhost:3001/ (root path)
- **Availability Management**: http://localhost:3001/availability/user/{userId}

```

```
