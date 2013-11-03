// Backbone.CrossDomainModel 0.1.0
//
// (c) 2013 Victor Quinn
// Licensed under the MIT license.

(function (root, factory) {
   if (typeof define === "function" && define.amd) {
      // AMD. Register as an anonymous module.
      define(["underscore","backbone"], function(_, Backbone) {
        // Use global variables if the locals are undefined.
        return factory(_ || root._, Backbone || root.Backbone);
      });
   } else {
      // RequireJS isn't being used. Assume underscore and backbone are loaded in <script> tags
      factory(_, Backbone);
   }
}(this, function(_, Backbone) {

    // Helper function to determine the request url given model and options objects
    function requestUrl(model, options) {
        var requestUrl = null;
        // First try the options object
        try {
            requestUrl = options.url;
        } catch(x) {}

        // Then try the model's url
        if (!requestUrl) {
            try {
                requestUrl = _.result(model, 'url');
            } catch(x) {}
        }

        return requestUrl;
    }

    // Helper function to determine whether protocols differ.
    function protocolsDiffer(thisProtocol, requestProtocol) {
        if (thisProtocol === ':' || requestProtocol === ":") {
            return false;
        }

        else if (thisProtocol === requestProtocol) {
            return false;
        }

        return true;
    }

    // Map from CRUD to HTTP for our default `Backbone.sync` implementation.

    var methodMap = {
        'create': 'POST',
        'update': 'PUT',
        'patch':  'PATCH',
        'delete': 'DELETE',
        'read':   'GET'
    };

    Backbone.vanillaSync = Backbone.sync;

    // Override 'Backbone.sync' to default to CrossDomainModel sync.
    // the original 'Backbone.sync' is still available in 'Backbone.vanillaSync'
    Backbone.sync = function(method, model, options) {

        // See if we need to use the XDomainRequest object for IE. If the request is on the
        // same domain, we can fall back on the normal Backbone.ajax handling.
        var useXDomainRequest = false;

        // See https://gist.github.com/jlong/2428561
        var thisDomainParser = document.createElement('a');
        thisDomainParser.href = document.URL;

        var requestDomainParser = document.createElement('a');
        requestDomainParser.href = requestUrl(model, options);

        if (requestDomainParser.host !== "" && (thisDomainParser.host !== requestDomainParser.host)) {
            useXDomainRequest = true;
        }

        // Only use this if browser doesn't support CORS natively. This should
        // catch IE7/8/9 but keep IE10 using the built in XMLHttpRequest which
        // IE10 finally supports for CORS.
        if (useXDomainRequest && !Backbone.$.support.cors) {

            // See this article for more details on all the silly nuances: http://vq.io/14DJ1Tv

            // Basically Backbone.sync rewritten to use XDomainRequest object
            var type = methodMap[method];

            // Default options, unless specified.
            _.defaults(options || (options = {}), {
                emulateHTTP: Backbone.emulateHTTP,
                emulateJSON: Backbone.emulateJSON
            });

            // XDomainRequest only works with POST. So DELETE/PUT/PATCH can't work here.

            // Note: Conscious decision to throw error rather than try to munge the request and
            // do something like force "options.emulateHTTP = true" because we want developers
            // to notice they're trying to do something illegal with this request and it may
            // require server-side changes for compatibility.
            if (!options.emulateHTTP && (method === 'update' || method === 'patch' || method === 'delete')) {
                throw new Error('Backbone.CrossDomain cannot use PUT, PATCH, DELETE with XDomainRequest (IE) and emulateHTTP=false');
            }

            // Default JSON-request options.
            var params = {type: type, dataType: 'json'};

            // Ensure that we have a URL.
            if (!options.url) {
                params.url = _.result(model, 'url') || urlError();
            }

            // Check if protocols differ, if so try the request with the current domain protocol
            if (protocolsDiffer(thisDomainParser.protocol, requestDomainParser.protocol)) {
                params.url = params.url.replace(new RegExp(requestDomainParser.protocol), thisDomainParser.protocol);
            }

            // TODO: XDomainRequest only accepts text/plain Content-Type header

            // TODO: XDomainRequest doesn't like other headers

            // Ensure that we have the appropriate request data.
            if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
                params.data = JSON.stringify(options.attrs || model.toJSON(options));
            }

            // For older servers, emulate JSON by encoding the request into an HTML-form.
            if (options.emulateJSON) {
                params.data = params.data ? {model: params.data} : {};
            }

            // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
            // And an `X-HTTP-Method-Override` header.

            if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
                params.type = 'POST';
                if (options.emulateJSON) params.data._method = type;
                var beforeSend = options.beforeSend;
                options.beforeSend = function(xhr) {
                    xhr.setRequestHeader('X-HTTP-Method-Override', type);
                    if (beforeSend) return beforeSend.apply(this, arguments);
                };
            }

            // Don't process data on a non-GET request.
            if (params.type !== 'GET' && !options.emulateJSON) {
                params.processData = false;
            }

            // Need to send this along as key/value pairs, can't send JSON blob
            if (params.type === 'POST') {
                params.data = Backbone.$.param(Backbone.$.parseJSON(params.data));
            }

            var xdr = options.xhr = new XDomainRequest(),
                success = options.success,
                error = options.error;

            // Attach deferreds, but only if $ is jQuery (if we don't do this check,
            // we'll break support for Zepto or other libraries without promise support
            if (Backbone.$.fn.jquery) {
                var deferred = Backbone.$.Deferred(),
                    completeDeferred = Backbone.$.Callbacks("once memory");

                // Attach deferreds
                deferred.promise(xdr).complete = completeDeferred.add;

                xdr.onload = function () {
                    var obj = {};
                    if (xdr.responseText) {
                        obj = Backbone.$.parseJSON(xdr.responseText);
                    }
                    if (obj) {
                        deferred.resolveWith(this, [success, 'success', xdr]);
                        success(obj);
                    } else {
                        deferred.resolveWith(this, [success, 'success', xdr]);
                        success(obj);
                    }
                };
                xdr.onerror = function () {
                    if (error) {
                        error(model, xdr, options);
                        deferred.resolveWith(this, [xdr, 'error', error]);
                    }
                    model.trigger('error', model, xdr, options);
                };

                xdr.done(xdr.onload);
                xdr.fail(xdr.onerror);

            } else {
                xdr.onload = function (resp) {
                    var obj = {};
                    if (xdr.responseText) {
                        obj = Backbone.$.parseJSON(xdr.responseText);
                    }
                    if (obj) success(obj);
                };

                xdr.onerror = function (xdr) {
                    if (error) error(model, xdr, options);
                    model.trigger('error', model, xdr, options);
                };
            }

            // Make the request using XDomainRequest
            xdr.open(params.type, params.url);

            // Must declare these even if empty or IE will abort randomly: http://vq.io/12bnhye
            xdr.onprogress = function () {};
            xdr.ontimeout = function () {};

            setTimeout(function () {
                xdr.send(params.data);
            }, 0);

            model.trigger('request', model, xdr, options);
            return xdr;
        }
        else {
            return Backbone.vanillaSync.apply(this, arguments);
        }
    };

    return Backbone;
}));
