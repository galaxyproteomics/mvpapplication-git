/**
 * Module for basic SQL queries against galaxy.
 * @type {{}}
 */
var gQuery = {

    href: null,
    dataSetID: null,

    query: function(sql, callBackFN){
        var url = gQuery.href;
        url += '/api/datasets/' + gQuery.datasetID +
            '?data_type=raw_data&provider=sqlite-table&headers=True&query=';
        url += sql;

        $.get(url, function (data) {
            callBackFN(data);
        }).fail(function(jqXHR) {
            alert( "ERROR: query \n" + jqXHR.responseText + " \nfailed.");
        });

    },

    init: function(confObj) {
        gQuery.href = confObj.href;
        gQuery.datasetID = confObj.datasetID;
    }
}
