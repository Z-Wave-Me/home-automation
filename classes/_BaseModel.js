'use strict';
function BaseModel() {
	BaseModel.super_.call(this);
	var self = this;
	self.attributes = {};
	self._previousAttributes = {};
	self.initialize.call(self);
}

inherits(BaseModel, EventEmitter2);

_.extend(BaseModel.prototype, {
	initialize: function () {
		return this;
	},
	toJSON: function () {
		return _.clone(this.attributes);
	},
	stopListening: function () {
		this.removeAllListeners();
	},
	isNew: function () {
		return Boolean(this.get('id'));
	},
	get: function (param) {
		var result,
			self = this;

		if (param.split(':').length === 1) {
			if (self.attributes.hasOwnProperty(param)) {
				result = self.attributes[param];
			}
		} else if (param.split(':').length > 1) {
			result = self._inObj(self.toJSON(), param.split(':'));
		}

		return result;
	},
	set: function (keyName, val, options) {
		var that = this,
			changes = [],
			current = _.clone(this.attributes),
			prev = this._previousAttributes,
			accessAttrs,
			attrs,
			findObj;

		function findX(obj, key) {
			var val = obj[key];
			if (val !== undefined) {
				return obj;
			}
			for (var name in obj) {
				var result = findX(obj[name]);
				if (result !== undefined) {
					return obj;
				}
			}
			return undefined;
		}

		options = options || {};
		accessAttrs = options.accessAttrs || that.accessAttrs;

		if (_.isString(keyName) && val !== undefined && keyName.split(':').length === 1) {
			findObj = findX(this.attributes, keyName);
			if (findObj[keyName] === val) {
				changes.push(keyName);
				that.changed[keyName] = val;
			}
		} else {
			if (_.isString(keyName) && val !== undefined && keyName.split(':').length > 1) {
				setObj(current, keyName.split(':'), val);
				_.extend(that.attributes, current);
				changes.push(keyName);
			} else {
				attrs = _.extend(that.attributes, _.pick(keyName, accessAttrs));
				Object.keys(attrs).forEach(function (key) {
					if (!_.isEqual(current[key], attrs[key])) {
						changes.push(attrs[key]);
					}
					if (!_.isEqual(prev[key], attrs[key])) {
						that.changed[key] = attrs[key];
					} else {
						delete that.changed[key];
					}
				});
			}
		}

		if (!options.silent) {
			if (changes.length) {
				that.attributes.updateTime = Math.floor(new Date().getTime() / 1000);
			}

			changes.forEach(function (key) {
				if (!!that.collection) {
					that.collection.emit('change:' + key, that, key);
				}
				that.emit('change:' + key, that, key);
			});
		}

		if (!options.setOnly) {
			that.save();
		}
		return this;
	},
	_inObj: function (obj, arr) {
		var result, findObj;

		while (arr.length > 0) {
			findObj = result === undefined ? obj : result;
			if (findObj.hasOwnProperty(arr[0])) {
				result = findObj[arr[0]];
			} else {
				break;
			}

			arr.shift();
		}

		return arr.length > 0 ? undefined : result;
	}
});