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
		this.hardwarePwmPins = [12, 13, 18, 19];
	},
	
	socketNotificationReceived: function (notification, payload) {
		const me = this;
		const { input, output, ...configDefaults } = payload;

		if (notification === "CONFIG" && me.started === false) {
			me.configDefaults = configDefaults;

		  	for (const [pin, pinData] of Object.entries(input)) {
				const pinStr = String(pin);
				console.log(`${me.name}: Registering input pin: ${pinStr} for ${pinData.name}`);

				me.pins.input[pinStr] = {
					type: pinData.type,
					name: pinData.name,
					sysname: pinData.name.replace(/ /g, "_").toUpperCase(),
					pull: pinData.pull,
					gpio: pigpio.gpio(parseInt(pin, 10))
				};
				me.pins.input[pinStr].gpio.modeSet('input');
			}

			for (const [pin, pinData] of Object.entries(output)) {
				const pinStr = String(pin);
				console.log(`${me.name}: Registering output pin: ${pinStr} for ${pinData.name}`);
				const isHardwarePwm = pinData.type === "hardwarePWM" && me.hardwarePwmPins.includes(parseInt(pin));
   				const isPwm = pinData.type === "PWM" || isHardwarePwm;

				if (pinData.type === "hardwarePWM" && !me.hardwarePwmPins.includes(parseInt(pin))){
					me.sendSocketNotification("SHOW_ALERT",`Pin ${pinStr} was configured as HardwarePWM, but ${pinStr} is not capable of HardwarePWM. Fallback to SoftwarePWM.`);
					console.warn(`Pin ${pinStr} was configured as HardwarePWM, but ${pinStr} is not capable of HardwarePWM. Fallback to SoftwarePWM.`);
					pinData.type = "PWM";
				}
				
				me.pins.output[pinStr] = {
					type: pinData.type,
					name: pinData.name,
					gpio: pigpio.gpio(parseInt(pin, 10)),
					default_PWM_effect: isPwm ? pinData.default_PWM_effect ?? me.configDefaults.default_PWM_effect : undefined,
					default_PWM_speed: isPwm ? pinData.default_PWM_speed ?? me.configDefaults.default_PWM_speed : undefined,
					default_PWM_steps: isPwm ? pinData.default_PWM_steps ?? me.configDefaults.default_PWM_steps : undefined,
					default_PWM_upperLimitDCP: isPwm ? pinData.default_PWM_upperLimitDCP ?? me.configDefaults.default_PWM_upperLimitDCP : undefined,
					default_PWM_lowerLimitDCP: isPwm ? pinData.default_PWM_lowerLimitDCP ?? me.configDefaults.default_PWM_lowerLimitDCP : undefined,
					default_PWM_flashLength: isPwm ? pinData.default_PWM_flashLength ?? me.configDefaults.default_PWM_flashLength : undefined,
					default_PWM_startOn: isPwm ? pinData.default_PWM_startOn ?? me.configDefaults.default_PWM_startOn : undefined,
					default_PWM_cycles: isPwm ? pinData.default_PWM_cycles ?? me.configDefaults.default_PWM_cycles : undefined,
					default_PWM_endOn: isPwm ? pinData.default_PWM_endOn ?? me.configDefaults.default_PWM_endOn : undefined,
					default_PWM_endPrevOn: isPwm ? pinData.default_PWM_endPrevOn ?? me.configDefaults.default_PWM_endPrevOn : undefined,
					default_PWM_state: isPwm ? pinData.default_PWM_state ?? me.configDefaults.default_PWM_state : undefined,
					pwmEffect: isPwm ? { } : undefined,
					default_state: !isPwm ? pinData.default_state ?? me.configDefaults.default_state : undefined,			
					default_hardwarePWM_frequency: isHardwarePwm ? pinData.default_hardwarePWM_frequency ?? me.configDefaults.default_hardwarePWM_frequency : undefined
				};
				me.pins.output[pinStr].gpio.modeSet('output');
			}

			console.log(`${me.name}: All pins in configuration are registered.`);
			me.sendSocketNotification("SHOW_ALERT",`${me.name}: All pins in configuration are registered.`);

			this.inputHandler();
			this.initializeOutputs();
			me.started = true;
		} else if (notification === "HANDLE_PWM" && me.started === true) {
			const pinStr = String(payload.pin);
			me.pins.output[pinStr] ? me.PWMHandler(payload) : (console.error(`Pin ${pinStr} is not configured as an output pin.`), me.sendSocketNotification("SHOW_ALERT",`Pin ${pinStr} is not configured as an output pin.`));
		} else if (notification === "HANDLE_ON/OFF" && me.started === true) {
			const pinStr = String(payload.pin);
			me.pins.output[pinStr] ? me.OnOffHandler(payload) : (console.error(`Pin ${pinStr} is not configured as an output pin.`), me.sendSocketNotification("SHOW_ALERT",`Pin ${pinStr} is not configured as an output pin.`));
		} else if (notification !== "CONFIG" && me.started === false) {
			me.sendSocketNotification("SHOW_ALERT",`Notification '${notification}' received, but MMM-GPIO-HANDLER is not (completely) initialized yet.`);
			console.warn(`Notification '${notification}' received, but MMM-GPIO-HANDLER is not (completely) initialized yet.`);
		} else {
			me.sendSocketNotification("SHOW_ALERT",`Notification '${notification}' received, but MMM-GPIO-HANDLER does not recognize this notification.`);
			console.error(`Notification '${notification}' received, but MMM-GPIO-HANDLER does not recognize this notification.`);
		}		
	},

	inputHandler: function () {
		const me = this;
		for (const [pin, pinData] of Object.entries(me.pins.input)) {
			switch (pinData.pull) {
			  	case "PUD_DOWN":
					pinData.gpio.pullUpDown(1);
					break;
			  	case "PUD_UP":
					pinData.gpio.pullUpDown(2);
					break;
			  	default:
					pinData.gpio.pullUpDown(0);
			}

			switch (pinData.type) {
				case "Button":
					pinData.gpio.glitchSet(me.configDefaults.debounce * 1000);
					let startTick, timeout;
			
					pinData.gpio.notify((level, tick) => {
						const pressed = (pinData.pull == "PUD_UP" && level == 0) || (pinData.pull != "PUD_UP" && level == 1);
						if (pressed){
							startTick = tick;
							timeout = setTimeout(() => {
								console.warn(`Button '${pinData.name}' is pressed longer than ${Math.round((me.configDefaults.longPressTimeOut / 1000) * 10) / 10} seconds. Is it stuck?`);
								me.sendSocketNotification(`${pinData.sysname}_LONG_PRESSED`);
								me.sendSocketNotification("SHOW_ALERT", `Button '${pinData.name}' is pressed longer than ${Math.round((me.configDefaults.longPressTimeOut / 1000) * 10) / 10} seconds. A long press is sent, but is it stuck?`);
							}, me.configDefaults.longPressTimeOut);				
							console.log(`Button '${pinData.name}' is pressed.`);
						} else {
							clearTimeout(timeout);
							const diff = (tick >> 0) - (startTick >> 0);
							console.log(`Button '${pinData.name}' is released.`);
							
							if (diff < (me.configDefaults.longPressTime * 1000)) {
								me.sendSocketNotification(`${pinData.sysname}_SHORT_PRESSED`);
								console.log(`Button '${pinData.name}' was pressed only short.`);
							} else if (diff > (me.configDefaults.longPressTime * 1000) && diff < (me.configDefaults.longPressTimeOut * 1000)) {
								me.sendSocketNotification(`${pinData.sysname}_LONG_PRESSED`);
								console.log(`Button '${pinData.name}' was pressed long.`);
							}
						}
					});
					break;

				case "PIR":
					pinData.gpio.notify((level) => {
						const detected = (pinData.pull == "PUD_UP" && level == 0) || (pinData.pull != "PUD_UP" && level == 1);
						if(detected){
							me.sendSocketNotification(`${pinData.sysname}_DETECTION`);
							console.log(`${pinData.name} detected presence`);
						} else {
							me.sendSocketNotification(`${pinData.sysname}_NO_DETECTION`);
							console.log(`${pinData.name} did not detect presence`);
						}
					});
					break;

				case "Other":
					pinData.gpio.notify((level) => {
						if (level == 1) {
							me.sendSocketNotification(`${pinData.sysname}_HIGH`);
							console.log(`${pinData.name} is high.`);
						} else if (level == 0){
							me.sendSocketNotification(`${pinData.sysname}_LOW`);
							console.log(`${pinData.name} is low.`);
						} else {
							me.sendSocketNotification(`${pinData.sysname}_FLOATING`);
							console.log(`${pinData.name} is floating.`);
						}
					});
				  	break;

				default:
					console.log(`Input type ${pinData.type} of input pin ${pin} not recognized. Could not be initialized.`);
					me.sendSocketNotification("SHOW_ALERT", `Input type ${pinData.type} of input pin ${pin} not recognized. Could not be initialized.`);
			  }
		}
	},

	initializeOutputs: function () {
		const me = this;
		for (const [pin, pinData] of Object.entries(me.pins.output)) {
			switch (pinData.type) {
				case "PWM":
				case "hardwarePWM":
					this.PWMHandler({"pin": pin});
					break;

				case "On/Off":
					this.OnOffHandler({"pin": pin});
					break;

				default:
					console.error(`Output type ${pinData.type} of output pin ${pin} not recognized. Could not be initialized.`);
					me.sendSocketNotification("SHOW_ALERT", `Output type ${pinData.type} of output pin ${pin} not recognized. Could not be initialized.`);
			}
		}
	},

	PWMHandler: function (payload) {
		const me = this;
		try {
			const pinData = me.pins.output[String(payload.pin)];
			const effect = payload.pwmEffect ?? pinData.default_PWM_effect;
			const speed = payload.pwmSpeed ?? pinData.default_PWM_speed;
			const steps = payload.pwmSteps ?? pinData.default_PWM_steps;
			const upperLimitDCP = payload.pwmUpperLimitDCP ?? pinData.default_PWM_upperLimitDCP ?? 100;
			const lowerLimitDCP = payload.pwmLowerLimitDCP ?? pinData.default_PWM_lowerLimitDCP ?? 0;
			const flashLength = payload.pwmFlashLength ?? pinData.default_PWM_flashLength;
			const startOn = payload.pwmStart ?? pinData.default_PWM_startOn ?? "low";
			const cycles = payload.pwmCycles?? pinData.default_PWM_cycles;
			const endOn = payload.pwmEnd ?? pinData.default_PWM_endOn;
			const endPrevOn = payload.pwmEndPrevOn ?? pinData.default_PWM_endPrevOn;
			const isHardwarePWM = pinData.type === "hardwarePWM";
			const state = Math.round((payload.pwmState ?? pinData.default_PWM_state) / (isHardwarePWM ? 1 : 3922));
			const frequency = pinData.default_hardwarePWM_frequency;
			const maxDutyCycle = isHardwarePWM ? 1000000 : 255;
			const minDutyCycle = 0;

			if (!pinData.gpio) throw new Error("Pin not initialized for GPIO.");
			if (pinData.type !== "PWM" && pinData.type !== "hardwarePWM") throw new Error("Pin not configured for PWM.");
			if ("number" != typeof upperLimitDCP || upperLimitDCP < 0 || upperLimitDCP > 100 || "number" != typeof lowerLimitDCP || lowerLimitDCP < 0 || lowerLimitDCP > 100 || upperLimitDCP <= lowerLimitDCP) throw new Error("Invalid values. upperLimitDCP and lowerLimitDCP should be numbers between 0 and 100 (percentage), and upperLimitDCP should be greater than lowerLimitDCP.");

			function setDutyCycle(dutyCycle) {
				if (isHardwarePWM) {
					pinData.gpio.hardwarePWM(frequency, dutyCycle);
				} else {
					pinData.gpio.analogWrite(dutyCycle);
				}
			}

			function newEffect() {
				clearInterval(pinData.pwmEffect.interval);
				clearTimeout(pinData.pwmEffect.timeout);
				for (var obj in pinData.pwmEffect) delete pinData.pwmEffect[obj];

				const upperLimitDC = Math.round(upperLimitDCP * maxDutyCycle / 100);
				const lowerLimitDC = Math.round(lowerLimitDCP * maxDutyCycle / 100);
				const DCBandwitdh = upperLimitDC - lowerLimitDC;

				let dutyCycle = startOn === "high" ? upperLimitDC : lowerLimitDC;
				const endDutyCycle = endOn === "high" ? upperLimitDC : lowerLimitDC;
				let dir = startOn === "high" ? -1 : 1;
				let cycleCount = 0;

				if (effect === "Breath"){				
					if (typeof speed !== "number" || typeof steps !== "number" || speed < 4 || steps < 1 || steps > DCBandwitdh) throw new Error("Invalid speed or step value for PWM Breath.");

					pinData.pwmEffect.type = effect;
					pinData.pwmEffect.steps = steps;
					pinData.pwmEffect.speed = speed;
					const step = Math.round(DCBandwitdh / steps);
					let isMax = false;
					let isMin = false;

					pinData.pwmEffect.interval = setInterval(() => {
						setDutyCycle(dutyCycle);
						
						dutyCycle += step * dir;

						if (dutyCycle >= upperLimitDC) {
							dutyCycle = upperLimitDC;
							dir = -1;
							isMax = true;
						} else if (dutyCycle <= lowerLimitDC) {
							dutyCycle = lowerLimitDC;
							dir = 1;
							isMin = true
						} 
						pinData.pwmEffect.extreme = dutyCycle === upperLimitDC ? "high" : (dutyCycle === lowerLimitDC ? "low" : "no");


						if (isMax && isMin) { 
							cycleCount++; 
							isMax = false; 
							isMin = false; 
						}
				
						if (cycles !== -1 && cycleCount >= cycles && Math.abs(dutyCycle - endDutyCycle) === 0) { 
							clearInterval(pinData.pwmEffect.interval); 
							for (var obj in pinData.pwmEffect) delete pinData.pwmEffect[obj];
						}
					}, speed);
				} else if (effect === "Pulse"){
					if (typeof speed !== "number" || typeof steps !== "number" || speed < 4 || steps < 1 || steps > DCBandwitdh) throw new Error("Invalid speed or steps value for PWM Pulse.");

					pinData.pwmEffect.type = effect;
					pinData.pwmEffect.speed = speed;
					pinData.pwmEffect.steps = steps;
					let cyclePosition = startOn === "high" ? Math.PI : 0;
					const startPosition = cyclePosition;
					const tolerance = Math.round(Math.min((DCBandwitdh / steps), DCBandwitdh / 100));
					let prevDutyCycle = dutyCycle;
		
					pinData.pwmEffect.interval = setInterval(() => {
						setDutyCycle(dutyCycle);

						cyclePosition +=  Math.PI / steps;
						if (cyclePosition > 2 * Math.PI) { 
							cyclePosition -= 2 * Math.PI; 
						}

						prevDutyCycle = dutyCycle;
						dutyCycle = Math.round(lowerLimitDC + (Math.sin(cyclePosition) + 1) / 2 * DCBandwitdh);

						if (dutyCycle >= upperLimitDC - tolerance && dutyCycle <= upperLimitDC + tolerance){
							pinData.pwmEffect.extreme =  "high";
						} else if (dutyCycle >= lowerLimitDC - tolerance && dutyCycle <= lowerLimitDC + tolerance) {
							pinData.pwmEffect.extreme =  "low";
						} else {
							pinData.pwmEffect.extreme =  "no";
						}

						if (cyclePosition === startPosition) { 
							cycleCount++; 
						}
		
						if (cycles !== -1 && cycleCount >= cycles && Math.abs(dutyCycle - endDutyCycle) <= tolerance) {
							clearInterval(pinData.pwmEffect.interval); 
							for (var obj in pinData.pwmEffect) delete pinData.pwmEffect[obj];
							setDutyCycle(dutyCycle);
						}
					}, speed); 
				} else if (effect === "Flash"){
					if (typeof speed !== "number" || typeof flashLength !== "number" || speed < 4 || flashLength < 4 || flashLength >= speed) throw new Error("Invalid speed or flashLength value for PWM Flash, and speed should be greater than flashLength.");

					pinData.pwmEffect.type = effect;
					pinData.pwmEffect.speed = speed;
					const flashLow = speed - flashLength;
					const timer = startOn === "high" ? flashLength : flashLow;

					const updateExtreme = () => {
						pinData.pwmEffect.extreme = dutyCycle === upperLimitDC ? "high" : "low";
					};
					
					pinData.pwmEffect.interval = setInterval(() => {
						dutyCycle = startOn === "high" ? upperLimitDC : lowerLimitDC;
						setDutyCycle(dutyCycle);
						updateExtreme();
						pinData.pwmEffect.timeout = setTimeout(() => {
							dutyCycle = startOn === "high" ? lowerLimitDC : upperLimitDC ;
							setDutyCycle(dutyCycle);
							updateExtreme();
							cycleCount++;

							if (cycles !== -1 && cycleCount >= cycles) { 
								clearInterval(pinData.pwmEffect.interval); 
								clearTimeout(pinData.pwmEffect.timeout);
								if (dutyCycle != endDutyCycle){
									pinData.pwmEffect.timeout = setTimeout(() => {
										setDutyCycle(endDutyCycle);
										updateExtreme();
										clearTimeout(pinData.pwmEffect.timeout);
									}, startOn === "high" ? flashLow : flashLength );
								}
								for (var obj in pinData.pwmEffect) delete pinData.pwmEffect[obj];
							}
						}, timer);
					}, speed);
				} else if (effect === "Fade-in" || effect === "Fade-out"){
					if (typeof speed !== "number" || typeof steps !== "number" || speed < 4 || steps < 1 || steps > DCBandwitdh) throw new Error(`Invalid speed value for PWM ${effect}.`);
					pinData.pwmEffect.type = effect;
					pinData.pwmEffect.speed = speed;
					pinData.pwmEffect.steps = steps;
					const step = Math.round(DCBandwitdh / steps);

					const startDC = effect === "Fade-in" ? lowerLimitDC : upperLimitDC;
					const endDC = effect === "Fade-in" ? upperLimitDC : lowerLimitDC;
					const dir = effect === "Fade-in" ? 1 : -1;

					dutyCycle = startDC;

					pinData.pwmEffect.interval = setInterval(() => {
						setDutyCycle(dutyCycle);
				
						dutyCycle += step * dir;
				
						if ((dir === 1 && dutyCycle > endDC) || (dir === -1 && dutyCycle < endDC)) {
							dutyCycle = endDC;
							setDutyCycle(dutyCycle);
							clearInterval(pinData.pwmEffect.interval);
							for (var obj in pinData.pwmEffect) delete pinData.pwmEffect[obj];
						}
					}, speed);
				} else if (effect === "Fixed"){
					if (typeof state !== "number" || state < minDutyCycle || state > maxDutyCycle) throw new Error("Invalid state value for PWM fixed.");
					setDutyCycle(state);
				} else {
					throw new Error("Invalid PWM type specified.");
				}
			}

			if (pinData.pwmEffect.interval && endPrevOn !== undefined) {
				let endTime, promise;
				const targetExtreme = endPrevOn === "high" ? "high" : "low";
				switch (pinData.pwmEffect.type ) {
					case "Breath":
					case "Pulse":
						endTime = new Date().getTime() + ((3 * pinData.pwmEffect.steps) * pinData.pwmEffect.speed );
						
						promise = new Promise((resolve) => {
							let promiseInterval = setInterval(() => {
								if (pinData.pwmEffect.extreme === targetExtreme || new Date().getTime() < endTime) {
									clearInterval(promiseInterval);
									resolve();
								}
							},Math.round(pinData.pwmEffect.speed / 2));
						});
						promise.then(newEffect);
						break;
					case "Flash":
							endTime = new Date().getTime() + (2 * pinData.pwmEffect.speed );
							
							promise = new Promise((resolve) => {
								let promiseInterval = setInterval(() => {
									if (pinData.pwmEffect.extreme === targetExtreme || new Date().getTime() < endTime) {
										clearInterval(promiseInterval);
										resolve();
									}
								},Math.round(pinData.pwmEffect.speed / 2));
							});
							promise.then(newEffect);
							break;
					case "Fade-in":
					case "Fade-out":
						endTime = new Date().getTime() + ((2 * pinData.pwmEffect.steps) * pinData.pwmEffect.speed );

						promise = new Promise((resolve) => {
							let promiseInterval = setInterval(() => {
								if (pinData.pwmEffect.interval || new Date().getTime() < endTime) {
									clearInterval(promiseInterval);
									resolve();
								}
							},Math.round(pinData.pwmEffect.speed / 2));
						});
						promise.then(newEffect);
						break;
						
					default:
						newEffect();
				}
			} else {
				newEffect();
			}

		} catch (error){
			console.error("PWM handling error:", error.message);
			me.sendSocketNotification("SHOW_ALERT", error.message);
		}
	},

	OnOffHandler: function (payload) {
		const me = this;
		try{
			const pinData = me.pins.output[String(payload.pin)];
			const state = payload.state ?? pinData.default_state ?? me.configDefaults.default_state;

			if (!pinData.gpio) {
				throw new Error("Pin not initialized for GPIO.");
			}

			if (state !== 0 && state !== 1) {
				throw new Error("Invalid state value. State must be 0 or 1.");
			  }

			pinData.gpio.write(state);
		} catch (error){
			console.error("On/Off handling error:", error.message);
			me.sendSocketNotification("SHOW_ALERT", error.message);
		}
	},
	
	stop: function() {
		console.log("Shutting down module: " + this.name);
	}
});