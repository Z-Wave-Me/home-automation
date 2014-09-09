define([], function () {
    "use strict";

    return ({
        init: function () {
            var ctx = this.getMoreartyContext(),
                servicesBinding = ctx.getBinding().sub('services'),
                dataBinding = ctx.getBinding().sub('data'),
                collections = servicesBinding.sub('collections');

            collections.val().forEach(function (collection, index) {
                var obj = collection.toJS();

                dataBinding.addListener(obj.id, function (data, previousData) {
                    var obj = data.toJS();

                    obj
                        .filter(function (model) {
                            return model.id === -1 || model._new;
                        })
                        .forEach(function (model) {
                            console.log(model);
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
                var obj = collection.toJS();

                setTimeout(function () {
                    that.fetch({
                        serviceId: obj.id,
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
                    });
                }, obj.delay || 0);
            });
        }
    });
});