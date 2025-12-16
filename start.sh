#!/bin/bash

echo "🎯 UnoDay - Next.js Version"
echo "============================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed!"
    echo ""
fi

echo "🚀 Starting development server..."
echo "📍 Open http://localhost:3000 in your browser"
echo ""

npm run dev
