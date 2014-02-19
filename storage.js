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
    return function () {
        var reply = {
                error: null,
                data: null,
                code: 200,
                message: null
            },
            //reqObj = new FormData(this.req.body),
            that = this;


        //console.log(JSON.stringify(Object.keys(reqObj)));
        //controller.pushFile(reqObj.file, function (fileObj) {
        //    reply.data = fileObj;
        //    that.initResponse(reply);
        //})
    }
};

ZAutomationStorageWebRequest.prototype.getFileFunc = function (fileId) {
    return function () {
        var reply = {
                error: null,
                data: "OK: get File" + fileId,
                code: 200
            },
            file = controller.pullFile(fileId);

        if (file) {
            reply.data = file;
        } else {
            reply.code = 404;
            reply.error = "File " + fileId + " doesn't exist";
        }

        this.initResponse(reply);
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
