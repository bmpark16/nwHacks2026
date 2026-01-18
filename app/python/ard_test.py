from arduino_controller import ArduinoController

# Initialize controller
arduino = ArduinoController()

# Try to connect and send test command
if arduino.connect():
    print("Arduino connected successfully!")
    arduino.trigger('test')
else:
    print("Failed to connect to Arduino")
