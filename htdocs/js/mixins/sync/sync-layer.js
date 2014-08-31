define([
    './xhr'
], function (
    Xhr
    ) {
    "use strict";

    return ({
        // public
        xhr: Xhr,
        get: function (url, callback, _options) {
            this.xhr.request({
                url: url,
                success: callback,
                params: _options.params,
                cache: _options.cache || true,
                method: 'GET',
                data: null
            })
        },
        post: function (url, data, callback, _options) {
            this.xhr.request({
                url: url,
                success: callback,
                params: _options.params,
                method: Boolean(data.id) ? 'PUT' : 'POST',
                data: data
            })
        }
    });
});