function log(msg) {
    'use strict';
    if (console) {
        console.log(msg);
    }
}

function stringify(x) {
    'use strict';
    if (JSON.stringify) {
        return JSON.stringify(x, null, '\t');
    }

    return '[?]';
}

function trim(str) {
    'use strict';
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

function colorScheme(dataColor) {
    'use strict';
    var colorClass =  {
        '4187C8' : 'blue',
        '72C147' : 'green',
        'FFCD39' : 'yellow',
        'EA782A' : 'orange',
        'EA442A' : 'red'
    };

    return colorClass[dataColor];
}

function getTimeStamp() {
    'use strict';
    return (new Date().toISOString());
}


function isLocalStorageAvailable() {
    'use strict';
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        return false;
    }
}

function isFileSystemApiAvailable() {
    'use strict';
    var result;
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        result = true;
    } else {
        result = false;
    }
    return result;
}

function isUrl(url) {
    var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi,
        regex = new RegExp(expression);

    return url.match(regex);
}

function getXmlHttp() {
    'use strict';
    try {
        return new ActiveXObject("Msxml2.XMLHTTP");
    } catch (e) {
        try {
            return new ActiveXObject("Microsoft.XMLHTTP");
        } catch (ee) {

        }
    }
    if (XMLHttpRequest !== undefined) {
        return new XMLHttpRequest();
    }
}

function getUrl(url, cb) {
    'use strict';
    var xmlhttp = getXmlHttp();
    xmlhttp.open("GET", url, true);
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState === 4) {
            if (cb) {
                cb(xmlhttp.status, xmlhttp.getAllResponseHeaders(), xmlhttp.responseText);
            }

        }
    };
    xmlhttp.send(null);
}

function rgbToHex(r, g, b, s) {
    return (s || '') + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}


String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

function LZ(x) {return(x<0||x>9?"":"0")+x}
