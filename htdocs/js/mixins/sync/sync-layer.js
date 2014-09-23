define([
    './xhr',
    './autosync'
], function (
    Xhr,
    AutoSync
    ) {
    "use strict";

    return {
        // interfaces
        autoSync: AutoSync,
        xhr: Xhr,
        // public
        getService: function (_serviceId) {
            var serviceId = _serviceId || this._serviceId,
                binding = this.getMoreartyContext().getBinding().sub('services').sub('collections'),
                service = binding.val().toArray().filter(function (service) {
                    return serviceId === service.toObject().id;
                });

            return service.length > 0 ? service[0].toObject() : null;
        },
        fetch: function (_options, command) {
            var service = this.getService(_options.serviceId || null),
                url;

            if (service) {
                url = this.isModel() ? service.url + '/' + this.getDefaultBinding().val('id') : service.url;

                if (Boolean(command)) {
                    url += '/command/' + command;
                }

                this._read(url, _options);
            } else {
                console.debug('incorrect _serviceId')
            }

            return false;
        },
        save: function (options) {
            options = options || {};

            var that = this,
                model = options.hasOwnProperty('model') ? options.model : that.props.model,
                collection = options.hasOwnProperty('collection') ? options.collection : that.props.collection,
                serviceId = options.hasOwnProperty('serviceId') ? options.serviceId : that.props.serviceId,
                service = that.getService(serviceId),
                url;

            if (!Boolean(serviceId)) {
                console.error('serviceId is not defined');
                return false;
            }

            if (Boolean(model)) {
                url = model.val('id') ? service.url + '/' + model.val('id') : service.url;
            } else if (collection) {
                url = service.url;
            }

            that.xhr.request({
                url: url,
                success: function (response) {
                    if (model && options.updateAfterSync) {
                        model.update(function (modelData) {
                            Object.keys(response.data).forEach(function (key) {
                                modelData.set('key', response.data[key]);
                            });

                            return modelData;
                        });
                    }

                    if (typeof options.success === 'function') {
                        options.success(model || collection, response.data)
                    }
                },
                params: options.params || {},
                method: model && model.val('id') ? 'PUT' : 'POST',
                data: JSON.stringify(model ? model.val().toJS() : collection.val().toJS())
            });
        },
        remove: function (options) {
            var that = this,
                model = that.props.model,
                collection = that.props.collection,
                serviceId = that.props.serviceId,
                service = that.getService(serviceId),
                url;

            if (Boolean(model)) {
                url = model.val('id') ? service.url + '/' + model.val('id') : service.url;
            } else if (collection) {
                url = service.url;
            }

            that.xhr.request({
                url: url,
                success: function (response) {
                    if (model) {
                        collection.update(function (collection) {
                           return collection.filter(function (m) {
                               return m.val('id') !== model.val('id');
                           });
                        });
                    } else if (collection) {
                        collection.clear();
                    }

                    if (typeof options.success === 'function') {
                        options.success(response.data, model || collection)
                    }
                },
                params: options.params || {},
                method: 'DELETE'
            });
        },
        // private
        _read: function (url, _options) {
            this.xhr.request({
                url: url,
                success: _options.success,
                params: _options.params,
                cache: _options.cache || true,
                method: 'GET',
                data: null
            })
        },
        _destroy: function (url, callback, _options) {
            this.xhr.request({
                url: url,
                success: callback,
                params: _options.params,
                method: 'DELETE'
            })
        },
        isModel: function () {
            return this.getDefaultBinding().val('id') || this._isModel;
        },
        enableAutoSync: function () {
            this.autoSync.init.call(this);
            this.autoSync.pull.call(this);
        }
    };
});