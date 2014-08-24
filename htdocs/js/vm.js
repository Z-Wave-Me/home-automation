// Use this as a quick template for future modules
define([
    'backbone'
], function (Backbone) {
    'use strict';
    var views = {}, create;

    create = function (context, name, View, options) {
        // View clean up isn't actually implemented yet but will simply call .clean, .remove and .unbind
        if (views[name] !== undefined) {
            if (views[name].hasOwnProperty('undelegateEvents')) {
                views[name].undelegateEvents();
            }
            if (views[name].hasOwnProperty('clean')) {
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
        return view;
    };

    return {
        create: create
    };
});
