/*** Z-Way HA Virtual Device base class ***************************************

Version: 2.0.0
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me> and Stanislav Morozov <morozov@z-wave.me>
Copyright: (c) ZWave.Me, 2013-2014

******************************************************************************/

VirtualDevice = function (options) {
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
        ],
        collection: options.controller.devices,
        metrics: {},
        ready: false,
        location: 0,
        tags: [],
        updateTime: 0,
        h: options.controller.hashCode(options.deviceId),
        hasHistory: false,
        visibility: true,
        probeType: getProbeType(options),
        attributes: {
            id: options.deviceId,
            metrics: this.metrics,
            tags: [],
            permanently_hidden: false,
            location: 0,
            h: options.controller.hashCode(options.deviceId),
            hasHistory: false,
            visibility: true,
            probeType: getProbeType(options)
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

function getProbeType(options) {
    //ZWayVDev_zway_3-0-156-0-A
    //ZWayVDev_zway_Remote_23-0-0-1
    //ZEnoVDev_zeno_3_1
    
    this.CC = {
        'SensorBinary': 0x30,
        'SensorMultilevel': 0x31,
        'Meter': 0x32,
        'SwitchColor': 0x33,
        'Alarm': 0x71,
        'AlarmSensor': 0x9c
    };

    var probeType = '',
        cutUndscre = options.deviceId.split('_'),
        cutNbrs = [];

    // looking for probetypes only at Z-Way devices
    if(cutUndscre[0] === 'ZWayVDev') {
        cutNbrs = cutUndscre[cutUndscre.length -1].split('-');

        /*
         * cutNbrs[0] ... nodeId
         * cutNbrs[1] ... instanceId
         * cutNbrs[2] ... commandClassId
         * cutNbrs[3] ... subClassId - necessary for probeType
        */
       
        var ccId = parseInt(cutNbrs[2], 10),
            subCCId = parseInt(cutNbrs[3], 10);
        
        //check for binary sensor (CC 48) subtypes
        if(ccId === this.CC['SensorBinary']){
            var currType = 'general_purpose'; // general_purpose as default

            switch (subCCId) {
                case 2:
                    currType = 'smoke';
                    break;
                case 3:
                    currType = 'co';
                    break;
                case 6:
                    currType = 'flood';
                    break;
                case 7:
                    currType = 'cooling';
                    break;
                case 10:
                    currType = 'door';
                    break;
            }
            
            probeType = currType;
        }

        //check for multilevel sensor (CC 49) subtypes
        if(ccId === this.CC['SensorMultilevel']){
            var currType = '';

            switch (subCCId) {
                case 1:
                    currType = 'temperature';
                    break;
                case 3:
                    currType = 'luminosity';
                    break;
                case 4:
                case 15:
                case 16:
                    currType = 'energy';
                    break;
                case 5:
                    currType = 'humidity';
                    break;
            }
            
            probeType = currType !== ''? currType : probeType;
        }

        //check for meter (CC 50) subtypes
        if(ccId === this.CC['Meter']){
            var types = [
                    'kilowatt_per_hour',
                    '',
                    'watt',
                    'pulse_count',
                    'voltage',
                    'ampere',
                    'power_factor'
                ];
            
            probeType = types[subCCId] !== ''? 'meterElectric_' + ypes[subCCId] : probeType;
        }

        //check for switch color (CC 51) subtypes
        if(ccId === this.CC['SwitchColor']){
            var types = [
                    'soft_white',
                    'cold_white',
                    'red',
                    'green',
                    'blue'
                ];            
            
            probeType = types[subCCId] !== ''? 'switchColor_' + ypes[subCCId] : probeType;
        }

        // check for alarm (CC 113) and alarm sensor (CC 156) subtypes
        if (ccId === this.CC['Alarm'] || ccId === this.CC['AlarmSensor']) {

            var prefSensor = ccId === this.CC['AlarmSensor']? 'Sensor' : '',
                types = [
                    'general_purpose',
                    'smoke',
                    'co',
                    'coo',
                    'heat',
                    'flood',
                    'door',
                    'burglar',
                    'power',
                    'system',
                    'emergency',
                    'clock'
                ];
                
            probeType = 'alarm' + prefSensor + '_' + types[subCCId];
        }
    }
    
    return probeType;
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
            if (findObj[keyName] === val) {
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
                        changes.push(attrs[key]);
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
        this.collection.controller.saveConfig();
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
