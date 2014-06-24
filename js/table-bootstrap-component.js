/*!
* Copyright 2002 - 2013 Webdetails, a Pentaho company.  All rights reserved.
*
* This software was developed by Webdetails and is provided under the terms
* of the Mozilla Public License, Version 2.0, or any later version. You may not use
* this file except in compliance with the license. If you need a copy of the license,
* please go to  http://mozilla.org/MPL/2.0/. The Initial Developer is Webdetails.
*
* Software distributed under the Mozilla Public License is distributed on an "AS IS"
* basis, WITHOUT WARRANTY OF ANY KIND, either express or  implied. Please refer to
* the license for the specific language governing your rights and limitations.
*/

window.TableBootstrap = (function ($, Component) {
    "use strict";

    var $context          = null,
        TableComponent    = null,
        pageRequestParams = null;

    function _createTableColumnModel(options) {
        var model = [],
            types = options.colTypes || [],
            item  = null,
            typeIndex = null;

        options.colHeaders.forEach(function (column, index) {
            item = {
                sClass: 'column' + index,
                sTitle: column,
                bVisible: (column !== '')
            };

            if (options.colTypes.length && options.colTypes[index]) {
                typeIndex     = options.colTypes[index];
                item.bVisible = (typeIndex !== "hidden");
                item.sClass  += " " + typeIndex;
                item.sType    = typeIndex;
            }

            model[index] = item;
        });

        return model;
    }

    function _getDataTableOptions(options) {
        var dataTableConfig = {},
            _checkConfigType = function (key) {
                var option = options[key];

                dataTableConfig[key] = (typeof option === "string") ? eval("(" + option + ")") : option;
            };

        if(options.tableStyle == "themeroller"){
            dataTableConfig.bJQueryUI = true;
        }

        dataTableConfig.bInfo           = options.info;
        dataTableConfig.iDisplayLength  = options.displayLength;
        dataTableConfig.bLengthChange   = options.lengthChange;
        dataTableConfig.bPaginate       = options.paginate;
        dataTableConfig.bSort           = options.sort;
        dataTableConfig.bFilter         = options.filter;
        dataTableConfig.sPaginationType = options.paginationType;
        dataTableConfig.aaSorting       = options.sortBy;

        //sDom configurations is needed for booststrap layout
        dataTableConfig.sDom = "CT<'clear'>lfrtip<'row'<'col-xs-6'><'col-xs-6'>><'row'<'col-xs-6'><'col-xs-6'>>";

        _checkConfigType('oLanguage');
        _checkConfigType('oColVis');
        _checkConfigType('oStdClasses');
        _checkConfigType('oTableTools');

        if(options.colHeaders !== undefined) {
            dataTableConfig.aoColumns = _createTableColumnModel(options);

          var bAutoWidth = true;
          if (options.colWidths!=undefined) {
            $.each(options.colWidths,function(i,val){
             if (val!=null){
                dataTableConfig.aoColumns[i].sWidth=val;
                bAutoWidth = false;
              }
            })
          }; //colWidths
          dataTableConfig.bAutoWidth = bAutoWidth;

          if(options.colSortable!=undefined){
            $.each(options.colSortable,function(i,val){
              if (val!=null && ( !val || val == "false" ) ){
                dataTableConfig.aoColumns[i].bSortable=false
              }
            })
          }; //colSortable
          if(options.colSearchable!=undefined){
            $.each(options.colSearchable,function(i,val){
              if (val!=null && ( !val || val == "false" ) ){
                dataTableConfig.aoColumns[i].bSearchable=false
              }
            })
          }; //colSearchable

        }

        return dataTableConfig;
    }

    function _getRequestParamValue(key) {
        var len = pageRequestParams.length;

        for (var i=0; i<len ; i++) {
            if (params[i].name == key) {
                return params[i].value;
            }
        }

        return null;
    }

    function _sortRequestedColumns() {
        var sortParam     = _getRequestParamValue("iSortingCols"),
            sortedColumns = [],
            column        = null,
            dir           = null;

        if (sortParam > 0) {
            for (var i = 0; i < sortParam; i++) {
                column = _getRequestParamValue("iSortCol_" + i);
                dir    = _getRequestParamValue("sSortDir_" + i);
                sortedColumns.push( col + (dir == "asc" ? "A" : "D"));
            }
        }

        return sortedColumns.join(",");
    }

    function _fetchPageData(callback, data) {
        var response = null;

        if (this.postFetch){
            var mod = this.postFetch(d,dataTable);

            if (typeof mod !== "undefined") {
                data = mod;
            }
        }

        response = {
            iTotalRecords: data.queryInfo.totalRows,
            iTotalDisplayRecords: data.queryInfo.totalRows,
            aaData: data.resultset,
            sEcho: _getRequestParamValue("sEcho")
        };

        this.rawData  = data;

        callback(response);
    }

    /* fnServerData is required for server-side pagination */
    function _fnServerData() {
        pageRequestParams = paramList;
        this.pagingCallback.apply(this, arguments);
    }


    TableComponent = {
        update: function() {
            if (!this.preExec()) {
                return;
            }
            if (!this.htmlObject) {
                return this.error("TableComponent requires an htmlObject");
            }
            try {
                this.block();
                this.initialize();
                this[(this.chartDefinition.paginateServerside) ? 'pageUpdate' : 'regularUpdate']();
            } catch (e) {
                /*
                 * Something went wrong and we won't have handlers firing in the future
                 * that will trigger unblock, meaning we need to trigger unblock manually.
                 */
                this.dashboard.error(e);
                this.unblock();
            }
        },

        initialize: function() {
            if (this.chartDefinition == undefined) {
                Dashboards.log("Fatal - No chart definition passed", "error");
                return;
            }

            this.clearTable();
            this.resetChartDefinition();
            this.resetTableSorting();
        },

        /* The non-paging query handler only needs to concern itself
         * with handling postFetch and calling the draw function
         */
        regularUpdate: function() {
            var success = _.bind(function(data){
                    this.rawData = data;
                    this.processTableComponentResponse(data)
                },this),
                handler = this.getSuccessHandler(success);

            this.queryState.setAjaxOptions({async:true});
            this.queryState.fetchData(this.parameters == undefined ? [] : this.parameters, handler);
        },

        pageUpdate: function() {
            var success = _.bind(function(values) {
                var changedValues = undefined;

                if ((typeof(this.postFetch)=='function')) {
                    changedValues = this.postFetch(values);
                }
                if (changedValues !== undefined) {
                    values = changedValues;
                }
                this.processTableComponentResponse(values);
            },this);

            this.extraOptions = this.extraOptions || [];
            this.extraOptions.push(["bServerSide",true]);
            this.extraOptions.push(["bProcessing",true]);
            this.queryState.setPageSize(parseInt(this.chartDefinition.displayLength || 10));
            this.queryState.setCallback(success);
            this.queryState.setParameters(this.parameters);
            this.queryState.setAjaxOptions({async:true});
            this.queryState.fetchData(this.parameters, success);
        },

        clearTable: function () {
            this.chartDefinition.tableId = this.htmlObject + "Table";
            $context                     = $("#"+this.htmlObject).empty();
        },

        resetChartDefinition: function () {
            var croppedCd = $.extend({}, this.chartDefinition);

            croppedCd.drawCallback = undefined;
            this.queryState        = Dashboards.getQuery(croppedCd);
            this.query             = this.queryState; // for analogy with ccc component's name
        },

        resetTableSorting: function () {
            var sortBy      = this.chartDefinition.sortBy || [],
                sortOptions = [],
                col         = null,
                dir         = null,
                index       = null,
                len         = sortBy.length;

            for (var i = 0; i < len; i++) {
                index = sortBy[i];
                col = index[0];
                dir = index[1];
                sortOptions.push( col + (dir == "asc" ? "A" : "D"));
            }

            this.queryState.setSortBy(sortOptions);
        },

        pagingCallback: function(url, callback, dataTable) {
            var sortedColumns = _sortRequestedColumns(),
                queryState    = this.queryState,
                searchParam   = _getRequestParamValue("sSearch") || '',
                pageSize      = parseInt(_getRequestParamValue("iDisplayLength"));

            queryState.setSortBy(sortedColumns);
            queryState.setPageSize(pageSize);
            queryState.setPageStartingAt(_getRequestParamValue("iDisplayStart"));
            queryState.setSearchPattern(searchParam);
            queryState.fetchData(_fetchPageData.bind(this, callback));
        },

      /*
       * Callback for when the table is finished drawing. Called every time there
       * is a redraw event (so not only updates, but also pagination and sorting).
       * We handle addIns and such things in here.
       */
        fnDrawCallback: function(dataTableSettings) {
            var dataTable = dataTableSettings.oInstance,
                cd           = this.chartDefinition,
                myself       = this,
                handleAddIns = _.bind(this.handleAddIns,this);

            $context.find("tbody tr").each(function(row,tr) {
            /*
             * Reject rows that are not actually part
             * of the datatable (e.g. nested tables)
             */
            if (dataTable.fnGetPosition(tr) == null) {
                return true;
            }

            $(tr).children("td").each(function(col,td) {

                var foundAddIn = handleAddIns(dataTable, td);
                /*
                 * Process column format for those columns
                 * where we didn't find a matching addIn
                 */
                if (!foundAddIn && cd.colFormats) {
                    var position = dataTable.fnGetPosition(td),
                        rowIdx   = position[0],
                        colIdx   = position[2],
                        format   = cd.colFormats[colIdx],
                        value    = myself.rawData.resultset[rowIdx][colIdx];

                    if (format && (typeof value != "undefined" && value !== null)) {
                        $(td).text(sprintf(format,value));
                    }
                }
            });
        });

        /* Old urlTemplate code. This needs to be here for backward compatibility */
        if (cd.urlTemplate != undefined) {
            var td =$("#" + myself.htmlObject + " td:nth-child(1)");

            td.addClass('cdfClickable');
            td.bind("click", function(e){
                var regex = new RegExp("{"+cd.parameterName+"}","g");
                var f = cd.urlTemplate.replace(regex,$(this).text());
                eval(f);
            });
        }
        /* Handle post-draw callback the user might have provided */
        if (typeof cd.drawCallback == 'function') {
            cd.drawCallback.apply(myself,arguments);
        }
      },

        /*
         * Handler for when the table finishes initialising. This only happens once,
         * when the table *initialises* ,as opposed to every time the table is drawn,
         * so it provides us with a good place to add the postExec callback.
         */
        fnInitComplete: function() {
            this.postExec();
            this.unblock();
        },

        /*
         * Resolve and call addIns for the given td in the context of the given
         * dataTable. Returns true if there was an addIn and it was successfully
         * called, or false otherwise.
         */
        handleAddIns: function(dataTable, td) {
            var cd = this.chartDefinition,
                position = dataTable.fnGetPosition(td),
                rowIdx = position[0],
                colIdx = position[2],
                colType = cd.colTypes[colIdx],
                addIn = this.getAddIn("colType", colType),
                state = {},
                target = $(td),
                results = this.rawData;

            if (!addIn) {
                return false;
            }

            try {
                if (!(target.parents('tbody').length)) {
                    return;
                } else if (target.get(0).tagName != 'TD') {
                    target = target.closest('td');
                }

                if(cd.colFormats) {
                    state.colFormat = cd.colFormats[state.colIdx];
                }

                state.rawData   = results;
                state.tableData = dataTable.fnGetData();
                state.colIdx    = colIdx;
                state.rowIdx    = rowIdx;
                state.series    = results.resultset[state.rowIdx][0];
                state.category  = results.metadata[state.colIdx].colName;
                state.value     =  results.resultset[state.rowIdx][state.colIdx];
                state.target    = target;

                addIn.call(td,state,this.getAddInOptions("colType",addIn.getName()));

                return true;
            } catch (e) {
                this.dashboard.error(e);

                return false;
            }
        },

        createDataTable: function (data) {
            var $table = $("<table id='" + this.htmlObject + "Table' class='table table-striped table-bordered' width='100%'></table>");

            $context.html($table);
            $table.dataTable(data);

            return $table;
        },

        processTableComponentResponse: function(json) {

            var myself             = this,
                chartDefinition    = this.chartDefinition,
                extraOptions       = {},
                oldDataTableConfig = null,
                dataTableConfig    = null;

            $context.trigger('cdfTableComponentProcessResponse');

            // Set defaults for headers / types
            if (typeof chartDefinition.colHeaders === "undefined" || chartDefinition.colHeaders.length == 0) {
                chartDefinition.colHeaders = json.metadata.map(function(i){return i.colName});
            }

            if (typeof chartDefinition.colTypes === "undefined" || chartDefinition.colTypes.length == 0) {
                chartDefinition.colTypes = json.metadata.map(function(i){return i.colType.toLowerCase()});
            }

            oldDataTableConfig = _getDataTableOptions(chartDefinition);

            // Build a default config from the standard options
            $.each(this.extraOptions ? this.extraOptions : {}, function(i, e){
                extraOptions[e[0]] = e[1];
            });

            dataTableConfig = $.extend(chartDefinition.dataTableOptions, oldDataTableConfig, extraOptions);

            /* Configure the table event handlers */
            dataTableConfig.fnDrawCallback = _.bind(this.fnDrawCallback, this);
            dataTableConfig.fnInitComplete = _.bind(this.fnInitComplete, this);

            /* fnServerData is required for server-side pagination */
            if (dataTableConfig.bServerSide) {
                var myself = this;

                dataTableConfig.fnServerData = _fnServerData.bind(this);
            }

            /* We need to make sure we're getting data from the right place,
             * depending on whether we're using CDA
             */
            if (json) {
                dataTableConfig.aaData = json.resultset;
            }

            /*
             * We'll first initialize a blank table so that we have a
             * table handle to work with while the table is redrawing
             */
            this.dataTable = this.createDataTable(dataTableConfig);

                //set the default class
            $context.addClass('form-inline table-responsive');
            // modify table search input
            $context.find('div.dataTables_filter input').addClass("form-control input-sm center-block");
            // modify table length select
            $context.find('div.dataTables_length select').addClass("form-control input-sm");


            // We'll create an Array to keep track of the open expandable rows.
            this.dataTable.anOpen = [];

            $context.find('table').bind('click', function(e) {
                if (typeof chartDefinition.clickAction === 'function' || myself.expandOnClick) {
                    var state   = {},
                        target  = $(e.target),
                        results = myself.rawData;

                    if (!(target.parents('tbody').length)) {
                        return;
                    } else if (target.get(0).tagName != 'TD') {
                        target = target.closest('td');
                    }

                    var position = myself.dataTable.fnGetPosition(target.get(0));

                    state.rawData   = myself.rawData;
                    state.tableData = myself.dataTable.fnGetData();
                    state.colIdx    = position[2];
                    state.rowIdx    = position[0];
                    state.series    = results.resultset[state.rowIdx][0];
                    state.category  = results.metadata[state.colIdx].colName;
                    state.value     =  results.resultset[state.rowIdx][state.colIdx];
                    state.colFormat = chartDefinition.colFormats[state.colIdx];


                state.target = target;


                if ( myself.expandOnClick ) {
                    myself.handleExpandOnClick(state);
                }
                if ( chartDefinition.clickAction  ){
                    chartDefinition.clickAction.call(myself,state);
                }
              }
            });
            $context.trigger('cdfTableComponentFinishRendering');
      },

      handleExpandOnClick: function(event) {
        var myself = this,
          detailContainerObj = myself.expandContainerObject,
          activeclass = "expandingClass";

        if(typeof activeclass === 'undefined'){
          activeclass = "activeRow";
        }

        var obj = event.target.closest("tr"),
            a = event.target.closest("a");

        if (a.hasClass ('info')) {
          return;
        } else {
          var row = obj.get(0),
              value = event.series,
              htmlContent = $("#" + detailContainerObj).html(),
              anOpen = myself.dataTable.anOpen,
              i = $.inArray( row, anOpen );

          if( obj.hasClass(activeclass) ){
            obj.removeClass(activeclass);
            myself.dataTable.fnClose( row );
            anOpen.splice(i,1);

          } else {
            // Closes all open expandable rows .
            for ( var j=0; j < anOpen.length; j++ ) {
              $(anOpen[j]).removeClass(activeclass);
              myself.dataTable.fnClose( anOpen[j] );
              anOpen.splice(j ,1);
            }
            obj.addClass(activeclass);

            anOpen.push( row );
            // Since the switch to async, we need to open it first
            myself.dataTable.fnOpen( row, htmlContent, activeclass );

            //Read parameters and fire changes
            var results = myself.queryState.lastResults();
            $(myself.expandParameters).each(function f(i, elt) {
              Dashboards.fireChange(elt[1], results.resultset[event.rowIdx][parseInt(elt[0],10)]);
            });

          };
        };
        $("td.expandingClass").click(
          function(event){
            //Does nothing but it prevents problems on expandingClass clicks!
            event.stopPropagation();
            return;
          }
        );
      }
    };

    return Component.extend(TableComponent);

}(window.jQuery, window.UnmanagedComponent));
