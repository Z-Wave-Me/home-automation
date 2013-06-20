#Z-Way Automation API

##Common request format

Every API request has standard URL prefix: http://automationServerIp:port/api

Every API request will return valid JSON object with the two root keys — `error` and `data`.

For the succesful request, error always a null and data always a valid JSON object itself.

As instance:

    {
        error: null,
        data: "OK"
    }

For the errorneous request, error always a valid JSON object with two keys — `code` (containing integer value with the error code) and `msg` (containing string which describes an error in a human-readable form). In this case, `data` field MAY be null or contain additional information about a problem.

As instance:

    {
        error: {
            code: 500,
            msg: "Unknown system error"
        },
        data: null
    }

## General

### GET /ui.json

Will return complete UI metadata (instances, actions, devices and widgets) in one dictionary.

### GET /events.json[?since=${UnixTimestamp}]

Will return list of public events since `${UnixTimestamp}` (default is 0, which means "all"). Timestamp SHOULD be in the UTC timezone.

## Instances

### GET /instances/

Will return metatada of every single module instance currently running in the system.

### GET /instances/${instanceId}

Will return single module metadata identified by ${id} variable

### GET /instances/${instanceId}/actions/

Will return list of the instance (identified by ${instanceId} variable) actions with their metadata

### GET /instances/${instanceId}/actions/${actionId}

Will return instance (identified by ${instanceId} variable) action (identified by ${adctionId}) metadata

### POST /instances/${instanceId}/actions/${actionId}

Will perform instance action.

Action payload comes in the form of POST-arguments (in the body).

## Devices

### GET /devices/

Will return metatada of every single virtual device currently registered in the system.

### GET /devices/${id}

Will return single device metadata identified by ${id} variable

## Widgets

### GET /widgets/[?dashboard=false]

Will return metatada of every single widget currently registered in the system. If `dashboard` GET-argument is set to true, will return widgets which is set on the dashboard.

### GET /widgets/${id}

Will return single widget metadata identified by ${id} variable

