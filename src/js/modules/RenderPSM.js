
const LorikeetHelp = {
    'text': '<p class="lead">Purpose</p>' +
    '<p>The <a href="http://uwpr.github.io/Lorikeet/" target="_blank">Lorikeet</a> viewer allows users to view and explore the MS/MS spectra which results in matches to specific peptide sequences.  Annotated MS/MS are shown for peptide sequences clicked on in the PSM Detail for Selected Peptides window, or those generated using the Render button. Lorikeet allows users to select various attributes of peptide MS/MS spectra to annotate (left side) and view a tabular summary peaks matching to selected fragment ions within the spectrum.  More information on Lorikeet is available at <a href="https://github.com/UWPR/Lorikeet" target="_blank">GitHub</a></p>' + 
    '<p>Along the top, you can delete, “thumbs up” or “thumbs down” the scan. Scans receiving a thumbs up assignment are tagged, and can be exported back to Galaxy for further analysis if desired.</p>'
};

/**
 * The lorikeet options instance
 * @constructor
 */
function LorikeetInstance(){

    this.options = {
        "sequence": null,
        "staticMods": [],
        "variableMods": [],
        "ntermMod": 0, // additional mass to be added to the n-term
        "ctermMod": 0, // additional mass to be added to the c-term
        "peaks": [],
        "massError": 0.1,
        "scanNum": null,
        "fileName": null,
        "charge": null,
        "precursorMz": null,
        "ms1peaks": null,
        "ms1scanLabel": null,
        "precursorPeaks": null,
        "precursorPeakClickFn": null,
        "zoomMs1": false,
        "width": 750, 	  // width of the ms/ms plot
        "height": 450, 	  // height of the ms/ms plot
        "extraPeakSeries": [],
        residueSpecificNeutralLosses: false,
        showIonTable: true,
        showViewingOptions: true,
        showOptionsTable: true, //false
        showInternalIonOption: true,
        showInternalIonTable: true,
        showMHIonOption: false,
        showAllTable: false,
        showSequenceInfo: true
    };

}




/**
 *
 *  Module for rendering the PSM to Lorikeet
 *
 *  1 - Find PSMs associated with a list of peptide ids.
 *  2 - User has chosen a score to use for ranking.
 *  3 - Get PSM based on the 'best' scoring for desired score.
 *  4 - Generate Lorikeet MSMS based on 3
 *
 */
var RenderPSM = (function(rpm){

    rpm.currentSpectra = {};
    rpm.renderedSpectra = {};
    rpm.idMapping = {};

    rpm.determineModType = function(arr, type) {
      rVal = [];

      arr.forEach(function(m){
          if (m.modType === type) {
              rVal.push(m);
          }
      });

      return rVal;
    };

    //Determine nature of mod: fixed, variable, cterm or nterm
    rpm.setModTypes = function(currentSpectra, obj){
        let sequenceLength = currentSpectra.sequence.length;
        let mods = [];
        if (currentSpectra.modifications != undefined) {
            mods = currentSpectra.modifications;
        }

        obj.staticMods = [];
        obj.variableMods = [];
        obj.ntermMod = 0; // additional mass to be added to the n-term
        obj.ctermMod = 0; // additional mass to be added to the c-term

        mods.forEach(function(m){
            let residueMod = true;
            let am = {};
            if (m.index === 0) {
                obj.ntermMod += m.modMass;
                residueMod = false;
            }
            if (m.index === sequenceLength + 1) {
                obj.ctermMod += m.modMass;
                residueMod = false;
            }
            if (residueMod) {
                if (m.modType === "fixed") {
                    // Example: [{"modMass":57.0,"aminoAcid":"C"}];
                    am.modMass = m.modMass;
                    am.aminoAcid = m.aminoAcid;
                    obj.staticMods.push(am);
                } else {
                    //Example: [ {index: 14, modMass: 16.0, aminoAcid: 'M'} ]
                    am.index = m.index;
                    am.modMass = m.modMass;
                    am.aminoAcid = m.aminoAcid;
                    obj.variableMods.push(am);
                }
            }
        });

    };

    rpm.renderSpectrum = function(spectrumID){
        var slug = '<div id="#ID#" class="panel panel-info col-md-12" style="background-color: #d9edf7"><div class="panel-heading">' +
            '<div class="row"><div class="col-md-10"><span class="aa aa_header">#PH#</span><span class="glyphicon glyphicon-question-sign lorikeet_help" style="padding: 5px"></span><span class="sr-only">Help?</span></div>' +
            '<div class="col-md-2"<div class="btn-group btn-group-xs" role="group" style="padding-bottom: 5px;">' +
            '<button value="#ID#" spec_id="#SID#" type="button" class="btn btn-default delete-scan"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></button>' +
            '<button value="#ID#" spec_id="#SID#" type="button" class="btn btn-default verify-scan"><span class="glyphicon glyphicon-thumbs-up" aria-hidden="true"></span></button>' +
            '<button value="#ID#" spec_id="#SID#" type="button" class="btn btn-default unverify-scan"><span class="glyphicon glyphicon-thumbs-down" aria-hidden="true"></span></button>' +
            '</div>' +
            '</div><div class="panel-body">#PB#</div></div>';
        var lObj = new LorikeetInstance();

        //Hold a map for  the complicated scan id and title so it is html compliant
        var scanIndex = Object.keys(rpm.renderedSpectra).length + 1;
        rpm.idMapping[scanIndex] = spectrumID;

        slug = slug.replace(/#ID#/g, scanIndex);
        slug = slug.replace(/#SID#/g, spectrumID);
        slug = slug.replace('#PH#', rpm.currentSpectra[spectrumID].sequence);
        slug = slug.replace('#PB#', '<div id="lm_' + scanIndex +'"></div>');
        lObj.scanNum = spectrumID;
        lObj.sequence =  rpm.currentSpectra[spectrumID].sequence;
        lObj.peaks =  rpm.currentSpectra[spectrumID].peaks;
        lObj.width = 750;
        lObj.height = 450;
        lObj.showInternalIonTable = true;
        lObj.showInternalIonOption = true;
        lObj.showAllTable = true;
        lObj.showOptionsTable = true;
        lObj.labelReporters = true;
        lObj.showMHIonOption = true;
        rpm.setModTypes(rpm.currentSpectra[spectrumID], lObj);

        $('#lorikeet_zone').prepend($.parseHTML(slug));
        $('#lm_' + scanIndex).specview(lObj);

        $('.lorikeet_help').on('click', function(){
            BuildHelpPanel.showHelp({
                'helpText':LorikeetHelp.text,
                'title': 'Lorikeet MS/MS Viewer'
            });
        });

        //Wire the review buttons
        $('.unverify-scan').on('click', function(){
            $('#' + $(this).val()).removeClass().addClass('panel panel-danger');
            rpm.publish('userUnverifiedSpectrum', {
                scanID: $(this).attr('spec_id')
            });
        });
        $('.delete-scan').on('click', function () {
            $('#' + $(this).val()).remove();
        });
        $('.verify-scan').on('click', function () {
            $('#' + $(this).val()).removeClass().addClass('panel panel-success');
            rpm.publish('userVerifiedSpectrum', {
                spectrum_title: RenderPSM.renderedSpectra[rpm.idMapping[$(this).val()]].Spectrum_title,
                spectrum_pkid: RenderPSM.renderedSpectra[rpm.idMapping[$(this).val()]].Spectrum_pkid,
                peptide_pkid: RenderPSM.renderedSpectra[rpm.idMapping[$(this).val()]].Peptide_pkid,
                sequence: RenderPSM.renderedSpectra[rpm.idMapping[$(this).val()]].sequence
            });
        });

    };

    rpm.getSequences = function() {
        var sql = 'SELECT peptides.id, peptides.sequence FROM peptides ' +
            'WHERE peptides.id in (##PEPS##)';
        var pepList = '';
        var url = rpm.galaxyConfiguration.href + '/api/datasets/' +
            rpm.galaxyConfiguration.datasetID + '?data_type=raw_data&provider=sqlite-table&headers=True&query=';

        Object.keys(rpm.currentSpectra).forEach(function(k, idx){
            if (idx > 0) {
                pepList += ',"' + rpm.currentSpectra[k].Peptide_pkid + '"';
            } else {
                pepList += '"' + rpm.currentSpectra[k].Peptide_pkid + '"';
            }
        });
        sql = sql.replace('##PEPS##', pepList);
        url += sql;

        $.get(url, function(data){
            var seqByPep = {}
            data.data.slice(1).forEach(function(cv){
                seqByPep[cv[0]] = cv[1];
            });
            Object.keys(rpm.currentSpectra).forEach(function(k){
                rpm.currentSpectra[k].sequence = seqByPep[rpm.currentSpectra[k].Peptide_pkid];
            });

            //Can now actually render the MSMS
            Object.keys(rpm.currentSpectra).forEach(function(k){
                rpm.renderSpectrum(k);
                rpm.renderedSpectra[k] = rpm.currentSpectra[k];
            });
        });
    };

    rpm.getModifications = function(){
        var sql = 'SELECT PM.peptide_ref, PM.location, PM.residue, PM.monoisotopicMassDelta, PM.modType ' +
            'FROM peptide_modifications PM WHERE PM.peptide_ref in (##PEPS##)';
        var pepList = '';
        var url = rpm.galaxyConfiguration.href + '/api/datasets/' +
            rpm.galaxyConfiguration.datasetID + '?data_type=raw_data&provider=sqlite-table&headers=True&query=';

        Object.keys(rpm.currentSpectra).forEach(function(k, idx){
            if (idx > 0) {
                pepList += ',"' + rpm.currentSpectra[k].Peptide_pkid + '"';
            } else {
                pepList += '"' + rpm.currentSpectra[k].Peptide_pkid + '"';
            }
        });
        sql = sql.replace('##PEPS##', pepList);
        url += sql;

        $.get(url, function(data){
            var modsByPepID = {};
            data.data.slice(1).forEach(function(cv){
                var obj = {};
                obj.index = cv[1]; // === 0 ? 1 : cv[1]; 0 means n-term 1 means the first amino acid.
                obj.modMass = cv[3];
                obj.aminoAcid = cv[2];
                obj.modType = cv[4];

                if (!(cv[0] in modsByPepID)) {
                    modsByPepID[cv[0]] = [];
                }
                modsByPepID[cv[0]].push(obj);
            });
            Object.keys(rpm.currentSpectra).forEach(function(k){
                rpm.currentSpectra[k].modifications = modsByPepID[rpm.currentSpectra[k].Peptide_pkid];
            });
            rpm.getSequences();
        });
    };

    rpm.buildPeaks = function(){
        var sqlSlug = 'SELECT scans.mzValues, scans.intensities, scans.spectrumID, scans.spectrumTitle FROM scans \n' +
            'WHERE scans.spectrumTitle = "##SPECTRUM_TITLE##" AND scans.spectrumID = "##SPECTRUM_ID##"';
        //var pepList = '';
        var url = rpm.galaxyConfiguration.href + '/api/datasets/' +
            rpm.galaxyConfiguration.datasetID + '?data_type=raw_data&provider=sqlite-table&headers=True&query=';
        var sql = '';

        Object.keys(rpm.currentSpectra).forEach(function(k, idx){
            if (idx > 0) {
                sql = sql + ' UNION ' + sqlSlug;
            } else {
                sql = sqlSlug;
            }
            sql = sql.replace('##SPECTRUM_TITLE##', rpm.currentSpectra[k].Spectrum_title);
            sql = sql.replace('##SPECTRUM_ID##', rpm.currentSpectra[k].Spectrum_pkid);
        });
        url += sql;

        $.get(url, function(data){
            data.data.slice(1).forEach(function(cv){
                var moz = JSON.parse(cv[0]);
                var intensity = JSON.parse(cv[1]);
                var cPeaks = rpm.currentSpectra[cv[2] + "," + cv[3]].peaks = [];

                moz.forEach(function(cv,idx){
                    cPeaks.push([
                        cv,
                        intensity[idx]
                    ]);
                });

            });
            rpm.getModifications();
        });
    };

    rpm.beginBulkRender = function(obj) {

        var sql = 'SELECT psm_entries.id, psm_entries.spectrumID, psm_entries.spectrumTitle, ' +
            '##MM##(psm_entries."##SCORE##") AS "##SCORE##" ' +
            'FROM psm_entries ' +
            ' WHERE ' +
            ' psm_entries.id IN (##ID_LIST##)' +
            'GROUP BY psm_entries.id';

        var rx_score = /##SCORE##/g;
        var m_m = obj.sortDir === 'ASC' ? 'MIN' : 'MAX';
        var url = rpm.galaxyConfiguration.href + '/api/datasets/' +
            rpm.galaxyConfiguration.datasetID + '?data_type=raw_data&provider=sqlite-table&headers=True&query=';

        var escapedIDs = obj.peptideIDs.split(',').map(function(x){return '"' + x + '"'}).toString();

        sql = sql.replace('##ID_LIST##', escapedIDs);
        sql = sql.replace(rx_score, obj.scoreField);
        sql = sql.replace('##MM##', m_m);

        url = url + sql;
        $.get(url, function(data){
            data.data.slice(1).forEach(function(cv){
                var obj = {};
                obj.Peptide_pkid = cv[0];
                obj.Spectrum_pkid = cv[1];
                obj.Spectrum_title = cv[2]
                rpm.currentSpectra[obj.Spectrum_pkid + "," + obj.Spectrum_title] = obj
            });
            rpm.buildPeaks();
        });
    };

    rpm.beginSinglePSM = function(obj){
        var sql = 'SELECT psm_entries.id, psm_entries.spectrumID, psm_entries.spectrumTitle ' +
            'FROM psm_entries WHERE psm_entries.spectrumID = ##ID## AND psm_entries.spectrumTitle = ##TITLE## ';
        var url = rpm.galaxyConfiguration.href + '/api/datasets/' +
            rpm.galaxyConfiguration.datasetID + '?data_type=raw_data&provider=sqlite-table&headers=True&query=';
        sql = sql.replace('##ID##', '"' + obj.spectrumID + '"');
        sql = sql.replace('##TITLE##', '"' + obj.spectrumTitle + '"');
        url += sql;

        $.get(url, function(data){
            data.data.slice(1).forEach(function(cv){
                var obj = {};
                obj.Peptide_pkid = cv[0];
                obj.Spectrum_pkid = cv[1];
                obj.Spectrum_title = cv[2]
                rpm.currentSpectra[obj.Spectrum_pkid + "," + obj.Spectrum_title] = obj
            });
            rpm.buildPeaks();
        });
    };

    rpm.manageClearing = function() {
        $('#clear_scans').removeAttr("disabled").on('click', function(){
            $('#lorikeet_zone').children().each(function(){$(this).remove()});
            $(this).attr('disabled', 'disabled');
            $('#clear_scans').tooltip('hide');
        });
    };

    rpm.init = function(confObj) {
        rpm.galaxyConfiguration = confObj.galaxyConfiguration;

        rpm.subscribe('renderPSMForPeptide', function(arg){
            rpm.currentSpectra = {};
            rpm.beginSinglePSM({
                peptideID: arg.pkid,
                spectrumID: arg.spectrumID,
                spectrumTitle: arg.spectrumTitle
            });
            rpm.manageClearing();


            $('html, body').animate({
                scrollTop: ($('#lorikeet_zone').offset().top)
            },1000);


        });

        rpm.subscribe('renderBestPSM', function(arg){
            rpm.currentSpectra = {};
            rpm.beginBulkRender({
                peptideIDs: arg.peptideIDs,
                scoreField: arg.scoreField,
                sortDir: arg.sortDir
            });
            $('html, body').animate({
                scrollTop: ($('#lorikeet_zone').offset().top)
            },1000);
            rpm.manageClearing();
        });
    };

    return rpm;

}(RenderPSM || {}));// eslint-disable-line no-use-before-define