define([
    // libs
    'react',
    'morearty',
    // components
    './components/base'
], function (
    // libs
    React,
    Morearty,
    // components
    Base
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        componentDidMount: function () {
            var ctx = this.getMoreartyContext(),
                binding = this.getDefaultBinding();

            binding.addListener('overlayShow', function (newValue, oldValue, absolutePath, relativePath) {
                if (newValue) {
                    document.getElementById('body').style.overflow = 'hidden';
                } else {
                    document.getElementById('body').style.overflow = 'auto';
                }
            });

            ctx.History.init(binding.sub('preferences').sub('activeNodeTreeId'), binding.sub('preferences').sub('activeNodeTreeIdHistory'))
        },
        back: function () {
            var ctx = this.getMoreartyContext(),
                binding = this.getDefaultBinding();

            ctx.History.undo(binding.sub('preferences').sub('activeNodeTreeId'), binding.sub('preferences').sub('activeNodeTreeIdHistory'))
        },
        closeOverlay: function () {
            this.getDefaultBinding().set('overlayShow', false);
        },
        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                overlay_show = binding.val('overlayShow'),
                overlay_name = binding.val('overlayShowName'),
                overlay_back_button_enabled = binding.sub('preferences').val('backButtonEnabled');

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
                        overlay_show ? Base({binding: binding}) : null
                    )
                )
            );
        }
    });
});
