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
		debounce: 100,
		longPressTime: 1000,
		Input: {
			"24": {
				type: "Button",
				name: "Button 1",
				pull: "PUD_DOWN",
				edge: "EITHER_EDGE"
			},
			"25": {
				type: "Button",
				name: "Button 2",
				pull: "PUD_DOWN",
				edge: "EITHER_EDGE"
			},
			"14":{
				type: "PIR",
				Name: "Pir Sensor",
				pull: "PUD_DOWN",
				edge: "EITHER_EDGE"				
			}
		},
		Output: {
			"4":  {
				type: "PWM",
				name: "Ledstrip FET"
			},
			"15":  {
				type: "On/Off",
				name: "Display K0"
			}
		}
	}
},
```

