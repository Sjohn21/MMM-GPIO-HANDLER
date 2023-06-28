/* global Module */

/* Magic Mirror
 * Module: MMM-GPIO-HANDLER
 *
 * By Koen Harthoorn
 * MIT Licensed.
 */

Module.register('MMM-GPIO-HANDLER',{	
	requiresVersion: "2.1.0",
	defaults: {
		debounce: 10000,
		longPressTime: 500000,
		longPressTimeOut: 3000000,
		input: {},
		output: {},
		default_state: 0,
		default_PWM_type: "Fixed",
		default_PWM_pulse_speed: 50,
		default_PWM_pulse_step: 10
	},
	
	start: function(){
		console.log("Starting module: " + this.name);
		this.sendSocketNotification("CONFIG", this.config);
	},
	
	socketNotificationReceived: function (notification, payload) {
		this.sendNotification(notification, payload);
	},
	
	notificationReceived: function (notification, payload) {
		if (
			notification === "HANDLE_PWM" ||
			notification === "HANDLE_ON/OFF"
		) {
			this.sendSocketNotification(notification, payload);
		}
		}
});
