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
            var that = this,
                Immutable = this.getMoreartyContext().Imm,
                service = this.getService(_options.serviceId || null),
                url;

            //if (!this._isAllowMethod('READ', _options.serviceId || null)) {
             //   console.debug('HTTP method is not allowed');
            //    return;
            //}

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
        push: function (_options) {
            var that = this,
                isModel = this.isModel(),
                Immutable = this.getMoreartyContext().Imm,
                service = this.getService(),
                url;

            if (service) {
                url = isModel ? service.url + '/' + this.getDefaultBinding().val('id') : service.url;

                this._read(url, function (response) {
                    that.getDefaultBinding().update(function () {
                        return Immutable.Map(response.data);
                    })
                }, _options);
            } else {
                console.debug('incorrect _serviceId')
            }
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
        _save: function (url, data, callback, _options) {
            this.xhr.request({
                url: url,
                success: callback,
                params: _options.params,
                method: Boolean(data.id) ? 'PUT' : 'POST',
                data: data
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
        _isAllowMethod: function (method) {
            var isModel = this.isModel(),
                service = this.getService();

            if (service) {
                if (isModel) {
                    // TODO: add check type model
                    return service.models.get(0).toObject().methods.toArray().indexOf(method) !== -1;
                } else {
                    return service.methods.toArray().indexOf(method) !== -1;
                }
            } else {
                return;
            }
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