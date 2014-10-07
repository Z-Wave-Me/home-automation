define([
    // libs

    'morearty'
], function (
    // libs
    Morearty
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        render: function () {
            var _ = React.DOM;

            return _.footer({ id: 'footer-region', className: 'clearfix' },
                _.div({className: 'left-button-container'},
                    _.span({className: 'settings-button'}),
                    _.span({className: 'settings-label'}, 'Rearrange & Settings')
                )
            );
        }
    });
});
