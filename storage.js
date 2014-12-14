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
        };

        this.initResponse(reply);
    }
}

ZAutomationStorageWebRequest.prototype.uploadFileFunc = function () {
    var self = this;

    self.rreq = self.req.body.file;

    return function () {
        this.res.body = null;
    }
};

ZAutomationStorageWebRequest.prototype.getFileFunc = function (fileId) {
    var self = this;
    return function () {

        self.res.body = self.rreq.content;
        self.res.headers = {
            'Content-Type': 'image/png',
            'Content-Length': self.rreq.length
        }
    }
};

ZAutomationStorageWebRequest.prototype.dispatchRequest = function (method, url) {

    // Default handler is NotFound
    var handlerFunc = this.NotFound;

    // ---------- Test exact URIs ---------------------------------------------
    if ("GET" === method && "/status" === url) {
        handlerFunc = this.statusReport();
    } else if ("POST" === method) {
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
