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
		pinConfiguration: [],
		debounce: 100,
		longPressTime: 1000
	},
	
	start: function(){
		Log.info("Starting module: " + this.name);
	}
});
