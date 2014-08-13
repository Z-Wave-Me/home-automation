(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(["../../../bower_components/jquery/dist/jquery", "underscore", "ractive"], factory);
    } else if (typeof exports === "object") {
        module.exports = factory(require("jquery"), require("underscore"), require("ractive"));
    } else {
        root.drawSpectrograms = factory(root.$, root._);
    }
}(this, function ($, _) {
    // this is where I defined my module implementation
    'use strict';

    var TooltipDecorator;
    //Tooltip decorator
    TooltipDecorator = function ( node, content ) {

        var decorator=this;
        var tooltip, handlers, eventName;

        this.content = content;
        this.className = 'ractive-tooltip';
        this.element = 'p';
        this.offsetX = 0;
        this.offsetY = -20;

        handlers = {
            mouseover: function () {
                // Create a tooltip...
                tooltip = document.createElement(decorator.element );
                tooltip.className = decorator.className;
                tooltip.textContent = decorator.content;

                // ...and insert it before the node
                node.parentNode.insertBefore( tooltip, node );
            },

            mousemove: function ( event ) {
                // Keep the tooltip near where the mouse is
                tooltip.style.left = event.clientX + 'px';
                tooltip.style.top = ( event.clientY - tooltip.clientHeight + decorator.offsetY ) + 'px';
            },

            mouseleave: function () {
                // Destroy the tooltip when the mouse leaves the node
                tooltip.parentNode.removeChild( tooltip );
            }
        };

        // Add event handlers to the node
        for ( eventName in handlers ) {
            if ( handlers.hasOwnProperty( eventName ) ) {
                node.addEventListener( eventName, handlers[ eventName ], false );
            }
        }

        // Return an object with a `teardown()` method that removes the
        // event handlers when we no longer need them
        return {
            teardown: function () {
                for ( eventName in handlers ) {
                    if ( handlers.hasOwnProperty( eventName ) ) {
                        node.removeEventListener( eventName, handlers[ eventName ], false );
                    }
                }
            }
        };
    };

    Ractive.decorators.tooltip = TooltipDecorator;
}));