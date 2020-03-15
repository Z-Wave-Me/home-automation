// Comon utilities and functions

var console = {
	log: debugPrint,
	warn: debugPrint,
	error: debugPrint,
	debug: debugPrint,
	logJS: function () {
		var arr = [], pretty = undefined;
		for (var key in arguments) {
			if (key == 0 && arguments[key] === "pretty") { // unstrict key == 0 since it is a string
				pretty = "  ";
				continue;
			}
			arr.push(JSON.stringify(arguments[key], undefined, pretty));
		}
		debugPrint(arr);
	},
	logJSP: function() {
		Array.prototype.unshift.call(arguments, "pretty");
		console.logJS.apply(null, arguments);
	}
};

function inherits(ctor, superCtor) {
	Object.defineProperty(ctor, "super_", {
		value: superCtor,
		enumerable: false,
		writable: false,
		configurable: false
	});
	ctor.prototype = Object.create(superCtor.prototype, {
		constructor: {
			value: ctor,
			enumerable: false,
			writable: true,
			configurable: true
		}
	});
}

function in_array(array, value) {
	return -1 !== array.indexOf(value);
}

function is_function(func) {
	return !!(func && func.constructor && func.call && func.apply);
}

function has_key(obj, key) {
	return -1 !== Object.keys(obj).indexOf(key);
}

function get_values(obj) {
	var res = [];

	Object.keys(obj).forEach(function (key) {
		res.push(obj[key]);
	});

	return res;
}

function byteArrayToString(data) {
	if (typeof ArrayBuffer !== 'undefined' && (data instanceof ArrayBuffer)) {
		data = new Uint8Array(data);
	}

	var output = "";
	for (var i = 0; i < data.byteLength; i++) {
		output += String.fromCharCode(data[i]);
	}
	return output;
}

function generateSalt() {
	return Base64.encode(byteArrayToString(crypto.random(64)));
}

function hashPassword(password, salt) {
	return Base64.encode(byteArrayToString(crypto.sha512(password + salt)));
}

function has_higher_version(newVersion, currVersion) {
	var isHigher = false,
		newVersion = newVersion && newVersion.toString() ? newVersion.toString().split('.') : null,
		currVersion = currVersion && currVersion.toString() ? currVersion.toString().split('.') : null;

	if (!!newVersion && !!currVersion) {
		for (var i = 0; i < currVersion.length; i++) {
			if ((parseInt(currVersion[i], 10) < parseInt(newVersion[i], 10)) || ((parseInt(currVersion[i], 10) <= parseInt(newVersion[i], 10)) && (!currVersion[i + 1] && newVersion[i + 1] && parseInt(newVersion[i + 1], 10) > 0))) {
				isHigher = true;
				break;
			}
		}
	}

	return isHigher;
}

/*
 * Iterate trough object, find the key and change its value
 * will change all keys that are equal to key
 */
function changeObjectValue(obj, key, value) {
	var objects = [];

	for (var i in obj) {

		if (!obj.hasOwnProperty(i)) {
			continue;
		}

		// arrays and objects are treated as objects  
		if (!!obj[i] && typeof obj[i] === 'object') {
			objects = objects.concat(changeObjectValue(obj[i], key));
		} else if (i === key) {
			obj[i] = value;
		}
	}
	return obj;
}

var Base64 = {
	_keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	encode: function (e) {
		var t = "";
		var n, r, i, s, o, u, a;
		var f = 0;
		e = Base64._utf8_encode(e);
		while (f < e.length) {
			n = e.charCodeAt(f++);
			r = e.charCodeAt(f++);
			i = e.charCodeAt(f++);
			s = n >> 2;
			o = (n & 3) << 4 | r >> 4;
			u = (r & 15) << 2 | i >> 6;
			a = i & 63;
			if (isNaN(r)) {
				u = a = 64
			} else if (isNaN(i)) {
				a = 64
			}
			t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a)
		}
		return t
	},
	decode: function (e) {
		var t = "";
		var n, r, i;
		var s, o, u, a;
		var f = 0;
		e = e.replace(/[^A-Za-z0-9\+\/\=]/g, "");
		while (f < e.length) {
			s = this._keyStr.indexOf(e.charAt(f++));
			o = this._keyStr.indexOf(e.charAt(f++));
			u = this._keyStr.indexOf(e.charAt(f++));
			a = this._keyStr.indexOf(e.charAt(f++));
			n = s << 2 | o >> 4;
			r = (o & 15) << 4 | u >> 2;
			i = (u & 3) << 6 | a;
			t = t + String.fromCharCode(n);
			if (u != 64) {
				t = t + String.fromCharCode(r)
			}
			if (a != 64) {
				t = t + String.fromCharCode(i)
			}
		}
		t = Base64._utf8_decode(t);
		return t
	},
	_utf8_encode: function (e) {
		var t = "";
		for (var n = 0; n < e.length; n++) {
			var r = e.charCodeAt(n);
			if (r < 128) {
				t += String.fromCharCode(r)
			} else if (r > 127 && r < 2048) {
				t += String.fromCharCode(r >> 6 | 192);
				t += String.fromCharCode(r & 63 | 128)
			} else {
				t += String.fromCharCode(r >> 12 | 224);
				t += String.fromCharCode(r >> 6 & 63 | 128);
				t += String.fromCharCode(r & 63 | 128)
			}
		}
		return t
	},
	_utf8_decode: function (e) {
		var t = "";
		var n = 0;
		var r = c1 = c2 = 0;
		while (n < e.length) {
			r = e.charCodeAt(n);
			if (r < 128) {
				t += String.fromCharCode(r);
				n++
			} else if (r > 191 && r < 224) {
				c2 = e.charCodeAt(n + 1);
				t += String.fromCharCode((r & 31) << 6 | c2 & 63);
				n += 2
			} else {
				c2 = e.charCodeAt(n + 1);
				c3 = e.charCodeAt(n + 2);
				t += String.fromCharCode((r & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
				n += 3
			}
		}
		return t
	}
};

var formRequest = {
	_randomString: function () {
		var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
		var rString = '';
		for (var i = 0; i < 15; i++) {
			var rnum = Math.floor(Math.random() * chars.length);
			rString += chars.substring(rnum, rnum + 1);
		}
		return rString;
	},
	send: function (formElements, method, url) {
		var boundary = "----WebKitFormBoundary" + formRequest._randomString();
		var obj = {};
		// set method
		obj.method = method;
		// set headers
		obj.headers = {
			"Connection": "keep-alive",
			"Content-Type": "multipart/form-data; boundary=" + boundary,
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Authorization"
		};
		// set url
		obj.url = url;
		// init data
		obj.data = "";
		// create form boundary
		for (var index in formElements) {
			obj.data += '--' + boundary + '\r\n';
			obj.data += 'Content-Disposition: form-data; name="' + formElements[index].name + '"' + (formElements[index].filename ? ('; filename="' + formElements[index].filename) + '"' : '') + '\r\n';
			obj.data += formElements[index].type ? ('Content-Type: ' + formElements[index].type + '\r\n\r\n') : '\r\n';
			obj.data += formElements[index].value + '\r\n';
		}
		;
		// end of boundary
		obj.data += '\r\n--' + boundary + '--\r\n';
		// return cloud server response
		return http.request(obj);
	}
};

function getHRDateformat(now) {
	var ts = now.getFullYear() + "-";
	ts += ("0" + (now.getMonth() + 1)).slice(-2) + "-";
	ts += ("0" + now.getDate()).slice(-2) + "-";
	ts += ("0" + now.getHours()).slice(-2) + "-";
	ts += ("0" + now.getMinutes()).slice(-2);

	return ts;
};

function checkBoxtype(type) {
	var match = false;

	try {
		var bT = system('cat /etc/z-way/box_type');

		bT.forEach(function (bType) {
			match = typeof bType === 'string' && (bType.indexOf(type) > -1 || bType === type) ? true : false;
		});
	} catch (e) {
	}

	return match;
};

function parseToObject(object) {
	return object && typeof object === "string" ? JSON.parse(object) : object;
};

function checkInternetConnection(host_url) {
	var cn = false,
		response = 'in progress',
		d = (new Date()).valueOf() + 15000; // wait not more than 15 sec

	// try to reach google to check for internet connection
	http.request({
		url: host_url,
		async: true,
		success: function (res) {
			response = 'done';
			cn = true;
		},
		error: function (res) {
			response = 'failed';
		}
	});

	// wait for response
	while ((new Date()).valueOf() < d && response === 'in progress') {
		processPendingCallbacks();
	}

	if (response === 'in progress') {
		response = 'failed';
	}

	return cn;
};

/*
* check for true / false
* also if the variable is from type string e.g. 'true' / 'false'
*/
function retBoolean(boolean) {
	if (boolean === true || boolean === 'true') {
		return true;
	} else {
		return false;
	}
};

/*
* find the smallest not assigned value (integer) of a specific key within array objects
*/
function findSmallestNotAssignedIntegerValue (array, key) {
	var value = 1,
		maxValue = null,
		listValues = [];

	listValues = array.map(function(entry) {
		return Number.isInteger(entry[key])? entry[key] : parseInt(entry[key],10);
	});

	maxValue = Math.max.apply(null, listValues);

	for (var i = 1; i <= maxValue; i++) {
		if (listValues.indexOf(i) < 0) {
			value = i;
			break;
		} else if (i == maxValue) {
			value = i + 1;
		}
	}

	return value;
};

/*
 * transform the publicKey into usual dsk format: xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx 
 */
 function transformPublicKeyToDSK (publicKey) {
 	var dsk = '';

 	if (_.isArray(publicKey) && publicKey.length > 0) {
 		dsk = publicKey.map(function(x, i, a) { if (i % 2 == 0) return x * 256 + a[i + 1]; }).filter(function(x) { return x != undefined; }).map(function(x) { return ("00000" + x).slice(-5); }).slice(0, 8).join('-');
 	}

 	return dsk;
 }


/*
 * Dump object and fix circular references to output it
 * (for debug purposes)
 */
function dumpObject(obj, ancetors) {
	if (typeof obj !== "object") return obj;
	if (obj === null) return null;
	if (obj === undefined) return undefined;
	
	var result = Array.isArray(obj) ? [] : {} ;
	var keys = Object.keys(obj);
	
	if (!ancetors) ancetors = [];
		
	for (var i in keys) {
		var key = keys[i];
		if (typeof obj[key] === "object") {
			var circular = false;
			
			for (var j in ancetors) {
				if (obj[key] === ancetors[j]) {
					circular = true;
					break;
				}
			}
			if (circular) {
				result[key] = "circular reference to ancetor (" + (ancetors.length - j) + " up)";
			} else {
				var new_ancetors = ancetors.slice(); // copy array
				new_ancetors.push(obj);
				result[key] = dumpObject(obj[key], new_ancetors);
			}
		} else {
			result[key] = obj[key];
		}
	}
	
	return result;
}

function debugPrintStack() {
	try {
		throw new Error("Printing stack trace");
	} catch(e) {
		console.log(e.stack);
	}
}
