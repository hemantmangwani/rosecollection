#!/bin/bash

# Rose Collection - Start Local Server
# This script starts a local web server for development

echo "🌹 Rose Collection - Starting Local Server..."
echo ""
echo "📂 Server will run at: http://localhost:8000"
echo "🛑 Press Ctrl+C to stop the server"
echo ""
echo "Opening browser in 3 seconds..."
echo ""

# Wait 3 seconds
sleep 3

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open http://localhost:8000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open http://localhost:8000
fi

# Start Python server
echo "Starting Python server..."
python3 -m http.server 8000
