define([], function () {
    'use strict';

    return {
        getCollection: function (collectionName) {
            var ctx = this.getMoreartyContext(),
                dataBinding = ctx.getBinding().sub('data').sub(collectionName);

            return dataBinding;
        },
        getModelFromCollection: function (id, collectionName) {
            var ctx = this.getMoreartyContext(),
                dataBinding;

            id = id || ctx.getBinding().sub('preferences').val().get('leftPanelItemSelectedId');

            dataBinding = this.getCollection(collectionName);

            if (id) {
                var item = dataBinding.val().find(function (data) {
                        return data.get('id') === id;
                    }),
                    index = dataBinding.val().indexOf(item);

                return dataBinding.sub(index);
            } else {
                return null;
            }

        },
        getItem: function (serviceId) {
            var ctx = this.getMoreartyContext(),
                Immutable = ctx.Immutable,
                service = ctx.getBinding().sub('services').sub('collections').val().toArray().filter(function (service) {
                    return serviceId === service.get('id');
                })[0].toJS(),
                adding = ctx.getBinding().sub('preferences').val('activeNodeTreeStatus') === 'adding',
                default_model_options = service.model.default;

            if (adding) {
                return Immutable.Map(default_model_options);
            } else {
                return this.getModelFromCollection(null, serviceId);
            }
        }
    };
});
