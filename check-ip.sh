#!/bin/bash

# Script to check your current public IP address
# Useful for whitelisting in GridDB Cloud

echo "========================================"
echo "      Current IP Address Check          "
echo "========================================"
echo ""

# Get IP from multiple sources for reliability
echo "Checking your public IP address..."
echo ""

# Method 1: ipinfo.io
IP1=$(curl -s https://ipinfo.io/ip 2>/dev/null)
if [ ! -z "$IP1" ]; then
    echo "✓ IP Address: $IP1"
else
    echo "✗ Could not get IP from ipinfo.io"
fi

# Method 2: icanhazip.com (backup)
IP2=$(curl -s https://icanhazip.com 2>/dev/null)
if [ ! -z "$IP2" ]; then
    echo "✓ Confirmed:  $IP2"
else
    echo "✗ Could not confirm from icanhazip.com"
fi

echo ""
echo "========================================"
echo ""

if [ "$IP1" = "$IP2" ] && [ ! -z "$IP1" ]; then
    echo "Your public IP address is: $IP1"
    echo ""
    echo "Add this IP to your GridDB Cloud whitelist:"
    echo "  1. Log into GridDB Cloud console"
    echo "  2. Go to your database settings"
    echo "  3. Add IP: $IP1"
    echo "  4. Save changes"
elif [ ! -z "$IP1" ]; then
    echo "Your public IP address is likely: $IP1"
    echo ""
    echo "Note: Could not verify from secondary source"
else
    echo "Error: Could not determine your public IP address"
    echo "Please check your internet connection"
fi

echo ""
