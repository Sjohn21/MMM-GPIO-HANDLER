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
		input: {},
		output: {},
		debounce: 10,
		longPressTime: 500,
		longPressTimeOut: 3000,
		default_PWM_effect: "Fixed",
		default_PWM_speed: 50, 
		default_PWM_steps: 10,
		default_PWM_state: 0,
		default_HardwarePWM_Frequency: 0,
		default_state: 0
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
