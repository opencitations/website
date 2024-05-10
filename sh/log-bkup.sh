#!/bin/bash

# Source directory where the file is located
SOURCE_DIR="/srv/web/log/"

# Get current month and year
CURRENT_MONTH=$(date +"%m")
CURRENT_YEAR=$(date +"%Y")

# Calculate previous month
PREVIOUS_MONTH=$((CURRENT_MONTH - 1))

# Adjust if previous month is January
if [ $PREVIOUS_MONTH -eq 0 ]; then
    PREVIOUS_MONTH=12
    CURRENT_YEAR=$((CURRENT_YEAR - 1))
fi

# Convert to two-digit format
if [ $PREVIOUS_MONTH -lt 10 ]; then
    PREVIOUS_MONTH="0$PREVIOUS_MONTH"
fi

#e.g. oc-2022-03.txt
PREFNAME="oc-"
SOURCE_FILE="$SOURCE_DIR$PREFNAME$CURRENT_YEAR-$PREVIOUS_MONTH.txt"

# destination directory
DESTINATION_DIR="/srv/index/bkup/log-bkup/raw"

#echo "MOVING: $SOURCE_FILE" "$DESTINATION_DIR"
# Move the file to the destination directory
mv "$SOURCE_FILE" "$DESTINATION_DIR"
