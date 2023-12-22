/*** OpenWeather Extended Z-Way HA module *******************************************

Version: 1.2.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>, Niels Roche <nir@z-wave.me>, Michael Pruefer
Description:
	This module creates weather widget that shows you 
	in addition to the temperature also humidity, pressure etc.
	You can also add a daylight widget that delivers on/off based on sunrise/sunset

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function OpenWeather (id, controller) {
	// Call superconstructor first (AutomationModule)
	OpenWeather.super_.call(this, id, controller);
}

inherits(OpenWeather, AutomationModule);

_module = OpenWeather;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

OpenWeather.prototype.init = function (config) {
	OpenWeather.super_.prototype.init.call(this, config);

	var self = this;

	this.vDevWeather = self.controller.devices.create({
		deviceId: "OpenWeather_" + this.id,
		defaults: {
			deviceType: "sensorMultiline",
			metrics: {
				multilineType: 'openWeather',
				probeTitle: 'Temperature'
			}
		},
		overlay: {
			metrics: {
				scaleTitle: this.config.units === "celsius" ? '°C' : '°F',
				title: this.config.city
			}
		},
		moduleId: this.id
	});
	
	if (config.show_daylight) {
		this.vDevDayLight = self.controller.devices.create({
			 deviceId: "OpenWeatherDaylight_" + this.id,
			 defaults: {
				 deviceType: "sensorBinary",
				 metrics: {
					 probeTitle: 'daylight'
				 }
			 },
			 overlay: {
				 metrics: {
					 title: this.config.city + " Daylight"
				 }
			 },
			 moduleId: this.id
		 });
	}

	if (config.show_temp_hum) {
		this.vDevTemp = self.controller.devices.create({
			 deviceId: "OpenWeatherTemp" + this.id,
			 defaults: {
				 deviceType: "sensorMultilevel",
				 metrics: {
					 probeTitle: 'Temperature'
				 }
			 },
			 overlay: {
				 metrics: {
					 title: this.config.city + " Temperature",
					 scaleTitle: this.config.units === "celsius" ? '°C' : '°F'
				 }
			 },
			 moduleId: this.id
		 });
		this.vDevHum = self.controller.devices.create({
			 deviceId: "OpenWeatherHum" + this.id,
			 defaults: {
				 deviceType: "sensorMultilevel",
				 metrics: {
					 probeTitle: 'Humidity'
				 }
			 },
			 overlay: {
				 metrics: {
					 title: this.config.city + " Humidity",
					 scaleTitle: "%"
				 }
			 },
			 moduleId: this.id
		 });
	}

	if (config.show_wind) {
		this.vDevWindSpeed = self.controller.devices.create({
			 deviceId: "OpenWeatherWindspeed" + this.id,
			 defaults: {
				 deviceType: "sensorMultilevel",
				 metrics: {
					 probeTitle: 'WindSpeed'
				 }
			 },
			 overlay: {
				 metrics: {
					 title: this.config.city + " wind speed",
					 scaleTitle: this.config.units_wind 
				 }
			 },
			 moduleId: this.id
		 });
		this.vDevWindGust = self.controller.devices.create({
			 deviceId: "OpenWeatherWindGust" + this.id,
			 defaults: {
				 deviceType: "sensorMultilevel",
				 metrics: {
					 probeTitle: 'WindGust'
				 }
			 },
			 overlay: {
				 metrics: {
					 title: this.config.city + " wind gust",
					 scaleTitle: this.config.units_wind
				 }
			 },
			 moduleId: this.id
		 });
		this.vDevWindDegree = self.controller.devices.create({
			 deviceId: "OpenWeatherWindDegree" + this.id,
			 defaults: {
				 deviceType: "sensorMultilevel",
				 metrics: {
					 probeTitle: 'WindDegree'
				 }
			 },
			 overlay: {
				 metrics: {
					 title: this.config.city + " wind degree",
					 scaleTitle: "°"
				 }
			 },
			 moduleId: this.id
		 });
	}
	
	refresh_rate = self.config.refresh_rate *60 *1000; 

	this.timer = setInterval(function() {
		self.fetchExtendedWeather(self);
	}, refresh_rate);
	self.fetchExtendedWeather(self);
};

OpenWeather.prototype.stop = function () {
	OpenWeather.super_.prototype.stop.call(this);

	if (this.timer)
		clearInterval(this.timer);
		
	if (this.vDevWeather) {
		this.controller.devices.remove(this.vDevWeather.id);
		this.vDevWeather = null;
	}
	
	if (this.vDevDayLight) {
		 this.controller.devices.remove(this.vDevDayLight.id);
		 this.vDevDayLight = null;
	 }

	if (this.vDevTemp) {
		 this.controller.devices.remove(this.vDevTemp.id);
		 this.vDevTemp = null;
	 }
	if (this.vDevHum) {
		 this.controller.devices.remove(this.vDevHum.id);
		 this.vDevHum = null;
	 }
	if (this.vDevWindSpeed) {
		 this.controller.devices.remove(this.vDevWindSpeed.id);
		 this.vDevWindSpeed = null;
	 }
	if (this.vDevWindGust) {
		 this.controller.devices.remove(this.vDevWindGust.id);
		 this.vDevWindGust = null;
	 }
	if (this.vDevWindDegree) {
		 this.controller.devices.remove(this.vDevWindDegree.id);
		 this.vDevWindDegree = null;
	 }
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

OpenWeather.prototype.fetchExtendedWeather = function(instance) {
	var self = instance,
		langFile = self.loadModuleLang(),
		lang = self.controller.defaultLang;
	
	http.request({
		url: "http://api.openweathermap.org/data/2.5/weather?q=" + encodeURIComponent(self.config.city) + "," + encodeURIComponent(self.config.country) +"&lang=" + lang + "&appid=" + encodeURIComponent(self.config.api),
		async: true,
		success: function(res) {
			try {
				var main = res.data.main,
					weather = res.data.weather,
					wind = res.data.wind,
					windspeed = wind.speed,
					windgust = wind.gust,
					winddeg = wind.deg,
					clouds = res.data.clouds,
					country = res.data.sys.country,
					weatherData = {'main': main,'weather': weather, 'wind': wind, 'clouds': clouds},
					temp = Math.round((self.config.units === "celsius" ? main.temp - 273.15 : main.temp * 1.8 - 459.67) * 10) / 10,
					hum = main.humidity,
					icon = "http://openweathermap.org/img/w/" + weather[0].icon + ".png",
					flag = "http://openweathermap.org/images/flags/" + country.toLowerCase() + ".png",
					sunrise = Math.round(res.data.sys.sunrise) * 1000,
					icon_sunrise = "http://openweathermap.org/img/w/01d.png",
					sunset = Math.round(res.data.sys.sunset) * 1000,
					icon_sunset = "http://openweathermap.org/img/w/01n.png";
				
				if (self.config.units_wind === "km/h") {
					windspeed = Math.round(windspeed * 3.6);
					windgust = Math.round(windgust * 3.6);
				} else if (self.config.units_wind === "mph")  {
					windspeed = Math.round(windspeed * 2.237);
					windgust = Math.round(windgust * 2.237);
				}	

				if (self.vDevDayLight) {
					var now = Date.now();
					
					if (now > sunrise && now < sunset) {
						self.vDevDayLight.set("metrics:level", "on");
						self.vDevDayLight.set("metrics:icon", icon_sunrise);
					} else {
						self.vDevDayLight.set("metrics:level", "off");
						self.vDevDayLight.set("metrics:icon", icon_sunset);
					}
				}
				if (self.vDevTemp) {
					self.vDevTemp.set("metrics:level", temp);
					self.vDevTemp.set("metrics:icon", "temperature");
				}
				if (self.vDevHum) {
					self.vDevHum.set("metrics:level", hum);
					self.vDevHum.set("metrics:icon", "humidity");
				}
				if (self.vDevWindSpeed) {
					self.vDevWindSpeed.set("metrics:level", windspeed);
					self.vDevWindSpeed.set("metrics:icon", icon);
				 }
				if (self.vDevWindGust) {
					self.vDevWindGust.set("metrics:level", windgust);
					self.vDevWindGust.set("metrics:icon", icon);
				 }
				if (self.vDevWindDegree) {
					self.vDevWindDegree.set("metrics:level", winddeg);
					self.vDevWindDegree.set("metrics:icon", icon);
				 }

				self.vDevWeather.set("metrics:zwaveOpenWeather", weatherData);
				self.vDevWeather.set("metrics:level", temp);
				self.vDevWeather.set("metrics:icon", icon);
				self.vDevWeather.set("metrics:country", country);
				self.vDevWeather.set("metrics:flag", flag);
			} catch (e) {
				self.addNotification("error", langFile.err_parse, "module");
			}
		},
		error: function() {
			self.addNotification("error", langFile.err_fetch, "module");
		}
	});
};