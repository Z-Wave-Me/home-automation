/*** Main Automation storage module *****************************************

Version:
-------------------------------------------------------------------------------
Author: Stanislav Morozov <r3b@seoarmy.ru>
Copyright: (c) ZWave.Me, 2014

******************************************************************************/

// ----------------------------------------------------------------------------
// --- ZAutomationWebRequest
// ----------------------------------------------------------------------------

function ZAutomationWebRequest() {
    this.req = {};
    this.res = {
        status: 501,
        headers: {
            "api-version": "1.0.1",
            "Content-Type": "text/plain; charset=utf-8"
        },
        body: null
    };
}

ZAutomationWebRequest.prototype.handlerFunc = function () {
    var self = this;

    return function () {
        return self.handleRequest.apply(self, arguments);
    };
};

ZAutomationWebRequest.prototype.responseHeader = function (name, value) {
    if (!!value) {
        this.res.headers[name] = value;
    } else {
        return this.res.headers[name];
    }
}

ZAutomationWebRequest.prototype.initResponse = function (response) {
    var that = this,
        reply,
        version = "1.0.1",
        fields,
        object = {},
        data,
        mainKey = null,
        subPaths = ['notifications', 'devices'],
        tempData,
        pager = null,
        limit = that.req.query.hasOwnProperty('limit') ? parseInt(that.req.query['limit']) : 10,
        offset = that.req.query.hasOwnProperty('offset') ? parseInt(that.req.query['offset']) : 0,
        pagination = that.req.query.hasOwnProperty('pagination') ? that.req.query['pagination'] : true,
        query = that.req.query.hasOwnProperty('q') ? String(that.req.query['q']).toLowerCase() : null,
        httpCode = {
            200: "200 OK",
            201: "201 Created",
            204: "204 No Content",
            304: "304 Not Modified",
            400: "400 Bad Request",
            401: "401 Unauthorized",
            403: "403 Forbidden",
            404: "404 Not Found",
            405: "405 Method Not Allowed",
            501: "501 Not Implemented",
            500: "500 Internal server error"
        };

    response.data = response.data || null;
    response.error = response.error || null;
    response.code = response.code || 200;
    response.contentType = response.contentType || "application/json; charset=utf-8";
    response.message = response.message || null;


    tempData = response.data;
    data = response.data;

    if (data) {
        subPaths.forEach(function (path) {
            if (response.data.hasOwnProperty(path)) {
                mainKey = path;
                tempData = response.data[path];
                data = response.data[path];
            }
        });
    }

    // filter fields
    if (!!tempData && response.code === 200 && that.req.query.hasOwnProperty('fields')) {
        fields = that.req.query['fields'].split(',');
        if (fields.length) {
            if (Array.isArray(tempData)) {
                data = [];
                tempData.forEach(function (model) {
                    object = {};
                    Object.keys(model).forEach(function (key) {
                        if (fields.indexOf(key)!== -1) {
                            object[key] = model[key];
                        }
                    });
                    data.push(object);
                });
            } else {
                data = {};
                Object.keys(response.data).forEach(function (key) {
                    if (fields.indexOf(key) !== -1) {
                        data[key] = response.data[key];
                    }
                });
            }
        }
    }

    if (Array.isArray(tempData) && mainKey) {
        // search
        if (query && Array.isArray(tempData)) {
            tempData = [];
            if (mainKey === 'devices') {
                data.forEach(function (obj) {
                    if (obj.metrics.title.toLowerCase().indexOf(query) !== -1) {
                        tempData.push(obj);
                    }
                });
            } else if (mainKey === 'notifications') {
                data.forEach(function (obj) {
                    if (obj.message.toLowerCase().indexOf(query) !== -1) {
                        tempData.push(obj);
                    }
                });
            }
            data = tempData;
        }

        // pager
        if (limit > 0 && offset >= 0 && String(pagination) === 'true') {
            data = data.slice(offset, offset + limit);
            pager = {
                total: data.length,
                totalPage: Math.round(data.length / limit),
                limit: limit,
                offset: offset,
                page: (offset + limit) / limit
            };
        }
    }

    // include
    if (!!mainKey) {
        response.data[mainKey] = data;
        data = response.data;
    }

    if (that.req.query.hasOwnProperty('suppress_response_code') && String(that.req.query.suppress_response_code) === 'true') {
        response.code = '200';
    } else {
        if (!!data) {
            response.code = response.code || 200;
        } else if (that.req.method === 'DELETE') {
            response.code = response.code || 204;
            response.data = '204 No Content';
        }
    }

    reply = {
        data: data,
        code: httpCode[response.code],
        message: response.message,
        error: response.error
    };

    if (pager) {
        reply.pager = pager
    }

    that.res = {
        status: response.code,
        body : JSON.stringify(reply),
        headers: {
            "Content-Type": response.contentType,
            "API-version": version
        }
    };
}

ZAutomationWebRequest.prototype.dispatchRequest = function (method, url) {
    return this.NotImplementedReply;
}

ZAutomationWebRequest.prototype.handleRequest = function (url, request) {
    var now = new Date();

    // Fill internal structures
    this.req.url = url;
    this.req.method = request.method;
    this.req.query = request.query;
    this.req.body = request.body || "";

    // Get and run request processor func
    var requestProcessorFunc = this.dispatchRequest(request.method, url);
    requestProcessorFunc.call(this);

    // Log request reply
    var bodyLength = "string" === typeof this.res.body ? this.res.body.length : "?";

    // Return to the z-way-http
    return this.res;
}

ZAutomationWebRequest.prototype.NotImplementedReply = function () {
    this.res = {
        status: 501,
        body : "Not implemented, yet",
        headers: {
            "Content-Type": "text/plain; charset=utf-8"
        }
    };
};

ZAutomationWebRequest.prototype.NotFound = function () {
    this.res = {
        status: 404,
        headers: {
            "Content-Type": "text/plain; charset=utf-8"
        },
        body: "Not Found"
    }
};

ZAutomationWebRequest.prototype.CORSRequest = function () {
    this.responseHeader('Access-Control-Allow-Origin', '*');
    this.responseHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    this.responseHeader('Access-Control-Allow-Headers', 'Content-Type');
    this.res.status = 200;
};
