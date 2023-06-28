/* global Module */

/* Magic Mirror
 * Module: MMM-GPIO-HANDLER
 *
 * By Koen Harthoorn
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const Gpio = require('pigpio').Gpio;

module.exports = NodeHelper.create({
	start: function () {
		this.started = false;
	},
	
	socketNotificationReceived: function (notification, payload) {
		const me = this;
		
		if (notification === "CONFIG" && me.started === false) {
			let{input, output, ...confvals} = payload;
			var pins = {};
		
			for(var pin in input){
				var pindata = input[String(pin)];
				console.log(me.name + ": Registering input pin: " + pin + " for " + pindata.name);
				pins.input[String(pin)] = {};
				pins.input[String(pin)]["type"] = pindata.type;
				pins.input[String(pin)]["name"] = pindata.name;
				pins.input[String(pin)]["sysname"] = pindata.name.replace(/ /g,"_").toUpperCase();
				pins.input[String(pin)]["pull"] = pindata.pull;
				pins.input[String(pin)]["edge"] = pindata.edge;
				pins.input[String(pin)]["gpio"] = new Gpio(pin, { mode: Gpio.INPUT });
			}
			
			for(var pin in output){
				var pindata = output[String(pin)]
				console.log(me.name + ": Registering output pin: " + pin + " for " + pindata.name);
				pins.output[String(pin)] = {};
				pins.output[String(pin)]["type"] = pindata.type;
				pins.output[String(pin)]["name"] = pindata.name;
				if(pindata.type === "PWM"){
					pins.output[String(pin)]["PWM_type"] = pindata.default_PWM_type ?? confvals.default_PWM_type ;
					if(pins.output[String(pin)]["PWM_type"] === "Pulse"){
						pins.output[String(pin)]["PWM_pulse_speed"] = pindata.default_PWM_pulse_speed ?? confvals.default_PWM_pulse_speed;
						pins.output[String(pin)]["PWM_pulse_step"] = pindata.default_PWM_pulse_step ?? confvals.default_PWM_pulse_step;
					} else if(pins.output[String(pin)]["PWM_type"] === "Fixed"){
						pins.output[String(pin)]["PWM_state"] = pindata.default_state ?? confvals.default_state;
					}
				} else{
					pins.output[String(pin)]["state"] = pindate.default_state ?? confvals.default_state;
				}
				pins.output[String(pin)]["sysname"] = pindata.name.replace(/ /g,"_").toUpperCase();
				pins.output[String(pin)]["gpio"] = new Gpio(pin, { mode: Gpio.OUTPUT });
				//pins[String(pin)].gpio.digitalWrite(pindata.default_state);
			}
			
			console.log(me.name + ": All pins in configuration are registered.");
			
			this.inputHandler(pins.input,confvals);
			this.initializeOutputs(pins.output,confvals);
			me.started = true;
		} else if(notification === "HANDLE_PWM" && me.started === true){
			//here pwm handles
		} else if(notification === "HANDLE_ON/OFF" && me.started === true){
			//here ON/OFF Handles
		} else if(notification !== "CONFIG" && me.started === false){
			me.sendSocketNotification("Notification '" + notification + "' received, but MMM-GPIO-HANDLER is not (completely) initialized yet.");
			console.log("Notification '" + notification + "' received, but MMM-GPIO-HANDLER is not (completely) initialized yet.");
		} else {
			me.sendSocketNotification("Notification '" + notification + "' received, but MMM-GPIO-HANDLER does not recognize this notification.");
			console.log("Notification '" + notification + "' received, but MMM-GPIO-HANDLER does not recognize this notification.");
		}
	},
	
	inputHandler: function(pins,config){
		const me = this;
		for(var pin in pins){
			let pindata = pins[String(pin)];
			switch(pindata.pull){
				case "PUD_DOWN":
					pindata.gpio.pullUpDown(Gpio.PUD_DOWN);
					break;
				case "PUD_UP":
					pindata.gpio.pullUpDown(Gpio.PUD_UP);
					break;
				default:
					pindata.gpio.pullUpDown(Gpio.PUD_OFF);
			}
			
			switch(pindata.type){
				case "Button":
					pindata.gpio.glitchFilter(config.debounce);
					pindata.gpio.enableAlert();
					let startTick;
					let prevLevel;
					let timeout = undefined; 
					
					 pindata.gpio.on('alert', (level, tick) => {
						if(pindata.pull == "PUD_UP"){
							if(level == 0){
								startTick = tick;
								timeout = setTimeout(() => {
									console.log("Button '" + pindata.name + "' is pressed longer than "+ Math.round((config.longPressTimeOut/1000000)*10)/10 +" seconds. Is it stuck?");
									me.sendSocketNotification(pindata.sysname + "_LONG_PRESSED");
									me.sendSocketNotification("ALERT","Button '" + pindata.name + "' is pressed longer than "+ Math.round((config.longPressTimeOut/1000000)*10)/10 +" seconds. A long press is send, but is it stuck?");
								}, config.longPressTimeOut / 1000);
									
								console.log("Button '" + pindata.name + "' is pressed.");
							}
							else{
								clearTimeout(timeout);
								const endTick = tick;
								const diff = (endTick >> 0) - (startTick >> 0);
								console.log("Button '" + pindata.name + "' is released.");
								if(diff < config.longPressTime){
									me.sendSocketNotification(pindata.sysname + "_SHORT_PRESSED");
									console.log("Button '" + pindata.name + "' was pressed only short.");
								}
								else if(diff > config.longPressTime && diff < config.longPressTimeOut){
									me.sendSocketNotification(pindata.sysname + "_LONG_PRESSED");
									console.log("Button '" + pindata.name + "' was pressed long.");
								}
							}
						}
						else {
							if(level == 1){
								startTick = tick;
								timeout = setTimeout(() => {
									console.log("Button '" + pindata.name + "' is pressed longer than "+ Math.round((config.longPressTimeOut/1000000)*10)/10 +" seconds. Is it stuck?");
									me.sendSocketNotification(pindata.sysname + "_LONG_PRESSED");
									me.sendSocketNotification("ALERT","Button '" + pindata.name + "' is pressed longer than "+ Math.round((config.longPressTimeOut/1000000)*10)/10 +" seconds. A long press is send, but is it stuck?");
								}, config.longPressTimeOut / 1000);
								
								console.log("Button '" + pindata.name + "' is pressed.");
							}
							else{
								clearTimeout(timeout);
								const endTick = tick;
								const diff = (endTick >> 0) - (startTick >> 0);
								console.log("Button '" + pindata.name + "' is released.");
								if(diff < config.longPressTime){
									me.sendSocketNotification(pindata.sysname + "_SHORT_PRESSED");
									console.log("Button '" + pindata.name + "' was pressed only short.");
								}
								else if(diff > config.longPressTime && diff < config.longPressTimeOut){
									me.sendSocketNotification(pindata.sysname + "_LONG_PRESSED");
									console.log("Button '" + pindata.name + "' was pressed long.");
								}
							}
						}
						
					});
				
					break;
				case "PIR":
					pindata.gpio.enableAlert();
					pindata.gpio.on('alert', (level, tick) => {
						if(pindata.pull == "PUD_UP"){
							if(level == 0){
								me.sendSocketNotification(pindata.sysname + "_DETECTION");
								console.log(pindata.name + " detected presence");
							}
							else{
								me.sendSocketNotification(pindata.sysname + "_NO_DETECTION");
								console.log(pindata.name + " did not detect presence");
							}
						}
						else {
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
					pindata.gpio.enableAlert();
					pindata.gpio.on('alert', (level, tick) => {
						if(level == 1){
							me.sendSocketNotification(pindata.sysname + "_HIGH");
							console.log(pindata.name + " is high.");
						}
						else{
							me.sendSocketNotification(pindata.sysname + "_LOW");
							console.log(pindata.name + " is low.");
						}
					});
					
				
					break;
				default:
					console.log("Input type " + pindata.type + " not recognized. Could not be initialized.");
					me.sendSocketNotification("ALERT","Input type " + pindata.type + " of input pin " + pin + " not recognized. Could not be initialized.");
			}
		}
	},
	
	initializeOutputs: function(pins,config){
		const me = this;
		for(var pin in pins){
			let pindata = pins[String(pin)];
			switch(pindata.type){
				case "PWM":
					this.PWMHandler(pin);
					break;
				case "On/Off":
					this.OnOffHandler(pin);
					break;
				default:
					console.log("Output type " + pindata.type + " of output pin " + pin + " not recognized. Could not be initialized.");
					me.sendSocketNotification("ALERT","Output type " + pindata.type + " of output pin " + pin + " not recognized. Could not be initialized.");
			}
		}
	},
	
	PWMHandler: function(pin){
		// add error handling
		if(pin.PWM_type === "Pulse"){
			let dutyCycle = 0;
			let dir = 1;

			setInterval(() => {
				pin.gpio.pwmWrite(dutyCycle);
				
				if(dir = 1){
					dutyCycle += pin.PWM_step;
				} else{
					dutyCycle -= pin.PWM_step;
				}
				
				if (dutyCycle > 255) {
					dutyCycle = 255;
					dir = 0;
				} else if(dutyCycle < 0) {
					dutyCycle = 0;
					dir = 1;
				}
			}, pin.PWM_Speed);
		} else if(pin.PWM_type === "Fixed"){
			pin.gpio.pwmWrite(pin.PWM_state);
		}
	},
	
	OnOffHandler: function(pin){
		pin.gpio.digitalWrite(pin.state);
	},
	
	stop: function() {
		console.log("Shutting down module: " + this.name);
	}
});
