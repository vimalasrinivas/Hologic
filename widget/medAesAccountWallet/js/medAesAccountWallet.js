/**
 * Created by srekonda on 10/24/2016.
 */
/**
 * @fileoverview Account Addresses Widget
 */
define(
  ['ccConstants', 'knockout', 'navigation', 'notifier', 'spinner', 'ccRestClient', 'ccStoreConfiguration', 'CCi18n',
    'jquery', 'pubsub', 'ccResourceLoader!global/api-helper', 'koValidate','ccResourceLoader!global/paymetric-helper'],
  function (CCConstants, ko, navigation, notifier, spinner, CCRestClient, CCStoreConfiguration, CCi18n,
    $, pubsub, apiHelper, koValidate, paymetricUtil) {
    'use strict';
    var widgetModel = this;
    return {
      walletData: ko.observableArray([]),
      cardType: ko.observable(),
      nameOnCard: ko.observable(),
      cardNumber: ko.observable(),
      cardIINPattern: ko.observable('[0-9]'),
      cardNumberLength: ko.observable('16'),
      expiryMonth: ko.observable(),
      expiryYear: ko.observable(),
      isDefaultCard: ko.observable(false),
      endYearList : [],
      isUpdateCard : ko.observable(false),
      maskedCardNumber : ko.observable(''),
      serviceError : ko.observable(''),
      editedCardId : ko.observable(''),
      iframeData : ko.observable(''),
      saveNewCard :  ko.observable(false),
      selectedDeleteCardId : ko.observable(''),
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
      }],
      /**
      * Called when widget is first loaded:
      *    Bind callback methods context.
      *    Define computed properties.
      *    Define property validator and validation model.
      *    Define reference data for creating the scheduleMode select options (including opt groups).
      */
      onLoad: function (widget) {
         widgetModel = widget;
        widget.setEndYear();
        paymetricUtil.loadPaymetricJs();  
        widget.getIframeData();
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
            message: widget.translate('nameOnCardRequired')
          }
        });
        widget.cardType.extend({
          required: {
            params: true,
            message: widget.translate('cardTypeRequired')
          }
        })
        widget.cardNumber.extend({
          required: {
            params: true,
            message: widget.translate('cardNumberRequired')
          },
          maxLength: {
            params: CCConstants.CYBERSOURCE_CARD_NUMBER_MAXIMUM_LENGTH,
            message: widget.translate('cardNumberMaxLength', { maxLength: CCConstants.CYBERSOURCE_CARD_NUMBER_MAXIMUM_LENGTH })
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
            message: widget.translate('endMonthRequired')
          },
          endmonth: {
            params: widget.expiryYear,
            message: widget.translate('endMonthInvalid')
          },
          maxLength: {
            params: 2,
            message: widget.translate('endMonthInvalid')
          }
        });
        widget.expiryYear.extend({
          required: {
            params: true,
            message: widget.translate('endYearRequired')
          },
          minLength: {
            params: 4,
            message: widget.translate('endYearInvalid')
          },
          maxLength: {
            params: 4,
            message: widget.translate('endYearInvalid')
          },
          validateYear: {
            params: widget.endYearList,
            message: widget.translate('endYearInvalid'),
          }
        });
        widget.cardType.subscribe(function (newValue) {
          console.log("card typeeee", newValue);
          if (newValue == 'VISA') {
            widget.cardIINPattern('4'),
              widget.cardNumberLength('13|16');
              $("#cc-card-number").attr('maxlength','16');
          } else if (newValue == 'MASTERCARD') {
            widget.cardIINPattern('5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720'),
              widget.cardNumberLength('16');
              $("#cc-card-number").attr('maxlength','16');
          } else if (newValue == 'AMEX') {
            widget.cardIINPattern('3[47]'),
              widget.cardNumberLength('15');
              $("#cc-card-number").attr('maxlength','15');
          }
        });
        widget.validationModel = ko.validatedObservable({
          cardType: widget.cardType,
          cardNumber: widget.cardNumber,
          endMonth: widget.endMonth,
          endYear: widget.endYear,
          nameOnCard: widget.nameOnCard
        });
      },

      /**
       * Called each time the widget is rendered:
       *    Ensure the user is authenticated, prompt to login if not.
       */
      beforeAppear: function (widget) {
        var widget = this
        widget.fetchCardsData();
      },
      displayAddCardModal : function(){
          var frameuri= widgetModel.iframeData().iframeUrl+'?origin=https://ccstore-test-zcxa.oracleoutsourcing.com';
        console.log("widgetModel.iframeData().iframeUrl",frameuri);
        var frameElement = document.getElementById('addcardFrame');
        frameElement.contentWindow.location.href = widgetModel.iframeData().iframeUrl;
        frameElement.autosizeheight = true;
         frameElement.autosizewidth = true;
      },
      addNewCardFromFrame : function(){
          var widget = this;  
          widget.createSpinner();
          paymetricUtil.addCard(widgetModel,function(data){
              console.log("Dataaaaa",data);
              widget.destroySpinner();
              if(data.hasOwnProperty('token')){
                $('#table-wallet').DataTable().clear().destroy();
            widgetModel.walletData([]);
            widgetModel.fetchCardsData();
            $('#addCardIframe').modal('hide');
          } else{
            widget.destroySpinner();
            widgetModel.serviceError(widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError);
          }
          widget.getIframeData();
          });
      },
      setEndYear : function(){
          var widget = this;
        var YEAR_LIST_LENGTH = 20;
        var endYear = new Date().getFullYear();
        for(var i=0; i<YEAR_LIST_LENGTH; i++) {
            widget.endYearList.push(endYear);
            ++endYear;
        }
      },
      fetchCardsData: function () {
        var widget = this;
        var cardApi = apiHelper.apiEndPoint.cardsList+"?accountId="+ widget.user().currentOrganization().repositoryId +'&siteURL='+widget.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName='+ widget.site().extensionSiteSettings.externalSiteSettings.siteName;
        apiHelper.getDataExternal(cardApi, function (err, result) {
          console.log("cards listtttt", result);
          widget.walletData(result);
          $('#table-wallet').DataTable({
            "ordering": false,
            "info": false,
            responsive: true,
            "pagingType": "numbers",
            "iDisplayLength": 20,
            "retrieve": true,
            "language": {search: "",searchPlaceholder: CCi18n.t('ns.medAesAccountWallet:resources.searchPlaceholder')}
          });
          if (result.length > 20) {
            $('.paging_numbers').removeClass('hide');
          } else {
            $('.paging_numbers').addClass('hide');
          }
        })
      },
      makeCardDefault: function (cardData) {
        var widget = this;
        var postData = {
          "cardDetails": {
            "id": cardData.id,
            "isDefault": true
          },
          "site": {
            "siteURL": widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
            "siteName": widget.site().extensionSiteSettings.externalSiteSettings.siteName
          }
        }
        var data = {
          "enpointUrl": apiHelper.apiEndPoint.updateCard+'?accountId='+ widget.user().currentOrganization().repositoryId +'&cardId=' + cardData.id,
          "postData": postData
        }
          console.log("card is validddddd",data);
        apiHelper.postDataExternal(data, function (err, result) {
          if (result.hasOwnProperty('cardId')) {
            $('#table-wallet').DataTable().clear().destroy();
            widget.walletData([]);
            widget.fetchCardsData();
            $('#addCardModal').modal('hide');
          } else{
            notifier.sendError(widget.WIDGET_ID,widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
          }
        })
      },
      
      showDeleteCardPop : function(cardData){
          var widget =this;
          $('#CC-deleteCard-modal').modal('show'); 
          widget.selectedDeleteCardId(cardData.id);
      },
      
     deleteCard: function () { 
        var widget = this;       
       // console.log("cardData---->",cardData);   
        var postData = {
          "cardDetails": {
            "isActive" : false
          },
          "site": {
            "siteURL": widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
            "siteName": widget.site().extensionSiteSettings.externalSiteSettings.siteName
          }
        }
        var data = {
          "enpointUrl": apiHelper.apiEndPoint.updateCard+'?accountId='+ widget.user().currentOrganization().repositoryId +'&cardId=' +  widget.selectedDeleteCardId(),       
          "postData": postData
        }
        console.log("dataaaa", data)
        apiHelper.postDataExternal(data, function (err, result) {  
            if(err){
            notifier.sendError(widget.WIDGET_ID,widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
          }
          if (result) {
            $('#table-wallet').DataTable().clear().destroy();   
            widget.walletData([]);
            $('#CC-deleteCard-modal').modal('hide'); 
            widget.fetchCardsData();
          }
        })
      },
      addNewCard: function () {       
        var widget = this;
        if (widget.validationModel.isValid()) {   
          var cardNumber = widget.cardNumber().replace(/\d(?=\d{4})/g, "*");  
          var token;
          if(widget.cardType() === 'VISA'){
              token = '4222222222222';
          } else if(widget.cardType() === 'MASTERCARD'){
             token = '5555555555554444';
          } else if(widget.cardType() === 'AMEX'){
              token = '4012888888881881';
          }
          var postData = {
            "cardDetails": {
              "cardType": widget.cardType(),
              "nameOnCard": widget.nameOnCard(),
              "token": token,
              "cardDescription":"",
              "expiryMonth": parseInt(widget.expiryMonth()),
              "expiryYear": parseInt(widget.expiryYear()),
              "isDefault": widget.isDefaultCard()
            },
            "site": {
              "siteURL": widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
              "siteName": widget.site().extensionSiteSettings.externalSiteSettings.siteName
            }
          }
           var data = {
          "enpointUrl": apiHelper.apiEndPoint.addCard+'?accountId='+ widget.user().currentOrganization().repositoryId ,
          "postData": postData
        }
          console.log("card is validddddd",JSON.stringify(postData));
        apiHelper.postDataExternal(data, function (err, result) {
            if(err){
            $('#addCardModal').modal('hide');
            notifier.sendError(widget.WIDGET_ID,widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
          }
          if (result.hasOwnProperty('cardId')) {
            $('#table-wallet').DataTable().clear().destroy();
            widget.walletData([]);
            widget.fetchCardsData();
            $('#addCardModal').modal('hide');
          } else{
            widget.serviceError(widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError);
          }
        })
        } else {
          widget.validationModel.errors.showAllMessages();
        }      
      },
      updateCardModal : function(data){
        this.cardType(data.cardType);
        this.nameOnCard(data.nameOnCard);
        this.maskedCardNumber(data.maskedCardNumber);
        var expMonth = data.expiryMonth < 10 ? '0'+data.expiryMonth : data.expiryMonth;
        this.expiryMonth(expMonth);
        this.expiryYear(data.expiryYear);
        //this.isDefaultCard(data.isDefault);
        this.isUpdateCard(true);
        this.editedCardId(data.id);
        $('#addCardModal').modal('show');
      },
      updateCard : function(){
          var widget = this;
            var token;
          if(widget.cardType() === 'VISA'){
              token = '4222222222222';
          } else if(widget.cardType() === 'MASTERCARD'){
             token = '5555555555554444';
          } else if(widget.cardType() === 'AMEX'){
              token = '4012888888881881';
          }
        if(this.expiryMonth.isValid() && this.expiryYear.isValid() && this.nameOnCard.isValid()){
            console.log("inside ifffffffff");
            var postData = {
            "cardDetails": {
              "cardType": this.cardType(),
              "nameOnCard": this.nameOnCard(),
              "token": token,
              "expiryMonth": parseInt(this.expiryMonth()),
              "expiryYear": parseInt(this.expiryYear()),
              "isDefault": this.isDefaultCard()
            },
            "site": {
              "siteURL": widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
              "siteName": widget.site().extensionSiteSettings.externalSiteSettings.siteName
            }
          }
           var data = {
          "enpointUrl": apiHelper.apiEndPoint.updateCard+'?accountId='+ widget.user().currentOrganization().repositoryId +'&cardId=' + this.editedCardId(),
          "postData": postData
        }
          console.log("card is validddddd",postData);
        apiHelper.postDataExternal(data, function (err, result) {
            if(err){
            $('#addCardModal').modal('hide');
            notifier.sendError(widget.WIDGET_ID,widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
          }
          if (result.hasOwnProperty('cardId')) {
            $('#table-wallet').DataTable().clear().destroy();
            widget.walletData([]);
            widget.fetchCardsData();
            $('#addCardModal').modal('hide');
          } else{
            widget.serviceError(widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError);
          }
        })
        }
      },
      getIframeData: function(){
          var widget = this;
        paymetricUtil.fetchFrameUrl(function(frameData){
            if(frameData.hasOwnProperty('iframeUrl')){
            widget.iframeData(frameData);
            console.log("widget.iframeData(",widget.iframeData().iframeUrl);
        }
        });  
      },
      closeModal : function(){
        this.isUpdateCard(false);
        this.cardType('');
        this.cardNumber('');
        this.expiryMonth('');
        this.expiryYear('');
        this.nameOnCard('');
        this.validationModel.errors.showAllMessages(false);
        $('#addCardModal').modal('hide');
      },
       /**
             * Destroy the 'loading' spinner.
             * @function  OrderViewModel.destroySpinner
             */
            destroySpinner: function() {
              // console.log("destroyed");
              $('#loadingModal').hide();
              spinner.destroy();
          },

          /**
           * Create the 'loading' spinner.
           * @function  OrderViewModel.createSpinner
           */
          createSpinner: function(loadingText) {
              var indicatorOptions = {
                  parent: '#loadingModal',
                  posTop: '0',
                  posLeft: '50%'
              };
              var loadingText = CCi18n.t('ns.common:resources.loadingText');
              $('#loadingModal').removeClass('hide');
              $('#loadingModal').show();
              indicatorOptions.loadingText = loadingText;
              spinner.create(indicatorOptions);
          },
      
    };
  });