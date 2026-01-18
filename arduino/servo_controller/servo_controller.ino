#include <Servo.h>

Servo myServo;
const int SERVO_PIN = 9;  // Connect servo to digital pin 9
const int START_POSITION = 0;
const int END_POSITION = 105;
const int SWEEP_DELAY = 5;  // Delay between each degree (ms)
const int RESET_DELAY = 500;  // Delay before resetting (ms)

bool autoMode = false;
bool triggerSweep = false;

void setup() {
  Serial.begin(9600);
  myServo.attach(SERVO_PIN);
  myServo.write(START_POSITION);
  Serial.println("Arduino Servo Controller Ready");
  Serial.println("Commands: START, STOP, TRIGGER");
}

void loop() {
  // Check for serial commands
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    handleCommand(command);
  }

  // Execute sweep if triggered or in auto mode
  if (triggerSweep || autoMode) {
    performSweep();
    triggerSweep = false;  // Reset trigger after single sweep
  }
}

void handleCommand(String command) {
  command.toUpperCase();

  if (command == "START") {
    autoMode = true;
    Serial.println("Auto mode started - continuous sweeping");
  }
  else if (command == "STOP") {
    autoMode = false;
    myServo.write(START_POSITION);
    Serial.println("Auto mode stopped - servo reset");
  }
  else if (command == "TRIGGER") {
    triggerSweep = true;
    Serial.println("Single sweep triggered");
  }
  else if (command.startsWith("SLEEPING") || command.startsWith("DOOMSCROLLING")) {
    // Handle action detection triggers
    triggerSweep = true;
    Serial.print("Action detected: ");
    Serial.println(command);
  }
  else {
    Serial.print("Unknown command: ");
    Serial.println(command);
  }
}

void performSweep() {
  // Sweep from 0 to 130 degrees
  for (int pos = START_POSITION; pos <= END_POSITION; pos++) {
    myServo.write(pos);
    delay(SWEEP_DELAY);

    // Check for stop command during sweep
    if (Serial.available() > 0) {
      String command = Serial.readStringUntil('\n');
      command.trim();
      command.toUpperCase();
      if (command == "STOP") {
        autoMode = false;
        myServo.write(START_POSITION);
        Serial.println("Sweep interrupted - stopped");
        return;
      }
    }
  }

  // Hold at end position briefly
  delay(RESET_DELAY);

  // Return to start position
  myServo.write(START_POSITION);

  // Brief pause before next sweep
  delay(RESET_DELAY);
}
