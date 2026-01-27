#!/bin/bash

# Script to find your local IP address for mobile testing

echo "=========================================="
echo "Finding your local IP address..."
echo "=========================================="
echo ""

# Try to get IP address on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Get the IP address of the active network interface
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    
    if [ -z "$LOCAL_IP" ]; then
        echo "Could not automatically detect IP. Trying alternative method..."
        LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
else
    echo "Unsupported OS. Please find your IP manually."
    exit 1
fi

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not detect your local IP address automatically."
    echo ""
    echo "Please find it manually:"
    echo "  macOS: System Preferences > Network"
    echo "  Linux: Run 'hostname -I' or 'ip addr'"
    exit 1
fi

echo "✅ Your local IP address is: $LOCAL_IP"
echo ""
echo "=========================================="
echo "Mobile Testing Instructions"
echo "=========================================="
echo ""
echo "1. Make sure your phone is connected to the SAME Wi-Fi network as your computer"
echo ""
echo "2. Start your development server:"
echo "   ./start-dev.sh"
echo ""
echo "3. On your phone's browser, navigate to:"
echo "   http://$LOCAL_IP:5173"
echo ""
echo "4. The app should load and connect to the backend automatically"
echo ""
echo "=========================================="
echo "Troubleshooting"
echo "=========================================="
echo ""
echo "If you can't access the app:"
echo "  • Make sure both devices are on the same Wi-Fi network"
echo "  • Check that your firewall allows connections on port 5173"
echo "  • Try disabling VPN if you're using one"
echo "  • On macOS, you may need to allow incoming connections in System Preferences > Security & Privacy > Firewall"
echo ""
