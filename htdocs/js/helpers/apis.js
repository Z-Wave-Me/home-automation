define([
    //libs
    'backbone'
], function(Backbone) {
    "use strict";

    function request(url, method, data, success, failure) {
        $.ajax({
            url: url,
            type: method,
            dataType: 'json',
            data: data,
            success: function(json) {
                if (typeof success === 'function') {
                    success(json);
                }
            },
            error: function(){
                if (typeof failure === 'function') {
                    failure();
                }
            }
        });
    }

    var Apis = { request: request };

    Apis.devices = {
        command: function(id, command, params, callback) {
            var params = !params ? {} : params;
            request('/devices/' + id + '/' + 'command/' + command, 'get', params, callback);
        }
    };


    return Apis;
});