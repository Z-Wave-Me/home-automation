/*** Z-Way HA Virtual Device base class ***************************************

Version: 2.0.0
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me> and Stanislav Morozov <morozov@z-wave.me>
Copyright: (c) ZWave.Me, 2013-2014

******************************************************************************/

VirtualDevice = function (options) {

    var probeType = options.defaults.probeType? options.defaults.probeType : (options.overlay.probeType? options.overlay.probeType : ''),
        permHidden = options.defaults.hasOwnProperty('permanently_hidden')? options.defaults.permanently_hidden : false,
        visibility = options.defaults.hasOwnProperty('visibility')? options.defaults.visibility : true,
        customicons = options.defaults.hasOwnProperty('customIcons') ? options.defaults.customIcons : {},
        removed = options.defaults.hasOwnProperty('removed')? options.defaults.removed : false;

    _.extend(this, options, {
        id: options.deviceId,
        accessAttrs: [
            'id',
            'deviceType',
            'metrics',
            'location',
            'tags',
            'updateTime',
            'permanently_hidden',
            'creatorId',
            'h',
            'hasHistory',
            'visibility',
            'creationTime',
            'probeType',
            'customIcons',
            'order',
            'removed'
        ],
        collection: options.controller.devices,
        metrics: {},
        ready: false,
        location: 0,
        tags: [],
        updateTime: 0,
        attributes: {
            id: options.deviceId,
            metrics: this.metrics,
            tags: [],
            permanently_hidden: permHidden,
            location: 0,
            h: options.controller.hashCode(options.deviceId),
            hasHistory: false,
            visibility: visibility,
            creationTime: 0,
            probeType: probeType,
            customIcons: customicons,
            order: {
                rooms: 0,
                elements: 0,
                dashboard: 0
            },
            removed: removed
        },
        changed: {},
        overlay: options.overlay || {},
        defaults: options.defaults || {},
        overlay_metrics: options.hasOwnProperty('overlay') ? options.overlay.metrics : {},
        _previousAttributes: {}
    });

    if (options.hasOwnProperty('overlay')) {
        delete options.overlay.metrics;
    }


    if (!!this.collection) {
        this.cid = _.uniqueId('c');
    }

    if (!!options.moduleId) {
        this.attributes.creatorId = options.moduleId;
    }

    this.initialize.apply(this, arguments);
    return this;
};

function inObj(obj, arr) {
    var result, findObj;

    while (arr.length > 0) {
        findObj = result === undefined ? obj : result;
        if (findObj.hasOwnProperty(arr[0])) {
            result = findObj[arr[0]];
        } else {
            break;
        }

        arr.shift();
    }

    return arr.length > 0 ? undefined : result;
}

function setObj(obj, arr, param) {
    var key;

    if (obj) {
        key = arr[0];
        arr.shift();
        if (arr.length === 0) {
            obj[key] = param;
        } else if (obj.hasOwnProperty(key) && arr.length > 0) {
            setObj(obj[key], arr, param);
        } else if (!obj.hasOwnProperty(key) && arr.length > 0) {
            obj[key] = {};
            setObj(obj[key], arr, param);
        }
    }
    return obj;
}

_.extend(VirtualDevice.prototype, {
    initialize: function () {
        'use strict';
        _.bindAll(this, 'get', 'set');
        _.extend(this.attributes, this.collection.controller.getVdevInfo(this.id));
        _.extend(this.attributes, this.overlay);
        _.defaults(this.attributes, { "metrics" : {} });
        _.extend(this.attributes.metrics, this.overlay_metrics);
        _.defaults(this.attributes, this.defaults); // set default params
        _.defaults(this.attributes.metrics, this.defaults.metrics); // set default metrics

        // set device creation time
        this.setCreationTime();

        this.attributes = this._sortObjectByKey(this.attributes);
        
        // cleanup
        delete this.overlay;
        delete this.overlay_metrics;
        delete this.defaults;
    },
    setReady: function () {
        this.ready = true;
        this.attributes.updateTime = Math.floor(new Date().getTime() / 1000);
    },
    setCreationTime: function() {
        var vDevInfo = this.collection.controller.vdevInfo[this.id];
        
        if (vDevInfo) {
            // check vdevInfo for creation time
            if (vDevInfo.creationTime) {
                this.attributes.creationTime = vDevInfo.creationTime > 0? vDevInfo.creationTime : Math.floor(new Date().getTime() / 1000);
            // add new if it doesn't exist
            } else {
                this.attributes.creationTime = Math.floor(new Date().getTime() / 1000);
            }
        // add new if it doesn't exist
        } else {
            this.attributes.creationTime = Math.floor(new Date().getTime() / 1000);
        }
    },
    get: function (param) {
        'use strict';
        var result;

        if (param.split(':').length === 1) {
            if (this.attributes.hasOwnProperty(param)) {
                result = this.attributes[param];
            }
        } else if (param.split(':').length > 1) {
            result = inObj(this.toJSON(), param.split(':'));
        }

        return result;
    },
    set: function (keyName, val, options) {
        var that = this,
            changes = [],
            current = _.clone(this.attributes),
            prev = this._previousAttributes,
            accessAttrs,
            attrs,
            findObj;

        function findX(obj, key) {
            var val = obj[key];
            if (val !== undefined) {
                return obj;
            }
            for (var name in obj) {
                var result = findX(obj[name]);
                if (result !== undefined) {
                    return obj;
                }
            }
            return undefined;
        }

        options = options || {};
        accessAttrs = options.accessAttrs || that.accessAttrs;

        if (_.isString(keyName) && typeof(val) != "undefined" && keyName.split(':').length === 1) {
            findObj = findX(this.attributes, keyName);
            if (findObj[keyName] !== val) {
                that.attributes[keyName] = val;
                changes.push(keyName);
                that.changed[keyName] = val;
            }
        } else {
            if (_.isString(keyName) && val !== undefined && keyName.split(':').length > 1) {
                setObj(current, keyName.split(':'), val);
                _.extend(that.attributes, current);
                changes.push(keyName);
            } else {
                attrs = _.extend(that.attributes, _.pick(keyName, accessAttrs));
                Object.keys(attrs).forEach(function (key) {
                    if (!_.isEqual(current[key], attrs[key])) {
                        // if metrics has changed go deeper and add change identifier of changed metrics entry
                        if (key === 'metrics') {
                            Object.keys(current[key]).forEach(function (metricsKey) {
                                if (!_.isEqual(current[key][metricsKey], attrs[key][metricsKey])) {
                                    changes.push('metrics:' + metricsKey);
                                }
                            });
                            // push also 'metrics' identifier
                            changes.push(key);
                        } else {
                            changes.push(key);
                        }
                    }
                    if (!_.isEqual(prev[key], attrs[key])) {
                        that.changed[key] = attrs[key];
                    } else {
                        delete that.changed[key];
                    }
                });
            }
        }


        if (!options.silent) {
            if (changes.length) {
                that.attributes.updateTime = Math.floor(new Date().getTime() / 1000);
            }

            changes.forEach(function (key) {
                if (!!that.collection) {
                    that.collection.emit('change:' + key, that, key);
                }
                that.emit('change:' + key, that, key);
            });
        }

        if (!options.setOnly) {
            that.save();
        }
        return this;
    },
    save: function (attrs, options) {
        if (!!attrs) {
            this.set(attrs, options);
        }
        this.collection.controller.setVdevInfo(this.id, this.attributes);
        //this.collection.controller.saveConfig();
        return this;
    },
    toJSON: function () {
        return _.clone(this.attributes);
    },
    destroy: function () {
        this.unlink();
        this.collection.emit('destroy', this);
        this.remove();
    },
    unlink: function () {
        this.collection.remove(this.cid);
    },
    remove: function () {
        this.stopListening();
        return this;
    },
    stopListening: function () {
        this.removeAllListeners();
    },
    init: function () {
        this.setReady();
    },
    deviceTitle: function () {
        return this.attributes.metrics.hasOwnProperty('title') ? this.attributes.metrics.title : this.id;
    },
    deviceIcon: function () {
        return this.metrics.icon = this.deviceType;
    },
    performCommand: function () {
        console.log("--- ", this.id, "performCommand processing:", JSON.stringify(arguments));
        if (typeof this.handler === "function") {
            try {
                return this.handler.apply(this, arguments);
            } catch(e) {
                var langFile = this.controller.loadMainLang();
                this.controller.addNotification("error", langFile.vd_err_virtual_dev + e.toString(), "module", "VirtualDevice");
                console.log(e.stack);
            }
        }
    },
    addTag: function (tag) {
        var tags = this.get('tags');
        tags.push(tag);
        this.set({'tags': _.uniq(tags)});
    },
    removeTag: function (tag) {
        var tags = this.get('tags');
        this.set({'tags': _.without(tags, tag)});
    },
    
    // wrappers for events
    on: function(eventName, func) {
        return this.collection.on(this.id + ":" + eventName, func);
    },
    off: function(eventName, func) {
        return this.collection.off(this.id + ":" + eventName, func);
    },
    emit: function(eventName, that) {
        return this.collection.emit(this.id + ":" + eventName, that);
    },
    _sortObjectByKey: function(o){
        var sorted = {},
            key, a = [];

        for (key in o) {
            if (o.hasOwnProperty(key)) {
                a.push(key);
            }
        }

        a.sort();

        for (key = 0; key < a.length; key++) {
            sorted[a[key]] = o[a[key]];
        }
        return sorted;
    }
});
