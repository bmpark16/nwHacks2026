Arduino servo controller
=========================

This folder contains the servo controller sketch used by the WetReminder project.

Files:
- `servo_controller/servo_controller.ino` - the Arduino sketch that listens on Serial
  for commands and performs servo sweeps.
- `upload.sh` - helper script that uses `arduino-cli` to compile and upload the
  sketch without using the Arduino IDE.

Quick upload using arduino-cli
------------------------------
1. Install `arduino-cli` (macOS):

   brew install arduino-cli

2. (Optional) Install board core (example for AVR/Uno):

   arduino-cli core update-index
   arduino-cli core install arduino:avr

3. Find your serial port (macOS):

   ls /dev/tty.*

4. Upload (example):

   ./upload.sh --port /dev/tty.usbmodem14101 --fqbn arduino:avr:uno

Notes
-----
- The sketch uses 9600 baud for serial messaging.
- If using an external power supply for the servo, ensure grounds are common.
- If the automatic port detection in the Python bridge fails, set
  `ARDUINO_PORT` in `app/python/config.py` or pass the port to the upload
  script.
