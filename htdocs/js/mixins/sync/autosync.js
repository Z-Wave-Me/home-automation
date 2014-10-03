define([], function () {
    "use strict";

    return ({
        init: function () {
            var that = this,
                ctx = this.getMoreartyContext(),
                defaultBinding = ctx.getBinding().sub('default'),
                servicesBinding = ctx.getBinding().sub('services'),
                dataBinding = ctx.getBinding().sub('data'),
                collections = servicesBinding.sub('collections');

            // add collection
            /*collections.val().forEach(function (collection) {
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
                                    if (model[key] !== response.data[key] && !isObject(modelBinding.val(key))) {
                                        modelBinding.set(key, response.data[key]);
                                    } else if (isObject(model[key]) && !this.equal(modelBinding.val(key), response.data[key])) {
                                        modelBinding.set(key, response.data[key]);
                                    }
                                });
                            }
                        });
                    }
                });
            });*/

            // add local data
            that.getBinding('preferences').addListener('defaultProfileId', function (profileId) {
                localStorage.setItem('defaultProfileId', String(profileId));
                var profiles = dataBinding.sub('profiles');

                var filter = profiles.val().filter(function (profile) {
                    return String(profile.get('id')) === String(profileId);
                });

                dataBinding.set('devicesOnDashboard', filter.toArray().length > 0 ? filter.toArray()[0].get('positions') : []);
            });

            dataBinding.addListener('profiles', function (profiles) {
                var activeId = localStorage.getItem('defaultProfileId'),
                    filter = profiles.filter(function (profile) {
                        return String(profile.get('id')) === String(activeId);
                    });

                dataBinding.set('devicesOnDashboard', filter.toArray().length > 0 ? filter.toArray()[0].get('positions') : []);
            });

            dataBinding.addListener('notifications', function () {
                defaultBinding.sub('notifications').set('count', dataBinding.sub('notifications').val().toArray().length)
            })
        },
        pull: function () {
            var that = this,
                ctx = that.getMoreartyContext(),
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
                                    var models = obj.hasOwnProperty('parse') ? obj.parse(response, ctx) : response.data;
                                    dataBinding.update(obj.id, function () {
                                        return Immutable.fromJS(models);
                                    });
                                }

                                if (obj.hasOwnProperty('postSyncHandler')) {
                                    obj.postSyncHandler(ctx, response, dataBinding.sub(obj.id));
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
        },
        equals: function ( x, y ) {
            if ( x === y ) return true;
            // if both x and y are null or undefined and exactly the same

            if ( ! ( x instanceof Object ) || ! ( y instanceof Object ) ) return false;
            // if they are not strictly equal, they both need to be Objects

            if ( x.constructor !== y.constructor ) return false;
            // they must have the exact same prototype chain, the closest we can do is
            // test there constructor.

            for ( var p in x ) {
                if ( ! x.hasOwnProperty( p ) ) continue;
                // other properties were tested using x.constructor === y.constructor

                if ( ! y.hasOwnProperty( p ) ) return false;
                // allows to compare x[ p ] and y[ p ] when set to undefined

                if ( x[ p ] === y[ p ] ) continue;
                // if they have the same strict value or identity then they are equal

                if ( typeof( x[ p ] ) !== "object" ) return false;
                // Numbers, Strings, Functions, Booleans must be strictly equal

                if ( ! this.equals( x[ p ],  y[ p ] ) ) return false;
                // Objects and Arrays must be tested recursively
            }

            for ( p in y ) {
                if ( y.hasOwnProperty( p ) && ! x.hasOwnProperty( p ) ) return false;
                // allows x[ p ] to be set to undefined
            }
            return true;
        }
    });
});