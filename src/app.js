
const MVPHelp = {
    'text': '<p class="lead">Purpose</p><p>The Galaxy-based MVP visualization plugin enables viewing of results produced from workflows integrating genomic sequencing data and mass spectrometry (MS)-based proteomics data, commonly known as proteogenomics.  The multi-functional tool allows for organization and filtering of results, quality assessment of tandem mass spectrometry (MS/MS) data matched to peptide sequences, and visualization of data at both the protein and gene level.  A user can, with relatively few keystrokes, filter and order large datasets down to a manageable subset. Due to the tools use of server-side caching, large data sets are handled as quickly as small datasets.</p>' +
    '<p>MVP incorporates the Lorikeet viewer for visualizing MS/MS data as well as the Integrated Genomics Viewer (IGV) for mapping peptide and protein sequences to genomic coordinates, essential for characterizing protein sequence variants arising from gene and transcript variants.</p>' +
    '<p>The starting page provides peptide-centric overview of peptide spectral matches (PSMs) identified using sequence database searching against a protein sequence database, and summarized in a MZSqlite-formatted input file. From this page, a user can carry-out a number of operations, including:</p>' +
    '<ul><li>PSMs linked to unique peptide sequences of interest</li>' +
    '<li>PSMs passing scoring thresholds to ensure quality</li>' +
    '<li>Visualization of MS/MS annotation and quality for selected PSMs</li>' +
    '<li>Mapping PSMs to overall protein sequences</li>' +
    '<li>Mapping protein sequences to genomic coordinates</li>' +
    '<li>Visualization of protein sequence variants comparison to reference protein and gene sequences</li>' +
    '<li>Archiving of PSMs of interest and automated transfer of selected results back to Galaxy for further analyses</li>' +
    '<li>Archiving of visualizations</li></ul>' +
    '<hr><p class="lead">Actions</p><p><dl>' +
    '<dt>ID Scores</dt><dd>Clicking on this button provides a view of the distribution of PSMs for the entire dataset based on false discovery rate (FDR) estimates of the sequence database searching tools used to produce PSMs, if available.  This shows the percent of PSMs passing FDR thresholds dependent on assigned PSM scores. Clicking on the button a second time removes the graph.</dd>' +
    '<dt>ID Features</dt><dd>Clicking on this button generates the list of scoring metrics produced by the sequence database searching software used to generate PSMs.  The user can select the scoring metrics to be shown when examining in detail any PSMs matching to peptide sequences of interest.</dd>' +
    '<dt>Export Scans</dt><dd>Clicking this button automatically exports selected peptide sequences and associated MS/MS data back to Galaxy, where it is shown as a new item in the active History in tabular format</dd>'

};


/**
 * Mediator pattern as main application.
 */
var MVPApplication = (function (app) {
    app.debug = true; //Listen in on event publish
    app.galaxyConfiguration = {};
    app.events = {};
    app.userDefaults = null;

    //Hold some basic defaults. User can override.
    app.app_defaults = {
        "tool_tip_visible": true
    };

    /**
     * Allows objects to subscribe to an event.
     * @param event name
     * @param fn call back function for event
     * @returns {subscribe}
     */
    app.subscribe = function (event, fn) {
        if (!app.events[event]) {
            app.events[event] = [];
        }
        app.events[event].push({
            context: this,
            callback: fn
        });
        return this;
    };

    /**
     * Unsubscribes from the event queue
     * @param event
     * @param fn
     */
    app.unsubscribe = function (event) {
        app.event[event].filter(function (cv) {
            return this === cv.context;
        }.bind(this));
    };


    /**
     * Allows objects to broadcast the occurrence of an event.
     * All subscribers to the event will have their callback functions
     * called.
     *
     * @param event name
     * @returns {*}
     */
    app.publish = function (event) {
        var args, subscription;

        if (!app.events[event]) {
            return false;
        }
        args = Array.prototype.slice.call(arguments, 1);

        if (app.debug) {
            console.log('APP PUBLISH: ' + event + ' ARGS: ' + args);
        }

        app.events[event].map(function (cv) {
            subscription = cv;
            subscription.callback.apply(subscription.context, args);
        });
        return this;
    };

    /**
     * Adds the subscribe and publish functions to an object
     * @param obj
     */
    app.installTo = function (obj) {
        obj.subscribe = app.subscribe;
        obj.publish = app.publish;
        obj.unsubscribe = app.unsubscribe;
    };

    //Load modules
    app.init = function (confObj) {
        this.galaxyConfiguration = confObj;

        $('#dataset_name').text(this.galaxyConfiguration.dataName);

        this.subscribe("ScoreSummaryComplete", function(){
           console.log('Score summary complete, begin table construction');
           ScoreDefaults.init();
           PeptideView.init({
                galaxyConfiguration: this.galaxyConfiguration,
                baseDiv: 'overview_div'
            });

        });

        this.subscribe("FDRDataPrepared", function(){
            $('#fdr_module').removeAttr('disabled')
                .on('click', function(){
                    $('#fdr_div').toggle();
                    $('html, body').animate({
                        scrollTop: ($('#fdr_div').offset().top)
                    },500);
                    $('#fdr_module').tooltip('hide')
                });

        });

        this.subscribe('UserChangedDefaults', function(data){
            Object.keys(data).forEach(function(k){
                console.log('UserChangedDefaults ' + k + " : " + data[k]);
                app.app_defaults[k] = data[k];
                if (k === 'tool_tip_visible') {
                    if (data[k]) {
                        $('[data-toggle="tooltip"]').tooltip();
                    } else {
                        $('[data-toggle="tooltip"]').tooltip('destroy');
                    }
                }

            });
        });

        this.installTo(ScoreSummary);
        this.installTo(PeptideView);
        this.installTo(RenderPSM);
        this.installTo(VerifiedScans);
        this.installTo(PeptideSequenceFilter);
        this.installTo(featureViewer);
        this.installTo(gQuery);
        this.installTo(ScoreDefaults);
        this.installTo(FDRPresentation);
        this.installTo(ScoreFilterModule);
        this.installTo(IGVManager);
        this.installTo(IGVTrackManager);
        this.installTo(BuildHelpPanel);
        this.installTo(ConfigModal);

        ScoreFilterModule.init({});

        gQuery.init({
            href: this.galaxyConfiguration.href,
            datasetID: this.galaxyConfiguration.datasetID
        });

        featureViewer.init({
            galaxyConfiguration: this.galaxyConfiguration,
            baseDiv: 'protein_viewer',
            queryFunc: gQuery.query,
            dbkey: this.galaxyConfiguration.dbkey
        });

        RenderPSM.init({
            galaxyConfiguration: this.galaxyConfiguration
        });


        VerifiedScans.init({
            galaxyConfiguration: this.galaxyConfiguration
        });

        PeptideSequenceFilter.init({
            galaxyConfiguration: this.galaxyConfiguration
        });

        ScoreSummary.init({
            href: this.galaxyConfiguration.href,
            datasetID: this.galaxyConfiguration.datasetID
        });

        IGVManager.init({
            galaxyConfiguration: this.galaxyConfiguration
        });

        IGVTrackManager.init({
           galaxyConfiguration: this.galaxyConfiguration
        });

        if (("protein_detection_protocol" in confObj.tableRowCount)){
            FDRPresentation.init({
                href: this.galaxyConfiguration.href,
                datasetID: this.galaxyConfiguration.datasetID,
                divID: "fdr_div",
                callBackFN: PeptideView.reBuildTable
            });
        }
        $('[data-toggle="tooltip"]').tooltip();

        $('#mvp_help').on('click', function(){
            BuildHelpPanel.showHelp({
                'helpText': MVPHelp.text,
                'title': 'Multi-omics Visualization Platform (MVP) Viewer'
            });
        });

        $('#mvp_full_window').on('click', function(){
            $('#mvp_full_window').tooltip('hide');
            window.open('#', '_blank');
        });

        $('#mvp_config').on('click', function(){
           ConfigModal.showConfig();
        });
    };

    return {
        run: function(confbj) {
            app.init(confbj);
        }
    }

}(MVPApplication || {})); // eslint-disable-line no-use-before-define