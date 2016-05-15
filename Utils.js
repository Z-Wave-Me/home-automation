// Comon utilities and functions

var console = {
    log: debugPrint,
    warn: debugPrint,
    error: debugPrint,
    debug: debugPrint,
    logJS: function() {
        var arr = [];
        for (var key in arguments)
            arr.push(JSON.stringify(arguments[key]));
        debugPrint(arr);
    }
};

function inherits (ctor, superCtor) {
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

function in_array (array, value) {
    return -1 !== array.indexOf(value);
}

function is_function (func) {
    return !!(func && func.constructor && func.call && func.apply);
}

function has_key (obj, key) {
    return -1 !== Object.keys(obj).indexOf(key);
}

function get_values (obj) {
    var res = [];

    Object.keys(obj).forEach(function (key) {
        res.push(obj[key]);
    });

    return res;
}

function has_higher_version (newVersion, currVersion) {
    var isHigher = false,
        newVersion = newVersion && newVersion.toString()? newVersion.toString().split('.') : null,
        currVersion = currVersion && currVersion.toString()? currVersion.toString().split('.') : null;

        if (!!newVersion && !!currVersion) {
            for (var i = 0; i < currVersion.length; i++) {
                if ((parseInt(currVersion[i], 10) < parseInt(newVersion[i], 10)) || ((parseInt(currVersion[i], 10) <= parseInt(newVersion[i], 10)) && (!currVersion[i+1] && newVersion[i+1] && parseInt(newVersion[i+1], 10) > 0))) {
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
