import serial
import serial.tools.list_ports
from config import ARDUINO_PORT, ARDUINO_BAUDRATE


class ArduinoController:
    def __init__(self):
        self.port = ARDUINO_PORT
        self.baudrate = ARDUINO_BAUDRATE
        self.connection = None
        self.auto_detect_port()

    def auto_detect_port(self):
        """Auto-detect Arduino port"""
        if self.port:
            return

        ports = serial.tools.list_ports.comports()
        for port in ports:
            # Common Arduino identifiers
            if 'arduino' in port.description.lower() or 'ch340' in port.description.lower() or 'cp210' in port.description.lower():
                self.port = port.device
                print(f"Auto-detected Arduino port: {self.port}")
                return

    def connect(self):
        """Connect to Arduino"""
        if not self.port:
            print("No Arduino port configured")
            return False

        try:
            self.connection = serial.Serial(
                self.port, self.baudrate, timeout=1)
            print(f"Connected to Arduino on {self.port}")
            return True
        except Exception as e:
            print(f"Error connecting to Arduino: {e}")
            return False

    def disconnect(self):
        """Disconnect from Arduino"""
        if self.connection and self.connection.is_open:
            self.connection.close()
            self.connection = None

    def trigger(self, action):
        """Send trigger command to Arduino"""
        if not self.connection or not self.connection.is_open:
            if not self.connect():
                return False

        try:
            # Send action as string (Arduino can parse this)
            command = f"{action}\n"
            self.connection.write(command.encode())
            print(f"Triggered Arduino with action: {action}")
            return True
        except Exception as e:
            print(f"Error triggering Arduino: {e}")
            return False

    def __del__(self):
        self.disconnect()
