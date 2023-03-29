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
			me.config = payload;
			let{input, output, ...confvals} = payload;
			var pins = {};
		
			for(var pin in me.config.input){
				var pindata = me.config.input[String(pin)];
				console.log(me.name + ": Registering input pin: " + pin + " for " + pindata.name);
				pins[String(pin)] = {};
				pins[String(pin)]["direction"] = "input";
				pins[String(pin)]["type"] = pindata.type;
				pins[String(pin)]["name"] = pindata.name;
				pins[String(pin)]["pull"] = pindata.pull;
				pins[String(pin)]["edge"] = pindata.edge;
				pins[String(pin)]["gpio"] = new Gpio(pin, { mode: Gpio.INPUT });
			}
			
			for(var pin in me.config.output){
				var pindata = me.config.output[String(pin)]
				console.log(me.name + ": Registering output pin: " + pin + " for " + pindata.name);
				pins[String(pin)] = {};
				pins[String(pin)]["direction"] = "output";
				pins[String(pin)]["type"] = pindata.type;
				pins[String(pin)]["name"] = pindata.name;
				pins[String(pin)]["gpio"] = new Gpio(pin, { mode: Gpio.OUTPUT });
			}
			
			console.log(me.name + "All pins in configuration are registered.");
			
			this.inputHandler(pins,confvals);
			me.started = true;
		}
	},
	
	inputHandler: function(pins,config){
		const me = this;
		for(var pin in pins){
			let pindata = pins[String(pin)];
			if(pindata.direction == "input"){
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
										me.sendSocketNotification(pindata.name.replace(/ /g,"_").toUpperCase() + "_LONG_PRESSED");
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
										me.sendSocketNotification(pindata.name.replace(/ /g,"_").toUpperCase() + "_SHORT_PRESSED");
										console.log("Button '" + pindata.name + "' was pressed only short.");
									}
									else if(diff > config.longPressTime && diff < config.longPressTimeOut){
										me.sendSocketNotification(pindata.name.replace(/ /g,"_").toUpperCase() + "_LONG_PRESSED");
										console.log("Button '" + pindata.name + "' was pressed long.");
									}
								}
							}
							else {
								if(level == 1){
									startTick = tick;
									timeout = setTimeout(() => {
										console.log("Button '" + pindata.name + "' is pressed longer than "+ Math.round((config.longPressTimeOut/1000000)*10)/10 +" seconds. Is it stuck?");
										me.sendSocketNotification(pindata.name.replace(/ /g,"_").toUpperCase() + "_LONG_PRESSED");
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
										me.sendSocketNotification(pindata.name.replace(/ /g,"_").toUpperCase() + "_SHORT_PRESSED");
										console.log("Button '" + pindata.name + "' was pressed only short.");
									}
									else if(diff > config.longPressTime && diff < config.longPressTimeOut){
										me.sendSocketNotification(pindata.name.replace(/ /g,"_").toUpperCase() + "_LONG_PRESSED");
										console.log("Button '" + pindata.name + "' was pressed long.");
									}
								}
							}
							
						});
					
						break;
					case "PIR":
					
						break;
					case "Other":
					
						break;
					default:
						console.log("Input type " + pindata.type + " not recognized. Could not be initialized.");
						me.sendSocketNotification("ALERT","Input type " + pindata.type + " of input pin " + pin + " not recognized. Could not be initialized.");
				}
			}
		}
	},
	
	stop: function() {
		console.log("Shutting down module: " + this.name);
	}
});
