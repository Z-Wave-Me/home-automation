define([
    // libs
    '../../../../../../bower_components/react/react-with-addons',
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
                node = this.getModelFromCollection(null, 'locations'),
                id = node ? node.get('id') : '',
                title = node ? node.get('title') : '',
                icon = node ? node.get('icon') : '',
                defaultProfileId = this.getBinding('preferences').val().get('defaultProfileId'),
                isActive = id === defaultProfileId,
                cx = React.addons.classSet;


            return _.div({ className: 'preview-data profile normal-status clearfix' },
                id ? _.div({ className: 'data-group'},
                    _.span({ className: 'label-item label-name' }, 'Id'),
                    _.span({ className: 'value-item'}, id)
                ) : null,
                _.div({ className: 'data-group'},
                    _.span({ className: 'label-item label-name' }, 'Name'),
                    _.span({ className: 'value-item'}, title)
                ),
                _.div({ className: 'data-group left-group'},
                    _.span({ className: 'label-item label-name' }, 'Icon'),
                    _.span({ className: 'value-item label-description' },
                        icon ? _.img( {src: icon, alt: title, title: title}) : 'none'
                    )
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
