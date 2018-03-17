/*
    Update Nanoleaf leaves based on external triggers
    James Botting - jbotting@ctlondon.com

    Example Module
*/

var Common      = require(global.WorkingDirectory+'/Core/Common').Common;

exports.examplemodule = function()
{
    // This is a simple example to show the module implementation methodology
    this.example = function(data, callback)
    {
        callback(null, (data == "1") ? "ok" : "down");
    }
};