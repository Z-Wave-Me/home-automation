define([
    // libs
    'react',
    'morearty',
    // components
    './_main',
    './_main_general',
    './_main_rooms',
    './_main_rooms_general',
    './_main_rooms_devices',
    './_main_widgets',
    './_main_automation',
    './_base_button',
    './_base_children_navigation',
    './_base_left_panel',
    './_base_search',
    './_base_mixin'
], function (
    // libs
    React,
    Morearty,
    // components
    _main,
    _main_general,
    _main_rooms,
    _main_rooms_general,
    _main_rooms_devices,
    _main_widgets,
    _main_automation,
    _base_button,
    _base_children_navigation,
    _base_left_panel,
    _base_search,
    _base_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, _base_mixin],
        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                activeNode = this.getActiveNodeTree(),
                components = {
                    '_main': _main,
                    '_main_general': _main_general,
                    '_main_rooms': _main_rooms,
                    '_main_rooms_general': _main_rooms_general,
                    '_main_rooms_devices': _main,
                    '_main_widgets': _main_widgets,
                    '_main_automation': _main_automation
                };

            return _.div({ className: 'preferences-overlay clearfix' },
                // children panel
                    activeNode[0].hasOwnProperty('children') && activeNode[0].id !== 1 ?
                    _base_children_navigation({binding: binding.sub('preferences')})
                    : null,
                // leftpanel
                activeNode[0].options.leftPanel ? _.div({className: 'left-panel-container'},
                    // search
                    activeNode[0].options.searchPanel ?
                        _base_search({binding: binding})
                        : null,
                    // list block
                    _base_left_panel({binding: binding})
                ) : null,
                // main component
                _.div({className: activeNode[0].options.leftPanel ? 'right-panel-container' : 'panel-container'},
                    components[activeNode[0].options.componentName]({binding: binding})
                )
            );
        }
    });
});
