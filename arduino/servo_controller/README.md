# Arduino Servo Controller Setup

## Hardware Setup

1. **Connect the Servo to Arduino R3:**
   - Servo Red Wire → Arduino 5V
   - Servo Brown/Black Wire → Arduino GND
   - Servo Orange/Yellow Wire → Arduino Digital Pin 9

## Software Setup

1. **Install Arduino IDE** (if not already installed)
   - Download from: https://www.arduino.cc/en/software

2. **Install Servo Library** (usually pre-installed)
   - In Arduino IDE: Sketch → Include Library → Servo

3. **Upload the Sketch:**
   - Open `servo_controller.ino` in Arduino IDE
   - Select Board: Tools → Board → Arduino Uno (or R3)
   - Select Port: Tools → Port → (your Arduino port)
   - Click Upload button

## How It Works

When the ML model detects **doomscrolling**, it automatically triggers the servo to:
1. Sweep from 0° to 130°
2. Hold briefly at 130°
3. Reset back to 0°
4. Wait for next trigger

## Testing

### Test via Serial Monitor (Arduino IDE)
Open Serial Monitor (Tools → Serial Monitor, 9600 baud) and send:
- `TRIGGER` - Execute one sweep
- `START` - Continuous sweeping mode
- `STOP` - Stop and reset to 0°

### Test via Python Bridge
With the Python bridge service running:

```bash
# Single sweep
curl -X POST http://localhost:5000/servo/trigger

# Start continuous mode
curl -X POST http://localhost:5000/servo/start

# Stop continuous mode
curl -X POST http://localhost:5000/servo/stop
```

## Adjusting Parameters

In `servo_controller.ino`, you can modify:
- `SERVO_PIN` - Change servo pin (default: 9)
- `END_POSITION` - Change sweep angle (default: 130°)
- `SWEEP_DELAY` - Speed of sweep (default: 15ms per degree)
- `RESET_DELAY` - Pause duration (default: 500ms)
