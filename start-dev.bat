@echo off

echo Starting Backend...
start cmd /k "cd backend && npx prisma generate && npm install && npm run dev"

echo Starting Frontend...
start cmd /k "cd frontend && npm install && npm run dev"