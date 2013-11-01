function log(msg) {
    if (console) {
        console.log(msg);
    }
}

function stringify(x) {
    if (JSON.stringify) {
        return JSON.stringify(x, null, '\t');
    }

    return '[?]';
}

function trim(str){
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

function colorScheme(dataColor) {

    var colorClass = new Array();
    colorClass['4187C8'] = 'blue';
    colorClass['72C147'] = 'green';
    colorClass['FFCD39'] = 'yellow';
    colorClass['EA782A'] = 'orange';
    colorClass['EA442A'] = 'red';

    return colorClass[dataColor];
}

function getTimeStamp() {
    return (new Date().toISOString());
}


function isLocalStorageAvailable() {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        return false;
    }
}

function isFileSystemApiAvailable() {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        return true;
    } else {
        return false;
    }
}

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

function capitaliseFirstLetter(string){
    return string.charAt(0).toUpperCase() + string.slice(1);
}
