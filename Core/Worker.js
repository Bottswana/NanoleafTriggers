/*
    Update Nanoleaf leaves based on external triggers
    James Botting - jbotting@ctlondon.com

    Background Worker
*/

var Common      = require(global.WorkingDirectory+'/Core/Common').Common;
var Worker      = { "RunningInstances" : {}, "IntervalRunning": false, "PendingChanges": {} };
var Waterfall   = require('async-waterfall');
var Nanoleaf    = require('nanoleaves');

// Main poll method
Worker.runInterval = function()
{
    if( Worker.IntervalRunning ) return;
    Waterfall(
    [
        function(callback)
        {
            var acceptableConfigs = [];
            Common.Settings.devices.forEach(element =>
            {
                // Validate device information
                if( element['device-ip'] == undefined || element['device-ip'].length <= 0 )
                {
                    // Invalid IP
                    Common.log(2, "Provision", "No IP provided for unit " + element['friendly-name']);
                    return;
                }
                else if( element['token'] == undefined || element['token'].length <= 0 )
                {
                    // Obtain device token
                    Common.log(1, "Provision", "No device token. Obtaining in background. Please hold power button on unit " + element['friendly-name']);
                    Worker.obtainToken(element);
                    return;
                }
                else if( element['leaf-default'].r == undefined || element['leaf-default'].g == undefined || element['leaf-default'].b == undefined )
                {
                    // Invalid default leaf config
                    Common.log(2, "Provision", "Default leaf configuration is nonsense for unit " + element['friendly-name']);
                    return;
                }

                // Start background effect updater
                if( Worker.PendingChanges[element['device-ip']] == undefined )
                {
                    Worker.PendingChanges[element['device-ip']] = {};
                    setInterval(function() { Worker.runEffectUpdater(element); }, 1000);
                }

                // Device valid for main workflow
                acceptableConfigs.push(element);
            });

            // Trigger next part
            callback(null, acceptableConfigs);
        },
        function(Devices, callback)
        {
            if( Devices.length <= 0 ) return callback(null); // Deliberately drop out here
            Common.log(0, "Worker", "Starting background process for configured instances");
            Devices.forEach(element =>
            {
                var TargetLeaf = new Nanoleaf({ host: element['device-ip'], token: element['token'] });
                Common.log(0, "Worker", "Processing instance name: " + element['friendly-name']);
                if( !Worker.RunningInstances[element] ) Worker.handleBackground(element, TargetLeaf);
            });

            // Trigger next part
            callback(null);
        }
    ],
    function(error, result)
    {
        if( error != null ) Common.log(3, "Worker", "Error on main processing loop " + error);
        Worker.IntervalRunning = false;
    });
}

// Obtain a API token for an unregistered nanoleaf
Worker.obtainToken = function(element)
{
    var TargetLeaf = new Nanoleaf({ host: element['device-ip'] });
    TargetLeaf.newToken().catch(t => {}).then(token =>
    {
        if( token == undefined ) return;
        element['token'] = token;

        Common.log(1, "Provision", "Device token aquired for leaf " + element['friendly-name']);
        Common.saveSettings();
    });
}

// Device Background Worker
Worker.handleBackground = function(element, TargetLeaf)
{
    Worker.RunningInstances[element] = true;
    Waterfall(
    [
        function(callback)
        {
            // Fetch leaves in the target device
            TargetLeaf.layout().catch(t => callback(t, null)).then(t => callback(null, t));
        },
        function(leaves, callback)
        {
            if( leaves == undefined ) callback("No data", null);
            var defaultingList = [];
            var leafPosition = 0;

            // Action each leaf in configuration
            element.leaves.forEach(leaf =>
            {
                // Fetch leaf ID
                var leafId = leaves.panels[leafPosition].id;
                leafPosition++;

                // Validate Module & Run
                if( leaf['use-module'] != undefined && leaf['use-module'].length > 0 && leaf['method'] != undefined && leaf['method'].length > 0 )
                {
                    try
                    {
                        var RequireVar2 = require(WorkingDirectory + "/ExternalModules/" + leaf['use-module']);
                        var ActiveModule = new RequireVar2[leaf['use-module']]();
                        if( ActiveModule != undefined )
                        {     
                            var Method = ActiveModule[leaf['method']];
                            if( Method != undefined )
                            {
                                return Method(leaf['data'], function(err, result)
                                {
                                    if( err != null ) return Common.log(3, "Error", "Module failed: " + err);
                                    Worker.handleResponse(result, element, leaf, leafId);
                                });
                            }
                        }
                    }
                    catch( Ex )
                    {
                        Common.log(3, "Error", "Module failed: " + Ex.message);
                    }
                }

                // Set leaf to default as the configuration is invalid or execution failed
                Common.log(2, "Warn", "Configuration invalid for leaf " + leafPosition + " in unit " + element['friendly-name']);
                Worker.PendingChanges[element['device-ip']][leafId] = {
                    r: element['leaf-default'].r,
                    g: element['leaf-default'].g,
                    b: element['leaf-default'].b,
                    transition: 20,
                    id: leafId
                };
            });

            // Default any non-processed leaves
            for( var i=leafPosition; i < leaves.panels.length; i++ )
            {
                Worker.PendingChanges[element['device-ip']][leaves.panels[i].id] = {
                    r: element['leaf-default'].r,
                    g: element['leaf-default'].g,
                    b: element['leaf-default'].b,
                    id: leaves.panels[i].id,
                    transition: 20,
                };
            }

            // Execute any defaulting actions
            callback(null);
        }
    ],
    function(error, result)
    {
        if( error != null ) Common.log(3, "Worker", "Error on processing leaf " + element['friendly-name'] + ", " + error);
        Worker.RunningInstances[element] = false;
    });
}

// Handle Module Response
Worker.handleResponse = function(result, element, leaf, leafId)
{
    var Response = leaf.responses[result];
    if( Response != undefined )
    {
        Worker.PendingChanges[element['device-ip']][leafId] = {
            transition: 20,
            r: Response.r,
            g: Response.g,
            b: Response.b,
            id: leafId
        };
    }
    else
    {
        Worker.PendingChanges[element['device-ip']][leafId] = {
            r: element['leaf-default'].r,
            g: element['leaf-default'].g,
            b: element['leaf-default'].b,
            transition: 20,
            id: leafId
        };
    }
}

// Update all pending changes from various callbacks in a single request per second
Worker.runEffectUpdater = function(element)
{
    var PendingChanges = Worker.PendingChanges[element['device-ip']];
    if( Object.keys(PendingChanges).length <= 0 ) return;

    Worker.PendingChanges[element['device-ip']] = {};
    var ChangeList = [];

    Object.keys(PendingChanges).forEach(key => ChangeList.push(PendingChanges[key]));
    var TargetLeaf = new Nanoleaf({ host: element['device-ip'], token: element['token'] });
    TargetLeaf.setStaticPanel(ChangeList).catch(t => {});
}

exports.Worker = Worker;