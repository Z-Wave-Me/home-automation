define([
    'backbone'
], function (Backbone) {
    "use strict";

    function request(url, method, data, success, failure) {
        $.ajax({
            url: url,
            type: method,
            dataType: 'json',
            data: data,
            success: function (json) {
                if (typeof success === 'function') {
                    success(json);
                }
            },
            error: function () {
                if (typeof failure === 'function') {
                    failure();
                }
            }
        });
    }

    var Apis = { request: request };

    Apis.devices = {
        command: function (id, command, params, callback) {
            params = !params ? {} : params;
            request('/devices/' + id + '/' + 'command/' + command, 'get', params, callback);
        }
    };

    Apis.uploadFile = function (file, callback, progress) {
        log('Uploading file!');

        var formData = new FormData();
        formData.append('file', file, 'file' + file.type);

        var xhr = new XMLHttpRequest();
        xhr.open('POST', "http://" + App.API.HOST + ':' + App.API.PORT + '/ZAutomation/storage', true);
        xhr.setRequestHeader("Content-Type", "multipart/form-data");
        xhr.onload = function (e) {
            if (this.status === 200 || this.status === 201) {
                callback(this);
            } else {
                log('Error: Status Code is not 200/201');
            }
        };
        if (progress) {
            xhr.addEventListener('progress', progress, false);
            if (xhr.upload) {
                xhr.upload.onprogress = progress;
            }
        } else {
            log('No Progress');
        }

        xhr.send(formData);

        return xhr; // returning the object because we may want to abort it manually later
    };


    return Apis;
});