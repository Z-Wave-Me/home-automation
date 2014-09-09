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
                dataBinding = ctx.getBinding().sub('data').sub(collectionName);

            id = id || ctx.getBinding().sub('preferences').val().get('leftPanelItemSelectedId');

            return dataBinding.val().find(function (data) {
                return data.get('id') === id;
            });
        }
    };
});
