define(['react'], function(React) {

    var HeaderBlock;

    HeaderBlock = React.createClass({
        render: function() {
            // JSX code
            return (
                <header id="header-region" className="wrapper clearfix">
                   <div className="header-box">
                       <span className="title" title="Z-WAVE>ME"><a className="platform-logo" title="Z-WAVE>ME" href="#"></a></span>
                       <nav className="right-nav">
                           <ul>
                               <li className="events-ok"><a className="events-menu" href="#"><span className="tools-sprite ok"></span>Ok</a></li>
                               <li className="events-warning hidden">
                                   <a className="events-menu" href="#">
                                       <div className="circle">
                                           <p className="count">0</p>
                                       </div>
                                       <div className="text">Warning</div>
                                   </a>
                               </li>
                               <li className="events-not-connection hidden">
                                   <a className="events-menu" href="#">
                                       <div className="circle">
                                           <p className="count">✘</p>
                                       </div>
                                       <div className="text">No connection</div>
                                   </a>
                               </li>
                               <li><a className="preferences-button" href="#"><span className="tools-sprite small-gear"></span>Preferences</a></li>
                               <li className="hidden"><a href="#">Sign out (Alexis)</a></li>
                           </ul>
                       </nav>
                       <nav className="top-nav">
                           <ul>
                               <li><a className="active" title="Dashboard" href="#dashboard">DASHBOARD</a></li>
                               <li><a title="Widgets" href="#widgets">WIDGETS</a></li>
                           </ul>
                       </nav>
                   </div>
                   <div className="filters-container clearfix"></div>
                </header>
            );
        }
    });

    /**
     * <HeaderBlock />
     */

    return React.createClass({
       render: function() {
           // JSX code
           return <HeaderBlock />;
       }
    });
});