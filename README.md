# MMM-GPIO-HANDLER
A Handler for GPIO Input and Output for Magic Mirror

# WIP

This module is work in progress and does not work yet currently.

## Configuration

To use the module insert it in the config.js file. Here is an example:

```json5
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
				pull: "PUD_DOWN"
			},
			"8": {
				type: "Button",
				name: "Button 3",
				pull: "PUD_DOWN"
			},
			"7": {
				type: "Button",
				name: "Button 4",
				pull: "PUD_DOWN"
			},
			"12": {
				type: "Button",
				name: "Button 5",
				pull: "PUD_DOWN"
			},
			"16": {
				type: "Button",
				name: "Button 6",
				pull: "PUD_DOWN"
			},
			"20": {
				type: "Button",
				name: "Button 7",
				pull: "PUD_DOWN"
			},
			"21": {
				type: "Button",
				name: "Button 8",
				pull: "PUD_DOWN"
			},
			"14": {
				type: "PIR",
				name: "Pir Sensor",
				pull: "PUD_DOWN"				
			}
		},
		output: {
			"4": {
				type: "PWM",
				name: "Ledstrip FET cool",
				default_PWM_type: "Fixed",
				default_state: 0
			},
			"17": {
				type: "PWM",
				name: "Ledstrip FET warm",
				default_PWM_type: "Fixed",
				default_state: 0
			},
			"15": {
				type: "On/Off",
				name: "Display K0",
				default_state: 1
			},
			"18": {
				type: "On/Off",
				name: "Display K1",
				default_state: 1
			},
			"23": {
				type: "On/Off",
				name: "Display K2",
				default_state: 1
			},
			"27": {
				type: "On/Off",
				name: "Display K3",
				default_state: 1
			},
			"22": {
				type: "On/Off",
				name: "Display K4",
				default_state: 1
			},
			"10": {
				type: "On/Off",
				name: "Relay CH1",
				default_state: 0
			},
			"9": {
				type: "On/Off",
				name: "Relay CH2",
				default_state: 0
			},
			"11":  {
				type: "On/Off",
				name: "Relay CH3",
				default_state: 0
			},
			"5": {
				type: "On/Off",
				name: "Relay CH4",
				default_state: 0
			},
			"6": {
				type: "On/Off",
				name: "Relay CH5",
				default_state: 0
			},
			"13": {
				type: "On/Off",
				name: "Relay CH6",
				default_state: 0
			},
			"19": {
				type: "On/Off",
				name: "Relay CH7",
				default_state: 0
			},
			"26": {
				type: "PWM",
				name: "Button 8 LED FET",
				default_PWM_type: "Pulse",
				default_PWM_pulse_speed: 500,
				default_PWM_pulse_step: 10,
				default_state: 0
			}
		}
	}
},
```

