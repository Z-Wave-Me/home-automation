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

    this.allow_extensions = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
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

    return function () {
        var reply = {
                error: 'Permission dendied',
                data: null,
                code: 403
            };
            
        if (req.role === controller.auth.ROLE.ADMIN) {
            var file = self.req.body.file,
                date = new Date(),
                extension = file.name.split('.').pop().toLowerCase(),
                fileName,
                type;

            reply = {
                error: 'Allow extensions ' + self.allow_extensions.join(','),
                data: null,
                code: 400
            };
            
            if (extension === 'jpg') {
                extension = 'jpeg';
            }
            fileName = 'storage-' + (+date / 1000).toFixed(0) + '.' + extension;
            
            if (self.allow_extensions.indexOf(extension) !== -1) {
                type = 'image/' + extension;
                file.type = type;
                file.createdAt = date.toJSON();

                saveObject(fileName, file);

                reply = {
                    error: null,
                    data: {
                        uri: '/ZAutomation/storage/' + fileName,
                        originalName: file.name,
                        length: file.length,
                        type: type
                    },
                    code: 200
                };
            }
        }

        self.initResponse(reply)
    }
};

ZAutomationStorageWebRequest.prototype.getFileFunc = function (fileId) {
    var self = this;

    return function () {
        var file = loadObject(fileId),
            ifNoneMatch = self.req.headers.hasOwnProperty('If-None-Match');

        if (file && !ifNoneMatch) {
            self.res.headers = {
                'Content-Type': file.type,
                ETag: 'W/' + fileId + file.createdAt,
                'Cache-Control': 'public, max-age=31536000',
                'Last-Modified': (new Date(file.createdAt)).toUTCString(),
                'Access-Control-Expose-Headers': self.controller.allow_headers.join(', ')
            };
            self.res.body = file.content;
            self.res.code = 200;
        } else if (file && ifNoneMatch && self.req.headers['If-None-Match'] === 'W/' + fileId + file.createdAt) {
            self.res = {
                status: 304,
                headers: {
                    "API-Version": "2.0.1",
                    'Content-Type': file.type,
                    'Access-Control-Expose-Headers': self.controller.allow_headers.join(', '),
                    'Access-Control-Allow-Origin': '*'
                },
                body: ''
            };
        } else {
            self.initResponse({
                data: null,
                error: 'File isn\'t found',
                code: 404
            });
        }
    }
};

ZAutomationStorageWebRequest.prototype.dispatchRequest = function (method, url) {

    // Default handler is NotFound
    var self = this,
        handlerFunc = this.NotFound;

    // ---------- Test exact URIs ---------------------------------------------
    if ("GET" === method && "/status" === url) {
        handlerFunc = self.statusReport();
    } else if ("POST" === method) {
        handlerFunc = self.uploadFileFunc();
    } else if ("OPTIONS" === method) {
        handlerFunc = self.CORSRequest();
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
                handlerFunc = self.getFileFunc(fileId);
            } else {
                handlerFunc = self.uploadFileFunc();
            }
        }
    }

    // --- Proceed to checkout =)
    return handlerFunc;
};
