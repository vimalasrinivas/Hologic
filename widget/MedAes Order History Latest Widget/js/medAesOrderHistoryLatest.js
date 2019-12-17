/**
 * @fileoverview Footer Widget.
 *
 * @author Taistech
 */
define(
    //---------------------------------https://ccadmin-test-zcxa.oracleoutsourcing.com/occs-admin/#/componentSelection/?name=MedAes%20Order%20History%20Latest%20Widget----------------------------------
    // DEPENDENCIES
    // Adding knockout
    //-------------------------------------------------------------------
    ['knockout', 'ccResourceLoader!global/api-helper', 'navigation', 'ccConstants'],

    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function(ko, helper, navigation, CCConstants) {

        "use strict";

        return {
            getShippedOrders: ko.observable(),
            getOpenOrders: ko.observable(),
            getCancellationOrders: ko.observable(),
            getInvoicesOrders: ko.observableArray(),
            isDesktop: ko.observable(true),
            isMobile: ko.observable(false),
            displayNewCardSection: ko.observable(false),
            invoiceTotal: ko.observable(''),
            isDefaultCard: ko.observable(false),
            getAddNewCardId: ko.observable(''),
            getExistingCardId: ko.observable(''),
            isDefaultCardValue: ko.observable(''),
            isStoredCardsLoaded: ko.observable(false),
            isShippedOrdersLoaded: ko.observable(false),
            isOpenOrdersLoaded: ko.observable(false),
            isCancelledOrdersLoaded: ko.observable(false),
            isInvoiceListLoaded: ko.observable(false),
            
            // invoice payment details List
            cardTypeList: [{
                    "name": "VISA",
                    "cardValue": "VISA"
                },
                {
                    "name": "Master Card",
                    "cardValue": "MASTERCARD"
                },
                {
                    "name": "Amex",
                    "cardValue": "AMEX"
                }
            ],
            cardType: ko.observable(),
            nameOnCard: ko.observable(),
            cardNumber: ko.observable(),
            cardIINPattern: ko.observable('[0-9]'),
            cardNumberLength: ko.observable('16'),
            expiryMonth: ko.observable(),
            expiryYear: ko.observable(),
            newCardCvv: ko.observable(),
            getExternalBillingAddress: ko.observable(),
            getExternalCardData: ko.observable(),
            isDefaultBillingAddress: ko.observable(null),
            endYearList: [],
            selectedInvoiceList: ko.observableArray([]),
            existingCardCvv: ko.observable(),
            onLoad: function(widget) {

                widget.getExternalBillingAddresses();
                widget.getExternalCardDetails();
                widget.addValidationRules();
                widget.addExistingCvvRule();
                widget.cardType.subscribe(function(newValue) {
                    console.log("card typeeee", newValue);
                    if (newValue == 'VISA') {
                        widget.cardIINPattern('4'),
                            widget.cardNumberLength('13|16');
                        $("#cc-card-number").attr('maxlength', '16');
                    } else if (newValue == 'MASTERCARD') {
                        widget.cardIINPattern('5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720'),
                            widget.cardNumberLength('16');
                        $("#cc-card-number").attr('maxlength', '16');
                    } else if (newValue == 'AMEX') {
                        widget.cardIINPattern('3[47]'),
                            widget.cardNumberLength('15');
                        $("#cc-card-number").attr('maxlength', '15');
                    }
                });


                $(window).resize(function() {
                    widget.showContent();
                })
                $("body").delegate("#sellectAllInvoices", "click", function(e) {
                    if (this.checked) {
                        // Iterate each checkbox
                        $(':checkbox').each(function() {
                            this.checked = true;
                        });
                    } else {
                        $(':checkbox').each(function() {
                            this.checked = false;
                        });
                    }
                });
                
               

            },

            addValidationRules: function() {
                var widget = this;
                widget.setEndYear();

                /**** start validation rules for frame */
                ko.validation.rules['validateYear'] = {
                    validator: function(val, params) {
                        var selectedEndYear = parseInt(val);
                        return params.indexOf(selectedEndYear) > -1 ? true : false;
                    },
                    message: "you have to fill all DOB fields!"
                };
                ko.validation.registerExtenders();

                widget.nameOnCard.extend({
                    required: {
                        params: true,
                        message: "Please enter name on card information"
                    }
                });
                widget.cardType.extend({
                    required: {
                        params: true,
                        message: "please choose card type information"
                    }
                })
                widget.cardNumber.extend({
                    required: {
                        params: true,
                        message: "Please enter card number information"
                    },
                    maxLength: {
                        params: CCConstants.CYBERSOURCE_CARD_NUMBER_MAXIMUM_LENGTH,
                        message: widget.translate('cardNumberMaxLength', {
                            maxLength: CCConstants.CYBERSOURCE_CARD_NUMBER_MAXIMUM_LENGTH
                        })
                    },
                    creditcard: {
                        params: {
                            iin: widget.cardIINPattern,
                            length: widget.cardNumberLength
                        },
                        //onlyIf: function () { return widget.applyConditions(); },
                        message: widget.translate('cardNumberInvalid')
                    }
                });
                widget.expiryMonth.extend({
                    required: {
                        params: true,
                        message: "Please enter expiration month information"
                    },
                    endmonth: {
                        params: widget.expiryYear,
                        message: "Invalid expires month/year, please try again."
                    },
                    maxLength: {
                        params: 2,
                        message: "Invalid expires month/year, please try again."
                    }
                });
                widget.expiryYear.extend({
                    required: {
                        params: true,
                        message: "Please enter expiration month information"
                    },
                    minLength: {
                        params: 4,
                        message: "Invalid expires month/year, please try again."
                    },
                    maxLength: {
                        params: 4,
                        message: "Invalid expires month/year, please try again."
                    },
                    validateYear: {
                        params: widget.endYearList,
                        message: "Invalid expires month/year, please try again.",
                    }
                });
                widget.newCardCvv.extend({
                    required: {
                        params: true,
                        message: "Please enter CVV information"
                    },
                    minLength: {
                        params: 3,
                        message: "Please provide minimum length of cvv is 3"
                    },
                    maxLength: {
                        params: 4,
                        message: "Please provide minimum length of cvv is 4"
                    },
                    number: {
                        param: true,
                        message: "Please enter numbers only"
                    },
                    cvv: {
                        params: 3,
                        message: "Invalid CVV number"
                    }
                })

                widget.validationModel = ko.validatedObservable({
                    cardType: widget.cardType,
                    cardNumber: widget.cardNumber,
                    expiryMonth: widget.expiryMonth,
                    expiryYear: widget.expiryYear,
                    nameOnCard: widget.nameOnCard,
                    newCardCvv: widget.newCardCvv
                });


                widget.setIsModified();

            },

            setIsModified: function() {
                var widget = this;
                widget.cardType('');
                widget.cardNumber('');
                widget.expiryMonth('');
                widget.expiryYear('');
                widget.nameOnCard('');
                widget.newCardCvv('');

                widget.cardType.isModified(false);
                widget.cardNumber.isModified(false);
                widget.expiryMonth.isModified(false);
                widget.expiryYear.isModified(false);
                widget.nameOnCard.isModified(false);
                widget.newCardCvv.isModified(false);

            },

            updateCard: function(data, event) {
                var widget = this;
                console.log(event, "..............event");
                console.log(data, "...............data...");
                var dropDownValue = $(event.currentTarget).val();
                data.isDefaultCardValue(dropDownValue);
                if (data.isDefaultCardValue() == "addNewCard") {
                    widget.displayNewCardSection(true);
                    widget.addValidationRules();
                    widget.removeExistingCvvRule();
                    $('#existingCardCVV').addClass('hide');
                } else if (data.isDefaultCardValue() != "addNewCard") {
                    $('#existingCardCVV').removeClass('hide');
                    widget.getExistingCardId('');
                    widget.addExistingCvvRule();
                    widget.displayNewCardSection(false);
                    widget.removeNewCardValidationRules();
                    widget.getExistingCardId(data.isDefaultCardValue());

                }

            },

            addExistingCvvRule: function() {
                var widget = this;
                widget.existingCardCvv.extend({
                    required: {
                        params: true,
                        message: "Please enter CVV information"
                    },
                    minLength: {
                        params: 3,
                        message: "Please provide minimum length of cvv is 3"
                    },
                    maxLength: {
                        params: 4,
                        message: "Please provide minimum length of cvv is 4"
                    },
                    number: {
                        param: true,
                        message: "Please enter numbers only"
                    },
                    cvv: {
                        params: 3,
                        message: "Invalid CVV number"
                    }
                })
                widget.existingCardViewModel = ko.validatedObservable({
                    existingCardCvv: widget.existingCardCvv
                })
                widget.existingCardCvv('');
                widget.existingCardCvv.isModified(false);
            },

            removeExistingCvvRule: function() {
                var widget = this;
                widget.existingCardCvv.rules.remove(function(item) {
                    return item.rule == "cvv";
                });
                widget.existingCardCvv.rules.remove(function(item) {
                    return item.rule == "required";
                });
            },

            removeNewCardValidationRules: function() {
                var widget = this;
                widget.cardType.rules.remove(function(item) {
                    return item.rule == "required";
                });
                widget.cardNumber.rules.remove(function(item) {
                    return item.rule == "required";
                });
                widget.expiryMonth.rules.remove(function(item) {
                    return item.rule == "required";
                });
                widget.expiryYear.rules.remove(function(item) {
                    return item.rule == "required";
                });
                widget.nameOnCard.rules.remove(function(item) {
                    return item.rule == "required";
                });
                widget.newCardCvv.rules.remove(function(item) {
                    return item.rule == "required";
                });
                widget.expiryYear.rules.remove(function(item) {
                    return item.rule == "validateYear";
                });
                widget.cardNumber.rules.remove(function(item) {
                    return item.rule == "creditcard";
                });
                widget.newCardCvv.rules.remove(function(item) {
                    return item.rule == "cvv";
                });
            },
            redirectToInvoiceDetails: function(getInvoiceId) {

                console.log(getInvoiceId, "...getInvoiceId");
                navigation.goTo("/invoiceDetails");
                $.Topic('GET_INVOICE_ID.memory').publish(getInvoiceId);
            },
            setEndYear: function() {
                var widget = this;
                var YEAR_LIST_LENGTH = 20;
                var endYear = new Date().getFullYear();
                for (var i = 0; i < YEAR_LIST_LENGTH; i++) {
                    widget.endYearList.push(endYear);
                    ++endYear;
                }
            },

            closeModal: function() {

                this.cardType('');
                this.cardNumber('');
                this.expiryMonth('');
                this.expiryYear('');
                this.nameOnCard('');
                this.existingCardCvv('');
                this.validationModel.errors.showAllMessages(false);
                if (this.isDefaultCardValue() === "addNewCard") {
                    $('#existingCardCVV').addClass('hide');
                } else {
                    $('#existingCardCVV').removeClass('hide');

                }



                $('#invoicePaymentModal').modal('hide');
            },
            beforeAppear: function(page) {

                var self = this;
                self.showContent();
                 
                  self.externalShippingOrderCall("SHIPPED", function(getdata) {
                    self.getShippedOrders(getdata);
                    self.isShippedOrdersLoaded(true);
                    self.displayDataTable();
                });

                self.externalShippingOrderCall("OPEN", function(getdata) {
                    self.getOpenOrders(getdata);
                    self.isOpenOrdersLoaded(true);
                    self.displayDataTable();
                });

                self.externalShippingOrderCall("CANCELLED", function(getdata) {
                    self.getCancellationOrders(getdata);
                    self.isCancelledOrdersLoaded(true);
                    self.displayDataTable();
                });


                self.externalInvoiceCall(function(getInvoiceData) {
                    self.getInvoicesOrders(getInvoiceData);
                    self.isInvoiceListLoaded(true);
                    self.displayInvoiceTable();
                });

              

            },
            paySelectedInvoices: function() {
                var widget = this;
                widget.invoiceTotal('');
                var selectedInvoices = [];
                $.each($("input[name='payInvoices']:checked"), function() {
                    selectedInvoices.push($(this).val());
                });
                var total = 0;
                widget.selectedInvoiceList([]);
                widget.resetModalData();
                if (selectedInvoices.length > 0) {
                    $("#invoicePaymentModal").modal("show");
                    for (var i = 0; i < widget.getInvoicesOrders().length > 0; i++) {
                        for (var j = 0; j < selectedInvoices.length > 0; j++) {
                            if (widget.getInvoicesOrders()[i].invoiceId == selectedInvoices[j]) {
                                console.log(widget.getInvoicesOrders()[i].openBlance);
                                widget.selectedInvoiceList.push({
                                    'invoiceId': widget.getInvoicesOrders()[i].invoiceId,
                                    'amount': widget.getInvoicesOrders()[i].openBlance
                                });
                                console.log(widget.selectedInvoiceList(), "...widget.selectedInvoiceList....");
                                total += parseInt(widget.getInvoicesOrders()[i].openBlance);
                                widget.invoiceTotal(total);
                            }

                        }

                    }


                } else {
                    console.log('Please choose the Invoices for payment....');
                }


            },
            resetModalData: function() {
                this.existingCardCvv.isModified(false);
                this.cardType('');
                this.cardNumber('');
                this.expiryMonth('');
                this.expiryYear('');
                this.nameOnCard('');
                this.existingCardCvv('');
                this.newCardCvv('');
                this.cardType.isModified(false);
                this.cardNumber.isModified(false);
                this.expiryMonth.isModified(false);
                this.expiryYear.isModified(false);
                this.nameOnCard.isModified(false);
                this.newCardCvv.isModified(false);
            },
            makeInvoicePayment: function() {
                var widget = this;

                if (widget.displayNewCardSection()) {
                    if (widget.validationModel.isValid()) {
                        widget.addNewCard()
                    } else {
                        widget.validationModel.errors.showAllMessages();
                    }
                } else {
                    if (widget.existingCardViewModel.isValid()) {
                        widget.invoicePayment(widget.getExistingCardId())
                    } else {
                        widget.existingCardViewModel.errors.showAllMessages();
                    }


                }


            },

            invoicePayment: function(getCardId) {
                var widget = this;
                var data = {
                    "storedCreditCardId": getCardId,
                    "accountId": widget.user().currentOrganization().repositoryId,
                    "paymentDetails": widget.selectedInvoiceList(),
                    'cvv': widget.existingCardCvv(),
                    "site": {
                        "siteURL": widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                        "siteName": widget.site().extensionSiteSettings.externalSiteSettings.siteName
                    }
                }

                var postData = {
                    "enpointUrl": helper.apiEndPoint.inovicePayment,
                    "postData": data
                }

                helper.postDataExternal(postData, function(err, result) {
                    if (result) {
                        $("#invoicePaymentModal").modal("hide");
                        console.log('result result', result);
                    } else {
                        console.log(err, "......invoice payment error");
                    }
                })

            },

            addNewCard: function() {
                var widget = this;
                widget.getAddNewCardId('')
                var cardNumber = widget.cardNumber().replace(/\d(?=\d{4})/g, "*");
                var postData = {
                    "cardDetails": {
                        /* "cardType": widget.cardType(),
                         "nameOnCard": widget.nameOnCard(),*/
                        //   "token": "5555555555554444",
                        //   "maskedCardNumber":cardNumber,
                        /* "expiryMonth": Number(widget.expiryMonth()),
                         "expiryYear": Number(widget.expiryYear()),*/
                        // "isDefault": widget.isDefaultCard()
                        "cardType": "MASTERCARD",
                        "nameOnCard": "Manoj Tyagi123",
                        "token": "5555555555554444",
                        "expiryMonth": 8,
                        "expiryYear": 25
                    },
                    "site": {
                        "siteURL": widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                        "siteName":  widget.site().extensionSiteSettings.externalSiteSettings.siteName
                    }
                }
                var data = {
                    "enpointUrl": helper.apiEndPoint.addCard + '?accountId=' + widget.user().currentOrganization().repositoryId ,
                    "postData": postData
                }

                helper.postDataExternal(data, function(err, result) {
                    if (result.hasOwnProperty('cardId')) {
                        widget.getAddNewCardId(result.cardId);
                        widget.invoicePayment(widget.getAddNewCardId())
                    } else {
                        console.log('add new card error', err);
                    }
                })

            },

            showContent: function() {
                var self = this;
                if ($(window).width() > 736) {
                    self.isDesktop(true);
                    self.isMobile(false);
                } else {
                    self.isDesktop(false);
                    self.isMobile(true);
                }
            },
            redirectOrderHistoryPage: function(orderid) {
                console.log("orderId", orderid);
                navigation.goTo("/OrderDetailsPage");
                $.Topic('GET_ORDER_ID.memory').publish(orderid)

            },
            externalShippingOrderCall: function(data, callback) {
                 var getResults = '';
                
                  var getDate = new Date();
                  var getYearVal  = getDate.getFullYear();
                  var getMonth = getDate.getMonth()+1;
                  var getMonthVal = getMonth < 10 ? '0' + getMonth :   getMonth;
                  var getDateVal = getDate.getDate() < 10 ? '0' + getDate.getDate() :   getDate.getDate();
                  var toDate = getYearVal + '-'+ getMonthVal + '-' + getDateVal;
                  var getFirstDate = new Date(getDate.getFullYear(), getDate.getMonth(), 1);
                  var month =getFirstDate.getMonth() < 10 ? '0' + getFirstDate.getMonth() :   getFirstDate.getMonth();
                  var fromDate = getFirstDate.getFullYear() + '-' +  month  + '-0'+ getFirstDate.getDate();
                    var self = this;
                     var  getData =   helper.apiEndPoint.orderHistory+'?siteURL='+self.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName='+ self.site().extensionSiteSettings.externalSiteSettings.siteName+'&accountId='+ self.user().currentOrganization().repositoryId+'&status='+data+"&fromDate="+fromDate+"&toDate="+toDate;
                    helper.getDataExternal(getData, function(err, result) {
                        if (result.orders.length>0) {
                            callback(result.orders);
    
                        }
                    })
            },

            displayDataTable: function() {
                var self = this;
                $("#shippedOrders,#openOrders,#invoiceOrders,#cancelledOrders").DataTable().destroy();
                if (self.isCancelledOrdersLoaded() && self.isOpenOrdersLoaded() && self.isShippedOrdersLoaded()) {
                    var tableIds = ['#shippedOrders', '#openOrders', '#invoiceOrders', '#cancelledOrders'];
                    for (var i = 0; i < tableIds.length; i++) {
                        $(tableIds[i]).DataTable({
                            "ordering": false,
                            "info": false,
                            responsive: true,
                            "pagingType": "numbers",
                            "iDisplayLength": 20
                        });

                    }
                    if(self.getShippedOrders().length < 20){
                        $('#shippedOrders_paginate').addClass('hide');
                     }
                     
                     if(self.getOpenOrders().length < 20){
                        $('#openOrders_paginate').addClass('hide');
                     }
                     
                     if(self.getInvoicesOrders().length < 20){
                        $('#openInvoicesOrders_paginate').addClass('hide');
                     }
                     
                     if(self.getCancellationOrders().length < 20){
                        $('#cancelledOrders_paginate').addClass('hide');
                     }
                }


            },
            getExternalCardDetails: function() {
                var widget = this;
                var cardApi = helper.apiEndPoint.cardsList + "?accountId=" + widget.user().currentOrganization().repositoryId + '&siteURL='+widget.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName;
                helper.getDataExternal(cardApi, function(err, result) {
                    if (result.storeCards.length > 0) {

                        for (var i = 0; i < result.storeCards.length; i++) {
                            if (result.storeCards[i].isDefault == false) {
                                widget.isDefaultCardValue(result.storeCards[i].id);
                                  widget.getExistingCardId(result.storeCards[i].id)
                                console.log(widget.isDefaultCardValue(), "...widget.isDefaultCardValue....");
                                widget.getExternalCardData(result.storeCards);
                                widget.isStoredCardsLoaded(true);
                            }
                        }

                    } else {
                        console.log(err, "......err.....");
                    }

                });


            },
            getExternalBillingAddresses: function() {
                var widget = this;
                var data = helper.apiEndPoint.addressList + "?accountId=" + widget.user().currentOrganization().repositoryId + '&siteURL='+widget.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName + "&usage=bill_to";
                helper.getDataExternal(data, function(err, result) {
                    if (result.addresses.length > 0) {
                        widget.getExternalBillingAddress(result.addresses);
                        for (var i = 0; i < widget.getExternalBillingAddress().length > 0; i++) {
                            if (widget.getExternalBillingAddress()[i].isDefault == true) {
                                widget.isDefaultBillingAddress(widget.getExternalBillingAddress()[i].address1 +
                                    ',' + widget.getExternalBillingAddress()[i].address2 + "," +
                                    widget.getExternalBillingAddress()[i].city + "," +
                                    widget.getExternalBillingAddress()[i].state + "," + widget.getExternalBillingAddress()[i].postalCode);
                                console.log(widget.getExternalBillingAddress()[i], 'is default...ture....');
                            }
                        }
                    } else if (err) {
                        console.log(err, "...err..");
                    }
                })
            },

            mergeWithParticularIncompleteOrder: function(pOrderId) {
                var widget = this;
                console.log("selffff", widget);
                widget.cart().mergeCartWithParticularIncompleteOrder(pOrderId);
            },
            externalInvoiceCall: function(callback) {
                var self = this;
                console.log("externalinvoice", self);

                var data = helper.apiEndPoint.invoiceList + "?accountId=" + self.user().currentOrganization().repositoryId +
                    '&siteURL=' +self.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName=' + self.site().extensionSiteSettings.externalSiteSettings.siteName;
                helper.getDataExternal(data, function(err, result) {
                    if (result.invoices.length > 0) {
                        callback(result.invoices);
                    }
                })
            },
            displayInvoiceTable: function() {
                var self = this;
                if (self.isInvoiceListLoaded()) {
                    $("#openInvoicesOrders").DataTable({
                        "ordering": false,
                        "info": false,
                        responsive: true,
                        "pagingType": "numbers",
                        "iDisplayLength": 20
                    });
                }

            },

            downloadCSV:function(){
                var self =this;
                window.open( helper.apiEndPoint.downloadCsv + "?accountId=" + self.user().currentOrganization().external_record_id +
                    '&siteURL=' +self.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName=' + self.site().extensionSiteSettings.externalSiteSettings.siteName);
            },
            SpippedOrdersSorting: function(event){
                 var widget =this;
                 var getValue = $(event.currentTarget).val();
                 if(getValue=="twoYear"){
                     widget.getShippedOrderItems(24);
                 }
                 else if(getValue=="OneYear"){
                      widget.getShippedOrderItems(12);
                 }
                  else if(getValue=="sixMonths"){
                         widget.getShippedOrderItems(6);
                 }
                  else if(getValue=="twoMonths"){
                       widget.getShippedOrderItems(2);
                 }
                 else if(getValue =='currentMonth'){
                     widget.getShippedOrderItems(1);
                 }
                 
            },
              openOrderSorting: function(event){
                 var widget =this;
                 var getValue = $(event.currentTarget).val();
                 if(getValue=="twoYear"){
                     widget.getOpenOrderItems(24);
                 }
                 else if(getValue=="OneYear"){
                      widget.getOpenOrderItems(12);
                 }
                  else if(getValue=="sixMonths"){
                         widget.getOpenOrderItems(6);
                 }
                  else if(getValue=="twoMonths"){
                       widget.getOpenOrderItems(2);
                 }
                 else if(getValue =='currentMonth'){
                     widget.getOpenOrderItems(1);
                 }
                 
            },
            cancelOrderSorting: function(event){
                 var widget =this;
                 var getValue = $(event.currentTarget).val();
                 if(getValue=="twoYear"){
                     widget.getCancelledOrderItems(24);
                 }
                 else if(getValue=="OneYear"){
                      widget.getCancelledOrderItems(12);
                 }
                  else if(getValue=="sixMonths"){
                         widget.getCancelledOrderItems(6);
                 }
                  else if(getValue=="twoMonths"){
                       widget.getCancelledOrderItems(2);
                 }
                 else if(getValue =='currentMonth'){
                     widget.getCancelledOrderItems(1);
                 }
                 
            },
            getCancelledOrderItems:function(getMonths){
                 var widget =this;
                    var getFormatedDate = widget.getFromDate(getMonths);
                     var getTodayDateFormat = widget.getTodayDate();
                     widget.searchRecordsForCancelledOrders(getFormatedDate,getTodayDateFormat, function(data){
                            console.log(data,"...data.....");
                            widget.getCancellationOrders('');
                            widget.getCancellationOrders(data);
                            widget.getCancellationOrders.valueHasMutated()
                            $("#cancelledOrders").DataTable().destroy();
                            $("#cancelledOrders").DataTable({
                                "ordering": false,
                                "info": false,
                                responsive: true,
                                "pagingType": "numbers",
                                "iDisplayLength": 20
                            });
                          
                     })
            },
            
            getShippedOrderItems : function(getMonths){
                var widget =this;
                  var getFormatedDate = widget.getFromDate(getMonths);
                     var getTodayDateFormat = widget.getTodayDate();
                     widget.searchRecordsForshippedOrders(getFormatedDate,getTodayDateFormat, function(data){
                            console.log(data,"...data.....");
                            widget.getShippedOrders('');
                            widget.getShippedOrders(data);
                            widget.getShippedOrders.valueHasMutated()
                            $("#shippedOrders").DataTable().destroy();
                            $("#shippedOrders").DataTable({
                                "ordering": false,
                                "info": false,
                                responsive: true,
                                "pagingType": "numbers",
                                "iDisplayLength": 20
                            });
                         
                     })
            },
            getOpenOrderItems : function(getMonths){
                      var widget =this;
                      var getFormatedDate = widget.getFromDate(getMonths);
                      var getTodayDateFormat = widget.getTodayDate();
                      widget.searchRecordsForshippedOrders(getFormatedDate,getTodayDateFormat, function(data){
                            console.log(data,"...data.....");
                            widget.getShippedOrders('');
                            widget.getShippedOrders(data);
                            widget.getShippedOrders.valueHasMutated()
                            $("#openOrders").DataTable().destroy();
                            $("#openOrders").DataTable({
                                "ordering": false,
                                "info": false,
                                responsive: true,
                                "pagingType": "numbers",
                                "iDisplayLength": 20
                            });
                          
                     })
            },
            
            
            getFromDate:function(getMonthValue){
                 var CurrentDate = new Date();
                 CurrentDate.setMonth(CurrentDate.getMonth()+1 - getMonthValue);
                 var getYearVal = CurrentDate.getFullYear();
                 var getMonthVal = CurrentDate.getMonth() < 10 ? '0' + CurrentDate.getMonth() :   CurrentDate.getMonth();
                 var getDateVal =CurrentDate.getDate() < 10 ? '0' + CurrentDate.getDate() :   CurrentDate.getDate();
                 return  getYearVal + '-'+ getMonthVal + '-' + getDateVal;
           
            },
            
             
            getTodayDate :function(){
                  var getDate = new Date();
                  var getYearVal  = getDate.getFullYear();
                  var getMonth = getDate.getMonth()+1;
                  var getMonthVal = getMonth < 10 ? '0' + getMonth :   getMonth;
                  var getDateVal =getDate.getDate() < 10 ? '0' + getDate.getDate() :   getDate.getDate();
                 return getYearVal + '-'+ getMonthVal + '-' + getDateVal;
                
            },
            
            
            searchRecordsForOpenOrders: function(fromDate ,newDate ,callback){
                    var self =this;
                    var data = helper.apiEndPoint.orderHistory + "?accountId=" + self.user().currentOrganization().repositoryId  +
                    '&siteURL=' +self.site().extensionSiteSettings.externalSiteSettings.siteUrl+'.currentOrganization()&siteName=' + self.site().extensionSiteSettings.externalSiteSettings.siteName+"&status=SHIPPED"+  "&fromDate="+fromDate+ "&toDate="+newDate ;
                    helper.getDataExternal(data, function(err, result) {
                    callback(result.orders);
                    })
                
            },
            
             searchRecordsForshippedOrders: function(fromDate ,newDate ,callback){
                    var self =this;
                    var data = helper.apiEndPoint.orderHistory + "?accountId=" + self.user().currentOrganization().repositoryId +
                    '&siteURL=' +self.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName=' + self.site().extensionSiteSettings.externalSiteSettings.siteName+"&status=OPEN"+  "&fromDate="+fromDate+ "&toDate="+newDate  ;
                    helper.getDataExternal(data, function(err, result) {
                        callback(result.orders);
                    })
            },
            searchRecordsForCancelledOrders: function(fromDate ,newDate ,callback){
                    var widget =this;
                    var data =  helper.apiEndPoint.orderHistory + "?accountId=" + widget.user().currentOrganization().repositoryId +
                    '&siteURL=' +widget.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName+"&status=CANCELLED"+ "&fromDate="+fromDate+ "&toDate="+newDate ;
                    helper.getDataExternal(data, function(err, result) {
                      callback(result.orders)
                    })
               },
            
            
      
            
        };
    }
);