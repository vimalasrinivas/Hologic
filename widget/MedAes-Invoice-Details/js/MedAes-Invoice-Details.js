/**
* @fileoverview hero Widget.
* 
* @author 
*/
define(
    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    ['knockout', 'jquery', 'ccResourceLoader!global/api-helper', 'ccRestClient', 'notifier', 'navigation', 'ccConstants', 'ccResourceLoader!global/paymetric-helper', 'spinner'],
    function (ko, $, helper, ccRestClient, notifier, navigation, CCConstants, paymetricUtil, spinner) { 
        "use strict";
        var widgetModel = '';
        //var invoiceId = '';
        return {
            invoiceDetails: ko.observable(),
            productIds: ko.observable(),
            displayInvoiceDetailsData: ko.observable(),
            displayNewCardSection: ko.observable(false),
            invoiceTotal: ko.observable(''),
            isDefaultCard: ko.observable(false),
            getAddNewCardId: ko.observable(''),
            getExistingCardId: ko.observable(''),
            isDefaultCardValue: ko.observable(''),
            selectedInvoices: ko.observableArray([]),
            isStoredCardsLoaded: ko.observable(false),
            invoiceId: ko.observable(),
            makeCardDefault: ko.observable(false),
            disablePayButton :ko.observable(true),
            currentInvoiceId : ko.observable(''),
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
            iframeData: ko.observable(''),
            serviceError: ko.observable(''),
            saveNewCard: ko.observable(false),
            invoicePaymentSuccess: ko.observable(false),
            spinnerOptions: {
                parent: '#loadingModal',
                posTop: '0',
                posLeft: '50%'
            },
            /**
            * Create spinner.
            */
            createSpinner: function () {
                var spinnerShow = {
                    parent: '#loadingModal',
                    posTop: '0',
                    posLeft: '50%'
                };
                var $loadingModal = $('#loadingModal');
                $loadingModal.removeClass('hide');
                $loadingModal.show();
                spinner.create(spinnerShow);
            },
            /**       
            * Destroy spinner.
            */
            destroySpinner: function () {
                 $('#loadingModal').hide();      
                spinner.destroy();    
            },
            onLoad: function (widget) {
                widgetModel = widget;
                
                // $.Topic('GET_INVOICE_ID.memory').subscribe(function (getInvoiceId) {
                //     console.log("subOrderId", getInvoiceId);
                //     if (getInvoiceId) {
                //         widget.invoiceId(getInvoiceId);
                //         widget.externalInvoiceDetailsCall();
                //       //  invoiceId = getInvoiceId;
                //     }
                // });    
                 
               // widgetModel.externalInvoiceDetailsCall(widgetModel.currentInvoiceId());     
                // for paymetric invoice payment
                paymetricUtil.loadPaymetricJs();
                paymetricUtil.fetchFrameUrl(function (frameData) {
                    if (frameData.hasOwnProperty('iframeUrl')) {
                        widget.iframeData(frameData);
                        console.log("widget.iframeData(", widget.iframeData().iframeUrl);
                    }
                });
                // for paymetric invoice payment ends here
                widget.addValidationRules();
                widget.addExistingCvvRule();
                widget.cardType.subscribe(function (newValue) {
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
              //  widget.externalInvoiceDetailsCall();
            },
            //product details call Functionalities
            fetchProductDetails: function (idResult) {
                var widget = this;
                console.log("idResult", idResult);
                ccRestClient.authenticatedRequest("/ccstoreui/v1/products?productIds=" + idResult +
                "&fields=route,displayName,primaryFullImageURL,description,repositoryId,brand,x_itemNumber", {},
                function (e) {
                console.log("heloooo", e);
                for (var i = 0; i < e.length; i++) {
                for (var j = 0; j < widget.invoiceDetails().orderItems.length; j++) {
                var productItems = widget.invoiceDetails().orderItems[j];
                if (e[i].repositoryId == productItems.productId) {
                productItems['brand'] = e[i].brand;
                productItems['primaryFullImageURL'] = e[i].primaryFullImageURL;
                productItems['x_itemNumber'] = e[i].x_itemNumber;
                } else{
                    productItems['brand'] = '';
                    productItems['primaryFullImageURL'] = '';
                    productItems['x_itemNumber'] = '';
                }
                }
                if (e.length == i + 1) {
                widget.displayInvoiceDetailsData(widget.invoiceDetails());
                }
                }
                },
                function (data) {}, "GET");
            }, 
            reprintInvoices: function (invoiceid) {      
                console.log(invoiceid,"invoiceid");
                var self = this;
                 self.createSpinner();
                var endpointUrl = helper.apiEndPoint.print + "?invoiceId=" + invoiceid.id+
                    '&siteURL=' + self.site().extensionSiteSettings.externalSiteSettings.siteUrl + '&siteName=' + self.site().extensionSiteSettings.externalSiteSettings.siteName;
                helper.getDataExternal(endpointUrl, function (err, result) {
                    if (err) {
                        self.destroySpinner();
                        var pdf = 'data:application/octet-stream;base64,' + result.pdf;
                        const downloadLink = document.createElement("a");
                        const fileName = "invoice.pdf";
                        downloadLink.href = pdf;
                        downloadLink.download = fileName;
                        downloadLink.click();
                        
                    } else {
                        console.log("resultttttt", result);
                        self.destroySpinner();
                        var pdf1 = 'data:application/octet-stream;base64,' + result.pdf;
                        const downloadLink = document.createElement("a");
                        const fileName = "invoice.pdf";
                        downloadLink.href = pdf1;
                        downloadLink.download = fileName;
                        downloadLink.click();
                    }
                });
            },
            beforeAppear: function (page) {
                console.log(page,"page");
                this.currentInvoiceId('');
                this.currentInvoiceId(page.parameters.split('=')[1]);
                console.log(this.currentInvoiceId(),"currentInvoiceId");
                
                var widget = this;
                widget.getExternalBillingAddresses();
                widget.getExternalCardDetails();
                widget.externalInvoiceDetailsCall(widget.currentInvoiceId());  
                widget.invoicePaymentSuccess(false);
               //console.log("externalinvociescall--->",widget.externalInvoiceDetailsCall());    
                   
            },
            addValidationRules: function () {
                var widget = this;
                widget.setEndYear();
                /**** start validation rules for frame */
                ko.validation.rules['validateYear'] = {
                    validator: function (val, params) {
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
            setIsModified: function () {
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
            closeModal: function () {
                this.cardType('');
                this.cardNumber('');
                this.expiryMonth('');
                this.expiryYear('');
                this.nameOnCard('');
                this.existingCardCvv('');
                this.newCardCvv('');
                this.validationModel.errors.showAllMessages(false);
                if (this.isDefaultCardValue() === "addNewCard") {
                    $('#existingCardCVV').addClass('hide');
                } else {
                    $('#existingCardCVV').removeClass('hide');
                }
                $('#invoicePaymentModal').modal('hide');
            },
            updateCard: function (data, event) {
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
                    widget.displayAddCardModal();
                }
                else if (data.isDefaultCardValue() != "addNewCard") {
                    $('#existingCardCVV').removeClass('hide');
                    widget.getExistingCardId('');
                    widget.addExistingCvvRule();
                    widget.displayNewCardSection(false);
                    widget.removeNewCardValidationRules();
                    widget.getExistingCardId(data.isDefaultCardValue());
                    /*for(var i=0;i<widget.getExternalCardData().length;i++){
                    if(dropDownValue==widget.getExternalCardData()[i].maskedCardNumber){
                    console.log(widget.getExternalCardData()[i].id,"existing card id");
                    }
                    }*/
                }
            },
            displayAddCardModal: function () {
                var frameuri = widgetModel.iframeData().iframeUrl + '?origin=https://ccstore-test-zcxa.oracleoutsourcing.com';
                console.log("widgetModel.iframeData().iframeUrl", frameuri);
                var frameElement = document.getElementById('addcardFrame');
                frameElement.contentWindow.location.href = widgetModel.iframeData().iframeUrl;
                frameElement.autosizeheight = true;
                frameElement.autosizewidth = true;
            },
            addExistingCvvRule: function () {
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
                widget.isDefaultCardValue.extend({
                    required: {
                        params: true,
                        message: "Choose card to continue"
                    },
                })
                widget.existingCardViewModel = ko.validatedObservable({
                    existingCardCvv: widget.existingCardCvv,
                    isDefaultCardValue: widget.isDefaultCardValue
                })
                widget.newCardViewModel = ko.validatedObservable({
                    isDefaultCardValue: widget.isDefaultCardValue
                })
                widget.existingCardCvv('');
                widget.existingCardCvv.isModified(false);
            },
            removeExistingCvvRule: function () {
                var widget = this;
                widget.existingCardCvv.rules.remove(function (item) {
                    return item.rule == "cvv";
                });
                widget.existingCardCvv.rules.remove(function (item) {
                    return item.rule == "required";
                });
            },
            removeNewCardValidationRules: function () {
                var widget = this;
                widget.cardType.rules.remove(function (item) {
                    return item.rule == "required";
                });
                widget.cardNumber.rules.remove(function (item) {
                    return item.rule == "required";
                });
                widget.expiryMonth.rules.remove(function (item) {
                    return item.rule == "required";
                });
                widget.expiryYear.rules.remove(function (item) {
                    return item.rule == "required";
                });
                widget.nameOnCard.rules.remove(function (item) {
                    return item.rule == "required";
                });
                widget.newCardCvv.rules.remove(function (item) {
                    return item.rule == "required";
                });
                widget.expiryYear.rules.remove(function (item) {
                    return item.rule == "validateYear";
                });
                widget.cardNumber.rules.remove(function (item) {
                    return item.rule == "creditcard";
                });
                widget.newCardCvv.rules.remove(function (item) {
                    return item.rule == "cvv";
                });
            },
            setEndYear: function () {
                var widget = this;
                var YEAR_LIST_LENGTH = 20;
                var endYear = new Date().getFullYear();
                for (var i = 0; i < YEAR_LIST_LENGTH; i++) {
                    widget.endYearList.push(endYear);
                    ++endYear;
                }
            },
            invoiceDetailsPayment: function (data, event) {
                var widget = this;
                console.log(data, "..........data.");
                console.log(event, ".........event.");
                var tempBalance = data.balanceDue;
                //var balanceAmount = tempBalance > 0 ? tempBalance : tempBalance === 0 ? 0 : -(tempBalance);
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
                this.existingCardCvv.isModified(false);
                
                widget.isDefaultCardValue("");
                widget.displayNewCardSection(false);
                widget.isDefaultCardValue.isModified(false);
                widget.saveNewCard(false);
                $("#invoicePaymentModal").modal("show");
                widget.selectedInvoices([]);
                this.invoiceTotal(data.orderSummary.total);
                this.selectedInvoices.push({ "invoiceId": data.id, "amount": tempBalance });
                //$('#addcardFrame').addClass('hide');
            },
            // invocie payment related fucntionality
            makeInvoicePayment: function () {
                var widget = this;
                
                if (widget.displayNewCardSection() && widget.newCardViewModel.isValid()) {
                    paymetricUtil.addCard(widgetModel, function (data) {
                        if (data.hasOwnProperty('token')) {
                            console.log(data.id, "...token...");
                            widget.createSpinner();
                            widget.getAddNewCardId(data.id);
                            widget.invoicePayment(widget.getAddNewCardId())
                            /* if (result.hasOwnProperty('cardId')) {
                            }*/
                        } else {
                            widgetModel.serviceError("Error in service");
                            widget.destroySpinner();  
                        }
                        paymetricUtil.fetchFrameUrl(function(frameData){
                            if(frameData.hasOwnProperty('iframeUrl')){
                            widget.iframeData(frameData);
                            console.log("widget.iframeData(",widget.iframeData().iframeUrl);
                            }
                        });
                    });
                }
                else {
                    if (widget.existingCardViewModel.isValid()) {
                        widget.createSpinner();
                        widget.invoicePayment(widget.getExistingCardId())
                    }
                    else {
                        widget.existingCardViewModel.errors.showAllMessages();
                    }
                }
            },
            invoicePayment: function (getCardId) {
                var widget = this;
                var data = {
                    "storedCreditCardId": getCardId,
                    "accountId": widget.user().currentOrganization().repositoryId,
                    "paymentDetails": widget.selectedInvoices(),
                    'cvv': widget.existingCardCvv(),
                    "currencyCode": "USD",
                    "site": {
                        "siteURL": widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                        "siteName": widget.site().extensionSiteSettings.externalSiteSettings.siteName
                    }
                };
                var postData = {
                    "enpointUrl": helper.apiEndPoint.inovicePayment,
                    "postData": data
                };
                helper.postDataExternal(postData, function (err, result) {
                    widget.displayNewCardSection(false);
                    widget.isDefaultCardValue('');
                    widget.destroySpinner();
                    if (result) {
                        $("#invoicePaymentModal").modal("hide");
                        console.log('result result', result);
                        widget.externalInvoiceDetailsCall(widget.currentInvoiceId());
                       widget.invoicePaymentSuccess(true);
                    } else {
                        $("#invoicePaymentModal").modal("hide");
                       
                        notifier.sendError(widget.WIDGET_ID, "There was an issue processing your payment. Please try again. **Will Paymetric be passing specific reasons for failures?", true);
                        widget.invoicePaymentSuccess(false);
                        console.log(err, "......invoice payment error");
                    }
                });
            },
            addNewCard: function () {
                var widget = this;
                widget.getAddNewCardId('')
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
                        "siteName": widget.site().extensionSiteSettings.externalSiteSettings.siteName
                    }
                };
                var data = {
                    "enpointUrl": helper.apiEndPoint.addCard + '?accountId=' + widget.user().currentOrganization().repositoryId,
                    "postData": postData
                };
                helper.postDataExternal(data, function (err, result) {
                    if (result.hasOwnProperty('cardId')) {
                        widget.getAddNewCardId(result.cardId);
                        widget.invoicePayment(widget.getAddNewCardId())
                    } else {
                        console.log('add new card error', err);
                        notifier.sendError(widget.WIDGET_ID, widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
                    }
                });
            },
            getExternalCardDetails: function () {
                var widget = this;
                var cardApi = helper.apiEndPoint.cardsList + "?accountId=" + widget.user().currentOrganization().repositoryId + '&siteURL=' + widget.site().extensionSiteSettings.externalSiteSettings.siteUrl + '&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName;
                helper.getDataExternal(cardApi, function (err, result) {
                    if(result){
                         if (result.storeCards.length > 0) {
                            for (var i = 0; i < result.storeCards.length; i++) {
                                if (result.storeCards[i].isDefault === true) {
                                    widget.isDefaultCardValue(result.storeCards[i].id);
                                   // console.log(widget.isDefaultCardValue(), "...widget.isDefaultCardValue....");
                                }
                                widget.getExternalCardData(result.storeCards);
                                    widget.isStoredCardsLoaded(true);
                            }
                        } 
                    }
                   else {
                        console.log(err, "......err.....");
                    }
                });
            },
            getExternalBillingAddresses: function () {
                var widget = this;
                var data = helper.apiEndPoint.addressList + "?accountId=" + widget.user().currentOrganization().repositoryId + '&siteURL=' + widget.site().extensionSiteSettings.externalSiteSettings.siteUrl + '&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName + "&usage=bill_to";
                helper.getDataExternal(data, function (err, result) {
                    if (result.addresses.length > 0) {
                        widget.getExternalBillingAddress(result.addresses);
                        for (var i = 0; i < widget.getExternalBillingAddress().length > 0; i++) {
                            if (widget.getExternalBillingAddress()[i].isDefault === true) {
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
                });
            },
            // ends here 
            redirectOrderDetailPage: function (orderid) {
                console.log("orderId", orderid);
                navigation.goTo("/OrderDetailsPage?orderNo="+orderid);                
            },
            
            externalInvoiceDetailsCall: function (fetchInvoiceId) {
      
               console.log("fetchInvoiceId", fetchInvoiceId);
                var widget = this;
                widget.createSpinner();
                if(fetchInvoiceId !== undefined){
                var data = helper.apiEndPoint.invoiceDetails + "?invoiceId=" + fetchInvoiceId +       
                    '&siteURL=' + widget.site().extensionSiteSettings.externalSiteSettings.siteUrl + '&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName;
               
                     widget.createSpinner();
                    helper.getDataExternal(data, function (err, result) {
                    	console.log("result",err);
                       
                    if (result) {
                        widget.invoiceDetails(result);
                     widget.destroySpinner();
                         if(widget.invoicePaymentSuccess()){
                             notifier.sendSuccess(widget.WIDGET_ID, "Thank you for your payment!", true);  
                         }
                        if(widget.invoiceDetails().balanceDue>0){  
                            widget.disablePayButton(true);     
                            
                        }else{
                               widget.disablePayButton(false);
                        }
                    
                        widget.displayInvoiceDetailsData(widget.invoiceDetails);
                        var productIds = [];        
                            if(widget.invoiceDetails().orderItems !== undefined){
                        			for (var j = 0; j < widget.invoiceDetails().orderItems.length; j++) {            
                        				var itemId = widget.invoiceDetails().orderItems[j].productId;
                        		       // var itemId ="809-5000-033"
                        				productIds.push(itemId);
                        				if (widget.invoiceDetails().orderItems.length == j + 1) {            
                        					widget.fetchProductDetails(productIds.toString());
                        				}
                        			}
                    }
                        			//console.log("productRequiredId", productIds.toString());      
                    }
                    
                    else{
                        widget.destroySpinner();           
                    }

                });
                }
            },
        };
    }
);