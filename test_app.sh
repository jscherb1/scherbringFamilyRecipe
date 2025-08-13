#!/bin/bash
# Quick test script to verify all components are working

echo "🧪 Testing Recipe App Components..."
echo "=================================="

# Test 1: Check if backend dependencies are installed
echo "1. Checking Python dependencies..."
cd /workspaces/scherbringFamilyRecipe/backend
if python3 -c "import azure.cosmos, fastapi, pydantic" 2>/dev/null; then
    echo "   ✅ Python dependencies OK"
else
    echo "   ❌ Missing dependencies. Run: pip install -r requirements.txt"
    exit 1
fi

# Test 2: Check environment configuration
echo "2. Checking environment configuration..."
if [ -f ".env" ] && grep -q "COSMOS_ENDPOINT" .env && grep -q "COSMOS_KEY" .env; then
    echo "   ✅ Environment configuration OK"
else
    echo "   ❌ Missing .env file or configuration"
    exit 1
fi

# Test 3: Test Cosmos DB connection
echo "3. Testing Cosmos DB connection..."
if python3 test_cosmos_connection.py > /dev/null 2>&1; then
    echo "   ✅ Cosmos DB connection OK"
else
    echo "   ❌ Cosmos DB connection failed"
    echo "   📋 Running detailed test..."
    python3 test_cosmos_connection.py
    exit 1
fi

# Test 4: Check if server can start (quick test)
echo "4. Testing FastAPI server startup..."
timeout 10 python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 > /dev/null 2>&1 &
SERVER_PID=$!
sleep 5

if ps -p $SERVER_PID > /dev/null; then
    echo "   ✅ FastAPI server starts OK"
    kill $SERVER_PID 2>/dev/null
else
    echo "   ❌ FastAPI server failed to start"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Your app is ready to run."
echo ""
echo "📚 To start developing:"
echo "   cd /workspaces/scherbringFamilyRecipe/backend"
echo "   python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "📖 Then visit: http://localhost:8000/docs"
