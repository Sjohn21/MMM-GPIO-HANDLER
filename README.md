# MMM-GPIO-HANDLER
[MagicMirror²](https://github.com/MichMich/MagicMirror/) module to handle GPIO Input and Output, including PWM functions.

## WIP
This module is work in progress and needs testing before stating it is maintained and usable.

# Contents
* [Concept / Background](#Concept-/-Background)
* [Dependencies](#Dependencies)
* [Installation](#Installation)
* [Configuration](#Configuration)
  * [Example Configuration](#Example-Configuration)
  * [Module Configuration](#Module-Configuration)
  * [Input Configuration](#Input-Configuration)
  * [Output Configuration](#Output-Configuration)
* [Usage](#Usage)
  * [Input usage](#Input-usage)
    * [Buttons](#Buttons)
	* [PIR](#PIR)
	* [Other](#Other)
  * [Output usage](#Output-usage)
    * [HANDLE_ON/OFF notification payload](#HANDLE_ON/OFF-notification-payload)
	* [HANDLE_PWM notification payload](#HANDLE_PWM-notification-payload)
* [Credits](#Credits)

# Concept / Background
While building my Mirror I could not find a module that support [PWM](https://en.wikipedia.org/wiki/Pulse-width_modulation) (Pulse Width Modulation) and/or handle GPIO as a whole (input & output).
The Mirror had leds and ledstrips installed according [this](https://dordnung.de/raspberrypi-ledstrip/) intruction (with MOSFETs).
Though the instructions do not mention PWM explicitly, the concept uses Software PWM.

This module supports:
* Both Hardware and Software PWM and some PWM effects, mostly optimized for LEDs. (Breath, Pulse, Flash, Fade-in, Fad-out).
* On/off handling of outputs (1/0 state, not using PWM).
* Input handling of buttons (short & long press), PIR, Other.

The module sends a Notification if an input is changed, which can be used to start actions in other modules.  
The module starts output handling form defaults set or when an HANDLE_PWM or HANDLE_ON/OFF notification is received. Payload in notification sets the options.

# Dependencies
The module depends on the use of the [socket interface](https://abyz.me.uk/rpi/pigpio/sif.html) of the [pigpio library](https://abyz.me.uk/rpi/pigpio/index.html). It works by launching the [pigpio Deamon](https://abyz.me.uk/rpi/pigpio/pigpiod.html) and exposing the socket interface.
The pigpiod utility requires sudo privileges to launch the library but thereafter the socket commands may be issued by normal users (e.g. MagicMirror).

On Raspbian/Raspberry Pi OS these utilities are normally already installed. To check you can run
```bash
pigpiod -v
```
It will show the version if it is installed.

If not installed on Raspbian/Raspberry Pi OS you can run
```bash
sudo apt-get update
sudo apt-get install pigpio
```
On other OS if the above not works, or if for some reason not the latest version of the package is installed and you need the latest package, you'll need the build-essential package:
```bash
sudo apt-get install build-essential
```
Next, run the following shell commands:
```bash
rm master.zip
sudo rm -rf pigpio-master
wget https://github.com/joan2937/pigpio/archive/master.zip
unzip master.zip
cd pigpio-master
make
sudo make install
```


Additionally, the [pigpio-client](https://github.com/guymcswain/pigpio-client#readme) is installed from dependecies to expose the socket interface APIs to javascript using nodejs.

Lastly, the module sends alerts in some cases. For this the defautl module [Alert](https://docs.magicmirror.builders/modules/alert.html) should be configured.

# Installation
Clone this repository in your `modules` folder, and install dependencies:
```bash
cd ~/MagicMirror/modules # adapt directory if you are using a different one
git clone https://github.com/Sjohn21/MMM-GPIO-HANDLER.git
cd MMM-GPIO-HANDLER
npm install
```

# Configuration
Add the module to your modules array in your `config.js`. Full list of configurable options can be found in [Module Configuration](#Module-Configuration).

## Example Configuration
Below is a simple example, with two buttons connected on pins 24 & 25 [(one with internal pull-up resistor and one with internall pull-down resistor active)](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#inputs), one PIR sensor on pin 14 (with pull-up resistor) and one unspecified/other sensor on pin 8 as inputs. The example has 5 outputs defined, one (software) PWM output with a fixed state (250000) for dutyCycle on pin 4, one hardwarePWM output with an effect of type Pulse using a speed of 50ms between changes and in 50 steps (of complete dutyCycle) on pin 12, an On/Off output with a default state of 1 on pin 15, an On/Off output with a default state of 0 on pin 10 and finally a (software) PWM output with an effect of type Breath using a speed of 50ms between changes and in 10 steps given a certain bandwitdh of dutyCycle between minimum 20% and maximum 80% of dutyCycle.

```js
{
	module: "MMM-GPIO-HANDLER",
	config: {
		debounce: 10000,
		longPressTime: 500000,
		longPressTimeOut: 3000000,
		input: {
			"24": {
				type: "Button",
				name: "Button 1",
				pull: "PUD_DOWN"
			},
			"25": {
				type: "Button",
				name: "Button 2",
				pull: "PUD_UP"
			},
			"14": {
				type: "PIR",
				name: "Pir Sensor",
				pull: "PUD_DOWN"				
			},
			"8": {
				type: "Other",
				name: "Other type of Sensor"		
			}
		},
		output: {
			"4": {
				type: "PWM",
				name: "Ledstrip FET cool",
				default_PWM_effect: "Fixed",
				default_PWM_state: 250000
			},
			"12": {
				type: "hardwarePWM",
				name: "Button 8 LED FET",
				default_PWM_effect: "Pulse",
				default_PWM_speed: 50,
				default_PWM_steps: 50
			},
			"15": {
				type: "On/Off",
				name: "Display K0",
				default_state: 1
			},
			"10": {
				type: "On/Off",
				name: "Relay CH1",
				default_state: 0
			},
			"17": {
				type: "PWM",
				name: "Button 7 LED FET",
				default_PWM_effect: "Breath",
				default_PWM_speed: 50,
				default_PWM_steps: 10,
				default_PWM_upperLimitDCP: 80,
				default_PWM_lowerLimitDCP: 20
			}
		}
	}
},
```
## Module Configuration
See below table for all options for the global module configuration. Some of them can be set globally and/or per output, see [Output Configuration](#Output-Configuration):

| Option                          | Type     | Default Value | Description |
| ------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input`                         | `object` | `{}`    | An object for configuration of Inputs, see [Input Configuration](#Input-Configuration). Default `{}`, no inputs configured                     |
| `output`                        | `object` | `{}`    | An object for configuration of Outputs, see [Output Configuration](#Output-Configuration). Default `{}`, no output configured                  |
| `debounce`                      | `uint`   | `10`    | In milliseconds, if the input pin changes state during this period after the last event the new event will be ignored                                   |
| `longPressTime`                 | `uint`   | `500`   | In milliseconds, for buttons. When pressed shorter than this time it is seen as a short press, when longer than this time as a long press               |
| `longPressTimeOut`              | `uint`   | `3000`  | In milliseconds, for buttons. When pressed longer than this time a long press is send and a warning if button is stuck                                  |
| `default_PWM_effect`            | `string` | `Fixed` | Possible values for PWM Effect are `Fixed`, `Breath`, `Pulse`, `Flash`, `Fade-in` and `Fade-out`                                                        |
| `default_PWM_speed`             | `uint`   | `50`    | In milliseconds, cannot be less than 4ms. Time between each step in an effect                                                                           |
| `default_PWM_steps`             | `uint`   | `10`    | Amount of steps for changing an effect between min an max dutyCycle, e.g. 10 steps between 0 an 255 (softwarePWM) is changing per 26                    |
| `default_PWM_upperLimitDCP`     | `uint`   |         | 0 - 100 (percentage), to change max dutyCycle (percentage from 1000000 for hardwarePWM and 255 for SoftwarePWM). If not set max Dutycyle is upper limit |
| `default_PWM_lowerLimitDCP`     | `uint`   |         | 0 - 100 (percentage), to change min dutyCycle (percentage from 1000000 for hardwarePWM and 255 for SoftwarePWM). If not set min Dutycyle is lower limit |
| `default_PWM_flashLength`       | `uint`   |         | In milliseconds, for use with Flash effect. The amount of time the led is on in a flash cycle. Cannot be less than 4ms and should be greater than default_PWM_speed |
| `default_PWM_startOn`           | `string` |         | `high` or `low`, to set if effects `Breath`, `Pulse` or `Flash` start on upper limit or lower limer of dutyCycle                                        |
| `default_PWM_cycles`            | `int`    |         | To set the amount of cycles an effect lasts for effects `Breath`, `Pulse` and `Flash`. Use `-1` for infinite cycles (or until a new effect is set)      |
| `default_PWM_endOn`             | `string` |         | `high` or `low`, to set if effects `Breath`, `Pulse` or `Flash` end on upper limit or lower limer of dutyCycle after set cycles                         |
| `default_PWM_endPrevOn`         | `string` |         | `high` or `low`, if an output already has an effect of `Breath`, `Pulse` or `Flash` and another effect is set on the same output the previous effect can be ended on upper or lower limit of dutyCycle. When not set the new effect overwrites the previous effect immediately |
| `default_PWM_state`             | `uint`   | `0`     | 0 - 1000000, state of dutyCycle for `Fixed` PWM Effect. This is the Range of HardwarePWM and is automatically converted linearly to a dutyCycle between 0 - 255 if output is SoftwarePWM |
| `default_hardwarePWM_frequency` | `uint`   | `0`     | 0 - 125000000 (or 0 - 187500000 for the BCM2711), PWM frequency for HardwarePWM, Frequencies above 30MHz are unlikely to work. HardwarePWM only works on pins `12`, `13`, `18` and `19`. Max two channels available, see [gpioHardwarePWM](https://abyz.me.uk/rpi/pigpio/cif.html#gpioHardwarePWM) for details. |
| `default_state`                 | `uint`   | `0`     | 0 - 1, state for On/Off outputs.                                                                                                                        |

## Input Configuration
See below table for all options for configuring input pins.  
Each pin configuration goes in their own object, within the input object.

| Option       | Type     | Requirement | Description                                                                                                                                   |
| ------------ | -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `OBJECT_KEY` | `string` | `required`  | The object Key represents the pin number for the input to be configured according BCM GPIO numbering, see [GPIO and the 40 pin header](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#gpio-and-the-40-pin-header) |
| `type`       | `string` | `required`  | The type of input, can be `Button`, `PIR` or `Other`                                                                                          |
| `name`       | `string` | `required`  | A Human readable name for the input                                                                                                           |
| `pull`       | `string` | `optional`  | Sets resistor pull ups or downs on the GPIO. `PUD_UP` for Pull-up or `PUD_DOWN` for Pull-down. If not set any pull will be cleared on the pin |

## Output Configuration
See below table for all options for configuring output pins.  
Each pin configuration goes in their own object, within the output object. Configuration in the pin object overwrites the system defaults for that pin. 

| Option                          | Type     | Requirement | Description                                                                                                                                             |
| ------------------------------- | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OBJECT_KEY`                    | `string` | `required`  | The object Key represents the pin number for the output to be configured according BCM GPIO numbering, see [GPIO and the 40 pin header](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#gpio-and-the-40-pin-header) |
| `type`                          | `string` | `required`  | The type of output, can be `PWM`, `hardwarePWM` or `On/Off`                                                                                             |
| `name`                          | `string` | `required`  | A Human readable name for the output                                                                                                                    |
| `default_PWM_effect`            | `string` | `optional`  | Possible values for PWM Effect are `Fixed`, `Breath`, `Pulse`, `Flash`, `Fade-in` and `Fade-out`                                                        |
| `default_PWM_speed`             | `uint`   | `optional`  | In milliseconds, cannot be less than 4ms. Time between each step in an effect                                                                           |
| `default_PWM_steps`             | `uint`   | `optional`  | Amount of steps for changing an effect between min an max dutyCycle, e.g. 10 steps between 0 an 255 (softwarePWM) is changing per 26                    |
| `default_PWM_upperLimitDCP`     | `uint`   | `optional`  | 0 - 100 (percentage), to change max dutyCycle (percentage from 1000000 for hardwarePWM and 255 for SoftwarePWM). If not set max Dutycyle is upper limit |
| `default_PWM_lowerLimitDCP`     | `uint`   | `optional`  | 0 - 100 (percentage), to change min dutyCycle (percentage from 1000000 for hardwarePWM and 255 for SoftwarePWM). If not set min Dutycyle is lower limit |
| `default_PWM_flashLength`       | `uint`   | `optional`  | In milliseconds, for use with Flash effect. The amount of time the led is on in a flash cycle. Cannot be less than 4ms and should be greater than default_PWM_speed |
| `default_PWM_startOn`           | `string` | `optional`  | `high` or `low`, to set if effects `Breath`, `Pulse` or `Flash` start on upper limit or lower limer of dutyCycle                                        |
| `default_PWM_cycles`            | `int`    | `optional`  | To set the amount of cycles an effect lasts for effects `Breath`, `Pulse` and `Flash`. Use `-1` for infinite cycles (or until a new effect is set)      |
| `default_PWM_endOn`             | `string` | `optional`  | `high` or `low`, to set if effects `Breath`, `Pulse` or `Flash` end on upper limit or lower limer of dutyCycle after set cycles                         |
| `default_PWM_endPrevOn`         | `string` | `optional`  | `high` or `low`, if an output already has an effect of `Breath`, `Pulse` or `Flash` and another effect is set on the same output the previous effect can be ended on upper or lower limit of dutyCycle. When not set the new effect overwrites the previous effect immediately |
| `default_PWM_state`             | `uint`   | `optional`  | 0 - 1000000, state of dutyCycle for `Fixed` PWM Effect. This is the Range of HardwarePWM and is automatically converted linearly to a dutyCycle between 0 - 255 if output is SoftwarePWM |
| `default_hardwarePWM_frequency` | `uint`   | `optional`  | 0 - 125000000 (or 0 - 187500000 for the BCM2711), PWM frequency for HardwarePWM, Frequencies above 30MHz are unlikely to work. HardwarePWM only works on pins `12`, `13`, `18` and `19`. Max two channels available, see [gpioHardwarePWM](https://abyz.me.uk/rpi/pigpio/cif.html#gpioHardwarePWM) for details. |
| `default_state`                 | `uint`   | `optional`  | 0 - 1, state for On/Off outputs.                                                                                                                        |

# Usage
The module needs to have the Pigpio Deamon running.  
Before running Magic Mirror start the Deamon using the following command:
```bash
sudo pigpiod -l
```
If [Pm2](https://docs.magicmirror.builders/configuration/autostart.html#using-pm2) is used start autostart Magic Mirror mm.sh (or whatever the bash script is called) can be adjusted by adding one line:
```bash
cd ./MagicMirror
sudo pigpiod -l # add this line here
DISPLAY=:0 npm start
```

## Input usage
When all inputs are configured, the inputs will be monitored. Once triggered the module will send a notification to all other modules.
An other module can than do whatever is needed with this notification.
The human readable name will be converted to a system name converted to all uppercase and where spaces are replaced by an underscore.

### Buttons
The pull can be set as per [Input Configuration](#Input-Configuration), if the Pull is set to `PUD_UP` and the level (3.3v) changes to 0 the notification will trigger. Likewise when the Pull is set to `PUD_DOWN` or not set and the level (3.3v) changes to 1.  
If the button is hold longer than `longPressTime` a long press notification will be send, if the button is hold shorter than this time a short press notification will be send. If the button is hold longer than `longPressTimeOut` a long press notification will be send at `longPressTimeOut` nonetheless and an Alert will be send to notify the user if the button might be stuck.  
Notifications are formatted as: `<<systemname>>_LONG_PRESSED` and `<<systemname>>_SHORT_PRESSED`.  
E.g. if the Button is named `Button 1` the notifications will be `BUTTON_1_LONG_PRESSED` and `BUTTON_1_SHORT_PRESSED`.

### PIR
The pull can be set as per [Input Configuration](#Input-Configuration), if the Pull is set to `PUD_UP` and the level (3.3v) changes to 0 the detection notification will trigger. Likewise when the Pull is set to `PUD_DOWN` or not set and the level (3.3v) changes to 1. A no detection notification will trigger when the level changes the other way around.  
Notifications are formatted as: `<<systemname>>_DETECTION` and `<<systemname>>_NO_DETECTION`.  
E.g. if the PIR sensor is named `Pir Sensor` the notifications will be `PIR_SENSOR_DETECTION` and `PIR_SENSOR_NO_DETECTION`.

### Other
If something else than a button or PIR is connected, the `other` option cna be used. When the level (3.3v) changes to 1 a high notification will be send, when the level (3.3v) changes to 0 a low notification will be send. When the level (3.3v) changes to something else a floating notification will be send.  
otifications are formatted as: `<<systemname>>_HIGH`, `<<systemname>>_LOW` and `<<systemname>>_FLOATING`.  
E.g. if the sensor is named `Other type of Sensor` he notifications will be `OTHER_TYPE_OF_SENSOR_HIGH`, `OTHER_TYPE_OF_SENSOR_LOW` and `OTHER_TYPE_OF_SENSOR_FLOATING`.

## Output usage
When all outputs are configured, the defaults set on the outputs will run once the module is started. E.g. if globally `default_PWM_cycles` is set to `10` cycles and pin 17 is configured as:
```js
"17": {
	type: "PWM",
	name: "Button 7 LED FET",
	default_PWM_effect: "Breath",
	default_PWM_speed: 50,
	default_PWM_steps: 10,
	default_PWM_upperLimitDCP: 80,
	default_PWM_lowerLimitDCP: 20
}
```
the led (in this case a led on a button) will run the the `Breath` effect with a changing speed of `50` and in `10` steps between a max dutyCycle of `80` percent and a min dutyCycle of `20` percent.

Additionally, Outputs can be changed by notifications. The `HANDLE_PWM` and `HANDLE_ON/OFF` notification are read by the module and a `payload` set the options. See next paragraphs.

### HANDLE_ON/OFF notification payload
The `HANDLE_ON/OFF` notification should be accompanied by an object in the payload. The object options are:

| Option  | Type   | Requirement | Description              |
| ------- | ------ | ----------- | ------------------------ |
| `pin`   | `uint` | `required`  | The pin to change state  |
| `state` | `uint` | `required`  | The new state `0` or `1` |

Example payload:
```js
{
	"pin" : 10,
	"state" : 1
}
```

### HANDLE_PWM notification payload
The `HANDLE_PWM` notification should be accompanied by an object in the payload. The object options are:

| Option             | Type     | Requirement | Description                                                                                                                                                        |
| ------------------ | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pin`              | `uint`   | `required`  | The pin to change pwm                                                                                                                                              |
| `pwmEffect`        | `string` | `required`  | `Fixed`, `Breath`, `Pulse`, `Flash`, `Fade-in` or `Fade-out`                                                                                                       |
| `pwmSpeed`         | `uint`   | `required*` | In milliseconds, cannot be less than 4ms. Time between each step in an effect. Not required for `Fixed` effect                                                     |
| `pwmSteps`         | `uint`   | `required*` | In milliseconds, Amount of steps for changing an effect between min an max dutyCycle.  Not required for `Fixed` and `Flash` effect                                 |
| `pwmUpperLimitDCP` | `uint`   | `optional`  | 0 - 100 (percentage), to change max dutyCycle. If not set max Dutycyle is upper limit                                                                              |
| `pwmLowerLimitDCP` | `uint`   | `optional`  | 0 - 100 (percentage), to change min dutyCycle. If not set min Dutycyle is lower limit                                                                              |
| `pwmFlashLength`   | `uint`   | `required*` | In milliseconds, only required with `Flash` effect. The amount of time the led is on in a flash cycle. Cannot be less than 4ms and should be greater than pwmSpeed |
| `pwmState`         | `uint`   | `required*` | 0 - 1000000, state of dutyCycle for `Fixed` PWM Effect. This is the Range of HardwarePWM and is automatically converted linearly to a dutyCycle between 0 - 255 if output is SoftwarePWM |
| `pwmStart`         | `string` | `optional`  | `high` or `low`, to set if effects `Breath`, `Pulse` or `Flash` start on upper limit or lower limer of dutyCycle. Deaults at `low`                                 |
| `pwmCycles`        | `int`    | `required*` | To set the amount of cycles an effect lasts. Requirde for effects `Breath`, `Pulse` and `Flash`. Use `-1` for infinite cycles (or until a new effect is set)       |
| `pwmEnd`           | `string` | `optional`  | `high` or `low`, to set if effects `Breath`, `Pulse` or `Flash` end on upper limit or lower limer of dutyCycle after set cycles                                    |
| `pwmEndPrevOn`     | `string` | `optional`  | `high` or `low`, if an output already has an effect of `Breath`, `Pulse` or `Flash` and another effect is set on the same output the previous effect can be ended on upper or lower limit of dutyCycle. When not set the new effect overwrites the previous effect immediately |

Example payload:
```js
{
	"pin" : 17,
	"pwmEffect" : "Pulse",
	"pwmSpeed" : 50,
	"pwmSteps" : 15,
	"pwmUpperLimitDCP" : 85,
	"pwmLowerLimitDCP" : 10,
	"pwmStart" : "high",
	"pwmCycles" : 15,
	"pwmEnd" : "low"
}
```

# Credits
* [Michael Teeuw](https://github.com/MichMich) for [MagicMirror2](https://github.com/MichMich/MagicMirror/)
* [Guy McSwain](https://github.com/guymcswain) for [pigpio-client](https://github.com/guymcswain/pigpio-client)
* [Joan](https://github.com/joan2937) for [Pigpio & Pigpiod](https://github.com/joan2937/pigpio)