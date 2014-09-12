define([
    // libs
    'react',
    'morearty',
    // components
    './_main',
    './general/main_general',
    './rooms/main_rooms',
    './widgets/main_widgets',
    './automation/main_automation',
    './_base_button',
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
    _main_widgets,
    _main_automation,
    _base_button,
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
                baseTitle = activeNode[0].options.name.toUpperCase(),
                components = {
                    '_main': _main,
                    '_main_general': _main_general,
                    '_main_rooms': _main_rooms,
                    '_main_widgets': _main_widgets,
                    '_main_automation': _main_automation
                };

            if (preferencesBinding.val('activeNodeTreeStatus') === 'editing') {
                baseTitle += ':EDIT';
            } else if (preferencesBinding.val('activeNodeTreeStatus') === 'adding') {
                baseTitle += ':CREATE';
            } else if (preferencesBinding.val('activeNodeTreeStatus') === 'pending') {
                baseTitle += ':DELETE';
            }

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
                _.div({className: activeNode[0].options.leftPanel ? 'right-panel-container cleafix' : 'panel-container'},
                    activeNode[0].options.leftPanel ? _.h2({ className: 'title-children clearfix'}, baseTitle) : null,
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
