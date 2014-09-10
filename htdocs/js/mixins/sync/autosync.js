define([], function () {
    "use strict";

    return ({
        init: function () {
            var that = this,
                ctx = this.getMoreartyContext(),
                servicesBinding = ctx.getBinding().sub('services'),
                dataBinding = ctx.getBinding().sub('data'),
                collections = servicesBinding.sub('collections');

            collections.val().forEach(function (collection, index) {
                var obj = collection.toJS();

                dataBinding.addListener(obj.id, function (data, previousData) {
                    var collection = data.toJS();

                    collection
                        .filter(function (model) {
                            return model.id === -1 || model._new;
                        })
                        .forEach(function (model) {
                            that.push({
                                data: model,
                                serviceId: obj.id,
                                success: function (response) {
                                    var data = response.data;
                                    dataBinding.sub(obj.id).sub(collection.indexOf(model)).update(function (dataObject) {
                                        Object.keys(response.data).forEach(function (key) {
                                            dataObject.set(key, data[key]);
                                        });

                                        return dataObject;
                                    });
                                }
                            })
                        });
                });
            })
        },
        pull: function () {
            var that = this,
                ctx = this.getMoreartyContext(),
                Immutable = ctx.Immutable,
                servicesBinding = ctx.getBinding().sub('services'),
                dataBinding = ctx.getBinding().sub('data'),
                collections = servicesBinding.sub('collections');

            collections.val().forEach(function (collection, index) {
                var obj = collection.toJS(),
                    func = (function () {
                        that.fetch({
                            serviceId: obj.id,
                            params: obj.sinceField ? { since: dataBinding.val().get(obj.sinceField) || 0 } : null,
                            success: function (response) {
                                if (response.data) {
                                    var models = obj.hasOwnProperty('parse') ? obj.parse(response) : response.data;
                                    models.forEach(function (jsonModel) {
                                        dataBinding.sub(obj.id).update(function (items) {
                                            return items.push(Immutable.Map(jsonModel));
                                        });
                                    });
                                }

                                if (obj.hasOwnProperty('postSyncHandler')) {
                                    obj.postSyncHandler(ctx, response);
                                }
                            }
                        })
                    });

                /*
                if (obj.autoSync) {
                    setInterval(func, obj.delay || 2000);
                } else {
                    setTimeout(func, obj.delay || 0);
                }*/

                setTimeout(func, obj.delay || 0);
            });
        }
    });
});