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
		debounce: 100,
		longPressTime: 1000,
		input: {},
		output: {}
	},
	
	start: function(){
		Log.log("Starting module: " + this.name);
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
