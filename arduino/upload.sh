#!/usr/bin/env bash
set -euo pipefail

# Simple upload helper using arduino-cli so you don't need the Arduino IDE.
# Usage:
#   ./upload.sh --port /dev/tty.usbmodem14101 --fqbn arduino:avr:uno
# You can also set ARDUINO_PORT and ARDUINO_FQBN environment variables.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKETCH_DIR="$SCRIPT_DIR/servo_controller"

PORT="${ARDUINO_PORT:-}" 
FQBN="${ARDUINO_FQBN:-arduino:avr:uno}"

print_usage() {
  cat <<EOF
Usage: $0 [--port PORT] [--fqbn FQBN]

Examples:
  # upload to Arduino Uno on /dev/tty.usbmodem14101
  $0 --port /dev/tty.usbmodem14101 --fqbn arduino:avr:uno

Environment variables:
  ARDUINO_PORT   default port if not passed
  ARDUINO_FQBN   fully-qualified board name (default: arduino:avr:uno)

Requires: arduino-cli installed and on PATH.
Install (macOS): brew install arduino-cli
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="$2"; shift 2;;
    --fqbn)
      FQBN="$2"; shift 2;;
    -h|--help)
      print_usage; exit 0;;
    *)
      echo "Unknown arg: $1"; print_usage; exit 1;;
  esac
done

if ! command -v arduino-cli >/dev/null 2>&1; then
  echo "arduino-cli not found. Install with: brew install arduino-cli" >&2
  exit 2
fi

if [[ -z "$PORT" ]]; then
  echo "ERROR: no port specified. Use --port or set ARDUINO_PORT env var." >&2
  arduino-cli board list
  exit 3
fi

echo "Compiling sketch in $SKETCH_DIR for $FQBN..."
arduino-cli compile --fqbn "$FQBN" "$SKETCH_DIR"

echo "Uploading to $PORT..."
arduino-cli upload -p "$PORT" --fqbn "$FQBN" "$SKETCH_DIR"

echo "Upload finished. Use a serial monitor at 9600 baud to view Arduino output."
