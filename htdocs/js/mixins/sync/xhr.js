define([], function () {
    "use strict";

    return ({
        request: function (options) {
            var xhr = new XMLHttpRequest(),
                query = this._getQueryParams(window.location.search),
                apiPort = query.hasOwnProperty('port') ? query.port : window.location.port,
                apiHost = query.hasOwnProperty('host') ? query.host : window.location.hostname,
                url =
                        window.location.protocol + '//' +
                        apiHost +
                        (Boolean(apiPort) ? ':' + apiPort : '')
                        + '/ZAutomation/api/v1' + options.url;

            options.params = options.params || {};

            if (!options.hasOwnProperty('url') || !options.hasOwnProperty('method')) {
                return;
            }

            if (options.hasOwnProperty('cache') && options.cache === false) {
                options.params.nocache = Math.random();
            }

            if (Object.keys(options.params).length > 0) {
                url = url + '?' + this._serialiseObject(options.params);
            }

            xhr.open(options.method, url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onreadystatechange = function (e) {
                if (xhr.readyState === 4) {
                    if (xhr.status < 400) {
                        if (Boolean(options.success) && typeof options.success === 'function') {
                            options.success(xhr.responseText ? JSON.parse(xhr.responseText) : xhr.responseText);
                        } else {
                            //console.debug('options.success is not function')
                        }
                        //console.log(xhr.responseText);
                    } else {
                        if (Boolean(options.error) && typeof options.error === 'function') {
                            options.error(xhr.responseText.length > 0 ? JSON.parse(xhr.responseText) : xhr.responseText);
                        } else {
                            //console.debug('options.error is not function')
                        }
                        //console.error(xhr.statusText);
                    }
                }
            };
            xhr.onerror = options.error;
            xhr.send(options.data || null);
        },
        _serialiseObject: function (obj) {
            var pairs = [];
            for (var prop in obj) {
                if (!obj.hasOwnProperty(prop)) {
                    continue;
                }
                if (Object.prototype.toString.call(obj[prop]) == '[object Object]') {
                    pairs.push(this._serialiseObject(obj[prop]));
                    continue;
                }
                pairs.push(prop + '=' + obj[prop]);
            }
            return pairs.join('&');
        },
        _getQueryParams: function (qs) {
            qs = qs.split("+").join(" ");

            var params = {}, tokens,
                re = /[?&]?([^=]+)=([^&]*)/g;

            while (tokens = re.exec(qs)) {
                params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
            }

            return params;
        }
    });
});