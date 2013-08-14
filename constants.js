/******************************************************************************

 Z-Way Home Automation Engine
 global constants
 Version: 0.1.1
 (c) ZWave.Me, 2013

 -----------------------------------------------------------------------------
 Author: Gregory Sitnin <sitnin@z-wave.me>
 Description:

******************************************************************************/

var ZWAY_DEVICE_CHANGE_TYPES = {
    0x01: "DeviceAdded",
    0x02: "DeviceRemoved",
    0x04: "InstanceAdded",
    0x08: "InstanceRemoved",
    0x10: "CommandAdded",
    0x20: "CommandRemoved"
};

var ZWAY_DATA_CHANGE_TYPE = {
    0x01: "Updated",       // Value updated or child created
    0x02: "Invalidated",   // Value invalidated
    0x03: "Deleted",       // Data holder deleted - callback is called last time before being deleted
    0x40: "PhantomUpdate", // Data holder updated with same value (only updateTime changed)
    0x80: "ChildEvent"     // Event from child node
};
