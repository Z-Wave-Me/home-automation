define([
    // libs
    'react',
    'morearty',
    // components
    './_main',
    './general/main_general',
    './rooms/main_rooms',
    './rooms/_main_rooms_general',
    './rooms/_main_rooms_devices',
    './widgets/main_widgets',
    './automation/main_automation',
    './_base_button',
    './_base_children_navigation',
    './_base_left_panel',
    './_base_search',
    './../mixins/base_mixin'
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
    // mixins
    base_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin],
        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                preferencesBinding = this.getBinding('preferences'),
                dataBinding = this.getBinding('data'),
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
                // leftpanel
                activeNode[0].options.leftPanel ? _.div({className: 'left-panel-container'},
                    // search
                    activeNode[0].options.searchPanel ?
                        _base_search({binding: preferencesBinding})
                        : null,
                    // list block
                    _base_left_panel({binding: { default: binding, data: dataBinding, preferences: preferencesBinding }}),
                    // buttons
                    activeNode[0].options.buttons ?  _base_button({ binding: { default: preferencesBinding}}) : null
                ) : null,
                // right panel
                _.div({className: activeNode[0].options.leftPanel ? 'right-panel-container' : 'panel-container'},
                    // children panel
                    activeNode[0].hasOwnProperty('children') && activeNode[0].children.length > 0 && activeNode[0].id !== 1 ?
                        _base_children_navigation({binding: preferencesBinding})
                        : null,
                    // main component
                    components[activeNode[0].options.componentName]({
                        binding: {
                            default: binding,
                            data: dataBinding,
                            preferences: preferencesBinding
                        }
                    })
                )
            );
        }
    });
});
