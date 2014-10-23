// This script transforms old formats to new

// Change : to - in vDev names in Z-WaveGate
(function () {
  var config = loadObject("config.json");
  
  if (config) {
    for (var id in config.vdevInfo) {
      var _id = id.replace(/:/g, "-");
      
      if (id.indexOf("Remote_") === 0 || id.indexOf("ZWayVDev_") === 0) {
        config.vdevInfo[_id] = config.vdevInfo[id];
        delete config.vdevInfo[id];
      }
    }
    saveObject("config.json", config);
  }
})();
