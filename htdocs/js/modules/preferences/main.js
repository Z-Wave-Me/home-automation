define([
    // components
    './components/base'
], function (
    // components
    BaseComponent
    ) {
    'use strict';

    return function (Ctx, _options) {
        var that = this,
            options = _options || {},
            Base = new BaseComponent(Ctx);


        return Ctx.createClass({
            componentDidMount: function () {
                Ctx.History.init(state.sub('preferences').sub('activeNodeTreeId'), state.sub('preferences').sub('activeNodeTreeIdHistory'))
            },
            back: function () {
                var state = this.getState();
                Ctx.History.undo(state.sub('preferences').sub('activeNodeTreeId'), state.sub('preferences').sub('activeNodeTreeIdHistory'))
                console.log('Back!');
            },
            closeOverlay: function () {
                var state = this.getState();
                state.set('overlayShow', false);
            },
            render: function () {
                var _ = Ctx.React.DOM,
                    state = this.getState(),
                    overlay_show = state.val('overlayShow'),
                    overlay_name = state.val('overlayShowName'),
                    overlay_back_button_enabled = state.sub('preferences').val('backButtonEnabled');

                return (
                    _.div({
                            className: overlay_show ? ['overlay', 'show'].join(' ') : 'overlay',
                            'data-overlay-name': overlay_name || 'default'
                        },
                        _.div({className: 'overlay-wrapper'},
                            _.div({className: 'overlay-top'},
                                _.div({className: 'overlay-left-top-panel overlay-top-panel'},
                                    _.span({className: overlay_back_button_enabled ? 'overlay-back-button' : 'overlay-back-button hidden', onClick: this.back}, '←')
                                ),
                                _.div({className: 'overlay-center-top-panel overlay-top-panel'},
                                    _.span({className: 'overlay-close-button', onClick: this.closeOverlay}, '✖')
                                ),
                                _.div({className: 'overlay-right-top-panel overlay-top-panel'})
                            ),
                            overlay_show ? Base({state: this.getState()}) : null
                        )
                    )
                );
            }
        });
    }
});
