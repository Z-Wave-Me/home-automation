define([], function () {
    "use strict";

    return ({
        init: function () {
            var that = this,
                ctx = this.getMoreartyContext(),
                servicesBinding = ctx.getBinding().sub('services'),
                dataBinding = ctx.getBinding().sub('data'),
                collections = servicesBinding.sub('collections');

            // add collection
            collections.val().forEach(function (collection) {
                dataBinding.addListener(collection.get('id'), function (data, previousData, absolutePath, relativePath) {
                    var subPath = parseInt(relativePath.split('.')[0]),
                        model,
                        modelBinding;

                    if ((subPath - 0) === subPath && (''+subPath).replace(/^\s+|\s+$/g, "").length > 0) {
                        modelBinding = dataBinding.sub(collection.get('id')).sub(subPath);
                        model = modelBinding.val().toJS();

                        that.push({
                            data: model,
                            serviceId: collection.get('id'),
                            success: function (response) {
                                Object.keys(response.data).forEach(function (key) {
                                    modelBinding.set(key, response.data[key]);
                                });
                            }
                        });
                    }
                });
            });

            // add local data
            that.getBinding('preferences').addListener('defaultProfileId', function (profileId) {
                localStorage.setItem('defaultProfileId', String(profileId));
            });
        },
        pull: function () {
            var that = this,
                ctx = that.getMoreartyContext(),
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
                                        jsonModel._changed = false;
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