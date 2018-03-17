/*
    Update Nanoleaf leaves based on external triggers
    James Botting - jbotting@ctlondon.com

    Gitlab Integration Module
*/

var Common      = require(global.WorkingDirectory+'/Core/Common').Common;
var Request     = require('request');

exports.gitlab = function()
{
    GitlabUrl = "https://yourgitlabserver.com/api/v4/";
    GitlabKey = "private_token for user";
    
    this.getPipelineStatus = function(data, callback)
    {
        var InputData = data.split(","); // Project ID,Branch
        Request(GitlabUrl + "projects/"+ InputData[0] + "/pipelines?ref=" + InputData[1] + "&private_token=" + GitlabKey, { json: true }, (err, res, body) =>
        {
            try
            {
                if( err ) return callback(err, null);
                callback(null, body[0].status);
            }
            catch( Ex )
            {
                callback(Ex.message, null);
            }
        });
    }
};