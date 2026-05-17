#!/bin/bash
# This script downloads gradle-wrapper.jar from gradle distribution
set -e

GRADLE_VERSION="8.14.3"
WRAPPER_DIR="android/gradle/wrapper"
WRAPPER_JAR="$WRAPPER_DIR/gradle-wrapper.jar"

mkdir -p "$WRAPPER_DIR"

# Download gradle distribution
GRADLE_ZIP="/tmp/gradle-${GRADLE_VERSION}-bin.zip"
GRADLE_URL="https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip"

echo "Downloading Gradle ${GRADLE_VERSION}..."
curl -L -o "$GRADLE_ZIP" "$GRADLE_URL"

# Extract gradle-wrapper.jar from the distribution
echo "Extracting gradle-wrapper.jar..."
unzip -q "$GRADLE_ZIP" "gradle-${GRADLE_VERSION}/lib/gradle-wrapper.jar" -d /tmp

# Copy to the correct location
cp "/tmp/gradle-${GRADLE_VERSION}/lib/gradle-wrapper.jar" "$WRAPPER_JAR"

# Verify
if [ -f "$WRAPPER_JAR" ]; then
    echo "✓ gradle-wrapper.jar successfully created at $WRAPPER_JAR"
    ls -lh "$WRAPPER_JAR"
else
    echo "✗ Failed to create gradle-wrapper.jar"
    exit 1
fi

# Clean up
rm -rf /tmp/gradle-${GRADLE_VERSION} "$GRADLE_ZIP"
