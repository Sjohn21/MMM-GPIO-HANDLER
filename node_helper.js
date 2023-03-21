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
	}
});
