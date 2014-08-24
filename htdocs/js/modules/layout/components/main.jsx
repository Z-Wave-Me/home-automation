define(['react'], function(React) {

    var MainBlock;

    MainBlock = React.createClass({
        render: function() {
            // JSX code
            return (
                <div id="main-region" className="main wrapper clearfix">
                    <section className="widgets"></section>
                </div>
            );
        }
    });

    /**
     * <MainBlock />
     */

    return React.createClass({
       render: function() {
           // JSX code
           return <MainBlock />;
       }
    });
});