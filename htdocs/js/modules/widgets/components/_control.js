define([], function (
    ) {
    'use strict';

    return function (Ctx) {
        return Ctx.createClass({
            render: function () {
                var _ = Ctx.React.DOM,
                    state = this.getState(),
                    item = state.val(),
                    title = item.get('metrics').title;

                return (
                    _.div({className: 'content'},
                        _.span({className: 'title-container'}, title),
                        _.button({className: 'quad-button up-button'}, 'Up'),
                        _.button({className: 'quad-button down-button'}, 'Down')
                    )
                )
            }
        });
    };
});
