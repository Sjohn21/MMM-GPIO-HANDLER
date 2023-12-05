/* global Module */

/* Magic Mirror
 * Module: MMM-GPIO-HANDLER
 *
 * By Koen Harthoorn
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const pigpio = require('pigpio-client').pigpio({ host: 'localhost'});

module.exports = NodeHelper.create({
	start: function () {
		this.started = false;
		this.configDefaults = {};
		this.pins = { input: {}, output: {} };
	},
	
	socketNotificationReceived: function (notification, payload) {
		const me = this;
		const { input, output, ...configDefaults } = payload;

		if (notification === "CONFIG" && me.started === false) {
			
			me.configDefaults = configDefaults;

		  	for (const [pin, pindata] of Object.entries(input)) {
				console.log(me.name + ": Registering input pin: " + pin + " for " + pindata.name);

				me.pins.input[String(pin)] = {
					type: pindata.type,
					name: pindata.name,
					sysname: pindata.name.replace(/ /g, "_").toUpperCase(),
					pull: pindata.pull,
					edge: pindata.edge,
					gpio: pigpio.gpio(parseInt(pin, 10))
				};
				me.pins.input[String(pin)].gpio.modeSet('input');
			}

			for (const [pin, pindata] of Object.entries(output)) {
				console.log(me.name + ": Registering output pin: " + pin + " for " + pindata.name);
				me.pins.output[String(pin)] = {
					type: pindata.type,
					name: pindata.name,
					gpio: pigpio.gpio(parseInt(pin, 10))
				};
				me.pins.output[String(pin)].gpio.modeSet('output');
	
				if (pindata.type === "PWM") {
					me.pins.output[String(pin)]["default_PWM_type"] = pindata.default_PWM_type ?? me.configDefaults.default_PWM_type;
					if (pindata.default_PWM_type === "Pulse") {
						me.pins.output[String(pin)]["default_PWM_pulse_speed"] = pindata.default_PWM_pulse_speed ?? me.configDefaults.default_PWM_pulse_speed;
						me.pins.output[String(pin)]["default_PWM_pulse_step"] = pindata.default_PWM_pulse_step ?? me.configDefaults.default_PWM_pulse_step;
					} else if (pindata.default_PWM_type === "Fixed") {
						me.pins.output[String(pin)]["default_PWM_state"] = pindata.default_state ?? me.configDefaults.default_state;
					}
				} else {
					me.pins.output[String(pin)]["default_state"] = pindata.default_state ?? me.configDefaults.default_state;
				}
			}

			console.log(me.name + ": All pins in configuration are registered.");

			this.inputHandler();
			this.initializeOutputs();
			me.started = true;

		} else if (notification === "HANDLE_PWM" && me.started === true) {
			const { pin, pwmType, pwmSpeedState, pwmStep } = payload;

			if (me.pins.output[String(pin)]) {
				me.PWMHandler(pin, pwmType, pwmSpeedState, pwmStep);
			} else {
				console.error(`Pin ${pin} is not configured as an output pin.`);
			}

		} else if (notification === "HANDLE_ON/OFF" && me.started === true) {
			const { pin, state } = payload;
				
			if (me.pins.output[String(pin)]) {
				me.OnOffHandler(pin, state);
			} else{
				console.error(`Pin ${pin} is not configured as an output pin.`);
			}

		} else if (notification !== "CONFIG" && me.started === false) {
		  me.sendSocketNotification("Notification '" + notification + "' received, but MMM-GPIO-HANDLER is not (completely) initialized yet.");
		  console.log("Notification '" + notification + "' received, but MMM-GPIO-HANDLER is not (completely) initialized yet.");
		} else {
		  me.sendSocketNotification("Notification '" + notification + "' received, but MMM-GPIO-HANDLER does not recognize this notification.");
		  console.log("Notification '" + notification + "' received, but MMM-GPIO-HANDLER does not recognize this notification.");
		}
	},

	inputHandler: function () {
		const me = this;
		for (const [pin, pindata] of Object.entries(me.pins.input)) {

			switch (pindata.pull) {
			  case "PUD_DOWN":
				pindata.gpio.pullUpDown(1);
				break;
			  case "PUD_UP":
				pindata.gpio.pullUpDown(2);
				break;
			  default:
				pindata.gpio.pullUpDown(0);
			}

			switch (pindata.type) {
				case "Button":
					pindata.gpio.glitchSet(me.configDefaults.debounce);
					let startTick;
					let timeout = undefined;
			
					pindata.gpio.notify((level, tick) => {
						if(pindata.pull == "PUD_UP"){
							if (level == 0) {
							startTick = tick;
							timeout = setTimeout(() => {
								console.log("Button '" + pindata.name + "' is pressed longer than " + Math.round((me.configDefaults.longPressTimeOut / 1000000) * 10) / 10 + " seconds. Is it stuck?");
								me.sendSocketNotification(pindata.sysname + "_LONG_PRESSED");
								me.sendSocketNotification("ALERT", "Button '" + pindata.name + "' is pressed longer than " + Math.round((me.configDefaults.longPressTimeOut / 1000000) * 10) / 10 + " seconds. A long press is sent, but is it stuck?");
							}, me.configDefaults.longPressTimeOut / 1000);
				
							console.log("Button '" + pindata.name + "' is pressed.");
							} else {
								clearTimeout(timeout);
								const endTick = tick;
								const diff = (endTick >> 0) - (startTick >> 0);
								console.log("Button '" + pindata.name + "' is released.");
								
								if (diff < me.configDefaults.longPressTime) {
									me.sendSocketNotification(pindata.sysname + "_SHORT_PRESSED");
									console.log("Button '" + pindata.name + "' was pressed only short.");
								} else if (diff > me.configDefaults.longPressTime && diff < me.configDefaults.longPressTimeOutt) {
									me.sendSocketNotification(pindata.sysname + "_LONG_PRESSED");
									console.log("Button '" + pindata.name + "' was pressed long.");
								}
							}
						}
						else {
							if(level == 1){
								startTick = tick;
								timeout = setTimeout(() => {
									console.log("Button '" + pindata.name + "' is pressed longer than "+ Math.round((me.configDefaults.longPressTimeOut/1000000)*10)/10 +" seconds. Is it stuck?");
									me.sendSocketNotification(pindata.sysname + "_LONG_PRESSED");
									me.sendSocketNotification("ALERT","Button '" + pindata.name + "' is pressed longer than "+ Math.round((me.configDefaults.longPressTimeOut/1000000)*10)/10 +" seconds. A long press is send, but is it stuck?");
								}, me.configDefaults.longPressTimeOut / 1000);
								
								console.log("Button '" + pindata.name + "' is pressed.");
							} else {
								clearTimeout(timeout);
								const endTick = tick;
								const diff = (endTick >> 0) - (startTick >> 0);
								console.log("Button '" + pindata.name + "' is released.");

								if(diff < me.configDefaults.longPressTime){
									me.sendSocketNotification(pindata.sysname + "_SHORT_PRESSED");
									console.log("Button '" + pindata.name + "' was pressed only short.");
								} else if(diff > me.configDefaults.longPressTime && diff < me.configDefaults.longPressTimeOut){
									me.sendSocketNotification(pindata.sysname + "_LONG_PRESSED");
									console.log("Button '" + pindata.name + "' was pressed long.");
								}
							}
						}
					});
		  
					break;

				case "PIR":
					pindata.gpio.notify((level, tick) => {
						if(pindata.pull == "PUD_UP"){
							if (level == 0) {
							me.sendSocketNotification(pindata.sysname + "_DETECTION");
							console.log(pindata.name + " detected presence");
							} else {
							me.sendSocketNotification(pindata.sysname + "_NO_DETECTION");
							console.log(pindata.name + " did not detect presence");
							}
						} else {
							if(level == 1){
								me.sendSocketNotification(pindata.sysname + "_DETECTION");
								console.log(pindata.name + " detected presence");
							}
							else{
								me.sendSocketNotification(pindata.sysname + "_NO_DETECTION");
								console.log(pindata.name + " did not detect presence");
							}
						}
					});
			
					break;

				case "Other":
					pindata.gpio.notify((level, tick) => {
						if (level == 1) {
							me.sendSocketNotification(pindata.sysname + "_HIGH");
							console.log(pindata.name + " is high.");
						} else {
							me.sendSocketNotification(pindata.sysname + "_LOW");
							console.log(pindata.name + " is low.");
						}
					});
		  
				  	break;

				default:
					console.log("Input type " + pindata.type + " not recognized. Could not be initialized.");
					me.sendSocketNotification("ALERT", "Input type " + pindata.type + " of input pin " + pin + " not recognized. Could not be initialized.");
			  }
		}
	},

	initializeOutputs: function () {
		const me = this;
		for (const [pin, pindata] of Object.entries(me.pins.output)) {
			switch (pindata.type) {
				case "PWM":
					this.PWMHandler(pin);
					break;

				case "On/Off":
					this.OnOffHandler(pin);
					break;

				default:
					console.log("Output type " + pindata.type + " of output pin " + pin + " not recognized. Could not be initialized.");
					me.sendSocketNotification("ALERT", "Output type " + pindata.type + " of output pin " + pin + " not recognized. Could not be initialized.");
			}
		}
	},

	PWMHandler: function (pin, pwmType, pwmSpeedState, pwmStep) {
		const me = this;
		try {
			const pinData = me.pins.output[String(pin)];
			const type = pwmType ?? pinData.default_PWM_type ?? me.configDefaults.default_PWM_type;
			const speed = pwmSpeedState ?? pinData.default_PWM_pulse_speed ?? me.configDefaults.default_PWM_pulse_speed;
			const step = pwmStep ?? pinData.default_PWM_pulse_step ?? me.configDefaults.default_PWM_pulse_step;
			const state = pwmSpeedState ?? pinData.default_PWM_state ?? me.configDefaults.default_state;
				
			if (!pinData.gpio) {
				throw new Error("Pin not initialized for GPIO.");
			}
			if (pinData.type !== "PWM" ) {
				throw new Error("Pin not configured for PWM.");
			}

			if(type === "Pulse"){
				if (typeof speed !== "number" || typeof step !== "number" || speed < 4 || step < 1 || step > 255) {
					throw new Error("Invalid speed or step value for PWM pulse.");
				}

				let dutyCycle = 0;
				let dir = 1;

				setInterval(() => {
					pinData.gpio.analogWrite(dutyCycle);
					
					if(dir == 1){
						dutyCycle += step;
					} else{
						dutyCycle -= step;
					}
					
					if (dutyCycle > 255) {
						dutyCycle = 255;
						dir = 0;
					} else if(dutyCycle < 0) {
						dutyCycle = 0;
						dir = 1;
					}
				}, speed);
			} else if(type === "Fixed"){
				if (typeof state !== "number" || state <1 || state > 255) {
					throw new Error("Invalid state value for PWM fixed.");
				}
				pinData.gpio.analogWrite(state);
			} else {
				throw new Error("Invalid PWM type specified.");
			}
		} catch (error){
			console.error("PWM handling error:", error.message);
		}
			// add Hardware PWM support?
	},

	OnOffHandler: function (pin, specState) {
		const me = this;
		try{
			const pinData = me.pins.output[String(pin)];
			const state = specState ?? pinData.default_state ?? me.configDefaults.default_state;

			if (!pinData.gpio) {
				throw new Error("Pin not initialized for GPIO.");
			}

			if (state !== 0 && state !== 1) {
				throw new Error("Invalid state value. State must be 0 or 1.");
			  }

			pinData.gpio.write(state);
		} catch (error){
			console.error("On/Off handling error:", error.message);
		}
	},
	
	stop: function() {
		console.log("Shutting down module: " + this.name);
	}
});
