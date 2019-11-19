const electron = require('electron');
const win = electron.remote;
const ipc = electron.ipcRenderer;
const BrowserWindow = win.BrowserWindow;
const shell = electron.shell;
const dialog = win.dialog

const path = require('path');
const fs = require('fs')
const crypto = require('crypto')

const knex = require('knex')({
    client: "sqlite3",
    connection: {
        filename: 'db.sqlite'
    }
})

// Sqlite & Knex
let medicationsData;
let itemsData;
let labItemsData;

// Get all medications and store for later use
knex.select('*').table('medications').then((rows) => {
    medicationsData = rows
})

// Get all general items and store for later use
knex.select('*').table('general_items').then((rows) => {
    itemsData = rows
})

// Get all lab and store for later use
knex.select('*').table('labs').then((rows) => {
    labItemsData = rows
})

$(function() {

    // Variables
    let windowControllers = $(".window-controllers"),
        appTitle = $(".app-title"),
        surgeryAreaWrapper = $('#surgeryAreaWrapper'),
        dentalAreaWrapper = $('#dentalAreaWrapper'),
        deliveryAreaWrapper = $('#deliveryAreaWrapper'),
        endoscopyAreaWrapper = $('#endoscopyAreaWrapper'),
        spectaclesAreaWrapper = $('#spectaclesAreaWrapper'),
        labAreaWrapper = $('#labAreaWrapper'),
        medicationAreaWrapper = $('#medicationAreaWrapper'),
        paper = $('.paper'),
        appendedItemsContainer = $('#appendedItemsContainer'),
        tblTotal = $("#tblTotal"),
        tblTotalContainer = $("#tblTotalContainer"),
        btnAddSurgeryItem = $(".btnAddSurgeryItem"),
        btnAddDeliveryItem = $(".btnAddDeliveryItem"),
        btnAddDentalItem = $(".btnAddDentalItem"),
        btnAddEndoscopyItem = $(".btnAddEndoscopyItem"),
        btnAddSpectaclesItem = $(".btnAddSpectaclesItem"),
        btnAddMedicationItem = $(".btnAddMedicationItem"),
        totalVal = $("#total"),
        btnPrint = $("#btnPrint"),
        btnSave = $("#btnSave"),
        btnExport = $("#btnExport"),
        btnImport = $(".btnImport"),
        patientName = $("#patientName"),
        customEditableInput = $(".custom-editable-input"),
        openAddNewModal = $("#btnOpenAddNewModal"),
        AddNewModal = $("#AddNewModal"),
        txtItemToAdd = $("#txtItemToAdd"),
        selectTbl = $("#selectTbl"),
        openEditModal = $("#btnOpenEditModal"),
        editItemModal = $("#editItemModal");
        selectTblEdit = $("#selectTblEdit"),
        txtItemToEdit = $("#txtItemToEdit"),
        tblExistingItems = $("#tblExistingItems"),
        fileModal = $('.file-modal'),
        fileTab = $('#file'),
        viewLevelInput = $('#viewLevelInput'),
        zoomSlider = $("#zoomSlider");

    $('.ui.dropdown').dropdown();
    $('.ui.button').popup();
        
    // Electron Implementation

    let currentWindow = win.getCurrentWindow();
    $('.window-maximize').on('click', () => {
        currentWindow.isMaximized() ? currentWindow.restore() : currentWindow.maximize()
    })

    $('.window-minimize').on('click', () => {
        currentWindow.minimize();
    })

    $('.window-close').on('click', () => {
        currentWindow.close();
    })

    ipc.on('winWidth', (event, arg) => {
        appTitle.css({
            "min-width": arg - 250
        })
    })
    
    ipc.on('winUnmaximize', (evt, arg) => {
        if (arg) {
            $('.window-maximize').removeClass('restore').addClass('maximize')
        }
    })

    ipc.on('winMaximized', (evt, arg) => {
        $('.window-maximize').removeClass('maximize').addClass('restore')
    })

    var desktopPath = '', documentPath = '';
    ipc.send('desktop-path');
    ipc.on('desktopPath', (evt, data) => {
        desktopPath = data
        $('.desktop-path').text(desktopPath.replace(/\\/g,">"));
    })

    ipc.send('document-path');
    ipc.on('documentPath', (evt, data) => {
        documentPath = data
        $('.document-path').text(documentPath.replace(/\\/g,">"));
    })

    // JQuery Implementation //

    function toggleAreaDisplay(whereToAppend, toggleObj) {

        // Form the new class for the item to be appended on the paper
        let classForItemToAppend = toggleObj.children('div:first').attr('class') + '2';

        // Check if item already exists on the paper
        if ($('.' + classForItemToAppend).length === 0) {
            // Append the inner html of the wrapper
            whereToAppend.append(toggleObj.html());

            // Get the appended Item
            let appendedItem = whereToAppend.children('div:last');

            // Add the class to the appended Item
            appendedItem.addClass(classForItemToAppend);
        }
        else {
            $("." + classForItemToAppend).remove();
        }
        
    }

    function acceptOnlyNumbersAndPeriod(e) {
        var key = e.which || e.keyCode;
        var counter = 0;
        var value = e.target.innerHTML.trim() || e.target.value;

        if (
            !(
                (!e.shiftKey &&
                    !e.altKey &&
                    !e.ctrlKey &&
                    // numbers
                    key >= 48 &&
                    key <= 57) ||
                // Numeric keypad
                (key >= 96 && key <= 105) ||
                // period
                key == 110 ||
                key == 190 ||
                // Backspace
                key == 8 ||
                // Home and End
                key == 35 ||
                key == 36 ||
                // left and right arrows
                key == 37 ||
                key == 39 ||
                // Del and Tab
                key == 46 ||
                key == 9
            )
        ) {
            e.preventDefault();
        }

        if (value) {
            for (let i = 0; i < value.length; i++) {
                if (value[i] == ".") {
                    counter++;
                }
            }
        }

        if (counter > 0 && (key == 110 || key == 190)) {
            e.preventDefault();
        }
    }

    // Handle Zoom slider
    zoomSlider.range({
        min: 10,
        max: 600,
        start: 100,
        step: 10,
        smooth: true,
        onChange: function(value) {
            viewLevelInput.val(`${value}%`);
            zoom($("#paper"), value)
        }
    });

    let initValue;
    viewLevelInput.on('keydown keyup blur focus', function(evt) {
        var $this = $(this);
        if (evt.type === 'blur') {
            if ($this.val().trim() === '') {
                $this.val(`${initValue}%`)
            }
            scalePaper($(this))
        } else if (evt.type === 'focus') {
            initValue = $this.val();
        }
        else if (evt.type === 'keydown') {
            acceptOnlyNumbersAndPeriod(evt)
        }
        else {
            if (evt.keyCode === 13 || evt.which === 13) {
                if ($this.val() < 10) $this.val(`${10}%`)
                scalePaper($this)
            }
        }
    })
    
    // $("#btnLoadExcelFile").on('click', function() {
    //     ipc.send('excel')
    // })
    // ipc.on('loadedExcelData', (evt, file) => {
    //     fs.readFile(file.filePaths[0], "utf8", (err, data) => {
    //         if (err) console.log(err)
    //         dataOnEachLineArray = data.split('\n');
    //         console.log(dataOnEachLineArray.length)
    //         for (let i = 0; i < 97; i++) {
    //             iteratorFormatted = dataOnEachLineArray[i].toString().replace('/"/g',"").trim();
    //             knex('labs').insert({name: iteratorFormatted}).then(res => { console.log('done')})
    //         }
    //     })
    // })

    function scalePaper($this) {
        var value = $this.val().toString().split('%')[0]
        zoom($("#paper"), value);
        $this.val(`${value}%`)
        zoomSlider.range('set value', value)
    }
    
    var winInitialReloadFlag;
    function zoom(divToZoom, zoomFactor) {
        
        if ($(".platform").get(0).scrollWidth > $(".platform").width()) {
            if (winInitialReloadFlag === false) {
                divToZoom.css({"margin-left": "0"})
                divToZoom.css({"transform-origin": '0 0'});
            }
            winInitialReloadFlag = false;
        } else {
            divToZoom.css("transform-origin", "center 0");
            divToZoom.css({"margin-left": "auto"});
        }
        
        divToZoom.css("transform", `scale(${zoomFactor / 100})`)
    }

    // Disable using keyboard in the date inputboxes
    paper.on("keydown", "#patientDetails input", function() {
        return false;
    }) 

    // Display the selected Date value into the hidden Content Editable area
    paper.on("blur", "input", function() {
        let $this = $(this);
        $this.parent("div").siblings(".custom-editable-input").text($this.val());
    }) 

    // Disable enter key press
    paper.on("keypress", customEditableInput, function(e) {
        if (e.which == 13 || e.charCode == 13) {
            return false
        }
    })

    // Handle add new fields events
    $('#btnAddSurgeryArea').on('click', function() {
        let $this = $(this);
        $this.attr('disabled', 'disabled');
        toggleAreaDisplay(appendedItemsContainer, surgeryAreaWrapper);
        $this.removeAttr('disabled');
    })

    $('#btnAddDentalArea').on("click", () => {
        let $this = $(this);
        $this.attr('disabled', 'disabled');
        toggleAreaDisplay(appendedItemsContainer, dentalAreaWrapper);
        $this.removeAttr('disabled');
    })

    $('#btnAddDeliveryArea').on("click", () => {
        let $this = $(this);
        $this.attr('disabled', 'disabled');
        toggleAreaDisplay(appendedItemsContainer, deliveryAreaWrapper);
        $this.removeAttr('disabled');
    })

    $('#btnAddEndoscopyArea').on("click", () => {
        let $this = $(this);
        $this.attr('disabled', 'disabled');
        toggleAreaDisplay(appendedItemsContainer, endoscopyAreaWrapper);
        $this.removeAttr('disabled');
    })

    $('#btnAddSpectaclesArea').on("click", () => {
        let $this = $(this);
        $this.attr('disabled', 'disabled');
        toggleAreaDisplay(appendedItemsContainer, spectaclesAreaWrapper);
        $this.removeAttr('disabled');
    })

    $('#btnAddLabArea').on("click", () => {
        let $this = $(this);
        $this.attr('disabled', 'disabled');
        toggleAreaDisplay(appendedItemsContainer, labAreaWrapper);
        $this.removeAttr('disabled');
    })

    $('#btnAddMedicationArea').on("click", () => {
        let $this = $(this);
        $this.attr('disabled', 'disabled');
        toggleAreaDisplay(appendedItemsContainer, medicationAreaWrapper);
        $this.removeAttr('disabled');
    })
    

    // Initialize dates
    var today = new Date();
    $('#dop, #dod, #doa').calendar({
        type: 'date'
        // minDate: new Date(today.getFullYear(), today.getMonth(), today.getDate())
    });

    function formatNumberToCurrencyFormat(number, total = false) {
        let numString = number.toString().split('.')[0],
            decimalPart = number.toString().split('.')[1],
            reversedNum = numString.split("").reverse().join().replace(/,/gi, ""),
            tempReversedNum = '';
            
        for(let i = 0; i < reversedNum.length; i++) {
            if (i % 3 === 0 && i !== 0) {
                tempReversedNum += ','
            }
            tempReversedNum += reversedNum[i]
        }
        
        let tempCorrectedNum = '';
        for(let i = tempReversedNum.length - 1; i >= 0; i--) {
            tempCorrectedNum += tempReversedNum[i]
        }
        
        return tempCorrectedNum + '.' + decimalPart
    }

    // Handle Qty and Rate multiplication values
    paper.on('keyup', '.qtyValue', function() {

        var tdObj = $(this).closest('tr').find('td');
        var hiddenInput = tdObj.siblings('td:last-child').children('input')
        var displaySpan = tdObj.siblings('td:last-child').children('span')

        hiddenInput.val(($(this).text() * tdObj.find('.rateValue').text()).toFixed(2))
        displaySpan.text(
            formatNumberToCurrencyFormat(($(this).text() * tdObj.find('.rateValue').text()).toFixed(2))
        );

        let tds = paper.find("table.basic:not('#tblTotal')").find("td:nth-child(4)").children("input");
        
        let total = 0;
         $.each(tds, function(index, ele) {
            total += Number(ele.value);
         });

         totalVal.text(formatNumberToCurrencyFormat(total.toFixed(2)));
    });

    paper.on("keyup", ".rateValue", function() {
        var tdObj = $(this).closest('tr').find('td');
        var hiddenInput = tdObj.siblings('td:last-child').children('input')
        var displaySpan = tdObj.siblings('td:last-child').children('span')

        hiddenInput.val(($(this).text() * tdObj.find('.qtyValue').text()).toFixed(2))
        displaySpan.text(
            formatNumberToCurrencyFormat(($(this).text() * tdObj.find('.qtyValue').text()).toFixed(2))
        );

        let tds = paper.find("table.basic:not('#tblTotal')").find("td:nth-child(4)").children("input");
        
        let total = 0;
         $.each(tds, function(index, ele) {
            total += Number(ele.value);
         });

         totalVal.text(formatNumberToCurrencyFormat(total.toFixed(2)));
    })

    paper.on("keydown", ".qtyValue, .rateValue", function(evt) {
        acceptOnlyNumbersAndPeriod(evt)
    })

    // Handle Adding Items to other items like Surgery, Dental etc. Areas
    paper.on("click", '.btnAddSurgeryItem, .btnAddDeliveryItem, .btnAddDentalItem, .btnAddEndoscopyItem, .btnAddSpectaclesItem', function() {
        let data = "";
        let tbody = $(this).closest(".add-item-btn-container").siblings("table").children("tbody")

        data += "<tr>";
        data += "<td><span class='hidden-item-collector'>general</span>";
        data += '<div class="ui selection dropdown fluid search selectItem"><input type="hidden" name="gender"><i class="dropdown icon"></i>'
        data += '<div class="default text">Select Item</div><div class="menu"><div class="item" data-value="general_items">General Items</div>'
        data += '<div class="item" data-value="medications">Medications</div></div></div>'
        data += "</td>";
        data += '<td><div contentEditable="true" class="custom-editable-input qtyValue"></div></td>';
        data += '<td><div contentEditable="true" class="custom-editable-input rateValue"></div></td>';
        data += '<td><span>0.00</span><input type="hidden" value="0"><i class="icon trash remove-item"></i></td>';
        data += "</tr>";

        tbody.append(data);

        tbody.children("tr:last").children("td:first").children(".selectItem").dropdown({
            values: itemsData,
            onChange: function(val,text) {
                $(this).parents("td").children("span").text(text);
            }
        })
    });
    
    function dropDownOnChange($this, value, text) {
        $this.siblings("span").text(value);
    }

    // Handle when add lab row is clicked
    paper.on("click", '.btnAddLabItem', function() {
        let data = "";

        let tbody = $(this).closest(".add-item-btn-container").siblings("table").children("tbody")

        data += "<tr>";
        data += "<td><select class='ui dropdown search selectItem lab-dropdown'></select><span class='hidden-item-collector'>lab</span></td>";
        data += '<td><div contentEditable="true" class="custom-editable-input qtyValue"></div></td>';
        data += '<td><div contentEditable="true" class="custom-editable-input rateValue"></div></td>';
        data += '<td><span>0.00</span><input type="hidden" value="0"><i class="icon trash remove-item"></i></td>';
        data += "</tr>";

        tbody.append(data);

        tbody.children("tr:last").children("td:first").children(".selectItem").dropdown({
            values: labItemsData,
            onChange: function(val,text) {
                $(this).parents("td").children("span").text(text);
            }
        })
    });
    
    // Handle when add medication row is clicked
    paper.on("click", '.btnAddMedicationItem', function() {
        let data = "";

        let tbody = $(this).closest(".add-item-btn-container").siblings("table").children("tbody")

        data += "<tr>";
        data += "<td><select class='ui dropdown search selectItem medication-dropdown'></select><span class='hidden-item-collector'>medi</span></td>";
        data += '<td><div contentEditable="true" class="custom-editable-input qtyValue"></div></td>';
        data += '<td><div contentEditable="true" class="custom-editable-input rateValue"></div></td>';
        data += '<td><span>0.00</span><input type="hidden" value="0"><i class="icon trash remove-item"></i></td>';
        data += "</tr>";

        tbody.append(data);

        tbody.children("tr:last").children("td:first").children(".selectItem").dropdown({
            values: medicationsData,
            onChange: function(val,text) {
                $(this).parents("td").children("span").text(text);
            }            
        })
    });
    
    // Remove table row item from the List
    paper.on("click", ".remove-item", function() {
        $(this).closest("tr").remove();
        
        let tds = paper.find("table.basic:not('#tblTotal')").find("td:nth-child(4)").children("input");

        // Recalculate the total when item is removed
        let total = 0;
         $.each(tds, function(index, ele) {
            total += Number(ele.value);
         });

         totalVal.text(formatNumberToCurrencyFormat(total.toFixed(2)));
    });

    // Open Add New Item
    openAddNewModal.on("click", () => {
        AddNewModal.modal({closable: false}).modal("show");
    });

    $("#btnAdd").on("click", () => {
        selectTblVal = selectTbl.val().trim()
        txtItemToAddVal = txtItemToAdd.val().trim()
    
        if (!txtItemToAddVal.length) {
            
            txtItemToAdd.parent("div").siblings(".error").css("visibility", "visible");
            return;
        }
        knex(selectTblVal).insert({'name': txtItemToAddVal}).then((res) => {
            txtItemToAdd.val("")
        })
    });

    txtItemToAdd.on("keyup", () => {
        txtItemToAdd.parent("div").siblings(".error").css("visibility", "hidden")
    })

    $("#btnCloseAddModal").on("click", () => {
        AddNewModal.modal("close")

        // Get all medications and store for later use
        knex.select('*').table('medications').then((rows) => {
            medicationsData = rows
        }).catch(e => {
            // console.log(e)
        })
        // Get all general items and store for later use
        knex.select('*').table('general_items').then((rows) => {
            itemsData = rows
        })
        // // Get all labs and store for later use
        knex.select('*').table('labs').then((rows) => {
            labItemsData = rows
        })
    })

    openEditModal.on("click", () => {
        editItemModal.modal({closable: false}).modal("show");
    })

    selectTblEdit.dropdown({
        onChange: function () {
            let tblName = $(this).dropdown("get value"),
                tbody = tblExistingItems.children("tbody");

            // empty the table
            tbody.empty();

            // Get the items related to selected items (Table name) and display
            knex.select('*').table(tblName).orderBy('name').then((rows) => {
                for(let i=0; i < rows.length; i++) {
                    tbody.append(`<tr><td>${i + 1}</td><td><div contenteditable="true" class="custom-editable-input" id="${rows[i].id}">${rows[i].name}</div></td></tr>`)
                }
            })
        }
    });

    editItemModal.find(".deny").on("click", function() {
        tblExistingItems.children("tbody").empty()
    })

    editItemModal.on("focusout", ".custom-editable-input", function() {

        let selectedTbl = selectTblEdit.dropdown("get value");

        knex(selectedTbl)
        .where('id', '=', $(this).attr('id'))
        .update({name: $(this).text().trim()})
        .then(function(res) {
            if (!res == 1) {
                console.log("Error!")
                return;
            }

            // Get all medications and store for later use
            knex.select('*').table(selectTblEdit.dropdown("get value")).then((rows) => {
                if (selectedTbl == "general_items") 
                    itemsData = rows
                else
                    medicationsData = rows
            })
        })
    })
    

    $(".selectItem").dropdown({
        onChange: function() {
            
        }
    })

    // Show print preview window
    btnPrint.on("click", () => {
        ipc.send('print-automatically', paper.html());
        fileModal.css("left", "-100%")
    });

    // Save the file
    btnSave.on("click", () => {
        ipc.send('print-to-pdf', paper.html());
        fileModal.css("left", "-100%");
    });

    // Export a template
    btnExport.on("click", () => {
        hiddenExportContainer = $("#hiddenExportContainer");

        // Remove the dropdown elements from the exported Template
        hiddenExportContainer.html(paper.html())
            .find("div.ui.dropdown.selectItem").remove()

        // Show the hidden element that holds the selected element
        hiddenExportContainer.find('.hidden-item-collector').addClass('hidden-item-collector-show').removeClass('hidden-item-collector')

        ipc.send('export', hiddenExportContainer.html())

        // Empty the hidden export container
        hiddenExportContainer.empty();

        // ipc.send('export', paper.html())
    })

    // Import a template
    btnImport.on("click", () => {
        fileModal.css("left", "-100%");
        ipc.send('import');
    })

    // Listen for when the data has been imported and render template
    ipc.on('imported-data', (evt, data) => {
        if (!data.canceled) {
            let file = data.filePaths[0];
            fs.readFile(file, "utf8", (err, text) => {
                if (err) {
                    dialog.showErrorBox("Import file", "Error importing file: " + err.message)
                    return
                }

                paper.html(decrypt(text))
                appendedItemsContainer = $("#appendedItemsContainer");
                totalVal = $("#total")

                // Reinitialize the date controls
                $('#dop, #dod, #doa').calendar({
                    type: 'date'
                    // minDate: new Date(today.getFullYear(), today.getMonth(), today.getDate())
                });
            });
        }
    })

    // Swictching between tabs
    $(".tab:not('#file')").click(function() {
        highliSelectedTab($(this));
    })

    $("#create").click(function() {
        switchTab($('#groupCreate'));
    });
    
    $("#view").click(function() {
        switchTab($('#groupView'));
    });

    $("#external").click(function() {
        switchTab($('#groupExternal'));
    })

    $("#settings").click(function() {
        switchTab($('#groupSettings'));
    })

    $("#file").click(function() {
        $(".tabs").siblings().removeClass("tab-selected");
        fileModal.css("left", "0")
        $(this).addClass('file-tab-selected');
    });
    
    $("#closeMenu").on('click', function() {
        fileModal.css("left", "-100%")
    });

    // Switching between the file properties
    $("#new").click(function() {
       switchProperties($(".property-item"), $(this), $("#newDetail"));
    });

    $("#open").click(function() {
       switchProperties($(".property-item"), $(this), $("#openDetail"));
    });

    $("#save").click(function() {
       switchProperties($(".property-item"), $(this), $("#saveDetail"));
    });

    $("#saveAs").click(function() {
       switchProperties($(".property-item"), $(this), $("#saveAsDetail"));
    });

    $("#print").click(function() {
       switchProperties($(".property-item"), $(this), $("#printDetail"));
    });

    // Show is active, the 
    $('#groupCreate span').click(function() {
        var $this = $(this), className = "isActive";
        
        if ($this.hasClass(className)) {
            $this.removeClass(className)
        } else {
            $this.addClass(className)
        }
    });
    
    // Creating new Pint
    $('#btnCreate').click(function() {
        var surg = $("#chkSurgery").prop("checked"),
        deli = $("#chkDelivery").prop("checked"),
        dent = $("#chkDental").prop("checked"),
        endo = $("#chkEndoscopy").prop("checked"),
        spec = $("#chkSpectacles").prop("checked"),
        lab = $("#chkLab").prop("checked"),
        medi = $("#chkMedication").prop("checked"),

        className = "isActive";

        appendedItemsContainer.empty();
        $('#groupCreate span').removeClass(className);

        if (surg) {
            toggleAreaDisplay(appendedItemsContainer, surgeryAreaWrapper);
            $('#btnAddSurgeryArea').addClass(className)
        }
        if (deli) {
            toggleAreaDisplay(appendedItemsContainer, deliveryAreaWrapper);
            $('#btnAddDeliveryArea').addClass(className)
        }
        if (dent) {
            toggleAreaDisplay(appendedItemsContainer, dentalAreaWrapper);
            $('#btnAddDentalArea').addClass(className)
        }
        if (endo) {
            toggleAreaDisplay(appendedItemsContainer, endoscopyAreaWrapper);
            $('#btnAddEndoscopyArea').addClass(className)
        }
        if (spec) {
            toggleAreaDisplay(appendedItemsContainer, spectaclesAreaWrapper);
            $('#btnAddSpectaclesArea').addClass(className)
        }

        if (lab) {
            toggleAreaDisplay(appendedItemsContainer, labAreaWrapper);
            $('#btnAddLabArea').addClass(className)
        }
        if (medi) {
            toggleAreaDisplay(appendedItemsContainer, medicationAreaWrapper);
            $('#btnAddMedicationArea').addClass(className)
        }

        $("#patientDetails").find(".custom-editable-input").empty();
        $("#patientDetails").find(".calendar input").val("");

        fileModal.css("left", "-100%")
        totalVal.text('0.00')
    });

    const encryption_metadata = {
        encryption_key: "byz9VFNtbRQM0yBODcCb1lr*_?_|3D3x", // Must be 32 characters
        initialization_vector: "X05IGQ5qdBnIqAWD" // Must be 16 characters
    }

    function decrypt(text) {
        const decipher = crypto.createDecipheriv('aes-256-cbc',Buffer.from(encryption_metadata.encryption_key), Buffer.from(encryption_metadata.initialization_vector))
        let dec = decipher.update(text, 'hex', 'utf8')
        dec += decipher.final('utf8')
        return dec
    }

    function highliSelectedTab(tab) {
        tab.addClass("tab-selected").siblings().removeClass('tab-selected');
    }

    function switchTab(groupToShow) {
        $(".groups>div").hide();
        groupToShow.show();
    }

    function switchProperties(propertiesClass, selectedProperty, propertyDetailToShow) {
        propertyDetailToShow.show().siblings().hide();
        propertiesClass.removeClass("property-selected");
        selectedProperty.addClass("property-selected");
    }

    function paperMouseWheelScroll(e, eleToZoom, zoomFactor, maxZoom) {
        
        if(e.originalEvent.wheelDelta < 0) {
            if (Number(viewLevelInput.val().replace(/%/g,"")) > zoomFactor) {
                zoomedTo = Number(viewLevelInput.val().replace(/%/g,"")) - zoomFactor
            }
        } else if(e.originalEvent.wheelDelta > 0) {
            if (Number(viewLevelInput.val().replace(/%/g,"")) < maxZoom) {
                zoomedTo = Number(viewLevelInput.val().replace(/%/g,"")) + zoomFactor
            }
        }

        zoomSlider.range('set value', zoomedTo)
        zoom(eleToZoom, zoomedTo);
        viewLevelInput.val(zoomedTo)
        
        e.preventDefault();
    }

    $('.platform').on('mousewheel', function(e){
        if (e.ctrlKey) {
            paperMouseWheelScroll(e, $("#paper"), 10, 600)
        }
    });
});