#!/bin/bash

# Start Development Servers Script
# Use this when you need external access (Codespaces, etc.)

echo "Starting Recipe Planner Development Servers..."
echo "This will start both frontend and backend outside Docker for external access."
echo ""

# Check if Docker containers are running and stop them
if docker-compose ps | grep -q "Up"; then
    echo "🐳 Stopping Docker containers first..."
    docker-compose down
    echo "✅ Docker containers stopped"
    echo ""
fi

# Start backend in background
echo "🚀 Starting backend server..."
cd backend
python -m uvicorn main:app --reload --port 8000 --host 0.0.0.0 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "🎨 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "🎉 Both servers are starting up!"
echo ""
echo "📍 Access URLs:"
echo "   Frontend: http://localhost:5173 (or your Codespace URL)"
echo "   Backend API: http://localhost:8000 (or your Codespace URL)"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "🛑 To stop both servers:"
echo "   Press Ctrl+C or run: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Store PIDs for cleanup
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# Wait for interrupt
trap 'echo ""; echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f .backend.pid .frontend.pid; echo "✅ Servers stopped"; exit 0' INT

# Keep script running
wait
