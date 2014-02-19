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


        var reader = new FileReader(),
            data = {
                type: file.type,
                name: file.name
            },
            xhr = new XMLHttpRequest();

        reader.onload = function (e) {
            data.file = e.target.result;
            xhr.open('POST', "http://" + App.API.HOST + ':' + App.API.PORT + '/ZAutomation/storage', true);
            xhr.setRequestHeader("Content-Type", "application/json");
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

            xhr.send(stringify(data));

            return xhr; // returning the object because we may want to abort it manually later
        }

        // Read in the image file as a data URL.
        reader.readAsBinaryString(file);
    };


    return Apis;
});