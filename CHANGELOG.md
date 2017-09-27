#27.09.2017 v2.3.6
Changes:
* show more logs on ZWaveBinding error
* Refactored PacketLog to make it work faster and take smaller RAM/FLASH
* add location title in front of device names within module configuration dropdowns
* Modified MobileAppSupport and LogicalRules apps to push user defined notifications
* add rain and co sensor types
* updated underscore.js to v1.8.3,
* add auto installer for E-Mail Me instance (is added automatically after z-way f/w upgrade if e-mail under My Settings was set and no instance is already existing)
* E-Mail Me instance is added automatically during initial setup - e-mail is set during initial login
* add "zway_parsedPackets.json" to blacklists, to be ignored during backup / restore
* add topology restore flag to ZAutomation restore api
* add support for fan and siren (pull request #439 by maros)
* add removed flag to vDevs
* add vDevs of failed nodes will be marked as metrics.isFailed:true now
* nodes with WakeUp CC - except portable remotes - will be checked once a day if they are failed (no wake up during a specific interval)
* add filterByNode() and filterByCreatorId() to DeviceCollection.js
* add modules to support Technaxx TX65, TX66, TX67 cams 
* add spanish translation
* postfix.json updated (changed or added):
  * Popp 10 year smoke detector with siren
  * Fibaro Door/Window Sensor G5
  * Popp Thermostat
  * Philio PST02-5B Motion Sensor
  * Philio PAT02-5C Flood Sensor
  * Foxx Project Range Extender
  * Foxx Project Smart Switch Gen5
  * WiDom Universal Double Switch
  * MCO Home Fan Coil Thermostat (4-pipe)
  * MCO Home Fan Coil Thermostat (2-pipe)
  * TKB Plug Dimmer French
  * Fibaro Door/Window Sensor G3
  * Fibaro Single Switch 2
  * Fibaro Double Switch 2
  * NodOn Micro Smart Plug
  * Aeotec Door/Window Sensor Gen5
  * Popp Water Sensor
  * Qubino Dimmerinsert 0-10V
  * Aeotec Home Energy Meter - Gen5
  * PAN16 Smart Energy Plug In Switch
  * Eurotronic Spirit
  * EVERSPRING ON/OFF Switch/Screw-In
  * Aeotec Smart Switch 6
  * Philio Motionsensor
  * Fibaro Dimmer 2
  * Aeotec Heavy Duty Switch
  * MCOHome Thermostat MH7-WH-EU
  * Aeotec WallMote Quad
  * POPP Plug Dimmer
  * Aeotec WallMote Dual
  * TKB Plug Dimmer German
  * Fibaro Keyfob
  * Fibaro Wall Plug FGWPx-102
  * Fibaro Universalsensor with Binary Input
  * Popp Wall Plug Switch Outdoor IP44
  * Popp Flow Stop
  * Qubino Relay Insert 1*2,3 kW
  * Vision Shock Sensor
  * Popp Radiator Thermostat
  * AEOTEC LED BULB
  * Qubino RGBW Dimmer
  * Vision DC/AC Power Siren
  * Danfoss Radiator Thermostat
  * Fibaro RGBW Module
  * Vision Security Siren G5
  * Qubino Weatherstation
  * Domitech ZBulb
  * Z-Wave.Me Wall Remote
  * POPP Wall_C Forever - Wall Remote
  * MCOHome Thermostat MH7-EH-EU
  * Aeotec Nano Switch 1 Relay
  * Aeotec Home Energy Meter - Gen5
  * Aeotec Nano Dimmer ZW111
  * Popp Z-Rain
  * Aeotec Nano Switch
  * Z-Wave.Me Funkwandschalter
  * Fibaro CO Sensor
  * Zipato Bulb 2
  * Devolo Door/Window Contact
  * Popp Solar Outdoor Siren
  * Qubino PWM Thermostat
  * WiDom Energy Driven Switch S/C
  * Secure Water Meter
  * Qubino Flush 1 Relay
  * Qubinio Flush2 Relays
  * TKB Home Wall Plug Switch
  * MCO Home MH-S314 EU (UK)
  * MCO Home CO2 Monitor
  * MCO Home MH-S412
  * MCO Home MH-S411
  * MCO Home MH-S412 UK
  * Philio 2-in-1 Sensor - Temperature and Humidity
  * Philio 3-in-1 Sensor - Flood, Temperature and Humidity
  * Qubino Roller Shutter Insert 2*1 kW with energy meter
  * Qubino Dimmerinsert with energy meter
  * Qubino Roller Shutter Insert 12-24V DC
  * Philio Relay Insert Blind
  * Aeotec LED Strip
  * EverSpring Motion Sensor SP816
  * Fibaro Door/Window Sensor 2
  * MCOHome Thermostat MH7H-XH-EU
  * TKB Home Power Meter Socket
  * Everspring Door/ Window Sensor
  * Philio Double Relay Insert 2*1.5 KW with Metering Function
  * Danfoss Hydronic Controller
  * Secure Z-Wave controlled Boiler Actuator (2 Channels)
  * Secure Electronic Room Thermostat with Temperature Sensor
  * Secure Temperature and Humidity Sensor
  * Popp 10 year smoke detector
  * Vision Door Lock with Handle
  * Vision Garage Door Sensor
  * TKB Digital Heating Thermostat
  * Remotec IR Extender ZXT-120
  * Fakro Electric actuator
  * Everspring mini Plug
  * Aeonlabs Minimote
  * Aeonlabs Minimote
  * POPP Keypad

Fixes:
* fixed LimitedArray class
* fix rssi output
* fix endless timeout entries of reorganization
* fix #442: Uncaught TypeError: Cannot read property 'filter' of undefined when getting notifications
* ZWave: fix not working set of old multilevel value
* ZWave: fixed that value and parameter not managed to 0
* fix not working Hide and hasHistory of elements is after z-way restart
* fix deleting room sensors from location is vdev moved to new location
* fix dublicated id's if instances are cloned
* limit max size of notifications to 2500. Old limit (5000) allowed file size over 1MB that resulted in complete cleared file after z-way restart
* fix d&d settings are lost after z-way reboot

Modules:
* DeviceHistory:
  * remove listeners on stop
  * fix notification bug in DeviceHistory app
  * remove binary support from DeviceHistory app - it's handles by UI now with a better readable event list
* MobileAppSupport v1.2.2:
  * modified to push user defined notifications
  * add remote/local indentification
* LogicalRules:
  * modified to push user defined notifications
* Camera:
  * add screen URl for new camera view
* ZWave:
  * add rain and co sensor types
  * add replace smoke image with burglar image for burglar events
  * fix not working set of old multilevel values
  * fixed that value and parameter not managed to 0
  * add isFailed flag to zway vDevs
  * add SaveData to save once per hour
* MailNotifier v1.2.0:
  * extend handler to send mails initialized by IfThen and LogicalRule
  * add checkbox to allow using an alternative email address next to the preconfigured addresses in user settings
* LightScene v1.1.1:
  * change icon type gesture to new type scene
* Sonos:
  * Added previous and next song functionality to sonos module (pull request #446 by vuza)
* OpenWeather:
  * Added clouds info to metrics:zwaveOpenWeather (pull request #438 by RobertGebauer)
  * Added optional sunset / sunrise widget (inspired by pull request #229 from manyosit)
* If/Then v2.5.0
  * allow use of mail and push notifications if condition is triggered

CIT:
* fix missing encodeURI
* send language keys for failed login feedback

#28.07.2017 v2.3.5
Changes:
* saving of notifications / z-way data refactored
  * now manged by LimitedArray Constructor
  * notifications file will be cleared on startup if > 1MB - this should avoid z-way-server startup problems 
* enable RSSI check only if implemented
* ZWave
  * ZWave module specific files are now per instance
  * Replaced global vars by local
  * Better Z-Wave Binding restart code to try 10 times
  * save old color for switchRGBW in vdev, save old level for switchMultilevel (probeType: switchColor_soft_white, _cold_white, _red, _green, _blue)
* load Cron as first module, to allow cronjob in ZWave module
* Update IntelHex2bin.js
* add app MobileAppSupport as system-app
* add email.me as system-app
* loadModuleLang refactored
* extract unnecessary files from backup file .zab to reduce size
* remove deprecated saveNotifications() function

Features:
* Support to show html page placed in folder MODULE_NAME/htdocs. You can open html page MODULE_NAME/htdocs/table.html from address: ZAutomation/api/v1/load/modulemedia/MODULE_NAME/table.html
* BE support for background room images
* Utils
  * internet check added
  * string to object parser added (and refactored in HA)
* location added to device-info notifications
* add periodically update of network statistics data
* BE support for Drag and Drop
* BE support for room main sensors (three sensors that can be assigned to room in UI)
* Modules
  * Icons and Title name fix for modules which generate vDevs
* New constructor function LimitedArray added (lib/LimitedArray.js)

Bugfix:
* memory problems caused by huge amount of data
* fix zbw inquery #431
* UZB/RaZ upgrade fixes
* Fix updates of manufacturerId = 0 (Sigma Designs) products
* Fixed IntelHex converter
* Remove QR code update on profile meta data update

ZWaveAPI:
* PacketLog API added

ZAutomationAPI:
* add api to control ntp service
* certfxAuth api added
* move api's zwaveDeviceInfoGet and zwaveDeviceInfoUpdate out of ZWave module into ZAutomation API
* vendor db API added

Modules:
* HTTPDevice
  * Added fields Content type and Data
* InbandNotifications
  * fix undefined scale unit of device info log
  * fix empty level in device-info notification
  * expand device events to include default custom icon information
  * refactored -> remove saving and polling
* ZWave
  * inject zway config to ZWaveAPI
  * expertsettings expanded + API changed
  * zwaveDeviceInfoGet and zwaveDeviceInfoUpdate API's removed
* SmartLight
  * add support for old Z-Wave.Me Dimmers
* IfThen 2.5.0
  * Don't send On command, if device is already turned On, similarly for Off
 
CIT
* authentication added
* profile management added
* system/info API adjusted
* configuration added (ntp, wifi, CIT name, TZ)

# 18.04.2017 v2.3.4
Changes:
* NetworkReorganization API refactored
* widget CloudBackup instruction

Features:
* ZWave: 
  * Added support of probeType GAS and WATER
  
# 27.03.2017 v2.3.1
Changes:
* Added Z-Wave module restart after UZB/RaZberry upgrade
* box reboot refactored
* controller function - get instances by module name added
* Factory reset:
  * add controller state check after SetDefault()
  * exclude 'default' from skin uninstaller
  * add null check to storage cleanup
  * add notification
* saveObject():
  * exclude null entries
* updateBackendConfig:
  * add transformation that removes 'null' entries from storage content list
* User passwords converted to salted hash (sha512)  

Bugfix:
* Fixed crash on title compilation in system with multiple dongles
* refactor error handling of broken or missing config.json / default-config.json
* Fixed bug with door lock status not updated

Features:
* Z-Wave MeterPulse CC support added
* QR code generation for login credentials added

ZWaveAPI:
* CallForALLNIF API added
* TestNode API added
* CheckAllLinks API added
* RSSIGet API added
* NetworkReorganization API added
* GetRorganizationLog API added
* sendZWayReport API added - sends a report including z-way data and last 1000 lines of z-way-server.log
* ZWave Backup API enhancement - optional up to latest 20000 lines of z-way-server.log can be added to backup package

Modules:
* NotificationSMS.ru
  * Added filter for notification level
* PhilioHW
  * improvements
* Correct value 
  * added

# 27.01.2017 v2.3.0
Changes:
* Added password field to all modules which use password field
* pull request #385 from pathec/patch-websocket
* notification api refactored:
  * prepare redeem and delete of single or more notifications
* add possibility to redeem or delete already redeemed notifications (via request params)
* Postfix updated:
 * Philio PST02-5B added
 * Philio Vision PAT02-1A added
 * sensorDiscrete support updated for all CentralScene devices
* fix debug.console
 * deactivated by default
 * JS/Run/controller.debug=true will activate console.debug output
* lib file descriptions updated
* more robust on config.json fault - will use default config.json instead

Bugfix:
* Do not update widgets if type is Invalidated

Features:
* add new device type 'sensorDiscrete'
  * n-state vDev for CentralScene CC
  * handles triggered scene in combination with their current key attribute
* skins api for skins ui feature support:
  * update and install skins from https://developer.z-wave.me
  * delete and apply skins
  * reset skin
* custom icons api for custom icons ui feature support:
  * update and install icon packages from https://developer.z-wave.me
  * upload single icons or custom icon packages locally
  * delete and apply icons
  * icons can be applied depending on device type and there different levels or states
* cloud backup module for cloud backup ui feature support:
  * only adjustable in SHUI under Configuration > Management > Backup & Restore
  * needs deposited e-mail adress of user (Configuration > My Settings)
  * restricted for admin users only
  * could be triggered manually or automatically by configured schedule
  * limited to 3 backups per box (remote id)
  * a request for you cloud backups will verify your email against https://service.z-wave.me/cloudbackup/ and send you a response including accesses to your box backups  
  * this feature is OPTIONAL, so you can still use the already existing backup (Configuration > Management > Backup & Restore > Download backup to your computer) 
* prepare set for timezone api
* prepare ZWaveAPI (ZWaveDeviceInfoGet/ZWaveDeviceInfoUpdate) for DB update of device data
* uploadModule.sh under automation/userModules added to allow upload of packed modules (tar.gz) directly from directory by ssh

ZWaveAPI:
* ZMEFirmwareUpgrade:
  * Added a way to flash ZMEFirmware from local file
* ZMEBootloaderUpgrade:
  * Added a way to flash ZMEBootloader from local file
* Added Access-Control-Allow-* headers
* new:
  * ZWaveDeviceInfoGet ... GET
  * ZWaveDeviceInfoUpdate ... GET

ZAutomation API:
* new:
  * /notifications ... PUT/DELETE
  * /notifications/:notification_id ... PUT/DELETE
  * /skins/tokens ... GET/PUT/DELETE
  * /skins ... GET
  * /skins/install ... POST
  * /skins/update/:skin_id ... PUT
  * /skins/setToDefault ... GET
  * /skins/active ... GET (ANONYMOUS)
  * /skins/:skin_id ... GET/PUT/DELETE
  * /icons ... GET
  * /icons/:icon_id ... DELETE
  * /icons/upload ... POST
  * /icons/install ... PUT
  * /system/timezone ... PUT

Modules:
* ImportRemoteHA 2.0.3
  * add functionality to tag all remote widgets
  * enhance url input to add ip adress only (with backward compatibility)
  * bugfix: vDevs siblings (pull request #393 from xibriz) 
  * bugfix: inherit hidden or dectivated state
  * bugfix: missing probeType
* IfThen 2.4.0
  * add support for Color Switch (in targets)
  * add support for type 'sensorDiscrete' (in actions)
  * bugfix: doesn't decide if on/off was triggered - action is still fired
* ZWave 2.3.0
  * add new device type 'sensorDiscrete'
  * do not update vDev if type is Invalidated
* InbandNotifications 1.1.0
  * add support for type 'sensorDiscrete'
  * some refactorings
* Cron 1.0.0
  * bugfix: initialization
* PhilioHW (POPP Hub 2)
  * no_breath option and WPS LED indication
  * breath off by default
* CloudBackup 0.1.2 beta
  * added to automation/modules
* OpenWeather 1.0.1
  * update open weather url's
* DummyDevice 1.0.1
  * bugfix: NaN on switchMultilevel initialization
  
# 10.11.2016 v2.2.5
* some performance enhancements in CommunicationLogger and CommunicationHistory

# 21.10.2016 v2.2.4

Changes:
* pull request #372
* pull request #342
* update main.js (//--- Load 3d-party dependencies) for HomeGear support
* Postfix - (ZWave module):
 * a lot of  changes in internal postfix logic
 * new configuration possibilities:
  * change device name (new)
  * change device icon (new)
  * change node name (new)
  * hide devices (new)
  * deactivate devices (new)
  * suppress device creation
  * change configuration
  * change CC data
  * app switch controller support
 * app major minor condition changed
 * bugfix for fibaro smoke sensor postfix
 * add postfix error messages, postfix.json updated
* Postfix - (ZWaveAPI):
 * add expertconfig and api ExpertConfigGet + ExperConfigUpdate
 * api's Postfix, PostfixUpdate, PostfixGet, PostfixRemove, PostfixAdd added
* ZAutomation API:
 * allow also req type object as post object in login
 * fix reload of initial getFirstLoginInfo call, add showWelcome entry - affecting (rebootBox, setLogin)

Modules:
* TamperAutoOff:
 * added, workaround for devices that don't deactivate tamper sensor
* RoundRobinScenes:
 * new param added in config
* LightMotionRockerAutocontrol:
 * some bug fixes and improvements
* ZWave:
 * Timing statistics changed according to new IMA data
 * Added support for new bootloader and OTW to 6.70 SDK
 * new sensortypes, seismic, acceleration x, y and z added
* IfThen
 * add Thermostat, SensorMultilevel support
* BindDevices
 * add thermostat support
 * change name to Association
* Notification
 * descriptions adjusted
* AutoLock
 * pull request #319

Fixes:
* Z-Wave-Me/zwave-smarthome #190
* ZWave module:
 * Fixed Communication statistics wrong timestamp
 * Fixed non-working blind stop command
 * fix for: Second Z-Wave module not generate a widgets #369
 * bugfix: cannot read data of undefined / null (incomingPacket)
*RemoteAccess:
 * bugfix: wrong ID after changing real ZBW ID.
* ScheduledScene:
 * fixed bug after adding locks to the list of actions

# 12.07.2016 v2.2.3

Changes:
* Allowing Basic Authentication for Ajax Requests
* language keys updated
* dependency / instance handling:
 * fetch undefined and failed instances to avoid error when they were adressed to global variable
 * rework loaded singleton handling - in-/activate instance will not influence that list 
 * add new installed and added apps also to loadedModules list, to avoid there reinitialization
 * flags of dependency error messages changed
 * filtering in instantiateModules() changed
* remove pushNamespaces() for emit 'destroy'
* CHANGELOG, README, api doc updated

New features:
* Scene support for fibaro swipe added (4 scenes)
* Support fixes added for Philio devices: PST02-5C Door Sensor, PST02-5B Motion Sensor, PAT02-5C Flood Sensor, PSG01 Smoke Sensor
* /system/info api added
* LightMotionRockerAutocontrol module added

Fixes:
* bugfix non working increase / decrease command in device api
* bugfix non loaded modules - double load
* bugfix 'cannot read property meta of undefined' in module initialization 
* minor refactoring of namespace generator

Modules:
* ScheduledScene: added locks support and send Action function
* PhilioHW: vDev added, batery charge timer
* ZWave: alarm probeTypes changed, tamper probe type added, renamed 'door' probe type into 'door-window'

# 11.04.2016 v2.2.2

New features:
* Reset to factory default (load default config, clear storage and userModules, set z-Way controller back to factory default, logout if succesful).
* Reset single device histories.
* Backup / restore of userModules added (Internet connection necessary).
* Welcome widget removed from default configs.

Fixes:
* CodeDevice typo.
* Callback execution error after calling a non existing/registered api.
* Added correct encoding in backup.
* Updating user profiles.
* Issues with set() of virtual devices.
* Too many bindings problem fixed for Alarm CC.
* More error messages internationalized.

Command Classes:
* Removed Basic CC from NIF, Secure NIF and Channel NIF to fit Z-Wave Plus (new in Z-Wave Plus specification).
* MaxCmd in MultiCmd changed to 3 (thanks to buggy Danfoss RS).
* Security Scheme Report value ignored according to spec change (new due to Z-Wave S2).
* MultiChannelAssociation bit address fixed.
* MultiChannelAssociation and Association are now limited by max together (sum of both groups) (clarified in Z-Wave specification).
* Association Remove group=0 fixed according to spec (clarified in Z-Wave specification).

New Command Classes:
* SimpleAVControl

Stability and security fixes:
* Better error handling of broken instances.
* Re-initialization of module refactored:
 * for better error handling
 * instances will be filtered and removed first
 * the module reloaded and all instances created again
 * user will get error output in events
 * instances will not be recreated, if something has broken
* Version handling added, to check which installed App needs to be prefered (already preinstalled apps with higher version have priority).
* Description and instances entries of default configs updated.
* Don't backup/restore notifications.
* instantiateModules() refactored* depending on their dependencies.
* Refactoring creating user profiles.
* Send device in sleep right after inclusion (to save battery).
* Fix bug with keepAwake false on interview force.

API changes:
* Fixed Z-Way to start secure interview if Primary (no SIS) or if SIS itself.
* zway.SetLearnMode and controller.SetLearnMode are back to prior to v2.2.0 syntax with true/false parameter. NWI is handled under the hood.
* Object moduleCategories removed from config.
* Reverted this feature "Request NIF for devices that do not have a valid NIF after loading" (introduced in v2.2.1) due to conflict with Security.
* Added Function Class ExploreRequestInclusion (used internally in SetLearnMode).
* Setting probeType refactored (moved completely in to ZWave module).
* Remove old logic: Ignore SwitchBinary if SwitchMultilevel exists.

Apps:
* SecurityMode: event 'SecurityMode.alert' added by MarioGravel.
* LightScene: Lock support added + minor enhancements.
* RoundRobin: update on itself to allow catching own events.
* RemoteAccess: refactored.
* DeviceHistory: refactored (new handling for scenes, switchControl added).

Debugging tools:
* Debug function zway_fc_application_command_handler_inject (zway.InjectPacket) to inject packet from any device like incoming from Z-Wave.
* Debug zway.SendDataSecure to allow sending commands using Security CC (like zway.SendData but with security forced).
* Default config in automation/defaultConfigs/config.json for factory reset. Can be used to revert to factory default after screwing up.


# 18.02.2016 v2.2.1

UI:
* Enhanced display on mobile devices and tablets.
* Added the ability to customize the device from Devices/Manage.
* Backup and restore.
* Redirect to the APP detail after module instalation.
* Rating, download counter and comments of the Apps.
* Improved modal windows and dropdowns.
* Remember me checkbox on the login page.
* Sorting Elements by title, newest....
* Added icon to deveices list in Events.
* Added stop button to blinds.

Expert UI:
* Network/Controller: Firmware Update page for RaZberry.
* Size of UI optimized.

New features:
* Request NIF for devices that do not have a valid NIF after loading.

Fixes:
* Cannot add email address to user #90
* Climate Control widget displays the correct values.
* List elements error #82.
* Can not install user module from store #87.
* Fixed redirect after post/put a local app.
* Elements are completely refactored.
* Replaced Bootstrap modal windows and dropdowns with Angular.
* Fix zway.devices[X].instances.length problem

Stability and security fixes:
* Fixed SegFault on non-existing CC inside MultiChannel.
* Fixed rare packet buffer corruption.
* Fixed devices data loss on bad data from UZB/RaZberry.
* Backup/restore problems fixed.
* Mark CC in channel as secure if this CC on instance[0] is secure

API changes:
* Authentication process with Secure Login.
* Replaced http protocol with https for external APIs.
* Enable SIS on secondary controller after exclusion


# 12.12.2015 v2.2.0

UI:
* Initial page forces to change default password and add email for password recovery. Password recovery by mail.
* New design for RGB color picker.
* Redesign of Dimmer Element. Has now 3 buttons for off, on/last state, on/full state.
* Events can now be filtered on any device.
* New design on Setup Menu, all Management functions are in single menu element shortening the menu.
* New design for device management. EnOcean UI is only shown if Enocean is active, Setup and Management for all different technologies is unified now.
* Z-Wave management now allows to remove Z-Wave device, either by Exclusion or by Removing a failed node.
* New Info Page gives valuable data for support.
* Dashboard Message improved if dashboard is still empty.
* New design for all elements. They now show the room they are assigned to plus measured values are much larger.
* Description of the bug report function added.
* Menu icons for Elements and Rooms are twisted.
* Whole new design of App store.
 * Now App store is open for third parties.
 * Allow update and delete of apps.
 * Apps are now grouped by theme.
 * Its possible to access private apps using token string.
 * New section "featured" for the most important apps.
* Newly created elements are color marked to find them better.
* New Icons for Thermostats and different other sensor values.
* Elements are now ordered by name.
* Plenty of changes to adapt to different mobile device screen sizes.
* All devices now belong to a room. There is a wildcard room for devices not assigned yet.

Expert UI:
* Showing current license in Expert UI.
* Description of different colors in routing table.
* Complete redesign of Association Settings page.
* Redirection to login page if accessed directly without login.

New features:
* Added support for WebSocket client and server (not on all platforms yet).
* notification2ext modules added to save notifications on external flash.
* Asynchronous DNS resolver for http and sockets not to block JS (not on all platforms yet).
* Support SendData to broadcast (node 255).
* Added JS functions for AssignReturnRoute, AssignSUCReturnRoute, DeleteReturnRoute.

Fixes:
* Restore functionality fixed. Make sure to update bootloader and firmware to 5.04 on UZB and RaZberry before running restore!!!
* Conforms with latest Z-Wave Plus updated specification.
* Fixed missing scales problem for Multilevel Sensors.
* New scales added for Multilevel Sensors.
* Fix incomplete read issue in system() API function.
* Print module js file:line info when compilation error occurs.
* Fixed SerialAPI AddNodeToNetwork and RemoveNodeFromNetwork callback mess. Need firmware 5.04 on UZB and RaZberry.
* ReplaceFailedNode restarts full interview including Security interview.
* ZMEFreqChange current frequency detection bug fixed.
* Compatibility: allow setTimeout(fn, 0) which is used sometimes for deferred callbacks.
* Fixed output of SDK version name of devices and RaZberry/UZB.
* Remote Access rare problems fixed.
* All device are now grouped by namespaces to allow easy selection in App settings.
* OpenWeather now with API Key (according to changed of the service).

New Command Classes:
* MultiChannel v4, MultiChannelAssociation v3, Association v2 support
* ThermostatSetPoint v3

Stability and security fixes:
* More stable interview with Security on slow hardware
* Few potential crash situations fixed

API changes:
* zway.SetLearnMode and controller.SetLearnMode parameter can now be 0, 1 and 2 to support NWI Learn Mode. See docs.
* lastExcludedDevice is now updated AFTER device complete removal and is now also updated in RemoveFailed success callback.


# 04.09.2015 v2.1.1

Command Classes:
* MCAv3 implementation added.
* Updated CC implementation to the latest Z-Wave standards.

New features:
* Frequency request from Z-Wave.Me stick and RaZberry.
* Authentication added to all HTTP requests.
* Device specific fixes applied to device inclusion.to fix minor non-interoperability.
* Add updateOnAction and skipEventIfSameValue flags to HTTPDevice and CodeDevice
* SwitchMultilevel value is repeatedly requested every 2 seconds until value stops changing.

Fixes:
* loadObject problem fixed on Windows.
* getsockname (detection of own IP) fixed.
* Allow named access to command classes even without public functions (like CentralScene or Security).
* Fix inf and nan problem in JSON* now they are null.
* CentralScene added to controller default to allow catch them on controller.
* zway_queue_inspect() call made public.
* NoOperation now is now issuing an isFailed after undelivered packet and it is sent only once to battery devices (to mark as failed).
* Many fixes in EnOcean.
* Show only devices from allowed rooms (don't show unallocated devices),
* Fixed authentication problems with find.z-wave.me and local user.
* Removed status field from modules.
* Fix devices update problem in ZAutomation API.
* Warning (255) battery values mapped to 0
* Fixed Thermostat F scale problem
* LogicalRules Switch on/off action fixed
* Sonos, RGB, SecurityMode modules fixed

UI:
* Easy installation of new modules from online store.
* Thermostats and A/C widgets fixed.
* Many improvements in Smart Home UI and Expert UI.


# 28.06.2015 v2.0.1

Command Classes:
* MultiCmd MaxNum changed to 6

New Command Classes:
* MultiChannel v4 support

Stability and security fixes:
* Don't allow to call secure commands unsecurely.
* Fix Security Scheme Inherit.
* Fix timers issue when clock is adjusted.
* Fix some non-blocking socket issues in sockets.
* Check if device still exists after SendData callback.
* Prevent segfault when unsubscribing data holder callback from within itself
* Restore function on 6.51.03 works again

New features:
* Add remote peer info in WebServer.

UI:
* Remote access management added to Home Automation UI.
* Removed UI selector page, access is possible via direct link or Info Widget


# 29.05.2015 v2.0.1-rc33

Command Classes:
* Make Basic CC mandatory in Secure NIF too
* MultCmd set maxNum in Defaults.xml.
* Ignore supported reports for already interviewed
* SensorBinary/SensorMultilevel command classes (to fix phantom sensors).
* Add 10 sec grace period for SensorMultilevel v1-4 when new sensor types are still accepted.
* Support rfStateCap == 0 in Protection CC to correctly handle devices with no RF protection.
* Update event type parent DH for Alarm/AlarmSensor CC when receiving event reports.

New Command Classes:
* MultiChannel v4 fallback support (supported as v3).

Fixes:
* Fix timers and queue hangs issue when clock is adjusted too much.
* Fix Security scheme inherit logic.
* Fix Alarm v3 event type mask bug.
* Make saveObject() atomic.
* Fix Version CC segfault on version change
* Workaround for devices not removing Security from NIF in usecure inclusion.

Home Automation:
* Notification CC (Alarm v3) renders vDev
* Added Sonos and GlobalCache modules
* Users management and authentication added

New features:
* Made queuing a bit faster: do not NACK job when received SOF while awaiting for ACK, CAN problem fixed.
* JavaScript sockets module now supports non-blocking, asynchronous, multicast, broadcast and reusable sockets.
* JavaScript XML module namespaces support added in findOne/findAll.
* Added possibility to write own V8 extensions. Sample code here: http://razberry.z-wave.me/fileadmin/modsample.tgz
* Added processPendingCallback() call in JS code (to keep callbacks working while handling slow code in JS).
* Add UZB driver to Windows installer

UI:
* Removed Z-Way HA UI and Blue UI.
* Made new Smart Home UI as default HA.


# 03.02.2015 v2.0.1-rc15

Z-Wave Plus certified for US (Certification Number ZC10-15010005).

Support for UZB1 added. Require additional license from license.z-wave.me (not finished yet !!!!!!).

From now Windows is maintained as well.

Command Classes:
* FirmwareUpdate progress added.
* ThermostatSetPoint v3 thermostat modes added.
* ManufacturerSpecific v2 implemented.

New Command Classes:
* MeterPulse
* BarrierOperator
* Hail (used to bypass Lutron patent in some old US devices).

New features:
* Added crypto module to JavaScript: crypto.sha256() and others (see docs).
* Added sockets module to control third party devices via TCP and UDP (like Global Cache or Sonos).
* Allow multi-level form serialization in http.request().
* Add support for HTTP compression of JS responses.
* Serve first pre-gzipped static files if present.
* Sort devices with equal probing score alphabetically (in GuessXML).

Fixes:
* Queueing made more stable. Sleeping secure devices managed better.
* Interview made more stable:
 ** does not restart on Wakeup Notification from the device.
 ** continue interview on device wakeup.
 ** fixed problems with not all sensors rendered for SensorBinary V2.
* Restore fixed on UZB1 and 5th gen RaZberry
* Fixed issue with detached threads in http module.
* Proxy can handle URLs with &. Used for some cameras.
* Adopted latest changes in Apple HomeKit.
* Encoding problems with Unicode in JS API.
* Fixed problem with CRC16 and MultiCmd rendered due to corrupted packets from RF.
* Fixed problem with wrong version of Command Class rendered during interview.
* Fix problems caused by ether noise: ignore supported reports for already interviewed command classes.
* Stability fixes.

Home Automation:
* Support for AlarmSensor (used in Fibaro devices and some others) in HA UI.
* Logical Rules module can be triggered by scenes (not only by device change as previously).

UI:
* Localization added. You can translate Z-Way Homa Automation in your language in automation/lang/ and automation/modules/*/lang/.
* RGB (SwitchColor CC) added to Z-Wave binding
* Many small improvements in Expert UI
* Small fixes in HA UI

API changes:
* SwitchColor CC now have new dataholder structure (same as other CCs with scales and types)
* Added _ prefix to functions from z-commons library bytes_to_* and *_to_bytes to minimize risk of overload by user functions.
* WebSocket API changed: event type added. Server can filter events based on this type before sending to clients.


# 21.11.2014 v2.0.0

Z-Wave Plus certified for EU (Certification Number ZC10-14110009).
Z-Way can work as primary and as secondary controller (to work with other Z-Wave controllers).
A lot of improvements and stability fixes.

Command Classes:
* SensorMultilevel will not create phantom sclaes anymore
* Alarm v2 fixed
* MultiCmd adopted to fix DLC 13 problem
* Security implements inclusion timers for secure inclusion
* SwitchBinary and SwitchMultilevel can now work as device
* NodeNaming UTF16 fixed
* MultiChannel Find Instance implemented
* AGI bugs fixed
* Association/MultiChannelAssociation autoconfig logic changed
* PowerLevel support added

New features:
* Completely new software structure
* HomeKit preliminary support. Waiting for apps in AppStore
* Proxy implemented in the engine to pass thru WebCams and other content via find.z-wave.me
* Websockets support
* Syslog logging support added on Unix/Linux platforms
* Add diagnostic messages in case of data access without a lock (for libzway users)
* Support for new 5th gen UZB dongle and RaZberry (AutoFlashAutoProg, NMV, RFPowerLevel, SendTestFrame functions added)

New Command Classes:
* Proprietary for few devices on the market using it

Minor changes in the API:
* FirmwareUpdate dataholders renamed
* New controller state Resetting assigned during reset to factory process (controller.data.controllerState)
* Replace python-style DataHolders type names in ZDDX and JS:
   ** "NoneType" changed to "empty"
   ** "str" changed to "string"
   ** "str[]" changed to "string[]"
* Data Holder JS property name is now hidden and is not returned in JS output neither in /ZWaveAPI/Data/
* Data Holders C API changes: all "zway_data_*(zway," should be changed to "zdata_*("
* Changed format of config.xml file and command line parameters. Now all Z-Wave related data moved into appropriate JS module
* Functions loadJSON(), saveJSON() and similar moved to fs.loadJSON(), added fs.load() to load any file as string

Fixes:
* SUC/SIS handling enhanced
* Works perfectly as secondary controller
* PowerLevel full support on 5th gen dongles/RaZberries
* AddNodeToNetwork and RemoveNodeFromNetwork cancel hang fixed
* Max packet size handling enhanced
* Answer-as-requested policy implemented to conform Z-Wave Plus (for Security/MultiCmd/CRC16)
* zway.bind with EnumerateExisting fixed
* RemoveFailedNode and ReplaceFailedNode timeout rised

UI:
* New Expert UI. Old Blue UI kept as second option.
* Communication statistics added for more network debugging
* New HA UI improved, more modules added

About New Expert UI:
* More installer friendly
* Works perfectly on tablets
* Multi Channel Associations can be set in a user friendly way like simple Associations
* Communication Statistics for advanced analysis of network stability
* Map removed from this UI
* Firmware Upgrade support

WebServer features:
* It is possible to run many WebServers on different port with different API and handlers
* Proxy support: webserver.proxify(url, target, [user, passwd]) creates transparent redirect
* WebSockets clients can receive notification from WebServer via webserver.push(obj) method


# 26.07.2014 v1.7.2

Fixes and improvements:
* Fix auth parameter in http.request()
* Small Z-Way C core fixes and improvements
* MeterTableMonitor historical data storage fix
* Fix various minor issues in JS code
* Fix DH deletion notification for array values
* Fix memory leak in ZXmlDocument.findOne() and deviceTypeString
* HTTP module: force adding content type for POST requests if not specified
* Do not perform url encoding on http headers
* Added optional timeout (ms) parameter to ZHttp
* Correctly output JS functions as strings when returning from /JS/Run/func
* Fix data holder value setter to work for both "dh.value=xxx" and "dh=xxx"

New features:
* New UI selector
* Function classed for NVM operations for 5th gen dongles (for 6.5x SDK)

Command Classes:
* CentralScene: respond to supported get, return number of scenes from config
* Time: respond with real time offset information, handle time offset report
* ClimateControlSchedule: added Override Get/Set
* Add UserCode SetRaw method for devices pretending user code to be binary.

Minor change in the API:
* givenName added to device dataholder to store names in Expert UI (for future use)
* User Code data holder type now depends on actual code data (bnary or string)
* Always read user code payload if present (even if status is 0)


#18.06.2014 v1.7.1

Fixes and improvements:
* Fix memory leak in http.request().
* Fix issues with too many threads created by many http.request().
* Make v8 debugger not to crash on ZXmlNode objects and on CC access.
* Minor fix of UserCode clear.
* Delivery statistics not recorder for encapsulated packets (only for physicaly sent).
* z-cfg-update can now convert from very config starting from v1.2.
* Improve experience with modern secure door locks inclusion.
* Limited callbacks count on DataHolder from JS not to overkill the server from JS and to easily find bugs in JS code.
* DataHolder callback with notifications for child events fixed.

New features:
* Experimental: v8 remote debugging!

Debugger:
 The debugger is enabled by setting V8_DEBUG environment variable and uses port 8183 (base port + 100).
 Then you can connect either with d8 (./d8*-remote_debugger*-debugger_port=8183) or with node-inspector*-debug-port 8183.


# 23.05.2014 v1.7.0

Fixes and improvements
* Check connectivity button fixed (NoOperation is not removed by Force Interview now).
* Mark Failed Node and Remove Failed Node not always working fixed.
* Blue UI fixes.
* A lot small bugs fixed...

New Command Classes:
* PowerLevel
* Version V2
* FirmwareUpdate
* ZWave+ Info
* AssociationGroupInformation
* DeviceResetLocally
* CRC16
* SwitchColor
* CentralScene

Minor change in the API:
* Controlled only Command Classes are now also saved on server stop and loaded on starup. Allows to bind to dataholders on controlled Command Classes.
* Added .supported datholder to all Command Classes data.
* Battery level 255 is now mapped to 0 (so, 255 will be never seen from now).
* Defaults.xml format changed!!!
* xxxxxxxx-DevicesData.xml changed a bit. Added z-cfg-update utility to update xxxxxxxx-DevicesData.xml to the new format.
* Timeouts rised for AddNodeToNetwork and RequestNodeNeighbourUpdate functions.

New features:
* Log JavaScript files and lines on exceptions for easier debug.
* Log possible exceptions in HTTP.
* Open serial port exclusively to prevent multiple Z-Way or some other software running in parallel.
* Added secureInclusion for unsecure interview (set it to false to include device insecurely)
* Keepalive enabled in Z-Way HTTP server
* Z-Wave+ Associations made only to Life Line group #1
* SensorMultilevel new types implemented.
* Blue UI ZDDX Create button.
* Remote Access and 8084 port for maintainance added to the distribution.


# 13.02.2014 v1.5.0-rc1

New features:
* XML parser in JavaScript with XPath (ZXmlDocument JS object).
* HTTP network operations implemented in JavaScript (http JS object).
* Basic, SwitchBinary and SwitchMultilevel Set events to controller now have srcInstance and srcNode to distinguish sender.

Fixes and improvements:
* Works now on new Raspbian based on 3.10.x kernels too.
* Better network management for large networks.
* Minimize packets flow with Secure nodes (might not work with ald Kwikset doorlock).
* Better packet flow for sleeping secure devices.
* Alarm and UserCode CC minor fixes.
* Basic->SensorBinaryV1 mapping fixed.
* Backup/Restore SDK names fixed.

Minor change in the API:
* bind() now returns just bound function instead of undefined
* Basic dataholders lastset and mylevel removed.
* SwitchBinary level dataholder made boolean.


# 23.10.2013 v1.4.1

New Command Classes are implemented:
* Alarm CC V1-3 supported (no expert UI yet).
* MeterTable CC V2 supported (no expert UI yet).

Minor change in the API:
* SwitchBinary Set value is now boolean. 

New features:
* Communication statistics gathered in devices[N].data.lastPacketInfo

Fixes:
* Sensor Binary fixed to receive changes from devices
* Some fixes in the blue UI
* Minor bug fixes


# 24.09.2013 v1.4

All available UIs are shipped included now. Go to /index.html page to select a UI:
* future UI (in development)
* current UI (old blue for experts)
* old jQuery mobile UI

New Command Classes are implemented:
* ApplicationStatus
* DoorLockLogging
* Indicator
* Meter v3
* Protection v1 & v2
* ScheduleEntryLock
* SensorBinary v2
* SensorConfiguration
* ThermostatFanMode
* ThermostatFanState
* ThermostatOperatingState v2
* TimeParameters

Home automation engine poject started (code in development, stored on https://github.com/Z-Wave-Me/home-automation)

Important API changes:
* loadJSON function added to API to allow load a file from program folder.
* Command Class SensorBinary data tree has changed. Now it contains sensor types like SensorMultilevel.
* SwitchMultilevel commands SetWithDuration and StartLevelChangeWithDuration are removed (Set and StartLevelChange should be used). 
* SwitchMultilevel Set/StartLevelChange are always with duration in C.
* New ChildCreated event on dataholder added to trap new child node cration.
* New JavaScript methods: fs.list(dir) and fs.stat(file).

Fixes:
* ThermostatSetPoint, SensorMultilevel, Meter UserCode improved, some minor problems fixed.
* Full RF power during inclusion/exclusion is restored.
* Thermostat temperature C/F conversion fixed (mostly for US products)

Other features:
* New V8 engine is used for better stability and performance. The code was reworked a lot to become faster and more stable.
* Better logging with log levels (check config.xml).

NB! You need to force interview for all devices with SensorBinary and SensorMultilevel Command Classes.
Go to Device Configuration tab, toggle Expert mode (bottom right corner) and press Force Interview under Advanced actions cut link.

NB! After backup & restore process it is recommended to re-install Z-Way (using same command as to install it).
Otherwise it might not run next time after restore. (due to old config/Defaults.xml comming from old package).

 
# 19.05.2013 v1.3.1

New feature:
* Backup/Restore implemented. You can restore config files only or full Z-Wave topology.
 

# 17.05.2013 v1.3

New features and improvements:
* Full Security support with all certified locks (tested with Kwikset, Vision Security, Yale)
* Communications with Danfoss living connect tuned to stop battery drain by the thermostat (full re-inclusion is required to heal Danfoss living connect!).
* Better performance and memory footprint. We have made major refactor of our Z-Wave engine to make it faster and more memory efficient!
* Better queue handling for failed nodes preventing them from blocking the full queue. Now even unpowered or failed devices in your network will not affect user experience anymore.
* Added public method in C and JS API to check if command class is supported.
* Release information stored in Z-Way library.

New Command Classes:
* MultiChannel v3
* SceneActivation
* SceneControllerConf
* SceneActuatorConf
* Clock
* Time

Bug fixes:
* fix of system() call in JavaScript
* UserCode.Set()
* crash on broadcast Basic.Set
* potential problems with Add/RemoveNodeFromNetwork/ControllerChange/CreateNewPrimary/RemoveFailedNode Function Calls.

Changes in frontend:
* Translations to Spanish, Russia, Deutsch. We will appreciate your help to translate our UI to your language.
* Thermostat UI fixed.

Major changes in software design:
* devices[x].data.ZDDXMLLang and devices[x].data.ZDDXML removed: client must load the file called devices[x].data.ZDDXMLFile.value from the backend and parse the language content.
 
!NB Some devices might require interview force to show properly Expert Commands and configuration parameters!
 

# 29.03.2013 v1.2

New Command Classes:
* SenorMultilevel V5 support (NB! Structure of SenorMultilevel data holder changed for all versions of this Command Class)

New features:
* /ZWaveAPI/Run/[...].data.[...] now returns dataholder tree in same structure as /ZWave/Data/[...]
* shortcuts for CCs on device and instance in JS syntax: you can now write devices[5].Basic.Set(255) instead of devices[5].instances[0].commandClasses.Basic.Set(255)* both "commandClasses" and "instanes[0]" can be omitted

Fixes:
* Unnecessary Command Classes on devices removed
* Queue handling after restart
* Line endings in ZDDX that caused UI to stop working
* More sanity checks to prevent crashes
 

# 04.03.2013 v1.1

New features:
* Z-Wave secure door locks support

New Command Classes:
* Security
* DoorLock
* UserCode

New methods in JavaScript to make more fun with JS. See documentation on documentation RaZberry page.
Minor bug fixes.

# Release 1.0.1 (in progress)

* Removed `actions` and `metrics` properties from the `module.json` of all modules.
* Module classes automatically loaded to the controller. Removed `modules` property from the `config.json`.
* Introduced `skip` property to the `module.json` which instructs AutomationController to skip module class loading.
* Introduced `autoloadPriority` property to the `module.json` which determines automatic module instantiation order (lower** the sooner).
* Introduced `caps` property to the Virtual Device which allows to list device capabilities.
* Widgets moved to the new CommonWidgets module. Creation and registering custom widgets made possible.
* Module's templates and htdocs folders now resides in ./templates/<ModuleName> and ./htdocs/modules/<ModuleName>
* `config.json` existence checking on startup
* New configuration setting `vdevInfo` allows to set human-readable device names and tags
* Introduced icon VDev metric
* Introduced `VirtualDevice.deviceTitle` & `VirtualDevice.deviceIcon` methods
* VirtualDevice now requires `init()` to be called after instantiation
* Widget's htdocs and Module's templates moded outside of the module's folder (for all modules)
* Introduced .caps vDev's property which contains device extended capabilities tags (take a look at BatterPolling module)
* Introduced className property in the widget's meta-description which allows to set custom widget className (essential to custom widgets)
* UI is now capable of showing widgets created and registered by the customer
* Renamed AutomationController.widget* to AutomationController.widgetClass* and changed widget subsystem behaviour to resolve ambiguity
* /ZAutomation/api/widgets/ now replies with widget classes definitions instead of widgets itself. Latter exists and creates only on the client-side, but exact widget's class names described in a vDevs.
* UI Dashboard refactored according to widgets subsystem changes
* Fixed bug with loading ZWaveDoorlockDevice. DoorlockWidget implemented.
* Added `exact` command to the MultilevelSwitch
* SwitchBinary & SwitchMultilevel now has equal deviceType (switch) and different deviceSubTypes
* Added tags and locations subsystems
* Added support multi-profiles
* Added control widgets position
* Refactored API (devices, locations) and added new methods (modules, profiles)

# Release 1.0.0

(initial)
