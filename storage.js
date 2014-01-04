/*** Main Automation storage module *****************************************

Version:
-------------------------------------------------------------------------------
Author: Stanislav Morozov <r3b@seoarmy.ru>
Copyright: (c) ZWave.Me, 2014

******************************************************************************/

// ----------------------------------------------------------------------------
// --- ZAutomationStorageWebRequest
// ----------------------------------------------------------------------------

function ZAutomationStorageWebRequest () {
    ZAutomationStorageWebRequest.super_.call(this);

    this.res = {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        },
        body: null
    }
};

inherits(ZAutomationStorageWebRequest, ZAutomationWebRequest);

ZAutomationStorageWebRequest.prototype.statusReport = function () {
    return function () {
        var reply = {
            error: null,
            data: "OK",
            code: 200
        }

        this.initResponse(reply);
    }
}

ZAutomationStorageWebRequest.prototype.uploadFileFunc = function () {
    return function () {
        var reply = {
                error: null,
                data: null,
                code: 200,
                message: "OK: Storage"
            },
            reqObj;

        try {
            reqObj = JSON.parse(this.req.body);
        } catch (ex) {
            reply.error = ex.message;
        }

        console.log(JSON.stringify(Object.keys(reqObj)));
        reply.data = reqObj;
        this.initResponse(reply);
    }
};

ZAutomationStorageWebRequest.prototype.getFileFunc = function (fileId) {
    var reply = {
        error: null,
        data: "OK: get File" + fileId,
        code: 200
    }

    this.initResponse(reply);
};

ZAutomationStorageWebRequest.prototype.CORSRequest = function () {
    return function () {
        this.responseHeader('Access-Control-Allow-Origin', '*');
        this.responseHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        this.responseHeader('Access-Control-Allow-Headers', 'Content-Type');
        this.res.status = 200;
    }
};

ZAutomationStorageWebRequest.prototype.dispatchRequest = function (method, url) {
    // Default handler is NotFound
    var handlerFunc = this.NotFound;

    // ---------- Test exact URIs ---------------------------------------------

    if ("GET" === method && "/status" === url) {
        handlerFunc = this.statusReport();
    } else if ("POST" === method && "" === url) {
        handlerFunc = this.uploadFileFunc();
    } else if ("OPTIONS" === method) {
        handlerFunc = this.CORSRequest();
    };

    // ---------- Test regexp URIs --------------------------------------------
    var re, reTest, fileId;

    // --- Perform vDev command
    if (handlerFunc === this.NotFound) {
        re = /\/(.+)/;
        reTest = re.exec(url);
        if (!!reTest) {
            fileId = reTest[1];
            if ("GET" === method && !!fileId) {
                handlerFunc = this.getFileFunc(fileId);
            }
        }
    }

    // --- Proceed to checkout =)
    return handlerFunc;
};
