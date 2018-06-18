/*** Z-Way HA Controller class module *****************************************

 Version: 1.0.0
 -------------------------------------------------------------------------------
 Author: Gregory Sitnin <sitnin@z-wave.me>
 Copyright: (c) ZWave.Me, 2013

 ******************************************************************************/

function AutomationController() {
	AutomationController.super_.call(this);

	this.allow_headers = [
		'Accept-Ranges',
		'Content-Encoding',
		'Content-Length',
		'Content-Range',
		'Content-Type',
		'ETag',
		'X-API-VERSION',
		'Date',
		'Cache-Control',
		'If-None-Match',
		'Content-Language',
		'Accept-Language',
		'ZWAYSession'
	];
	this.config = config.controller || {};
	this.debug = false;
	this.availableLang = ['en', 'ru', 'de', 'sk', 'cz', 'se', 'fr', 'es']; // will be updated by correct ISO language codes in future
	this.defaultLang = 'en';
	this.profiles = config.profiles;
	this.instances = config.instances;
	this.locations = config.locations || [];
	this.vdevInfo = config.vdevInfo || {};
	this.modules_categories = fs.loadJSON('modulesCategories.json') || [];
	this.namespaces = namespaces || [];
	this.registerInstances = {};
	this.files = files || {};

	this.modules = {};
	this.devices = new DevicesCollection(this);

	this.notifications = [];
	this.lastStructureChangeTime = 0;

	this._loadedSingletons = [];

	this.auth = new AuthController(this);
	this.skins = loadObject('userSkins.json') || [{
		name: "default",
		title: "Default",
		description: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.",
		version: "1.0.3",
		icon: true,
		author: "Martin Vach",
		homepage: "http://www.zwave.eu",
		active: true
	}];

	this.icons = loadObject('userIcons.json') || [];
}

inherits(AutomationController, EventEmitter2);

function wrap(self, func) {
	return function() {
		func.apply(self, arguments);
	};
}

AutomationController.prototype.init = function() {
	var self = this;


	function pushNamespaces(device, locationNspcOnly) {
		self.generateNamespaces(function(namespaces) {
			ws.push('me.z-wave.namespaces.update', JSON.stringify(namespaces));
		}, device, locationNspcOnly);
	}

	self.loadModules(function() {
		self.emit("core.init");

		// update namespaces if device title has changed
		self.devices.on('change:metrics:title', function(device) {
			ws.push("me.z-wave.devices.title_update", JSON.stringify(device.toJSON()));
			pushNamespaces(device, false);
		});

		// update only location namespaces if device location has changed
		self.devices.on('change:location', function(device) {
			ws.push("me.z-wave.devices.location_update", JSON.stringify(device.toJSON()));
			pushNamespaces(device, true);
			var id = device.get('id');
			locationId = device.get('location'),
				order = device.get('order'),
				count = 0;

			self.devices.forEach(function(dev) {
				if (dev.get('location') == locationId) {
					count++;
				}
			});

			order.room = (count - 1);
			device.set('order', order);

			var location = _.find(self.locations, function(loc) {
				if (loc.id !== 0) {
					var index = loc.main_sensors.indexOf(id);
					if (index > -1) {
						return loc;
					}
				}
			});

			if (location !== undefined) {
				location.main_sensors.splice(index, 1);
				self.updateLocation(location.id, location.title, location.user_img, location.default_img, location.img_type, location.show_background, location.main_sensors, function(data) {
					if (!data) {
						console.log("Error location not exists");
					}
				});
			}
		});

		// update namespaces if device permanently_hidden status has changed
		self.devices.on('change:permanently_hidden', function(device) {
			ws.push("me.z-wave.devices.visibility_update", JSON.stringify(device.toJSON()));
			pushNamespaces(device, false);
		});

		// update namespaces if device removed status has changed
		self.devices.on('change:metrics:removed', function(device) {
			ws.push("me.z-wave.devices.visibility_update", JSON.stringify(device.toJSON()));
			pushNamespaces(device, false);
		});

		// update namespaces if structure of devices collection changed
		self.devices.on('created', function(device) {
			ws.push("me.z-wave.devices.add", JSON.stringify(device.toJSON()));
			pushNamespaces(device);
		});

		self.devices.on('destroy', function(device) {
			ws.push("me.z-wave.devices.destroy", JSON.stringify(device.toJSON()));

		});

		self.devices.on('removed', function(device) {
			pushNamespaces(device);

			var id = device.get('id');
			var locationId = device.get('location');

			if (locationId !== 0) {
				var location = _.find(self.locations, function(location) {
					return location.id === locationId;
				});

				if (typeof location !== 'undefined') {
					if (location.hasOwnProperty("main_sensors")) {
						var index = location.main_sensors.indexOf(id);
						if (index > -1) {
							location.main_sensors.splice(index, 1);
							self.updateLocation(location.id, location.title, location.user_img, location.default_img, location.img_type, location.show_background, location.main_sensors, function(data) {
								if (!data) {
									console.log("Error location not exists");
								}
							});
						}
					}
				}
			}
		});

		self.on("notifications.push", function(notice) {
			ws.push("me.z-wave.notifications.add", JSON.stringify(notice));
		});
	});
};

AutomationController.prototype.setDefaultLang = function(lang) {
	var self = this,
		oldLang = self.defaultLang;

	self.defaultLang = self.availableLang.indexOf(lang) === -1 ? 'en' : lang;

	if (self.defaultLang !== oldLang) {
		this.emit('language.changed', self.defaultLang);
	}
};

AutomationController.prototype.saveConfig = function() {

	// do clean up of location namespaces 
	cleanupLocations = function(locations) {
		var newLoc = [];

		locations.forEach(function(loc) {
			newLoc.push(_.omit(loc, 'namespaces'));
		});

		return newLoc;
	};

	var cfgObject = {
		"controller": this.config,
		"vdevInfo": this.vdevInfo,
		"locations": cleanupLocations(this.locations),
		"profiles": this.profiles,
		"instances": this.instances
	};

	try {
		saveObject("config.json", cfgObject);
	} catch (e) {
		console.log("Error: can not write back config to storage: ", e);
	}
};

AutomationController.prototype.saveFiles = function() {
	saveObject("files.json", this.files);
};

AutomationController.prototype.start = function(reload) {
	var restore = restore || false;

	// if reload flag is true, overwrite config values first
	if (reload) {
		console.log("Reload config...");
		// Reload config
		this.reloadConfig();
		this.skins = loadObject('userSkins.json') || [{
			name: "default",
			title: "Default",
			description: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.",
			version: "1.0.3",
			icon: true,
			author: "Martin Vach",
			homepage: "http://www.zwave.eu",
			active: true
		}];
		this.icons = loadObject('userIcons.json') || [];
	}

	// Restore persistent data
	this.loadNotifications();

	// Run all modules
	console.log("Loading modules...");
	this.instantiateModules();

	ZAutomation = function() {
		return {
			status: 400,
			body: "Invalid ZAutomation request"
		};
	};
	ws.allowExternalAccess("ZAutomation", this.auth.ROLE.ANONYMOUS);

	// Run webserver
	console.log("Starting automation...");
	ZAutomation.api = new ZAutomationAPIWebRequest(this).handlerFunc();
	ws.allowExternalAccess("ZAutomation.api", this.auth.ROLE.ANONYMOUS); // there would be additional auth check for each request

	// Run storage
	console.log("Starting storage...");
	ZAutomation.storage = new ZAutomationStorageWebRequest(this).handlerFunc();
	ws.allowExternalAccess("ZAutomation.storage", this.auth.ROLE.ANONYMOUS); // there would be additional auth check for each request

	// Notify core
	this.emit("core.start");
};

AutomationController.prototype.reloadConfig = function() {
	var reloadedConfig = loadObject("config.json");

	// overwrite variables with restored data
	this.config = reloadedConfig.controller || config.controller;
	this.profiles = reloadedConfig.profiles || config.profiles;
	this.instances = reloadedConfig.instances || config.instances;
	this.locations = reloadedConfig.locations || config.locations;
	this.vdevInfo = reloadedConfig.vdevInfo || config.vdevInfo;
};

AutomationController.prototype.stop = function() {
	var self = this,
		modWithoutDep = [];

	// Remove API webserver
	console.log("Stopping automation...");
	ZAutomation = null;

	ws.revokeExternalAccess("ZAutomation");
	ws.revokeExternalAccess("ZAutomation.api");
	ws.revokeExternalAccess("ZAutomation.storage");

	// Clean instances
	console.log("Stopping instances with dependencies ...");
	self.instances.forEach(function(instance) {

		// first stop instances with dependencies
		if (self.modules[instance.moduleId]) {
			if ((instance.active === true || instance.active === 'true') &&
				_.isArray(self.modules[instance.moduleId].meta.dependencies) &&
				self.modules[instance.moduleId].meta.dependencies.length > 0) {
				self.removeInstance(instance.id);
			} else if ((instance.active === true || instance.active === 'true')) {
				modWithoutDep.push(instance.id)
			}
		}
	});

	// stop instances without dependencies at least
	if (modWithoutDep.length > 0) {
		console.log("Stopping all remaining instances ...");
		modWithoutDep.forEach(function(instanceId) {
			self.removeInstance(instanceId);
		})
	}

	this._loadedSingletons = [];

	// save notifications on automation shut down
	this.notifications.finalize();
	this.notifications = null;

	// Notify core
	this.emit("core.stop");
};

AutomationController.prototype.restart = function() {
	this.stop();
	this.start();

	var langFile = this.loadMainLang();

	this.addNotification("warning", langFile.ac_warn_restart, "core", "AutomationController");
};

AutomationController.prototype.loadModules = function(callback) {
	console.log("--- Loading ZAutomation classes");
	var self = this;

	fs.list("modules/").forEach(function(moduleClassName) {
		self.loadModuleFromFolder(moduleClassName, "modules/");
	});

	(fs.list("userModules/") || []).forEach(function(moduleClassName) {
		self.loadModuleFromFolder(moduleClassName, "userModules/");
	});

	if (typeof callback === 'function') {
		callback();
	}
};

AutomationController.prototype.loadModuleFromFolder = function(moduleClassName, folder, ignoreVersion) {
	var self = this,
		langFile = self.loadMainLang(),
		values,
		addModule = false,
		ignoreVersion = ignoreVersion ? ignoreVersion : false;

	var moduleMetaFilename = folder + moduleClassName + "/module.json",
		_st;

	_st = fs.stat(folder + moduleClassName);
	if (_st && "file" === _st.type) {
		return; // skip files in modules folders
	}

	_st = fs.stat(moduleMetaFilename);

	if (!_st || "file" !== _st.type || 2 > _st.size) {
		console.log("ERROR: Cannot read module metadata from", moduleMetaFilename);
		return;
	}

	try {
		var moduleMeta = fs.loadJSON(moduleMetaFilename);
	} catch (e) {
		values = moduleMetaFilename + ": " + e.toString();

		self.addNotification("error", langFile.ac_err_load_mod_json + values, "core", "AutomationController");
		console.log(e.stack);
		return; // skip this modules
	}
	if (moduleMeta.hasOwnProperty("skip"), !!moduleMeta["skip"]) return;

	var moduleFilename = folder + moduleClassName + "/index.js";
	_st = fs.stat(moduleFilename);
	if ("file" !== _st.type || 2 > _st.size) {
		console.log("ERROR: Cannot stat module", moduleFilename);
		return;
	}

	moduleMeta.id = moduleClassName;
	moduleMeta.location = folder + moduleClassName;

	// check version before overwriting the already existing module
	if (self.modules[moduleClassName] &&
		self.modules[moduleClassName].meta &&
		self.modules[moduleClassName].meta.version &&
		moduleMeta.version) {

		var existingVersion = self.modules[moduleClassName].meta.version.toString(),
			currentVersion = moduleMeta.version.toString();

		if (existingVersion.localeCompare(currentVersion) === 0 || ignoreVersion) {
			addModule = true;
		} else {
			addModule = has_higher_version(currentVersion, existingVersion);
		}

	} else {
		addModule = true;
	}

	if (addModule) {
		// Grab _module and clear it out
		self.modules[moduleClassName] = {
			meta: moduleMeta,
			location: folder + moduleClassName
		};
	} else {
		console.log('Lower version detected, ignoring ...');
	}

	return addModule;
};


AutomationController.prototype.instantiateModule = function(instanceModel) {
	var self = this,
		module = _.find(self.modules, function(module) {
			return instanceModel.moduleId === module.meta.id;
		}),
		instance = null,
		langFile = self.loadMainLang(),
		values,
		cntExistInst = [];

	if (!module) {
		self.addNotification("error", langFile.ac_err_init_module_not_found, "core", "AutomationController");
		return null; // not loaded
	}

	if (module.failed) {
		self.addNotification("error", langFile.ac_err_load_failure + (module.meta && module.meta.id ? ': ' + module.meta.id : ''), "core", "AutomationController");
		return null; // not loaded
	}

	// add creation time
	if (!instanceModel.creationTime) {
		instanceModel.creationTime = Math.floor(new Date().getTime() / 1000);
	}

	if (Boolean(instanceModel.active)) {
		try {
			instance = new global[module.meta.id](instanceModel.id, self);
		} catch (e) {
			values = ((module && module.meta) ? module.meta.id : instanceModel.moduleId) + ": " + e.toString();

			self.addNotification("error", langFile.ac_err_init_module + values, "core", "AutomationController");
			console.log(e.stack);
			return null; // not loaded
		}

		console.log("Instantiating module", instanceModel.id, "from class", module.meta.id);

		cntExistInst = _.filter(self.instances, function(inst) {
			return module.meta.id === inst.moduleId;
		});

		if (module.meta.singleton) {
			if (in_array(self._loadedSingletons, module.meta.id) && cntExistInst.length > 1) {
				console.log("WARNING: Module", instanceModel.id, "is a singleton and already has been instantiated. Skipping.");
				return null; // not loaded
			}

			self._loadedSingletons.push(module.meta.id);
		}

		try {
			instance.init(instanceModel.params);
		} catch (e) {

			// remove singleton entry of broken instance
			if (module.meta.singleton) {
				var index = self._loadedSingletons.indexOf(module.meta.id);

				if (index > -1) {
					self._loadedSingletons.splice(index, 1);
				}
			}

			values = ((module && module.meta) ? module.meta.id : instanceModel.moduleId) + ": " + e.toString();

			self.addNotification("error", langFile.ac_err_init_module + values, "core", "AutomationController");
			console.log(e.stack);
			return null; // not loaded
		}

		// add module to loaded modules if at least one instance exists
		if (this.loadedModules.indexOf(module) < 0) {
			this.loadedModules.push(module);
		}

		self.registerInstance(instance);
		return instance;
	} else {
		return null; // not loaded
	}
};

AutomationController.prototype.loadModule = function(module, rootModule, instancesCount) {
	var langFile = this.loadMainLang(),
		values;

	if (rootModule && rootModule === module) {
		console.log('Circular dependencies detected!');
		return false;
	}

	if (module.failed) return false; // already tried to load, and failed
	if (this.loadedModules.indexOf(module) >= 0) return true; // already loaded

	rootModule = rootModule || module;

	if (module.meta.dependencies instanceof Array) {
		for (var i in module.meta.dependencies) {
			var dep = module.meta.dependencies[i];
			values = dep + " :: " + module.meta.id;

			var depModule = this.modules[dep];
			if (!depModule) {
				this.addNotification("error", langFile.ac_err_dep_not_found + values, "dependency", module.meta.id);
				module.failed = true;
				return false;
			}

			if (!this.loadModule(depModule, rootModule)) {
				this.addNotification("error", langFile.ac_err_dep_not_loaded + values, "dependency", module.meta.id);
				module.failed = true;
				return false;
			}

			if (!this.loadedModules.some(function(x) {
					return x.meta.id === dep;
				})) {

				this.addNotification("error", langFile.ac_err_dep_not_init + values, "dependency", module.meta.id);
				module.failed = true;
				return false;
			}
		}
	}

	console.log("Loading module " + module.meta.id + " from " + module.location);
	try {
		executeFile(module.location + "/index.js");
	} catch (e) {
		values = module.meta.id + ": " + e.toString();

		this.addNotification("error", langFile.ac_err_file_load + values, "core", "AutomationController");
		console.log(e.stack);
		module.failed = true;
		return false; // skip this modules
	}

	if (!_module) {
		values = module.meta.id;

		this.addNotification("error", langFile.ac_err_invalid_module + values, "core", "AutomationController");
		module.failed = true;
		return false; // skip this modules
	}

	// Monkey-patch module with basePath method
	_module.prototype.moduleBasePath = function() {
		return module.location;
	};

	module.classRef = _module;

	_module = undefined;

	// Loading instances

	var count = 0;
	this.instances.filter(function(x) {
		return x.moduleId === module.meta.id;
	}).forEach(function(x) {
		if (this.instantiateModule(x) !== null) {
			count++;
		}
	}, this);

	if (count || instancesCount) {
		this.loadedModules.push(module);
	}
	return true;
};

AutomationController.prototype.unloadModule = function(moduleId) {
	var self = this,
		activeInstances = [],
		result = 'failed';

	try {
		// filter for instances of moduleId
		activeInstances = self.instances.filter(function(instance) {
			return instance.moduleId === moduleId;
		}).map(function(instance) {
			return instance.id;
		});

		// remove all instances of moduleId
		if (activeInstances.length > 0) {
			activeInstances.forEach(function(instanceId) {
				self.deleteInstance(instanceId);
			});
		}

		//remove from loaded Modules
		self.loadedModules = self.loadedModules.filter(function(module) {
			return module.meta.id !== moduleId;
		});

		// remove from modules list
		if (self.modules[moduleId]) {
			delete self.modules[moduleId];

			result = 'success';
		}
	} catch (e) {
		result = e;
	}

	return result;
};

AutomationController.prototype.installModule = function(moduleUrl, moduleName) {
	var result = "in progress";

	console.log('Installing app', moduleName, '...');

	if (moduleUrl) {
		installer.install(
			moduleUrl,
			moduleName,
			function() {
				result = "done";
			},
			function() {
				result = "failed";
			}
		);

		var d = (new Date()).valueOf() + 20000; // wait not more than 20 seconds

		while ((new Date()).valueOf() < d && result === "in progress") {
			processPendingCallbacks();
		}

		if (result === "in progress") {
			result = "failed";
		}
	}

	return result;
};

AutomationController.prototype.uninstallModule = function(moduleId, reset) {
	var langFile = this.loadMainLang(),
		uninstall = false,
		reset = reset ? reset : false,
		unload = this.unloadModule(moduleId),
		result = "in progress";

	if (unload === 'success') {
		try {
			installer.remove(
				moduleId,
				function() {
					result = "done";
				},
				function() {
					result = "failed";
				}
			);

			var d = (new Date()).valueOf() + 20000; // wait not more than 20 seconds

			while ((new Date()).valueOf() < d && result === "in progress") {
				processPendingCallbacks();
			}

			if (result === "in progress") {
				result = "failed";
			}

			if (result === "done") {

				if (reset) {
					loadSuccessfully = this.loadInstalledModule(moduleId, 'modules/', true);

					uninstall = loadSuccessfully;
				} else {
					uninstall = true;
				}

			}
		} catch (e) {
			console.log('Uninstalling or reseting of app "' + moduleId + '" has failed. ERROR:', e);
			this.addNotification("error", langFile.ac_err_uninstall_mod + ': ' + moduleId, "core", "AutomationController");
		}
	}

	return uninstall;
};

AutomationController.prototype.loadInstalledModule = function(moduleId, rootDirectory, ignoreVersion) {
	var self = this,
		successful = false,
		ignoreVersion = ignoreVersion ? ignoreVersion : false;

	try {
		if (fs.list(rootDirectory + moduleId) && fs.list(rootDirectory + moduleId).indexOf('index.js') !== -1) {
			console.log('Load app "' + moduleId + '" from folder ...');
			successful = self.loadModuleFromFolder(moduleId, rootDirectory, ignoreVersion);

			if (successful && self.modules[moduleId]) {
				self.loadModule(self.modules[moduleId]);

				successful = true;
			}
		}
	} catch (e) {
		console.log('Load app "' + moduleId + '" has failed. ERROR:', e);
	}

	return successful;
};

AutomationController.prototype.reinitializeModule = function(moduleId, rootDirectory, ignoreVersion) {
	var self = this,
		successful = false,
		existingInstances = [],
		ignoreVersion = ignoreVersion ? ignoreVersion : false;

	// filter for active instances of moduleId
	existingInstances = self.instances.filter(function(instance) {
		return instance.moduleId === moduleId;
	});

	this.unloadModule(moduleId);

	// try to reinitialize app
	try {
		if (fs.list(rootDirectory + moduleId) && fs.list(rootDirectory + moduleId).indexOf('index.js') !== -1) {
			console.log('Load app "' + moduleId + '" from folder ...');
			successful = self.loadModuleFromFolder(moduleId, rootDirectory, ignoreVersion);

			if (successful && self.modules[moduleId]) {

				self.loadModule(self.modules[moduleId], undefined, existingInstances.length);

				// add and start instances of moduleId again
				existingInstances.forEach(function(instance) {
					self.createInstance(instance);
				});

				successful = true;
			}
		}
	} catch (e) {
		console.log('Load app "' + moduleId + '" has failed. ERROR:', e);
	}

	return successful;
};

AutomationController.prototype.instantiateModules = function() {
	var self = this,
		langFile = this.loadMainLang(),
		modules = Object.getOwnPropertyNames(this.modules),
		requiredBaseModules = ["Cron", "ZWave"],
		requiredWithDep = [];

	this.loadedModules = [];

	modules.splice(modules.indexOf('Cron'), 1);
	modules.splice(modules.indexOf('ZWave'), 1);

	// get all required modules from dependencies
	Object.getOwnPropertyNames(this.modules).forEach(function(m) {
		if (this.modules[m].meta &&
			this.modules[m].meta.dependencies &&
			_.isArray(this.modules[m].meta.dependencies) &&
			this.modules[m].meta.dependencies.length > 0) {

			// load if it exists in modules list
			requiredBaseModules = _.uniq(requiredBaseModules.concat(_.filter(this.modules[m].meta.dependencies, function(dep) {
				return self.modules[dep];
			})));

			// remove all required base modules from modules list
			this.modules[m].meta.dependencies.forEach(function(mod) {
				if (modules.indexOf(mod) > -1) {
					modules.splice(modules.indexOf(mod), 1);
				}
			});
		}
	}, this);

	// first instantiate all required modules without dependencies
	requiredBaseModules.forEach(function(mod) {

		// prepare base modules with dependencies
		if (this.modules[mod].meta &&
			this.modules[mod].meta.dependencies &&
			_.isArray(this.modules[mod].meta.dependencies) &&
			this.modules[mod].meta.dependencies.length > 0) {

			// cache required modules with dependencies
			if (requiredWithDep.indexOf(mod) < 0) {
				requiredWithDep.push(mod);
			}
		} else {
			// load base modules without dependencies first
			this.loadModule(this.modules[mod]);
		}
	}, this);

	// instantiate all required with dependencies
	requiredWithDep.forEach(function(mod) {
		this.loadModule(this.modules[mod]);
	}, this);

	// load all remaining modules
	modules.forEach(function(mod) {
		this.loadModule(this.modules[mod]);
	}, this);
};

AutomationController.prototype.moduleInstance = function(instanceId) {
	return this.instances.hasOwnProperty(instanceId) ? this.instances[instanceId] : null;
};

AutomationController.prototype.registerInstance = function(instance) {
	var self = this,
		langFile = this.loadMainLang();

	if (!!instance) {
		var instanceId = instance.id,
			isExistInstance = self.registerInstances.hasOwnProperty(instanceId);

		if (!isExistInstance) {
			self.registerInstances[instanceId] = instance;
			self.emit('core.instanceRegistered', instanceId);
		} else {
			self.emit('core.error', new Error(langFile.ac_err_instance_already_exists + instanceId));
		}
	} else {
		self.emit('core.error', new Error(langFile.ac_err_instance_empty + instance.id));
	}
};

AutomationController.prototype.listInstances = function() {
	var self = this,
		expInstances = [];

	if (self.instances) {
		self.instances.forEach(function(instance) {
			var moduleJSON = self.getModuleData(instance.moduleId);

			expInstances.push(_.extend(instance, {
				// use category from module and use it's title as fallback ...
				category: moduleJSON && moduleJSON.category || null,
				title: (!instance.title || instance.title === '') ? ((moduleJSON.defaults && moduleJSON.defaults.title) ? moduleJSON.defaults.title : "?") : instance.title
			}));
		});
	} else {
		expInstances = null;
	}

	return expInstances;
}

AutomationController.prototype.createInstance = function(reqObj) {

	//var instance = this.instantiateModule(id, className, config),
	var self = this,
		langFile = this.loadMainLang(),
		id = findSmallestNotAssignedIntegerValue(self.instances, 'id'),
		instance = null,
		module = _.find(self.modules, function(module) {
			return module.meta.id === reqObj.moduleId;
		}),
		result,
		alreadyExisting = [];

	if (!!module) {

		if (reqObj.id) {
			alreadyExisting = _.filter(this.instances, function(inst) {
				return inst.id === reqObj.id
			});
		}

		instance = _.extend(reqObj, {
			id: alreadyExisting[0] ? reqObj.id : id,
			active: reqObj.active === 'true' || reqObj.active ? true : false
		});

		self.instances.push(instance);
		self.saveConfig();
		self.emit('core.instanceCreated', instance.id);
		result = self.instantiateModule(instance);

		// remove instance from list if broken
		if (result === null) {
			var currIndex = self.instances.length ? self.instances.length - 1 : 0;

			self.instances.splice(currIndex, 1);
			self.saveConfig();
			self.emit('core.instanceDeleted', id);
		}
	} else {
		self.emit('core.error', new Error(langFile.ac_err_create_instance + reqObj.moduleId + " :: " + id));
		result = false;
	}

	return result;
};

AutomationController.prototype.stopInstance = function(instance) {
	var self = this,
		langFile = this.loadMainLang(),
		instId = instance.id,
		values;

	try {
		instance.stop();
		delete this.registerInstances[instId];

		// get all devices created by instance 
		instDevices = _.map(this.devices.filter(function(dev) {
			return dev.get('creatorId') === instId;
		}), function(dev) {
			return dev.id;
		});

		// cleanup devices 
		if (instDevices.length > 0) {
			instDevices.forEach(function(id) {
				// check for device entry again
				if (!!self.devices.get(id)) {
					self.devices.remove(id);
				}
			});
		}

	} catch (e) {
		values = ((instance && instId) ? instId : "<unknow id>") + ": " + e.toString();

		this.addNotification("error", langFile.ac_err_stop_mod + values, "core", "AutomationController");
		console.log(e.stack);
		return;
	}
};

AutomationController.prototype.reconfigureInstance = function(id, instanceObject) {
	var langFile = this.loadMainLang(),
		register_instance = this.registerInstances[id],
		instance = _.find(this.instances, function(model) {
			return model.id === id;
		}),
		index = this.instances.indexOf(instance),
		config = {},
		result;

	if (instance) {
		if (register_instance) {
			this.stopInstance(register_instance);
		}

		if (instanceObject.hasOwnProperty('params')) {
			if (Object.keys(instanceObject.params).length === 0) {
				config = instanceObject.params;
			} else {
				for (var property in instance.params) {
					config[property] = instanceObject.params.hasOwnProperty(property) && instanceObject.params[property] !== instance.params[property] ? instanceObject.params[property] : instance.params[property];
				}
			}
		}

		_.extend(this.instances[index], {
			title: instanceObject.hasOwnProperty('title') ? instanceObject.title : instance.title,
			description: instanceObject.hasOwnProperty('description') ? instanceObject.description : instance.description,
			active: instanceObject.hasOwnProperty('active') ? instanceObject.active : instance.active,
			params: config !== {} ? config : instance.params
		});

		if (!!register_instance) {
			if (this.instances[index].active) { // here we read new config instead of existing
				register_instance.init(config);
				this.registerInstance(register_instance);
			} else {
				register_instance.saveNewConfig(config);
			}
		} else {
			if (this.instances[index].active) {
				this.instantiateModule(this.instances[index]);
			}
		}

		result = this.instances[index];
		this.emit('core.instanceReconfigured', id)
	} else {
		result = null;
		this.emit('core.error', new Error(langFile.ac_err_refonfigure_instance + id));
	}

	this.saveConfig();
	return result;
};

AutomationController.prototype.removeInstance = function(id) {
	var instance = this.registerInstances[id],
		getInstFromList = [];

	getInstFromList = this.instances.filter(function(model) {
		return id === model.id;
	});

	if (!!instance) {
		this.stopInstance(instance);

		this.emit('core.instanceStopped', id);
		this.saveConfig();
	}

	// remove from loaded singleton list if singleton
	if (getInstFromList.length > 0 && getInstFromList[0]) {
		var moduleId = getInstFromList[0].moduleId;
		var index = this._loadedSingletons.indexOf(moduleId);
		if (index > -1) {
			this._loadedSingletons.splice(index, 1);
		}
	}
};

AutomationController.prototype.deleteInstance = function(id) {
	var instDevices = [],
		self = this;

	// get all devices created by instance 
	instDevices = this.devices.filterByCreatorId(id);

	this.removeInstance(id);

	this.instances = this.instances.filter(function(model) {
		return id !== model.id;
	});

	// cleanup 
	if (instDevices.length > 0) {
		instDevices.forEach(function(vDev) {
			// check for vDevInfo entry
			if (self.vdevInfo[vDev.id]) {
				self.devices.remove(vDev.id);
				self.devices.cleanup(vDev.id);
			}
		});
	}

	this.saveConfig();
	this.emit('core.instanceDeleted', id);
};

AutomationController.prototype.installSkin = function(reqObj, skinName, index) {
	var result = "in progress";

	if (reqObj.file_path) {

		console.log('Installing skin', skinName, '...');

		skininstaller.install(
			reqObj.file_path,
			skinName,
			function() {
				result = "done";
			},
			function() {
				result = "failed";
			}
		);

		var d = (new Date()).valueOf() + 20000; // wait not more than 20 seconds

		while ((new Date()).valueOf() < d && result === "in progress") {
			processPendingCallbacks();
		}

		if (result === "in progress") {
			result = "failed";
		}

		if (result === 'done') {
			if (index < 0) {
				// add new skin
				newSkin = {
					name: '',
					title: '',
					description: '',
					version: '',
					icon: false,
					author: '',
					homepage: '',
					active: false
				};

				for (var property in reqObj) {
					if (reqObj.hasOwnProperty(property) && newSkin.hasOwnProperty(property)) {
						newSkin[property] = reqObj[property];
					}
				}

				this.skins.push(newSkin);
			} else {
				// update entries
				for (var property in reqObj) {
					if (reqObj.hasOwnProperty(property) && this.skins[index].hasOwnProperty(property)) {
						this.skins[index][property] = reqObj[property];
					}
				}

				this.skins[index].active = false;
			}

			saveObject("userSkins.json", this.skins);
		}
	}

	return result;
};

AutomationController.prototype.uninstallSkin = function(skinName) {
	var langFile = this.loadMainLang(),
		result = "in progress";

	try {
		skininstaller.remove(
			skinName,
			function() {
				result = "done";
			},
			function() {
				result = "failed";
			}
		);

		var d = (new Date()).valueOf() + 20000; // wait not more than 20 seconds

		while ((new Date()).valueOf() < d && result === "in progress") {
			processPendingCallbacks();
		}

		if (result === "in progress") {
			result = "failed";
		}

		//if (result === "done") {

		this.skins = _.filter(this.skins, function(skin) {
			return skin.name !== skinName;
		});

		this.profiles.forEach(function(prof) {
			if (prof.skin === skinName) {
				prof.skin = 'default';
			}
		});

		saveObject("userSkins.json", this.skins);
		//}

	} catch (e) {
		console.log('Uninstalling or reseting of skin "' + skinName + '" has failed. ERROR:', e);
		this.addNotification("error", langFile.ac_err_uninstall_skin + ': ' + skinName, "core", "AutomationController");
	}

	return result;
};

AutomationController.prototype.setSkinState = function(skinName, reqObj) {

	var res = null;

	if (reqObj.hasOwnProperty('active')) {

		_.forEach(this.skins, function(skin) {
			if (reqObj.active === true || reqObj.active === 'true') {
				// activate target skin and deactivate all others
				skin.active = skin.name === skinName ? true : false;
				res = skin.name === skinName ? skin : res;
			} else {
				// deactivate all skins and set default skin to active: true
				skin.active = skin.name === 'default' ? true : false;
				res = skin.name === 'default' ? skin : res;
			}
		})

		saveObject("userSkins.json", this.skins);
	}

	return res;
};

AutomationController.prototype.installIcon = function(option, reqObj, iconName, id) {
	var reply = {
			message: "in progress",
			files: []
		},
		filelist = [],
		input = "",
		name = "",
		update = false;

	extensionToLower = function(name) {
		var arr = name.split(".");
		arr[arr.length - 1] = arr[arr.length - 1].toLowerCase();
		if (arr[arr.length - 1] == "gz" && arr.length > 2 && arr[arr.length - 2].toLowerCase() == "tar") {
			arr[arr.length - 2] == arr[arr.length - 2].toLowerCase();
		}
		return arr.join(".");
	};

	switch (option) {
		case 'remote':
			input = reqObj.file_path;
			name = iconName
			break;
		case 'local':
			reqObj.name = extensionToLower(reqObj.name);
			input = JSON.stringify(reqObj);
			name = reqObj.name;
			break;
	}

	if (input) {
		console.log('Installing icon', name, '...');

		iconinstaller.install(
			input,
			iconName,
			id,
			function(success) {
				filelist = parseToObject(success);
				reply.message = "done";
			},
			function() {
				reply.message = "failed";
			}
		);

		var d = (new Date()).valueOf() + 20000; // wait not more than 20 seconds

		while ((new Date()).valueOf() < d && reply.message === "in progress") {
			processPendingCallbacks();
		}

		if (reply.message === "in progress") {
			reply.message = "failed";
		}

		if (reply.message === 'done') {
			for (var file in filelist) {
				if (filelist[file].filename && filelist[file].orgfilename) {
					var icon = {
						'file': filelist[file].filename,
						'orgfile': filelist[file].orgfilename,
						'source': iconName + "_" + id,
						'name': iconName,
						'id': id,
						'timestamp': Math.floor(new Date().getTime() / 1000),
						'source_title': option === "local" ? iconName + " " + id : reqObj.title
					};

					reply.files.push(filelist[file].filename);

					this.icons.push(icon);
					update = true;
				}
			}

			if (update) {
				saveObject("userIcons.json", this.icons);
			}
		}
	}

	if (reply.files.length == 1) {
		reply.files = reply.files[0];
	}

	return reply;
};

AutomationController.prototype.listIcons = function() {
	var result = "in progress",
		icons = {};

	try {
		iconinstaller.list(
			function(success) {
				icons = success;
				result = "done";
			},
			function() {
				result = "failed";
			}
		);

		var d = (new Date()).valueOf() + 20000; // wait not more than 20 seconds

		while ((new Date()).valueOf() < d && result === "in progress") {
			processPendingCallbacks();
		}

		if (result == "in progress") {
			result = "failed";
		}

	} catch (e) {
		console.log(e)
	}

	return icons;
}

AutomationController.prototype.uninstallIcon = function(iconName) {
	var langFile = this.loadMainLang(),
		result = "in progress";

	try {
		iconinstaller.remove(
			iconName,
			function(success) {
				result = "done";
			},
			function(error) {
				if (error == "No such icon.") {
					result = "done";
				} else {
					result = "failed";
				}
			}
		);

		var d = (new Date()).valueOf() + 20000; // wait not more than 20 seconds

		while ((new Date()).valueOf() < d && result === "in progress") {
			processPendingCallbacks();
		}

		if (result === "in progress") {
			result = "failed";
		}

		//if (result === "done") {
		this.icons = _.filter(this.icons, function(icon) {
			return icon.file !== iconName;
		});

		saveObject("userIcons.json", this.icons);
		//}

	} catch (e) {
		console.log('Uninstalling or reseting of icon "' + iconName + '" has failed. ERROR:', e);
		this.addNotification("error", langFile.ac_err_uninstall_icon + ': ' + iconName, "core", "AutomationController");
	}

	return result;
}

AutomationController.prototype.deleteCustomicon = function(iconName) {
	self = this;
	self.devices.each(function(dev) {
		if (!_.isEmpty(dev.get('customIcons'))) {
			var customIcon = dev.get('customIcons');
			_.each(customIcon, function(value, key) {
				if (typeof value !== "object") {
					if (value === iconName) {
						customIcon = {};
						dev.set('customIcons', customIcon, {
							silent: true
						});
						return false;
					}
				} else {
					_.each(value, function(icon, level) {
						if (icon === iconName) {
							delete customIcon[key][level];
						}
					});

					if (_.isEmpty(customIcon[key])) {
						customIcon = {};
					}
					dev.set('customIcons', customIcon, {
						silent: true
					});
				}
			});
		}
	});
}

AutomationController.prototype.deleteAllCustomicons = function() {
	self = this;
	self.devices.each(function(dev) {
		dev.set('customIcons', {}, {
			silent: true
		});
	});
}

AutomationController.prototype.deviceExists = function(vDevId) {
	return Object.keys(this.devices).indexOf(vDevId) >= 0;
};

AutomationController.prototype.getVdevInfo = function(id) {
	return this.vdevInfo[id] || {};
};

AutomationController.prototype.setVdevInfo = function(id, device) {
	this.vdevInfo[id] = _.pick(device,
		"deviceType",
		"metrics",
		"location",
		"tags",
		"permanently_hidden",
		"creationTime",
		"customIcons",
		"order",
		"visibility",
		"hasHistory");
	this.saveConfig();
	return this.vdevInfo[id];
};

AutomationController.prototype.clearVdevInfo = function(id) {
	delete this.vdevInfo[id];
	this.saveConfig();
};

AutomationController.prototype.loadNotifications = function() {
	//this.notifications = loadObject("notifications") || [];

	this.notifications = new LimitedArray(
		loadObject("notifications") || [],
		function(arr) {
			saveObject('notifications', arr);
		},
		25, // check it every 25 notifications
		2500, // save up to 2500 notifications
		function(notification) {
			var now = new Date(),
				startOfDay = now.setHours(0, 0, 0, 0),
				s_tsSevenDaysBefore = Math.floor(startOfDay / 1000) - 86400 * 6, // fallback for older versions
				ms_tsSevenDaysBefore = Math.floor(startOfDay) - 86400000 * 6;

			return (notification.id.toString().length <= 10 && notification.id >= s_tsSevenDaysBefore) ||
				(notification.id.toString().length > 10 && notification.id >= ms_tsSevenDaysBefore);
		}
	);
};

AutomationController.prototype.addNotification = function(severity, message, type, source) {
	var now = new Date(),
		notice = {
			id: Math.floor(now.getTime()),
			timestamp: now.toISOString(),
			level: severity,
			message: message,
			type: type || 'device',
			source: source,
			redeemed: false
		};

	if (typeof message === 'object') {
		msg = JSON.stringify(message);
	} else {
		msg = message;
	}

	this.notifications.push(notice);

	this.emit("notifications.push", notice); // notify modules to allow SMS and E-Mail notifications
	console.log("Notification:", severity, "(" + type + "):", msg);
};

AutomationController.prototype.deleteNotifications = function(ts, before, callback) {
	var before = Boolean(before) || false,
		newNotificationList = [],
		ts = parseInt(ts) || 0;

	if (ts !== 0) {
		if (before) {
			newNotificationList = this.notifications.get().filter(function(notification) {
				return notification.id >= ts;
			});
			console.log('---------- all notifications before ' + ts + ' deleted ----------');
		} else {
			newNotificationList = this.notifications.get().filter(function(notification) {
				return notification.id !== ts;
			});
			console.log('---------- notification with id ' + ts + ' deleted ----------');
		}

		this.notifications.set(newNotificationList);

		if (typeof callback === 'function') {
			callback(true);
		}
	}
};

AutomationController.prototype.deleteAllRedeemedNotifications = function(callback) {
	try {
		this.notifications.set(this.notifications.get().filter(function(notification) {
			return !notification.redeemed;
		}));

		if (typeof callback === 'function') {
			callback(true);
		}
	} catch (e) {
		console.log('deleteAllRedeemedNotifications - something went wrong:', e.message);

		if (typeof callback === 'function') {
			callback(false);
		}
	}
};

AutomationController.prototype.redeemNotification = function(id, redeemed, callback) {
	var r = redeemed !== undefined ? redeemed : true;
	id = id || 0;

	if (id > 0) {
		var notifications = this.notifications.get(),
			index = _.findIndex(notifications, {
				id: id
			});

		notifications[index].redeemed = r;

		this.notifications.set(notifications);

		if (typeof callback === 'function') {
			callback(true);
		}
	} else {
		if (typeof callback === 'function') {
			callback(false);
		}
	}
};

AutomationController.prototype.redeemAllNotifications = function(redeemed, callback) {
	var r = redeemed !== undefined ? redeemed : true;

	try {
		var notifications = this.notifications.get();

		_.forEach(notifications, function(notification) {
			notification.redeemed = r;
		});

		this.notifications.set(notifications);

		if (typeof callback === 'function') {
			callback(true);
		}
	} catch (e) {
		if (typeof callback === 'function') {
			callback(false);
		}
	}
};

AutomationController.prototype.getLocation = function(locations, locationId) {
	var location = [],
		nspc = null;

	location = locations.filter(function(location) {
		if (locationId === 'globalRoom') {
			return location.id === 0 &&
				location.title === locationId;
		} else {
			return location.id === locationId;
		}
	});

	return location[0] ? location[0] : null;
}

AutomationController.prototype.addLocation = function(locProps, callback) {
	var id = this.locations.length > 0 ? Math.max.apply(null, this.locations.map(function(location) {
		return location.id;
	})) + 1 : 1; // changed after adding global room with id=0 || old: this.locations.length ? this.locations[this.locations.length - 1].id + 1 : 1;
	var locations = this.locations.filter(function(location) {
		return location.id === id;
	});

	if (locations.length > 0) {
		if (typeof callback === 'function') {
			callback(false);
		}
	} else {

		var location = {
			id: id,
			title: locProps.title,
			user_img: locProps.user_img || '',
			default_img: locProps.default_img || '',
			img_type: locProps.img_type || '',
			show_background: locProps.show_background || false,
			main_sensors: locProps.main_sensors || []
		};

		this.locations.push(location);

		if (typeof callback === 'function') {
			callback(location);
		}

		this.saveConfig();
		this.emit('location.added', id);
	}
};

AutomationController.prototype.removeLocation = function(id, callback) {
	var self = this,
		langFile = this.loadMainLang(),
		locations = this.locations.filter(function(location) {
			return location.id === id;
		});
	if (locations.length > 0) {
		Object.keys(this.devices).forEach(function(vdevId) {
			var vdev = self.devices[vdevId];
			if (vdev.location === id) {
				vdev.location = 0;
			}
		});

		this.locations = this.locations.filter(function(location) {
			return location.id !== id;
		});

		this.saveConfig();
		if (typeof callback === 'function') {
			callback(true);
		}
		this.emit('location.removed', id);
	} else {
		if (typeof callback === 'function') {
			callback(false);
		}
		this.emit('core.error', new Error(langFile.ac_err_location_not_found));
	}
};

AutomationController.prototype.updateLocation = function(id, title, user_img, default_img, img_type, show_background, main_sensors, callback) {
	var langFile = this.loadMainLang(),
		locations = this.locations.filter(function(location) {
			return location.id === id;
		});

	if (locations.length > 0) {
		location = this.locations[this.locations.indexOf(locations[0])];

		location.title = title;
		location.show_background = show_background;
		location.main_sensors = main_sensors;
		if (typeof user_img === 'string') {
			location.user_img = user_img;
		}
		if (typeof default_img === 'string') {
			location.default_img = default_img;
		}
		if (typeof img_type === 'string') {
			location.img_type = img_type;
		}
		if (typeof callback === 'function') {
			callback(location);
		}

		this.saveConfig();
		this.emit('location.updated', id);
	} else {
		if (typeof callback === 'function') {
			callback(false);
		}
		this.emit('core.error', new Error(langFile.ac_err_location_not_found));
	}
};

AutomationController.prototype.listNotifications = function(since, to) {
	var now = new Date();

	since = parseInt(since) || 0;
	to = parseInt(to) || Math.floor(now.getTime() / 1000);

	return this.notifications.get().filter(function(notification) {
		return notification.id >= since && notification.id <= to;
	});
};

AutomationController.prototype.getNotification = function(id) {
	var filteredNotifications = this.notifications.get().filter(function(notification) {
		return parseInt(notification.id) === parseInt(id);
	});

	return filteredNotifications[0] || null;
};

AutomationController.prototype.updateNotification = function(id, object, callback) {
	var filteredNotifications = _.find(this.notifications.get(), function(notification) {
			return parseInt(notification.id) === parseInt(id);
		}),
		index = this.notifications.get().indexOf(filteredNotifications);

	if (object.hasOwnProperty('redeemed')) {
		this.notifications.get()[index].redeemed = object.redeemed;

		if (typeof callback === 'function') {
			callback(this.notifications.get()[index]);
		}
	} else {
		if (typeof callback === 'function') {
			callback(null);
		}
	}
};

// get list of files from storage that should be ignored during e.g. backup, restore
AutomationController.prototype.getIgnoredStorageFiles = function(list) {
	var dontSave = [
			"notifications",
			"8084AccessTimeout",
			"expertconfig.json",
			"de.devices.json",
			"en.devices.json",
			"history",
			"postfix.json"
		], // objects that should be ignored
		dynamicMatches = [
			"incomingPacket.json",
			"outgoingPacket.json",
			"originPackets.json",
			"parsedPackets.json",
			"reorgLog",
			"rssidata.json",
			"vendors.json",
			"history_"
		],
		storageList = __storageContent;
	matches = [];

	// add additional list of ignored storage files
	dontSave = list && _.isArray(list) ? _.uniq(dontSave.concat(list)) : dontSave;

	// apply list of dynamic matches to ignore list
	if (storageList) {
		_.forEach(dynamicMatches, function(match) {
			matches = _.uniq(matches.concat(_.filter(storageList, function(name) {
				return name.indexOf(match) > -1;
			})));
		});
	}

	return _.uniq(dontSave.concat(matches));
};

AutomationController.prototype.getListProfiles = function() {
	var getProfiles = [];

	this.profiles.forEach(function(profile) {
		var prof = {},
			excl = ["login", "password", "role"];

		for (var property in profile) {
			if (excl.indexOf(property) === -1) {
				prof[property] = profile[property];
			}
		}

		getProfiles.push(prof);
	});
	return getProfiles;
};

AutomationController.prototype.getProfile = function(id) {
	return _.find(this.profiles, function(profile) {
		return profile.id === parseInt(id);
	}) || null;
};

AutomationController.prototype.createProfile = function(profile) {
	var id = 0,
		globalRoom = [0],
		profileIds = _.map(this.profiles, function(pro) {
			return parseInt(pro.id);
		});

	// create latest id
	id = profileIds.length > 0 ? Math.max.apply(null, profileIds) + 1 : 1;

	profile.id = id;

	if (profile.role === 1) {
		profile.rooms = profile.rooms.indexOf(0) > -1 ? profile.rooms : profile.rooms.concat(globalRoom);
	}

	profile.salt = generateSalt();
	profile.password = hashPassword(profile.password, profile.salt);

	this.profiles.push(profile);

	this.saveConfig();
	return profile;
};

AutomationController.prototype.updateProfile = function(object, id) {
	var profile = _.find(this.profiles, function(profile) {
			return profile.id === parseInt(id);
		}),
		index;

	if (profile) {
		index = this.profiles.indexOf(profile);

		for (var property in object) {
			if (object.hasOwnProperty(property) && profile.hasOwnProperty(property)) {
				this.profiles[index][property] = object[property];
			}
		}
	}

	this.saveConfig();
	return this.profiles[index];
};

AutomationController.prototype.updateProfileAuth = function(object, id) {
	var profile = _.find(this.profiles, function(profile) {
			return profile.id === parseInt(id);
		}),
		index;

	if (profile) {
		index = this.profiles.indexOf(profile);

		p = this.profiles[index];

		if (object.hasOwnProperty('password') && object.password !== '' && !!object.password) {
			p.salt = generateSalt();
			p.password = hashPassword(object.password, p.salt);
		}
		if (object.hasOwnProperty('login') && object.login !== '' && !!object.login) {
			p.login = object.login;
		}

		this.saveConfig();

		return p;
	} else {
		return null;
	}
};

AutomationController.prototype.removeProfile = function(profileId) {
	var that = this;
	this.profiles = this.profiles.filter(function(profile) {
		return profile.id !== profileId;
	});

	this.saveConfig();
};

/*AutomationController.prototype.allowLoginForwarding = function (request) {
	var forward = false,
		find = false,
		zbw_cookie;


	// check if find.z-wave.me
	if (request.headers['Cookie']) {
		zbw_cookie = request.headers['Cookie'].split(";").map(function(el) {
			return el.trim().split("=");
		}).filter(function(el) {
			return el[0] === "ZBW_SESSID"
		})
	}

	find = zbw_cookie && zbw_cookie.length > 0;

	// check for forwarding if license for controller is still active and forwarding is set
	// dont' treat find.z-wave.me as local user (connection comes from local ssh server)
	if (this.config.forwardCITAuth && zway && zway.controller.data.countDown && zway.controller.data.countDown.value > 0 && !find) {
		forward = true;
	}

	return forward;
};*/

AutomationController.prototype.getIPAddress = function() {
	var ip = false;
	try {
		if (checkBoxtype('poppbox')) {
			ip = system(". /lib/functions/network.sh; network_get_ipaddr ip wan; echo $ip")[1].replace(/[\s\n]/g, '');
		} else {
			ip = system("ip a s dev eth0 | sed -n 's/.*inet \\([0-9.]*\\)\\/.*/\\1/p' | head -n 1")[1].replace(/[\s\n]/g, '');
		}
	} catch (e) {
		console.log(e);
	}

	return ip;
}

AutomationController.prototype.getQRCodeData = function(profile, password) {
	var data = {
			id: "",
			login: "",
			service: "find.z-wave.me",
			ssid: "",
			ip: "",
			wpa: "",
			passwd: ""
		},
		url = "",
		ip = "";

	data.passwd = password;
	data.login = profile.login;
	data.id = this.getRemoteId();

	ip = this.getIPAddress();
	if (ip) {
		data.ip = ip;
	}

	url = Object.keys(data).map(function(key) {
		return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
	}).join('&');

	url = Base64.encode(url);

	return url;
}

// namespaces
AutomationController.prototype.generateNamespaces = function(callback, device, locationNspcOnly) {
	var that = this,
		devStillExists = that.devices.get(device.id),
		locationNspcOnly = locationNspcOnly ? locationNspcOnly : false,
		nspcArr = [],
		locNspcArr = [],
		devLocation = device.get('location'),
		location = that.getLocation(that.locations, devLocation),
		devHidden = device.get('permanently_hidden') || device.get('metrics:removed');

	if (!!location && !location.namespaces) {
		location.namespaces = [];
	}

	if (device) {

		this.genNspc = function(nspc, vDev) {
			var devTypeEntry = 'devices_' + vDev.get('deviceType'),
				devProbeType = vDev.get('probeType'),
				devEntry = {
					deviceId: vDev.id,
					deviceName: vDev.get('metrics:title')
				},
				addRemoveEntry = function(entryArr) {
					var exists = [];

					// check if entry already exists
					exists = _.filter(entryArr, function(entry) {
						return entry.deviceId === devEntry.deviceId;
					});

					if (!!devStillExists && exists.length < 1 && !devHidden) {
						// add entry
						entryArr.push(devEntry);
					} else if (!!devStillExists && exists[0] && !devHidden) {
						// change existing deviceName
						if (!_.isEqual(exists[0]['deviceName'], devEntry['deviceName'])) {
							exists[0]['deviceName'] = devEntry['deviceName'];
						}
					} else if (devStillExists === null || devHidden) {
						// remove entry
						entryArr = _.filter(entryArr, function(entry) {
							return entry.deviceId !== devEntry.deviceId;
						});
					}

					return entryArr;
				},
				deleteEmptyProp = function(object, key) {
					// delete empty CC type entries
					if ((_.isArray(object[key]) && object[key].length < 1) || (!_.isArray(object[key]) && Object.keys(object[key]).length < 1)) {
						delete object[key];
					}
					return object;
				},
				cutType = [],
				cutSubType = '',
				paramEntry;

			// check for type entry
			typeEntryExists = _.filter(nspc, function(typeEntry) {
				return typeEntry.id === devTypeEntry;
			});

			if (typeEntryExists.length > 0) {
				paramEntry = typeEntryExists[0] && typeEntryExists[0].params ? typeEntryExists[0].params : paramEntry;
			}

			// generate probetype entries
			if (devProbeType !== '') {
				cutType = devProbeType === 'general_purpose' ? devProbeType.split() : devProbeType.split('_'),
					// sub type includes whole probeType after first '_'
					cutSubType = devProbeType.substr(cutType[0].length + 1);

				paramEntry = paramEntry ? paramEntry : {};

				// create 'none' entry to get an object with array of 'none probetype' entries
				if (_.isArray(paramEntry)) {
					paramEntry = {
						none: paramEntry
					};
				}

				// check for CC sub type and add device namespaces
				if (cutType.length > 1) {

					// add CC type
					if (!paramEntry[cutType[0]]) {
						paramEntry[cutType[0]] = {};
					}

					// add subtype
					if (!paramEntry[cutType[0]][cutSubType]) {
						paramEntry[cutType[0]][cutSubType] = [];
					}

					//check if entry is already there
					paramEntry[cutType[0]][cutSubType] = addRemoveEntry(paramEntry[cutType[0]][cutSubType]);

					// delete empty suptype entries
					paramEntry[cutType[0]] = deleteEmptyProp(paramEntry[cutType[0]], cutSubType);

					// add CC type
				} else {
					if (!paramEntry[cutType[0]]) {
						paramEntry[cutType[0]] = [];
					}

					//check if entry is already there
					paramEntry[cutType[0]] = addRemoveEntry(paramEntry[cutType[0]]);
				}

				// remove CC if empty
				paramEntry = deleteEmptyProp(paramEntry, cutType[0]);

			} else {
				// add entries to type entries
				paramEntry = paramEntry ? paramEntry : [];

				// create 'none' entry to get an object with array of 'none probetype' entries
				if (_.isArray(paramEntry)) {
					paramEntry = {
						none: paramEntry
					};
				} else if (!_.isArray(paramEntry) && devProbeType === '') {
					paramEntry['none'] = paramEntry['none'] ? paramEntry['none'] : [];
				}
				paramEntry.none = addRemoveEntry(paramEntry.none);
			}

			// delete 'none' entry if it exists as a single entry
			if (!_.isArray(paramEntry) && Object.keys(paramEntry).length === 1 && paramEntry['none']) {
				paramEntry = paramEntry['none'];
			}

			// set namespaces
			that.setNamespace(devTypeEntry, nspc, paramEntry);

			// check for 'devices_all'
			devicesAll = _.filter(nspc, function(entries) {
				return entries.id === 'devices_all';
			});

			// add 'devices_all' with entries
			if (devicesAll.length < 1) {
				that.setNamespace('devices_all', nspc, [devEntry]);
			} else if (devicesAll[0].params && _.isArray(devicesAll[0].params)) {
				// check if entry is already there
				// add/remove entry to/from devices_all
				devicesAll[0].params = addRemoveEntry(devicesAll[0].params);
			}

			return nspc;
		};

		// only triggered if there is no explicite location change - 
		// on device: created, removed, destroy, change:metrics:title, change:permanently_hidden, change:metrics:removed
		// usual update of global namespaces
		// first setup of location namespace 
		if (!locationNspcOnly) {

			// add to location namespaces
			if (!!location) {
				_.forEach(that.locations, function(l) {
					if (l.id === devLocation) {
						// add to namespace
						l.namespaces = that.genNspc(location.namespaces, device);
					}
				});
			}

			// update global namespaces
			nspcArr = that.genNspc(that.namespaces, device);

			if (typeof callback === 'function') {
				callback(nspcArr);
			}

			// if location of device has changed
			// on device: change:location
			// update namespaces for location if necessary
		} else {
			_.forEach(that.locations, function(l) {
				if (!l.namespaces) {
					l.namespaces = [];
				}

				if (l.id === devLocation) {
					// if device is assigned to location add to namespace
					devStillExists = that.devices.get(device.id);
					l.namespaces = that.genNspc(l.namespaces, device);
				} else {
					// remove from the other namespaces
					devStillExists = null;
					l.namespaces = that.genNspc(l.namespaces, device);
				}
			});

			if (typeof callback === 'function') {
				callback(locNspcArr);
			}
		}

	} else {
		if (typeof callback === 'function') {
			callback(nspcArr);
		}
	}
};

AutomationController.prototype.getListNamespaces = function(path, namespacesObj, setLocationTitle) {
	var self = this,
		result = [],
		namespaces = namespacesObj,
		path = path || null,
		pathArr = [],
		namespacesPath = '',
		nspc,
		v = setLocationTitle ? setLocationTitle : false;

	this.getNspcDevAll = function(nspcObj) {
		var devicesAll = [],
			obj = {};

		if (_.isArray(nspcObj)) {
			nspcObj.forEach(function(nspcEntry) {
				if (!~devicesAll.indexOf(nspcEntry)) {
					devicesAll.push(nspcEntry);
				}
			});
		} else {
			for (var prop in nspcObj) {
				devicesAll = devicesAll.concat(self.getNspcDevAll(nspcObj[prop]));
			}
		}

		return devicesAll;
	};

	// map all entries (deviceName, deviceId)
	// if deviceName add also location title
	mapEntries = function(list) {
		// return list of entries
		return _.map(list, function(entry) {
			var locationTitle = '';

			if (setLocationTitle) {
				var vDev = self.devices.get(entry.deviceId),
					location = self.getLocation(self.locations, vDev.get('location'));

				locationTitle = currPath === 'deviceName' && !!location && location && location.title !== 'globalRoom' ? location.title.toUpperCase() + ' - ' : '';
			}

			return locationTitle + entry[currPath];
		});
	};

	if (!!path && namespaces) {

		pathArr = path.split('.');

		// add 'params' to path array if neccessary
		if (pathArr.length > 1 && pathArr.indexOf('params') === -1) {
			pathArr.splice(1, 0, 'params');
		}

		// filter for type
		nspc = namespaces.filter(function(namespace) {
			return namespace.id === pathArr[0];
		})[0];

		//nspc = nspc[0]? nspc[0] : nspc;

		// get object/array by path
		if (nspc && pathArr.length > 1) {
			var shift = 1;
			for (var i = 0; i < pathArr.length; i++) {
				var currPath = pathArr[i + shift],
					obj = {},
					lastPath = ['deviceId', 'deviceName'];

				if (nspc[currPath]) {
					nspc = nspc[currPath];
					result = nspc;

				} else if (!nspc[currPath] && ~lastPath.indexOf(currPath)) {
					result = self.getNspcDevAll(nspc);

					result = mapEntries(result);
					// add backward compatibility
				} else if (~lastPath.indexOf(currPath)) {

					if (_.isArray(nspc)) {
						// map all device id's or device names
						result = mapEntries(nspc);
					}
				} else if (!nspc[currPath] && nspc['devices_all'] && i < 1) {
					nspc = nspc['devices_all'];
					result = nspc;
					// change shift to get last path entry
					shift = 0;
				} else if (currPath && !nspc[currPath] && i > 0) {
					nspc = [];
					result = nspc;

					break;
				} else if (currPath) {
					result = nspc;
				}
			}
		} else {
			result = nspc && nspc['params'] ? nspc['params'] : nspc; // if not return undefined
		}

	} else {
		result = namespaces;
	}

	return result;
};

AutomationController.prototype.setNamespace = function(id, namespacesArr, data) {
	var result = null,
		namespace,
		index;

	id = id || null;

	if (id && this.getListNamespaces(id, namespacesArr)) {
		namespace = _.findWhere(namespacesArr, {
			id: id
		});
		if (!!namespace) {
			index = namespacesArr.indexOf(namespace);

			// remove entry if data is empty
			if (~index && (_.isArray(data) && data.length < 1) || ((!_.isArray(data)) && Object.keys(data).length < 1)) {
				namespacesArr = namespacesArr.splice(index, 1);
				result = namespacesArr;
			} else {
				namespacesArr[index].params = data;
				result = namespacesArr[index];
			}
		}
	} else if ((_.isArray(data) && data.length > 0) || ((!_.isArray(data)) && Object.keys(data).length > 0)) {
		namespacesArr.push({
			id: id,
			params: data
		});
		result = null;
	}

	return result;
};

AutomationController.prototype.getListModulesCategories = function(id) {
	var result = null,
		categories = this.modules_categories;

	if (Boolean(id)) {
		result = _.find(categories, function(category) {
			return category.id === id;
		});
	} else {
		result = categories;
	}

	return result;
};

AutomationController.prototype.getModuleData = function(moduleName) {
	var self = this,
		defaultLang = self.defaultLang,
		moduleMeta = self.modules[moduleName] && self.modules[moduleName].meta || null,
		languageFile = self.loadModuleLang(moduleName),
		data = {};

	if (!self.modules[moduleName]) {
		return {}; // module not found (deleted from filesystem or broken?), return empty meta
	}

	try {
		metaStringify = JSON.stringify(moduleMeta);
	} catch (e) {
		try {
			metaStringify = JSON.stringify(fs.loadJSON('modules/' + moduleName + '/module.json'));
		} catch (e) {
			try {
				metaStringify = JSON.stringify(fs.loadJSON('userModules/' + moduleName + '/module.json'));
			} catch (e) {
				console.log('Cannot load lang file from module ' + moduleName + '. ERROR: ' + e);
			}
		}
	}

	if (languageFile !== null) {
		Object.keys(languageFile).forEach(function(key) {
			var regExp = new RegExp('__' + key + '__', 'g');
			if (languageFile[key]) {
				metaStringify = metaStringify.replace(regExp, languageFile[key]);
			}
		});
		data = JSON.parse(metaStringify);
	} else {
		data = self.modules[moduleName].meta;
	}

	return data;
};

AutomationController.prototype.replaceNamespaceFilters = function(moduleMeta) {
	var self = this,
		moduleMeta = moduleMeta || null,
		langFile = this.loadMainLang();

	// loop through object
	function replaceNspcFilters(moduleMeta, obj, keys) {
		var objects = [];

		for (var i in obj) {
			if (obj && !obj[i]) {
				continue;
			}
			if ((i === 'properties' || i === 'fields') && typeof obj[i] === 'object' && obj[i]['room'] && obj[i]['devicesByRoom']) {
				var k = _.keys(obj[i])
				newObj = {};

				try {
					// overwrite old key with new namespaces array
					if (i === 'properties') {
						console.log("Room - Device relation found, try to preparate JSON's schema structure ...");

						var dSRoom = _.extend({
								"type": "",
								"field": "",
								"datasource": "",
								"enum": "",
								"title": ""
							}, obj[i]['room']),
							dSDevByRoom = _.extend({
								"type": "",
								"datasource": "",
								"enum": "",
								"title": "",
								"dependencies": ""
							}, obj[i]['devicesByRoom']);

						if (dSRoom['enum'] && !_.isArray(dSRoom['enum'])) {
							dSRoom['enum'] = getNspcFromFilters(moduleMeta, dSRoom['enum']);

							obj[i]['room'] = dSRoom;
						}

						if (dSDevByRoom['enum'] && !_.isArray(dSDevByRoom['enum']) && _.isArray(dSRoom['enum'])) {
							var path = dSDevByRoom['enum'].substring(21).replace(/:/gi, '.');
							if (k.length > 0) {
								k.forEach(function(key) {
									if (key === 'devicesByRoom') {
										dSRoom['enum'].forEach(function(roomId, index) {
											var locNspc = [],
												nspc = [];

											location = self.getLocation(self.locations, roomId);

											if (!!location) {
												nspc = self.getListNamespaces(path, location.namespaces);
											}

											dSDevByRoom['enum'] = nspc && nspc.length > 0 ? nspc : [langFile.no_devices_found];
											dSDevByRoom['dependencies'] = "room";

											newObj['devicesByRoom_' + roomId] = _.clone(dSDevByRoom);
											if (newObj['devicesByRoom_' + roomId]['title']) {
												newObj['devicesByRoom_' + roomId]['title'] = newObj['devicesByRoom_' + roomId]['title'] + '_' + roomId;
											}
										});
									} else {
										newObj[key] = obj[i][key];
									}
								});
							}

							obj[i] = newObj;
						}
					} else {
						console.log("Room - Device relation found, try to preparate JSON's options structure ...");

						var dSRoom = _.extend({
								"type": "",
								"field": "",
								"optionLabels": ""
							}, obj[i]['room']),
							dSDevByRoom = _.extend({
								"dependencies": {},
								"type": "",
								"field": "",
								"optionLabels": ""
							}, obj[i]['devicesByRoom']);

						if (dSRoom['optionLabels'] && !_.isArray(dSRoom['optionLabels'])) {
							dSRoom['optionLabels'] = getNspcFromFilters(moduleMeta, dSRoom['optionLabels']);

							obj[i]['room'] = dSRoom;
						}

						if (dSDevByRoom['optionLabels'] && !_.isArray(dSDevByRoom['optionLabels']) && _.isArray(dSRoom['optionLabels'])) {
							var path = dSDevByRoom['optionLabels'].substring(21).replace(/:/gi, '.');
							if (k.length > 0) {
								k.forEach(function(key) {
									if (key === 'devicesByRoom') {
										dSRoom['optionLabels'].forEach(function(roomName, index) {

											var locNspc = [],
												nspc = [],
												locationId;

											location = self.locations.filter(function(location) {
												return location.title === roomName
											});
											locationId = location[0] ? location[0].id : location.id;

											if (location[0]) {
												nspc = self.getListNamespaces(path, location[0].namespaces);
											}

											dSDevByRoom['optionLabels'] = nspc && nspc.length > 0 ? nspc : [langFile.no_devices_found];
											dSDevByRoom['dependencies'] = {
												"room": locationId
											};

											newObj['devicesByRoom_' + locationId] = _.clone(dSDevByRoom);

											if (newObj['devicesByRoom_' + locationId]['label']) {
												newObj['devicesByRoom_' + locationId]['label'] = newObj['devicesByRoom_' + locationId]['label'] + '_' + locationId;
											}
										});
									} else {
										newObj[key] = obj[i][key];
									}
								});
							}

							obj[i] = newObj;
						}
					}

				} catch (e) {
					console.log('Cannot prepare Room-Device related JSON structure. ERROR: ' + e);
					self.addNotification('warning', langFile.err_preparing_room_dev_structure, 'module', moduleMeta.id);
				}

				// try to replace the other stuff
				for (var key in obj[i]) {
					_.each(obj[i][key], function(p, index) {
						if (~keys.indexOf(index) && !_.isArray(p)) {
							obj[i][key][index] = getNspcFromFilters(moduleMeta, obj[i][key][index]);
						}
					});
				}
			} else if (typeof obj[i] === 'object') {
				objects = objects.concat(replaceNspcFilters(moduleMeta, obj[i], keys));
			} else if (keys.indexOf(i) > -1 && !_.isArray(obj[i])) {
				// overwrite old key with new namespaces array
				obj[i] = getNspcFromFilters(moduleMeta, obj[i]);
			}
		}

		return obj;
	};

	// generate namespace arry from filter string 
	function getNspcFromFilters(moduleMeta, nspcfilters) {
		var namespaces = [],
			filters = nspcfilters.split(','),
			apis = ['locations', 'namespaces', 'loadFunction'],
			filteredDev = [];

		try {

			if (!_.isArray(filters)) {
				return false;
			}

			// do it for each filter
			_.forEach(filters, function(flr, i) {
				var id = flr.split(':'),
					path;

				if (apis.indexOf(id[0]) > -1) {

					// get location ids or titles - except location 0/globalRoom - 'locations:id' or 'locations:title'
					// should allow dynamic filtering per location
					if (id[0] === 'locations' && (id[1] === 'id' || id[1] === 'title')) {
						namespaces = _.filter(self.locations, function(location) {
							return location[id[1]] !== 0 && location[id[1]] !== 'globalRoom';
						}).map(function(location) {
							return location[id[1]];
						});

						// get namespaces of devices per location - 'locations:locationId:filterPath'				   
					} else if (id[0] === 'locations' && id[1] === 'locationId') {
						// don't replace set filters instead
						namespaces = nspcfilters;

						// load function from file
					} else if (id[0] === 'loadFunction') {
						var filePath = moduleMeta.location + '/htdocs/js/' + id[1],
							jsFile = fs.stat(filePath);

						if (id[1] && jsFile && jsFile.type === 'file') {
							jsFile = fs.load(filePath);

							if (!!jsFile) {
								//compress string 
								namespaces = jsFile.replace(/\s\s+|\t/g, ' ');
							}
						}

						// get namespaces of devices ignoring locations
					} else {
						// cut path
						path = flr.substring(id[0].length + 1).replace(/:/gi, '.');

						// get namespaces
						nspc = self.getListNamespaces(path, self.namespaces, true);
						if (nspc) {
							namespaces = namespaces.concat(nspc);
						}
					}
				}
			});
			return namespaces;

		} catch (e) {
			console.log('Cannot parse filters > ' + nspcfilters + ' < from namespaces. ERROR: ' + e);
			self.addNotification('warning', langFile.err_parsing_npc_filters, 'module', moduleMeta.id);

			return namespaces;
		}
	};

	if (!!moduleMeta) {
		var params = {
			schema: ['enum'],
			options: ['optionLabels', 'onFieldChange', 'click'],
			postRender: ''
		};

		// transform filters
		for (var property in params) {
			if (property === 'postRender' && moduleMeta[property] && !_.isArray(moduleMeta[property])) {
				moduleMeta[property] = getNspcFromFilters(moduleMeta, moduleMeta[property]);
			} else if (moduleMeta[property]) {
				moduleMeta[property] = replaceNspcFilters(moduleMeta, moduleMeta[property], params[property]);
			}
		}
	}

	return moduleMeta;
};

// load module lang folder
AutomationController.prototype.loadModuleLang = function(moduleId) {
	var moduleMeta = this.modules[moduleId] && this.modules[moduleId].meta || null,
		languageFile = null;

	if (!!moduleMeta) {
		languageFile = this.loadMainLang(moduleMeta.location + '/');
	}

	return languageFile;
};

// load lang folder with given prefix
AutomationController.prototype.loadMainLang = function(pathPrefix) {
	var self = this,
		languageFile = null,
		prefix;

	if (pathPrefix === undefined || pathPrefix === null) {
		prefix = '';
	} else {
		prefix = pathPrefix;
	}

	try {
		languageFile = fs.loadJSON(prefix + "lang/" + self.defaultLang + ".json");
	} catch (e) {
		try {
			languageFile = fs.loadJSON(prefix + "lang/en.json");
		} catch (e) {
			languageFile = null;
		}
	}

	return languageFile;
};

AutomationController.prototype.loadModuleMedia = function(moduleName, fileName) {
	var img = ["png", "PNG", "jpg", "jpeg", "JPG", "JPEG", "gif", "GIF"],
		text = ["css", "js", "txt", "rtf", "xml"],
		html = ["htm", "html", "shtml"],
		video = ["mpeg", "mpg", "mpe", "qt", "mov", "viv", "vivo", "avi", "movie", "mp4"],
		fe,
		resObject = {
			data: null,
			ct: null
		};

	try {

		fe = fileName.split(".").pop();

		if (img.indexOf(fe) > -1) {
			resObject.ct = "image/(png|jpeg|gif)";
		}

		if (text.indexOf(fe) > -1) {
			resObject.ct = "text/(css|html|javascript|plain|rtf|xml)";
		}

		if (html.indexOf(fe) > -1) {
			resObject.ct = "text/html";
		}

		if (video.indexOf(fe) > -1) {
			resObject.ct = "video/(mpeg|quicktime|vnd.vivo|x-msvideo|x-sgi-movie|mp4)";
		}

		try {
			resObject.data = fs.load('userModules/' + moduleName + '/htdocs/' + fileName);
		} catch (e) {
			resObject.data = fs.load('modules/' + moduleName + '/htdocs/' + fileName);
		}

	} catch (e) {
		resObject = null;
	}

	return resObject;
};

AutomationController.prototype.loadImage = function(fileName) {
	var data = null,
		img = loadObject(fileName);

	if (!!img) {
		data = Base64.decode(img);
	}

	return data;
};

AutomationController.prototype.hashCode = function(str) {
	var hash = 0,
		i, chr, len;
	if (this.length === 0) {
		return hash;
	}
	for (i = 0, len = str.length; i < len; i++) {
		chr = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
};

AutomationController.prototype.createBackup = function() {
	var self = this,
		backupJSON = {},
		userModules = [],
		skins = [],
		result = null;

	var list = __storageContent,
		excludedFiles = this.getIgnoredStorageFiles();

	try {
		// save all objects in storage
		for (var ind in list) {
			if (excludedFiles.indexOf(list[ind]) === -1) {
				backupJSON[list[ind]] = loadObject(list[ind]);
			}
		}

		// add list of current userModules
		_.forEach(fs.list('userModules') || [], function(moduleName) {
			if (fs.stat('userModules/' + moduleName).type === 'dir' && !_.findWhere(userModules, {
					name: moduleName
				})) {
				userModules.push({
					name: moduleName,
					version: self.modules[moduleName] ? self.modules[moduleName].meta.version : ''
				});
			}
		});

		if (userModules.length > 0) {
			backupJSON['__userModules'] = userModules;
		}

		// add list of current skins excluding default skin
		_.forEach(this.skins, function(skin) {
			if (skins.indexOf(skin) === -1 && skin.name !== 'default') {
				skins.push({
					name: skin.name,
					version: skin.version
				});
			}
		});

		if (skins.length > 0) {
			backupJSON['__userSkins'] = skins;
		}

		/*
		 //TODO icon backup
		 var ret = "in progress";
		 iconinstaller.backup(
		 function(backup) {
			 console.log("success", backup);
			 console.log("success length", backup.length);
			 ret =  new Uint8Array(backup);
			 }, function(error){
			 console.log("error", error);
			 ret = "failed";
		 });

		var d = (new Date()).valueOf() + 20000; // wait not more than 20 seconds

		while ((new Date()).valueOf() < d &&  ret === "in progress") {
			processPendingCallbacks();
		}

		 console.log(ret);
		 if(ret !== "failed") {
			 var bcp = "";
			 console.log(ret.length);
			 for(var i = 0; i < ret.length; i++) {
			 bcp += String.fromCharCode(ret[i]);
			 }

			 backupJSON["__Icons"] = bcp;
		 }
		*/

		// save Z-Way and EnOcean objects
		if (!!global.ZWave) {
			backupJSON["__ZWay"] = {};
			global.ZWave.list().forEach(function(zwayName) {
				var bcp = "",
					data = new Uint8Array(global.ZWave[zwayName].zway.controller.Backup());

				for (var i = 0; i < data.length; i++) {
					bcp += String.fromCharCode(data[i]);
				}

				backupJSON["__ZWay"][zwayName] = bcp;
			});
		}

		/* TODO
		 if (!!global.EnOcean) {
		 backupJSON["__EnOcean"] = {};
		 global.EnOcean.list().forEach(function(zenoName) {
		 // backupJSON["__EnOcean"][zenoName] = global.EnOcean[zenoName].zeno.controller.Backup();
		 });
		 }
		 */

		result = backupJSON;
	} catch (e) {
		throw e.toString();
	}

	return result;
};

AutomationController.prototype.getRemoteId = function() {
	var checkIfTypeError = true,
		result = null;

	if (typeof ZBWConnect === 'function') {
		try {
			zbw = new ZBWConnect(); // find zbw by path or use (raspberry) location /etc/zbw as default

			if (!!zbw) {
				checkIfTypeError = zbw.getUserId() instanceof TypeError ? true : false;
			}
		} catch (e) {
			try {
				zbw = new ZBWConnect('./zbw');
				checkIfTypeError = zbw.getUserId() instanceof TypeError ? true : false;
			} catch (er) {
				console.log('Something went wrong. Reading remote id has failed. Error:' + er.message);
			}
		}
		if (checkIfTypeError) {
			console.log('Something went wrong. Reading remote id has failed.');
		} else {
			result = zbw.getUserId();
		}
	} else {
		console.log('Reading remote id has failed. Service is not available.');
	}

	return result;
};

AutomationController.prototype.getInstancesByModuleName = function(moduleName) {
	return Object.keys(this.registerInstances).map(function(id) {
		return controller.registerInstances[id];
	}).filter(function(i) {
		return i.meta.id === moduleName;
	});
};

AutomationController.prototype.reoderDevices = function(list, action) {
	var self = this,
		result = false;
	try {
		_.each(list, function(id) {
			var vDev = self.devices.get(id),
				order = vDev.get('order');

			order[action] = list.indexOf(id);

			vDev.set('order', order);
		});
		result = true;
	} catch (e) {
		console.log(e);
	}

	return result;
};

AutomationController.prototype.vDevFailedDetection = function(nodeId, isFailed, zwayName) {
	this.devices.filterByNode(nodeId, zwayName).forEach(function(vDev) {
		if (vDev.get('metrics:isFailed') !== isFailed) { // don't trigger events if values is not changing to minimize the number of events
			vDev.set('metrics:isFailed', isFailed);
		}
	});
};

AutomationController.prototype.transformIntoNewInstance = function(moduleName) {

	if (['IfThen', 'LogicalRules', 'ScheduledScene', 'LightScene'].indexOf(moduleName) < 0) {
		return null;
	}

	var self = this,
		instances = [],
		newInstances = [],
		result = [];

	var moduleMeta = this.modules[moduleName] && this.modules[moduleName].meta || null;

	instances = _.filter(this.instances, function(i) {
		return moduleName === i.moduleId && !i.params.transformed;
	});

	if (instances.length && moduleMeta) {
		instances.forEach(function(instance) {
			var newInstance = {};

			switch (moduleName) {
				case 'IfThen':
				case 'LogicalRules':
					newInstance = {
						moduleId: 'Rules',
						active: false,
						title: '',
						params: {
							simple: {
								triggerEvent: {},
								triggerDelay: 0,
								targetElements: [],
								sendNotifications: [],
								reverseDelay: 0
							},
							advanced: {
								active: false,
								triggerOnDevicesChange: false,
								triggerScenes: [],
								triggerDelay: 0,
								logicalOperator: 'and',
								tests: [],
								targetElements: [],
								sendNotifications: [],
								reverseDelay: 0
							},
							reverse: false
						}
					}
					break;
				case 'ScheduledScene':

					newInstance = {
						moduleId: 'Schedules',
						active: false,
						title: '',
						params: {
							weekdays: [],
							times: [],
							devices: []
						}
					};

					break;
				case 'LightScene':

					newInstance = {
						moduleId: 'Scenes',
						active: false,
						title: '',
						params: {
							devices: [],
							customIcon: {
								table: [{
									icon: ''
								}]
							}
						}
					};

					break;
			}

			if ((moduleName === 'LogicalRules' && has_higher_version(moduleMeta.version, '1.4.0')) ||
				(moduleName === 'IfThen' && has_higher_version(moduleMeta.version, '2.5.0')) ||
				(moduleName === 'ScheduledScene' && has_higher_version(moduleMeta.version, '2.2.1')) ||
				(moduleName === 'LightScene' && has_higher_version(moduleMeta.version, '1.1.0'))) {

				// adjust title and instance state
				newInstance.active = instance.active || false;
				newInstance.title = moduleName + ' - ' + instance.title || 'Automatically transformed ' + newInstance.moduleId + ' instance from ' + moduleName + ' instance #' + instance.id;

				if (moduleName === 'LogicalRules') {

					// transform into advanced Rule
					newInstance.params.advanced = self.transformIntoRule('advanced', instance, newInstance.params.advanced);

				} else if (moduleName === 'IfThen') {

					// transform into simple Rule
					newInstance.params.simple = self.transformIntoRule('simple', instance, newInstance.params.simple);

				} else if (moduleName === 'ScheduledScene') {

					// update params and instance
					newInstance.params.devices = self.concatDeviceListEntries(instance.params.devices);
					newInstance.params.times = instance.params.times;
					newInstance.params.weekdays = instance.params.weekdays;

				} else if (moduleName === 'LightScene') {

					// update params and instance
					newInstance.params.devices = self.concatDeviceListEntries(instance.params);
				}

				newInstances.push(newInstance);

				// stop old instance
				instance.active = instance.active || instance.active === 'true' ? false : instance.active;
				// set transformed flag
				instance.params.moduleAPITransformed = true;
				self.reconfigureInstance(instance.id, instance);
			}
		});

		// create new instances
		newInstances.forEach(function(inst, index) {

			var active = inst.active;
			if (!active) {
				inst.active = true;
			}

			addedInst = self.createInstance(inst);

			result.push({
				id: addedInst.id,
				title: inst.title,
				old_moduleId: moduleName
			});

			// stop old instance
			if (addedInst && (!active || active === 'false')) {

				inst.active = false;
				self.reconfigureInstance(addedInst.id, inst);
			}
		});
	}

	return result;
};

AutomationController.prototype.transformIntoRule = function(type, instance, object) {
	var self = this,
		targetDevices = [],
		tests = [],
		oldParams = instance.params ? instance.params : null,
		newParams = object ? object : null;

	/*
	newParams = {
		active: true,
		triggerOnDevicesChange: false,
		triggerScenes: [],
		triggerDelay: 0,
		logicalOperator: 'and',
		tests: [],
		targetElements: [],
		sendNotifications: [],
		reverseDelay: 0
	}
	*/

	// transform old structure to new
	if (oldParams && type === 'advanced' && newParams) {

		object.active = true;
		object.triggerOnDevicesChange = oldParams.triggerOnDevicesChange || false;
		object.logicalOperator = oldParams.logicalOperator || 'and';
		object.tests = oldParams.test || [];
		object.targetElements = oldParams.action || [];

		// concat all tests to one list
		oldParams.tests.forEach(function(test) {

			if (Object.keys(test)[1]) {
				var entry = test[Object.keys(test)[1]];

				if (test['testType'] === 'time') {
					tests.push({
						type: "time",
						operator: entry.testOperator,
						level: entry.testValue
					});
				} else if (test['testType'] === 'nested') {
					var nested = {
						logicalOperator: test['testNested']['logicalOperator'],
						tests: []
					}

					test['testNested']['tests'].forEach(function(nestedTest) {
						var nestedTests = [];

						if (nestedTest['testType'] === 'time') {
							nested.tests.push({
								type: "time",
								operator: nestedTest.testOperator,
								level: nestedTest.testValue
							});
						} else {
							nested.tests.push(self.transformAdvancedEntry('test', nestedTest));
						}
					});

					tests.push(nested);

					//
				} else {
					tests.push(self.transformAdvancedEntry('test', entry));
				}
			}
		});

		// concat actions to one list
		Object.keys(oldParams.action).forEach(function(key) {

			oldParams.action[key].forEach(function(entry) {
				if (entry.device || (key === 'scenes' && entry)) {
					if (key === 'scenes') {
						targetDevices.push({
							deviceId: entry,
							deviceType: 'toggleButton',
							level: 'on'
						});
					} else if (key === 'notification') {
						newParams.sendNotifications.push(entry);
					} else {
						targetDevices.push(self.transformAdvancedEntry('action', entry));
					}
				}
			});
		});

		// set new params
		newParams.tests = tests;
		newParams.targetElements = targetDevices;

	} else if (oldParams && type === 'simple' && newParams) {

		/*
		newParams = {
			triggerEvent: {},
			triggerDelay: 0,
			targetElements: [],
			sendNotifications: [],
			reverseDelay: 0
		}
		*/

		// transform trigger event
		if (Object.keys(oldParams.sourceDevice)[1]) {
			var entry = oldParams.sourceDevice[Object.keys(oldParams.sourceDevice)[1]];

			newParams.triggerEvent = self.transformSimpleEntry(entry);
		}

		// concat actions to one list
		oldParams.targets.forEach(function(key) {
			var targetEntry = key[Object.keys(key)[1]];

			if (key['notification']) {
				newParams.sendNotifications.push(targetEntry);
			} else if (key['scene']) {
				newParams.targetElements.push({
					deviceId: targetEntry.target,
					deviceType: 'toggleButton',
					level: 'on'
				});
			} else {
				newParams.targetElements.push(self.transformSimpleEntry(targetEntry));
			}
		});
	}

	return newParams;
}

AutomationController.prototype.transformSimpleEntry = function(entry) {
	//console.log('simple entry:', JSON.stringify(entry));
	var vdevId = entry && entry.device ? entry.device : entry.target,
		vDev = this.devices.get(vdevId),
		lvl = entry.status && ['color', 'level'].indexOf(entry.status) < 0 ? entry.status : (entry.level ? entry.level : (entry.color ? {
			r: entry.color.red,
			g: entry.color.green,
			b: entry.color.blue
		} : 0));

	if (vDev) {
		/* transform each single entry to the new format: switches, thermostats, dimmers, locks, scenes 
			{
			    deviceId: '',
			    deviceType: '',
			    level: '', // color: { r: 0, g: 0, b: 0}, on, off, open, close, color
			    sendAction: true, || false >> don't do this if level is already triggered
			    operator: '',
			    reverseLevel: "off"  // set reverse level on or off
			}
		*/
		return {
			deviceId: vdevId,
			deviceType: vDev ? vDev.get('deviceType') : '',
			level: lvl,
			sendAction: entry.sendAction || false,
			operator: entry.operator,
			reverseLevel: "off"
		};
	}
};

AutomationController.prototype.transformAdvancedEntry = function(transformation, entry) {
	//console.log('advanced entry:', JSON.stringify(entry));
	var vDev = this.devices.get(entry.device);

	if (vDev) {
		if (transformation === 'test') {
			/* transform each single entry to the new format: switches, thermostats, dimmers, locks, scenes 
				{
				    deviceId: '',
				    type: '',
				    level: '', // color: { r: 0, g: 0, b: 0}, on, off, open, close, color
				    operator: ''
				}
			*/
			return {
				deviceId: vDev.id,
				type: vDev ? vDev.get('deviceType') : '',
				level: entry['testValue'],
				operator: entry['testOperator'] ? entry['testOperator'] : undefined
			}

		} else if (transformation === 'action') {
			/* transform each single entry to the new format: switches, thermostats, dimmers, locks, scenes 
				{
				    deviceId: '',
				    deviceType: '',
				    level: '', // color: { r: 0, g: 0, b: 0}, on, off, open, close, color
				    sendAction: true || false >> don't do this if level is already triggered
				}
			*/
			return {
				deviceId: entry.device,
				deviceType: vDev ? vDev.get('deviceType') : '',
				level: entry.status && ['color', 'level'].indexOf(entry.status) < 0 ? entry.status : (entry.level ? entry.level : (entry.color ? {
					r: entry.color.red,
					g: entry.color.green,
					b: entry.color.blue
				} : 0)),
				sendAction: entry.sendAction || false
			}
		}
	}
};

AutomationController.prototype.concatDeviceListEntries = function(devices) {
	var self = this,
		newDevArr = [],
		keys = ['switches', 'dimmers', 'thermostats', 'locks', 'scenes'];

	// concat all lists to one
	Object.keys(devices).forEach(function(key) {
		/* transform each single entry to the new format: switches, thermostats, dimmers, locks, scenes 
			{
			    deviceId: '',
			    deviceType: '',
			    level: '', // color: { r: 0, g: 0, b: 0}, on, off, open, close, color
			    sendAction: true || false >> don't do this if level is already triggered
			}
		*/
		if (_.isArray(devices[key]) && keys.indexOf(key) >= 0) {
			devices[key].forEach(function(entry) {

				var vDev = null;
				if (entry.device || (key === 'scenes' && entry)) {
					if (key === 'scenes') {
						newDevArr.push({
							deviceId: entry,
							deviceType: 'toggleButton',
							level: 'on'
						});
					} else {
						vDev = self.devices.get(entry.device);

						newDevArr.push({
							deviceId: entry.device,
							deviceType: vDev ? vDev.get('deviceType') : '',
							level: entry.status && ['color', 'level'].indexOf(entry.status) < 0 ? entry.status : (entry.level ? entry.level : (entry.color ? {
								r: entry.color.red,
								g: entry.color.green,
								b: entry.color.blue
							} : 0)),
							sendAction: entry.sendAction
						});
					}
				}
			});
		}
	});

	// update params and instance
	return newDevArr;
};