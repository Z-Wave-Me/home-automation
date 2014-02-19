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

function qVar(variable) {
    'use strict';
    var query = window.location.search.substring(1),
        vars = query.split('&'),
        i,
        pair;
    for (i = 0; i < vars.length; i += 1) {
        pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) === variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    return undefined;
}

String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
