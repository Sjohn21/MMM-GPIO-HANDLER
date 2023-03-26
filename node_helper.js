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
			me.pins = [];
		
			for(var pin in me.config.input){
				var pindata = me.config.input[String(pin)];;
				console.log(me.name + ": Registering input pin: " + pin + " for " + pindata.name);
				me.pins[String(pin)] = {};
				me.pins[String(pin)]["type"] = pindata.type;
				me.pins[String(pin)]["name"] = pindata.name;
				me.pins[String(pin)]["gpio"] = new Gpio(pin, { mode: Gpio.INPUT });
				switch(pindata.pull){
					case "PUD_DOWN":
						me.pins[String(pin)].gpio.pullUpDown(Gpio.PUD_DOWN);
						break;
					case "PUD_UP":
						me.pins[String(pin)].gpio.pullUpDown(Gpio.PUD_UP);
						break;
					default:
						me.pins[String(pin)].gpio.pullUpDown(Gpio.PUD_OFF);
				}
				switch(pindata.edge){
					case "RISING_EDGE":
						me.pins[String(pin)].gpio.enableInterrupt(Gpio.RISING_EDGE);
						break;
					case "FALLING_EDGE":
						me.pins[String(pin)].gpio.enableInterrupt(Gpio.FALLING_EDGE);
						break;
					default:
						me.pins[String(pin)].gpio.enableInterrupt(Gpio.EITHER_EDGE);
				}
				if(pindata.type == "Button"){
					me.pins[String(pin)].gpio.glitchFilter(me.config.debounce);
				}
			}
			
			for(var pin in me.config.output){
				var pindata = me.config.output[String(pin)]
				console.log(me.name + ": Registering output pin: " + pin + " for " + pindata.name);
				me.pins[String(pin)] = {};
				me.pins[String(pin)]["type"] = pindata.type;
				me.pins[String(pin)]["name"] = pindata.name;
				me.pins[String(pin)]["gpio"] = new Gpio(pin, { mode: Gpio.OUTPUT });
			}
			
			console.log(me.name + "All pins in configuration are registered.");
			
			me.started = true;
		}
	},
	
	stop: function() {
		console.log("Shutting down module: " + this.name);
	}
});
