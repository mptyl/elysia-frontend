#!/bin/bash

# Source directory (Next.js build output)
SOURCE_DIR="out"

# Destination directory
DEST_DIR="../elysia/elysia/api/static"

# Clear Next.js cache to ensure fresh build
echo "Clearing Next.js cache..."
rm -rf .next

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: '$SOURCE_DIR' directory not found!"
    echo "Please run 'next build' first to generate the static files."
    exit 1
fi

# Check if destination parent directory exists
if [ ! -d "$(dirname "$DEST_DIR")" ]; then
    echo "Error: Destination parent directory '$(dirname "$DEST_DIR")' does not exist!"
    exit 1
fi

# Clean destination directory to remove stale chunks from previous builds
if [ -d "$DEST_DIR" ]; then
    echo "Cleaning destination directory..."
    rm -rf "$DEST_DIR"
fi
mkdir -p "$DEST_DIR"

# Copy fresh build output
echo "Copying files from '$SOURCE_DIR' to '$DEST_DIR'..."
cp -r "$SOURCE_DIR"/* "$DEST_DIR"

echo "Export completed successfully!"
