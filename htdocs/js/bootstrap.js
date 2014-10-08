define(['morearty', 'App'], function (Morearty, App) {

    return React.createClass({
        mixins: [Morearty.Mixin],
        componentWillMount: function () {
            this.props.ctx.init(this);
        },

        render: function () {
            var Ctx = this.props.ctx;
            return React.withContext({ morearty: Ctx }, function () {
                return App({
                    binding: {
                        default: Ctx.getBinding().sub('default'),
                        preferences: Ctx.getBinding().sub('preferences'),
                        services: Ctx.getBinding().sub('services'),
                        data: Ctx.getBinding().sub('data')
                    }
                });
            });
        }
    });
});