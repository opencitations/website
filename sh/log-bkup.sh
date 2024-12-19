#!/bin/bash

# Define source and destination directories
SOURCE_DIR="/srv/web/log"
DEST_DIR="/srv/index/bkup/log-bkup/raw"

# Get the newest file based on modification time
NEWEST_FILE=$(ls -t "$SOURCE_DIR"/oc-*.txt | head -n 1)

# Loop through all files in the directory matching the pattern
for FILE in "$SOURCE_DIR"/oc-*.txt; do
    # If the file is not the newest, move it to the destination directory
    if [[ "$FILE" != "$NEWEST_FILE" ]]; then
        mv "$FILE" "$DEST_DIR"
    fi
done

echo "Older log files have been moved to $DEST_DIR."
