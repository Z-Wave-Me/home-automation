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
        addModelToCollection: function (collection, model) {
            collection.update(function (collection) {
                collection.push(Immutable.Map(model.val().toJS()));
            });
        },
        getItem: function (serviceId, itemId) {
            var ctx = this.getMoreartyContext(),
                preferences = ctx.getBinding().sub('preferences'),
                filterObject = ctx.getBinding().sub('services').sub('collections').val().toArray().filter(function (service) {
                    return serviceId === service.get('id');
                }),
                service = Array.isArray(filterObject) && filterObject.length > 0 ? filterObject[0].toJS() : null,
                default_model_options = service ? service.model.defaults : null;

            if (preferences.val('activeNodeTreeStatus') === 'add') {
                preferences.set('temp', Immutable.Map(default_model_options));
                return preferences.sub('temp');
            } else {
                return this.getModelFromCollection(itemId || null, serviceId);
            }
        },
        getActiveProfile: function () {
            var ctx = this.getMoreartyContext(),
                activeId = localStorage.getItem('defaultProfileId'),
                filter = ctx.getBinding().sub('data').sub('profiles').val().toArray().filter(function (profile) {
                    return String(profile.get('id')) === String(activeId);
                }),
                index;

            if (filter.length > 0) {
                index = ctx.getBinding().sub('data').sub('profiles').val().toArray().indexOf(filter[0]);
                return ctx.getBinding().sub('data').sub('profiles').sub(index);
            } else {
                return null;
            }
        },
        showInDashBoard: function (deviceId) {
            var profile = this.getActiveProfile();
            if (profile) {
                return profile.val('positions').indexOf(deviceId) !== -1;
            } else {
                return false;
            }
        },
        updateObjectAsNamespace: function (dataObject) {
            var that = this;

            function r(obj) {
                for (var property in obj) {
                    if (obj.hasOwnProperty(property)) {
                        if (typeof obj[property] == "object") {
                            r(obj[property]);
                        } else if (typeof obj[property] === 'string') {
                            if (obj[property].indexOf('namespace') !== -1) {
                                obj[property] = that._getNamespace(obj[property].split(':'));
                            }
                        }
                    }
                }
            }

            r(dataObject);

            return dataObject;
        },
        _getNamespace: function (path) {
            var ctx = this.getMoreartyContext(),
                namespaces = ctx.getBinding().sub('data').sub('namespaces'),
                filter = namespaces.val().toArray().filter(function (namespace) {
                    return namespace.get('id') === path[1];
                }),
                index,
                namespace;


            if (filter.length > 0) {
                index = filter.indexOf(filter[0]);
                namespace = namespaces.sub(index);

                return namespace.val('params').map(function (param) {
                    return param[path[2]];
                });
            } else {
                return null;
            }

        }
    };
});
