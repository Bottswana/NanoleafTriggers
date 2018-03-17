#!/usr/bin/nodejs

/*
    Update Nanoleaf leaves based on external triggers
    James Botting - jbotting@ctlondon.com
*/

// Version Information
global.WorkingDirectory = 'C:\\Users\\James\\Desktop\\nanoleaf_monitoring';
global.Version = '1.0.0';

// Nothing user configurable below this line \\
var Common = require(global.WorkingDirectory+'/Core/Common').Common;
var Worker = require(global.WorkingDirectory+'/Core/Worker').Worker;

// Load Settings
Common.log(1, "Init", "Initialising Nanoleaf Controller v" + global.Version);
Common.Settings = Common.loadSettings();
if( Common.Settings === false ) return;

// Start Background Work
setInterval(Worker.runInterval, Common.Settings['poll-interval']);
return true;