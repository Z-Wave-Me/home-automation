/*
 * This class creates an object that can be called to save data stored in object using a saver function.
 * The object will be saved only periodically and will be stripped to a limit and filtered using filter function.
 * Object can grow in memory not bigger than to limit + period - then it will be stripped and saved.
 */
function LimitedArray(initial, saver, period, limit, filter) {
	this.object = Array.isArray(initial) ? initial :  [];
	this.saver = saver;   // function
	this.period = period; // integer
	this.limit = limit;   // integer
	this.filter = filter; // function

	this.counter = this.period;
}

LimitedArray.prototype.save = function() {
	if (this.counter-- === 0) {
		this.counter = this.period;
		
		// first filter the object
		if (this.filter) {
			this.object = this.object.filter(this.filter);
		}

		// then limit the object size
		if (this.limit) {
			this.object = this.object.slice(-this.limit);
		}

		// save the object
		this.saver(this.object);
	}
};

LimitedArray.prototype.get = function() {
	return this.object;
};

LimitedArray.prototype.set = function(value) {
    this.object = value;
    this.save();
};

LimitedArray.prototype.push = function(value) {
	this.object.push(value);
	this.save();
};

LimitedArray.prototype.finalize = function() {
	this.counter = 1; // force save
	this.save();
	
	// release
	this.saver = null;
	this.filter = null;
};
