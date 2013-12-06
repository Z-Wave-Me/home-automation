// Use this as a quick template for future modules
define([
    'jquery',
    'backbone',
    'events'
], function ($, Backbone, Events) {
    'use strict';
    var views = {}, create;

    create = function (context, name, View, options) {
        // View clean up isn't actually implemented yet but will simply call .clean, .remove and .unbind
        if (views[name] !== undefined) {
            views[name].undelegateEvents();
            if (typeof views[name].clean === 'function') {
                views[name].clean();
            }
        }
        var view = new View(options);
        views[name] = view;
        if (context.children === undefined) {
            context.children = {};
            context.children[name] = view;
        } else {
            context.children[name] = view;
        }
        Events.trigger('viewCreated');
        return view;
    };

    return {
        create: create
    };
});
