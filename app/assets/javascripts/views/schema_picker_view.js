(function() {
    chorus.views.SchemaPicker = chorus.views.LocationPicker.BaseView.extend({
        constructorName: "SchemaPickerView",
        templateName: "schema_picker",

        events: {
            "click .database a.new": "createNewDatabase",
            "click .database .cancel": "cancelNewDatabase",
            "click .schema a.new": "createNewSchema",
            "click .schema .cancel": "cancelNewSchema"
        },

        subviews: {
            ".data_source": "dataSourceView",
            ".database": "databaseView",
            ".schema": "schemaView"
        },

        buildSelectorViews: function() {
            this.schemaView = new chorus.views.LocationPicker.SchemaView({
                allowCreate: this.options.allowCreate
            });

            this.databaseView = new chorus.views.LocationPicker.DatabaseView({
                childPicker: this.schemaView,
                allowCreate: this.options.allowCreate
            });

            this.dataSourceView = new chorus.views.LocationPicker.DataSourceView({
                childPicker: this.databaseView
            });
            this.registerSubView(this.schemaView);
            this.registerSubView(this.databaseView);
            this.registerSubView(this.dataSourceView);
        },

        setSelectorViewDefaults: function() {
            if(_.isUndefined(this.options.showSchemaSection)) {
                this.options.showSchemaSection = true;
            }

            this.databaseView.hide();
            this.schemaView.hide();

            if(this.options.defaultSchema) {
                this.setSelection('dataSource', this.options.defaultSchema.database().dataSource());
                this.setSelection('database', this.options.defaultSchema.database());
                this.setSelection('schema', this.options.defaultSchema);
                this.dataSourceView.loading();
                this.databaseView.loading();
                this.schemaView.loading();
            } else {
                this.setSelection('dataSource', this.options.dataSource);
                this.setSelection('database', this.options.database);
            }

            if(this.dataSourceView.selection && !this.options.database) {
                this.databaseView.fetchDatabases(this.dataSourceView.selection);
            }

            if(this.databaseView.selection) {
                this.schemaView.fetchSchemas(this.databaseView.selection);
            }
        },

        postRender: function() {
            this.$('.loading_spinner').startLoading();
            this.$("input.name").bind("textchange", _.bind(this.triggerSchemaSelected, this));
        },

        createNewDatabase: function(e) {
            e.preventDefault();
            this.trigger("clearErrors");
            this.databaseView.createNew();
            this.schemaView.createNested();
        },

        createNewSchema: function(e) {
            e.preventDefault();
            this.trigger("clearErrors");
            this.schemaView.createNew();
        },

        cancelNewDatabase: function(e) {
            this.cancel(e, this.databaseView);
        },

        cancelNewSchema: function(e) {
            this.cancel(e, this.schemaView);
        },

        cancel: function(e, view) {
            e.preventDefault();
            view.collectionLoaded();
            this.triggerSchemaSelected();
        },

        schemaId: function() {
            var selectedSchema = this.schemaView.getSelectedSchema();
            return selectedSchema && selectedSchema.id;
        },

        getSelectedSchema: function() {
            return this.schemaView.selection;
        },

        getSelectedDatabase: function() {
            return this.databaseView.selection;
        },

        additionalContext: function() {
            return { options: this.options };
        }
    });
})();

