var nun = nunjucks.env;
var ee;
var uiMeta;

function initGlobal () {
    console.log('Loading UI metadata...');
    $.ajax('/api/ui.json', {
        method: 'GET'
    }).done(function (reply, textStatus, jqXHR) {
        console.log("API REPLY", textStatus, reply);
        if (typeof reply !== 'object') {
            ee.emit('error', new Error("Non-object API reply"));
        } else if (reply.error) {
            ee.emit('error', new Error("API error " + reply.error.code + ": " +reply.error.msg));
        } else {
            uiMeta = reply.data;
            ee.emit("ui.loadedMetadata", reply);
        }
    }).fail(function (jqXHR, textStatus, err) {
        ee.emit('error', err);
    });
}

$(document).ready(function () {
    ee = new EventEmitter2();

    ee.on('error', function (err) {
        console.log("ERROR", err);
    });

    ee.on('ui.loadedMetadata', function () {
        console.log('Initiating screen redraw');
        ee.emit('ui.redrawScreen');
    });

    initGlobal();
});
