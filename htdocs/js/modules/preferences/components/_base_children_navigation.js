define([
    // libs
    'react',
    'morearty',
    // mixins
    './../mixins/base_mixin'
], function (
    // libs
    React,
    Morearty,
    // mixins
    base_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin],
        render: function () {
            var that = this,
                activeNode = this.getActiveNodeTree()[0],
                _ = React.DOM;

            return _.div({ className: 'base-children-component clearfix' },
                _.div({ className: 'children-container' },
                    activeNode.children.map(function (childNode, index) {
                        return _.span({
                            className: childNode.id === activeNode.id ? 'child-node selected' : 'child-node',
                            key: index,
                            onClick: that.setActiveNode.bind(null, childNode.id)
                        }, childNode.options.name.toUpperCase());
                    })
                )
            );
        }
    });
});

