define(['react'], function(React) {

    var FooterBlock;

    FooterBlock = React.createClass({
        render: function() {
            // JSX code
            return (
                <footer id="footer-region">
                    <div className="footer-bar">
                        <span className="tools-pen"></span>
                        <span className="title-item">Rearrange and Settings</span>
                    </div>
                </footer>
            );
        }
    });

    /**
     * <FooterBlock />
     */

    return React.createClass({
       render: function() {
           // JSX code
           return <FooterBlock />;
       }
    });
});