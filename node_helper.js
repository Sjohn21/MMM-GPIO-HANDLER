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
			me.gpio = [];
		}
		for(var pin in me.config.input){
			console.log(me.name + ": Registering input pin: " + pin);
			me.pin[String(pin)].type = pin.type
			me.pin[String(pin)].type = pin.name
			me.pin[String(pin)].gpio = new Gpio(pin, { mode: Gpio.INPUT });
			me.pin[String(pin)].gpio.pullUpDown(pin.pull);
			me.pin[String(pin)].gpio.enableInterrupt(pin.edge);
			if(pin.type == "Button"){
				me.pin[String(pin)].gpio.glitchFilter(me.config.debounce);
			}
		}
		
		for(var pin in me.config.output){
			console.log(me.name + ": Registering output pin: " + pin);
			me.pin[String(pin)].type = pin.type
			me.pin[String(pin)].type = pin.name
			me.pin[String(pin)].gpio = new Gpio(pin, { mode: Gpio.OUTPUT });
		}
		
		console.log("All pins in configuration are registered.");
		
		me.started = true;
	},
	
	stop: function() {
		Log.log("Shutting down module: " + this.name);
		this.connection.close();
	}
});
