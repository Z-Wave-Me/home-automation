console.log("Setting web request handler");

function ZAutomationWebRequest (url, request) {
    console.log(request.method + " " + url);

    var response = {
        status: 500,
        headers: {},
        body: "Not implemented, yet"
    }

    var staticUrls = {
        '/': 'asd'
    };

    var dynamicUrls = {

    }

    function requestHandlerFunc (url) {

    }

    if (staticUrls.hasOwnProperty(url)) {
        // handle static url
    } else {
        var handler = requestHandlerFunc(url);
        if (handler) {
            // try to handle dynamic url
        } else {
            response = {
                status: 404,
                headers: {},
                body: "Error 404. File not found"
            }
        }
    }

    return response;
}
