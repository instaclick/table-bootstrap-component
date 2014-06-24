/*
 * Function: fnLengthChange
 * Purpose:  Change the number of records on display
 * Returns:  array:
 * Inputs:   object:oSettings - DataTables settings object
 *           int:iDisplay - New display length
 */

/* Example
 * $(document).ready(function() {
 *    var oTable = $('#example').dataTable();
 *    oTable.fnLengthChange( 100 );
 * } );
 */

 // Ensure we load dataTables before this line. If not, just keep going
if ($.fn.dataTableExt != undefined) {
    $.fn.dataTableExt.oApi.fnLengthChange = function ( oSettings, iDisplay ) {
        oSettings._iDisplayLength = iDisplay;
        oSettings.oApi._fnCalculateEnd( oSettings );

        // If we have space to show extra rows backing up from the end point - then do so
        if ( oSettings._iDisplayEnd == oSettings.aiDisplay.length ) {
            oSettings._iDisplayStart = oSettings._iDisplayEnd - oSettings._iDisplayLength;

            if ( oSettings._iDisplayStart < 0 ) {
                oSettings._iDisplayStart = 0;
            }
        }

        if ( oSettings._iDisplayLength == -1 ) {
            oSettings._iDisplayStart = 0;
        }

        oSettings.oApi._fnDraw( oSettings );

        $('select', oSettings.oFeatures.l).val( iDisplay );
    };
}
