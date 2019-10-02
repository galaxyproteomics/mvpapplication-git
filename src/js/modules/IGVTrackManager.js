

/**
 * User can add tracks to IGV. These tracks are data entries in the current Galaxy history.
 * This code manages interactions betweem user and Galaxy history.
 */
var IGVTrackManager = (function(itm){

    itm.validTrackTypes = ['bed', 'gff', 'gff3', 'gtf', 'wig', 'bigWig', 'bedGraph', 'bam', 'vcf', 'seg'];
    itm.trackGroups = {'bed': 'annotation', 'gff': 'annotation', 'gff3': 'annotation', 'gtf': 'annotation',
        'wig': 'wig', 'bigWig': 'wig', 'bedGraph': 'wig', 'bam': 'alignment', 'vcf': 'variant', 'seg': 'seg'};
    itm.galaxyTrackFiles = null;

    itm.queryGalaxyHistory = function() {
        let url = itm.galaxyConfiguration.href +
            '/api/histories/' + itm.galaxyConfiguration.historyID + '/contents/';

        $.get(url, function(data){
            let files = [];
            data.forEach(function(d){
                let obj = {};
                if (Object.keys(d).indexOf('extension') > -1 && d.visible) {
                    if (IGVTrackManager.validTrackTypes.indexOf(d.extension.toLowerCase()) > -1) {
                        obj.id = d.id;
                        obj.name = d.name;
                        obj.sourceType = d.extension;
                        obj.trackGroup = itm.trackGroups[d.extension.toLowerCase()];

                        if (d.extension.toLowerCase() === 'bam') {
                            obj.indexURL = itm.galaxyConfiguration.href + d.url + '/metadata_file?metadata_file=bam_index';
                        }

                        files.push(obj);
                    }
                }
            });
            itm.galaxyTrackFiles = files;
            itm.publish("ValidTrackFilesAvailable", itm.galaxyTrackFiles);
        });
    };

    itm.init = function(confObj){

        itm.galaxyConfiguration = confObj.galaxyConfiguration;

        itm.subscribe("NeedValidTrackFiles", function(){
            if (itm.galaxyTrackFiles) {
                itm.publish("ValidTrackFilesAvailable", itm.galaxyTrackFiles);
            } else {
                itm.queryGalaxyHistory();
            }
        });
    };

    return itm;
}(IGVTrackManager || {}));//eslint-disable-line no-use-before-define