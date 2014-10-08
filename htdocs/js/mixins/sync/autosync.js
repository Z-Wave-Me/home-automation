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

            // add local data
            that.getBinding('preferences').addListener('defaultProfileId', function (profileId) {
                localStorage.setItem('defaultProfileId', String(profileId));

                var profiles = dataBinding.sub('profiles'),
                    filter = profiles.val().filter(function (profile) {
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
                    func = (function (callback) {
                        that.fetch({
                            serviceId: obj.id,
                            params: obj.sinceField ? { since: dataBinding.val().get(obj.sinceField) || 0 } : null,
                            success: function (response) {
                                if (callback && typeof callback === 'function') {
                                    callback(response);
                                }
                                if (obj.hasOwnProperty('postSyncHandler')) {
                                    obj.postSyncHandler.call(that, ctx, response, dataBinding.sub(obj.id));
                                } else {
                                    if (response.data) {
                                        var models = obj.hasOwnProperty('parse') ? obj.parse(response, ctx) : response.data;
                                        dataBinding.merge(obj.id, Immutable.fromJS(models));
                                    }
                                }

                                if (collections.sub(index).val('loaded')=== false) {
                                    collections.sub(index).set('loaded', true);
                                    ctx.getBinding().sub('default').sub('system').update('loaded_percentage', function (percantage) {
                                        return percantage + ((1 / collections.val().toArray().length) * 100);
                                    });

                                    if (collections.val().every(function (c) {
                                        return c.get('loaded') === true;
                                    })) {
                                        ctx.getBinding().sub('default').sub('system').set('loaded', true);
                                    }
                                }
                            }
                        })
                    });

                if (obj.autoSync) {
                    setTimeout(func.bind(this, function () {
                        setInterval(function () {
                            if (collections.sub(index).val('loaded')) {
                                func();
                            }
                        }, obj.delay || 1000);
                    }), 0);
                } else {
                    setTimeout(func, obj.delay || 0);
                }
                //setTimeout(func, obj.delay || 0);
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