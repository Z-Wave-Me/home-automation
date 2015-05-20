/*** Sonos Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Implements virtual device based on JavaScript code
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Sonos (id, controller) {
    // Call superconstructor first (AutomationModule)
    Sonos.super_.call(this, id, controller);
}

inherits(Sonos, AutomationModule);

_module = Sonos;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Sonos.prototype.init = function (config) {
    Sonos.super_.prototype.init.call(this, config);

    var self = this;
 
    var vDevP = self.controller.devices.create({
        deviceId: "Sonos_Device_Play_" + this.id,
        defaults: {
            deviceType: "switchBinary",
            metrics: {
                title: 'Sonos Play ' + this.id,
                icon: ""
            }
        },
        overlay: {},
        handler: function (command, args) {
            self.action(command === "on" ? "Play" : "Pause");
        },
        moduleId: this.id
    });

    var vDevV = self.controller.devices.create({
        deviceId: "Sonos_Device_Volume_" + this.id,
        defaults: {
            deviceType: "switchMultilevel",
            metrics: {
                title: 'Sonos Volume ' + this.id,
                icon: ""
            }
        },
        overlay: {},
        handler: function (command, args) {
            var level;
            if (command === "on") level = 100;
            if (command === "off") level = 0;
            if (command === "exact") level = parseInt(args.level, 10);
            self.volume(level);
        },
        moduleId: this.id
    });
};

Sonos.prototype.stop = function () {
    this.controller.devices.remove("Sonos_Device_Play" + this.id);
    this.controller.devices.remove("Sonos_Device_Volume" + this.id);
    
    Sonos.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

Sonos.prototype.action = function (action) {
    http.request({
        async: true,
        headers: {
            'Content-Type': 'text/xml', 
            'SOAPACTION': 'urn:schemas-upnp-org:service:AVTransport:1#' + action  
        },
        url: "http://" + this.config.host + ":1400/MediaRenderer/AVTransport/Control",
        method: 'POST',
        data: '\
            <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">\
                <s:Body>\
                    <u:' + action + ' xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">\
                        <InstanceID>0</InstanceID>\
                        <Speed>1</Speed>\
                    </u:' + action + '>\
                </s:Body>\
            </s:Envelope>',
        error: function(response) {
            console.log("Can not make request: " + response.statusText);
        } 
    });
};

Sonos.prototype.volume = function (level) {
    http.request({
        async: true,
        headers: {
            'Content-Type': 'text/xml', 
            'SOAPACTION': 'urn:schemas-upnp-org:service:RenderingControl:1#SetVolume'
        },
        url: "http://" + this.config.host + ":1400/MediaRenderer/RenderingControl/Control",
        method: 'POST',
        data: '\
            <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">\
                <s:Body>\
                    <u:SetVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1">\
                        <InstanceID>0</InstanceID>\
                        <Channel>Master</Channel>\
                        <DesiredVolume>' + level + '</DesiredVolume>\
                    </u:SetVolume>\
                </s:Body>\
            </s:Envelope>',
        error: function(response) {
            console.log("Can not make request: " + response.statusText);
        } 
    });
};

/*
	public function GetVolume()
	{
		$url = '/MediaRenderer/RenderingControl/Control';
		$action = 'GetVolume';
		$service = 'urn:schemas-upnp-org:service:RenderingControl:1';
		$args = '<InstanceID>0</InstanceID><Channel>Master</Channel>';
		$filter = 'CurrentVolume';
		return $this->Upnp($url,$service,$action,$args,$filter);
	}

device.telephony.on('busy', function () {
    // check state first
    console.log("checking state");
    for (var i in playerIPs) {
        var ip = playerIPs[i];
        console.log("trying to check state", ip);
        device.ajax({
            url: 'http://'+ip+':1400/MediaRenderer/AVTransport/Control',
            type: 'POST',
            headers: {
                'CONTENT-TYPE': 'text/xml; charset="utf-8"',
                'CONNECTION': 'close',
                'SOAPACTION': '"urn:schemas-upnp-org:service:AVTransport:1#GetTransportInfo"'
    
            },
            data: '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:GetTransportInfo xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID></u:GetTransportInfo></s:Body></s:Envelope>'
        }, getPlayerStateRecievedCallback(ip), onPlayerError);
    }
});
*/
