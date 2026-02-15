#!/bin/bash

# Deeper Prime HQ - Data Directory Setup Script
# Copies data-template to DATA_DIR if it doesn't exist

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATE_DIR="$PROJECT_DIR/data-template"

# Load DATA_DIR from .env.local if it exists
if [ -f "$PROJECT_DIR/.env.local" ]; then
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    export "$key=$value"
  done < "$PROJECT_DIR/.env.local"
fi

if [ -z "$DATA_DIR" ]; then
  echo "Error: DATA_DIR is not set."
  echo "Please set DATA_DIR in your .env.local file."
  echo "Example: DATA_DIR=/users/ivansmacbook/Public/Transfer Folder/deeper-prime-data"
  exit 1
fi

if [ -d "$DATA_DIR" ]; then
  echo "Data directory already exists at: $DATA_DIR"
  echo "Skipping setup. Delete the directory first if you want to reset."
  exit 0
fi

echo "Setting up Deeper Prime HQ data directory..."
echo "Source: $TEMPLATE_DIR"
echo "Destination: $DATA_DIR"

mkdir -p "$DATA_DIR"
cp -r "$TEMPLATE_DIR/"* "$DATA_DIR/"
mkdir -p "$DATA_DIR/docs"

echo ""
echo "Data directory created successfully at: $DATA_DIR"
echo "All JSON schemas and template files have been copied."
echo "You can now run 'npm run dev' to start the dashboard."
