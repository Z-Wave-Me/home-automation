define([
    // libs
    'react',
    'morearty',
    // components
    './_base_mixin'
], function (
    // libs
    React,
    Morearty,
    // components
    _base_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, _base_mixin],
        getModels: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                activeNode = this.getActiveNodeTree()[0],
                name = activeNode.options.name,
                itemsBinding,
                items,
                renderModel;

            renderModel = function (item, index) {
                var searchString = binding.sub('preferences').val('searchString').toLowerCase(),
                    title;

                if (name === 'rooms') {
                    title = item.toObject().title;
                } else if (name === 'general') {
                    title = item.toObject().name;
                } else if (name === 'widgets') {
                    title = item.toObject().metrics.title;
                } else if (name === 'automation') {
                    title = item.toObject().params.title;
                }

                if ((searchString.length > 1 && searchString.indexOf(title.toLowerCase()) !== -1) || searchString.length < 2) {
                    return _.li({
                            key: index
                        },
                        title
                    );
                } else {
                    return null;
                }

            };

            if (name === 'rooms') {
                itemsBinding = binding.sub('locations');
            } else if (name === 'general') {
                itemsBinding = binding.sub('profiles');
            } else if (name === 'widgets') {
                itemsBinding = binding.sub('devices');
            } else if (name === 'automation') {
                itemsBinding = binding.sub('instances');
            }

            items = itemsBinding.val();

            return _.ul({ className: 'left-panel-list' },
                items.map(renderModel).toArray()
            )
        },
        render: function () {
            var binding = this.getDefaultBinding(),
                preferences = binding.sub('preferences');

            return this.getModels();
        }
    });
});
