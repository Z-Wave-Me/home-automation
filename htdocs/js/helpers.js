// ----------------------------------------------------------------------------
// --- ZAutomation helpers
// ----------------------------------------------------------------------------

console.log("--- Loading helper routines...");

// ----------------------------------------------------------------------------
// --- Prototypal inheritance support routine (from Node.JS)
// ----------------------------------------------------------------------------

function inherits (ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });
}

// ----------------------------------------------------------------------------
// --- HTTP GET Query variable fetcher
// ----------------------------------------------------------------------------

function qVar(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    return undefined;
}

// ----------------------------------------------------------------------------
// --- API helpers
// ----------------------------------------------------------------------------

function apiRequest (uri, callback, options) {
    var opts = {
        method: "GET"
    };

    // opts.patchWith(options);
    if ("object" === typeof options) {
        Object.keys(options).forEach(function (key) {
            opts[key] = options[key];
        });
    }

    $.ajax(apiUrl+uri, opts).done(function (reply, textStatus, jqXHR) {
        // console.log("API REPLY", textStatus, reply);

        var err;

        if (typeof reply !== 'object') {
            err = new Error("Non-object API reply");
            console.log('error', err.message);
            if (!!callback) callback(err);
        } else if (reply.error) {
            err = new Error("API error " + reply.error.code + ": " +reply.error.msg);
            console.log('error', err.message);
            if (!!callback) callback(err);
        } else {
            if (!!callback) callback(null, reply.data);
        }
    }).fail(function (jqXHR, textStatus, error) {
        var err = new Error(error);
        console.log('error', err);
        if (!!callback) callback(err);
    });
}

// ----------------------------------------------------------------------------
// --- Global variables construction and setup
// ----------------------------------------------------------------------------

var DEBUG = qVar("debug") ? true : false;

var apiPort = qVar("port") ? qVar("port") : window.location.port;
var apiHost = qVar("host") ? qVar("host") : window.location.hostname;
var apiUrl = "http://"+apiHost+":"+apiPort+"/ZAutomation/api";
