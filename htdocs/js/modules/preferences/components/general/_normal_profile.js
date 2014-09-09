define([
    // libs
    'react',
    'morearty',
    // components
    '../common/_buttons_group',
    // mixins
    './../../mixins/base_mixin',
    'mixins/data/data-layer'
], function (
    // libs
    React,
    Morearty,
    // components
    _button_group,
    // mixins
    base_mixin,
    data_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin, data_layer_mixin],
        render: function () {
            var binding = this.getDefaultBinding(),
                _ = React.DOM,
                node = this.getModelFromCollection(null, 'profiles'),
                id = node ? node.get('id') : '',
                title = node ? node.get('title') : '',
                description = node ? node.get('description') : '',
                defaultProfileId = this.getBinding('preferences').val().get('defaultProfileId'),
                isActive = id === defaultProfileId,
                cx = React.addons.classSet,
                buttonClasses = cx({
                    'button': true,
                    'disabled': isActive
                });


            return _.div({ className: 'preview-data profile normal-status' },
                _.div({ className: 'data-group'},
                    _.span({ className: 'label-item label-name' }, 'Name'),
                    _.span({ className: 'value-item'}, title)
                ),
                _.div({ className: 'data-group left-group'},
                    _.span({ className: 'label-item label-name' }, 'Description'),
                    _.span({ className: 'label-item label-description' }, description)
                ),
                _.div({ className: 'data-group left-group'},
                    _.button({ className: buttonClasses}, isActive ? 'This is default profile' : 'Make as default profile')
                ),
                _button_group({
                    binding: {
                        default: this.getBinding('preferences'),
                        item: node
                    }
                })
            );
        }
    });
});
