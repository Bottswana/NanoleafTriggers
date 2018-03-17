/*
    Update Nanoleaf leaves based on external triggers
    James Botting - jbotting@ctlondon.com

    Common Functions
*/

var chalk       = require('chalk');
var fs          = require('fs');
var tDate       = new Date();
var fStream     = null;

var Common      = {};
Common.Settings = {};

// Common Functions
Common.loadSettings = function()
{
    try
    {
        var FilePath = global.WorkingDirectory + "/Settings.json";
        if( !fs.existsSync(FilePath) )
        {
            Common.log(3, "Settings", "Unable to load Settings.json. Please create and modify this file before starting!");
            return false;
        }

        var FileData = fs.readFileSync(FilePath, 'utf8');
        return JSON.parse(FileData);
    }
    catch( Ex )
    {
        Common.log(3, "Settings", "Unable to load Settings.json: " + Ex.message);
        return false;        
    }
}

Common.saveSettings = function()
{
    try
    {
        var FilePath = global.WorkingDirectory + "/Settings.json";
        if( !fs.existsSync(FilePath) )
        {
            Common.log(3, "Settings", "Unable to find Settings.json to save changes.");
            return false;
        }

        var FileData = JSON.stringify(Common.Settings, null, 4);
        fs.writeFileSync(FilePath, FileData, 'utf8');
        Common.log(1, "Settings", "Changes have been saved to Settings.json");
        return true;
    }
    catch( Ex )
    {
        Common.log(3, "Settings", "Unable to update Settings.json: " + Ex.message);
        return false;        
    }  
}

Common.log = function(logLevel, prefix, logMessage)
{
    var logPrefix = "";

    // File Logging
    if( fStream == null )
    {
        fStream = fs.createWriteStream(global.WorkingDirectory + '/Server.log', {flags : 'a'});
        Common.log(1, "Init", "Initialized log file: " + global.WorkingDirectory + '/Server.log');
    }

    // Console Logging
    if( logLevel == 0 )         logPrefix = "[" + prefix +"] ";
    else if( logLevel == 1 )    logPrefix = "[" + chalk.green(prefix) + "] ";
    else if( logLevel == 2 )    logPrefix = "[" + chalk.yellow(prefix) + "] ";
    else if( logLevel == 3 )    logPrefix = "[" + chalk.red(prefix) + "] ";

    // Write to console/file
    console.log( logPrefix + logMessage );
    logPrefix = "[" + prefix +"] ";
    fStream.write('[' + tDate.toUTCString() + ']' + logPrefix + logMessage + '\n');
}

exports.Common = Common;