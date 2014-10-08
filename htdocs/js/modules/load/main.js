define([
    // libs
    'morearty'
    // components
    // mixins
], function (
    // libs
    Morearty
    // components
    // mixins
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        render: function () {
            var _ = React.DOM,
                default_binding = this.getDefaultBinding(),
                system_binding = default_binding.sub('system'),
                styles_progress = {
                    width: system_binding.val('loaded_percentage') + '%'
                };

            return system_binding.val('loaded') === false ? (
                _.div({className: 'overlay show'},
                    _.div({className: 'overlay-wrapper'},
                        _.div({className: 'overlay-top'},
                            null
                        ),
                        _.div({className: 'loading-component'},
                            _.div({className: 'header'}, 'Loading'),
                            _.div({className: 'progress-bar'},
                                _.div({style: styles_progress, className: 'progress-activity'})
                            ),
                            _.div({className: 'list-events'},
                                null
                            )
                        )
                    )
                )
            ) : null;
        },
        closeOverlay: function () {

        }
    });
});
