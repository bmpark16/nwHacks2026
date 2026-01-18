# Wet Reminder

A desktop application that helps incentivize intense productivity by monitoring user behavior through camera analysis and triggering Arduino actions when procrastination is detected.

Here is our devpost submission for Wet Reminder : https://devpost.com/software/wet-reminder

## Features

- **Timer Modes**: Pomodoro-style timer with customizable focus and break times, or manual mode
- **Camera Integration**: Select and preview camera feed for real-time monitoring
- **LSTM Model Detection**: Uses deep learning to detect "doomscrolling" and "sleeping" behaviors
- **Arduino Integration**: Triggers physical actions when procrastination is detected
- **Session Logging**: Tracks and stores all detected events with timestamps
- **Session History**: View logs from previous focus sessions

## Setup

### Prerequisites

- Node.js and npm
- Python 3.8+
- Trained LSTM model file (`action.h5`)

### Installation

1. Install frontend dependencies:
```bash
cd app/ui
npm install
```

2. Install Electron dependencies:
```bash
cd app/electron
npm install
```

3. Install Python dependencies:
```bash
cd app/python
pip install -r requirements.txt
```

4. Place your trained model file:
   - Copy `action.h5` to `app/python/action.h5`

### Running

1. Start the UI dev server:
```bash
cd app/ui
npm run dev
```

2. In another terminal, start Electron:
```bash
cd app/electron
npm start
```

## Project Structure

```
app/
├── electron/          # Electron main process
│   ├── main.js        # Main process with IPC handlers
│   ├── preload.js     # Preload script for secure IPC
│   └── storage/       # Session and settings storage
├── python/            # Python bridge service
│   ├── bridge_service.py    # Flask server for model evaluation
│   ├── model_processor.py   # LSTM model processing
│   ├── arduino_controller.py # Arduino serial communication
│   └── config.py      # Configuration
└── ui/                # React frontend
    └── src/
        ├── App.jsx    # Main app component
        └── components/ # UI components
```

## Usage

1. **Select Camera**: Click "Choose Camera" to select your webcam
2. **Configure Timer**: Choose focus time and break time (for Pomodoro mode)
3. **Start Session**: Click "Start" to begin monitoring
4. **View Events**: Detected events appear in real-time in the Session Events panel
5. **Review History**: Select previous sessions from the dropdown to view past logs

## Configuration

Edit `app/python/config.py` to adjust:
- Probability threshold for detection
- Arduino port (or leave as None for auto-detection)
- Model path

## Authors

bryan raymond fleming bernard
