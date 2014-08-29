define([
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
    './_base_leftpanel',
    './_base_search',
    './_base_mixin'
], function (
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
    _base_leftpanel,
    _base_search,
    _base_mixin
    ) {
    'use strict';

    return function (Ctx, _options) {
        var that = this,
            options = _options || {},
            components = {},
            _ = Ctx.React.DOM;

        // register components
        [
            // additional components
            ['_base_mixin', _base_mixin],
            ['_main', _main],
            ['_main_general', _main_general],
            ['_main_rooms', _main_rooms],
            ['_main_rooms_general', _main_rooms_general],
            ['_main_rooms_devices', _main_rooms_devices],
            ['_main_widgets', _main_widgets],
            ['_main_automation', _main_automation],
            // element components
            ['_base_button', _base_button],
            ['_base_children_navigation', _base_children_navigation],
            ['_base_leftpanel', _base_leftpanel],
            ['_base_search', _base_search]
        ].forEach(function (component) {
            components[component[0]] = new component[1](Ctx, component[2] || {}, components);
        });

        return Ctx.createClass({
            mixins: [components['_base_mixin']],
            render: function () {
                var state = this.getState(),
                    activeNode = this.getActiveNodeTree();

                return _.div({ className: 'preferences-overlay clearfix' },
                    // children panel
                    activeNode[0].hasOwnProperty('children') && activeNode[0].id !== 1 ?
                        components['_base_children_navigation']({state: state.sub('preferences')})
                        : null,
                    // leftpanel
                    activeNode[0].options.leftPanel ? _.div({className: 'left-panel-container clearfix'},
                        // search
                        activeNode[0].options.searchPanel ?
                            components['_base_search']({state: state.sub('preferences')})
                            : null,
                        // list block
                        components['_base_leftpanel']({state: state.sub('preferences')})
                    ) : null,
                    // main component
                    components[activeNode[0].options.componentName]({state: state})
                );
            }
        });
    }
});
