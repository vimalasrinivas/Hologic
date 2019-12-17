/**
 * @fileoverview Shopper Details Widget.
 *
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub', 'navigation', 'notifier', 'ccConstants', 'CCi18n', 'pubsub','ccResourceLoader!global/api-helper', 'koValidate','ccResourceLoader!global/paymetric-helper', 'swmRestClient','spinner'],
    
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, PubSub, navigation, notifier, CCConstants, CCi18n, pubsub, apiHelper, koValidate, paymetricUtil,swmRestClient, spinner) {   
  
    "use strict";
        
    return {
      
      WIDGET_ID:        "shopperDetails",
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
      ignoreBlur:   ko.observable(false),
      interceptedLink: ko.observable(null),
      isUserProfileInvalid: ko.observable(false),
      showSWM : ko.observable(true),
      ShowEditable: ko.observable(false),
      isProfileLocaleNotInSupportedLocales : ko.observable(),  
      saveNewCard :  ko.observable(true),
      selectedDeleteCardId:ko.observable(''),
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
      
      beforeAppear: function (page) {
          
        var widget = this;
        
         widget.fetchCardsData();  
       
        // Checks whether the user is logged in or not
        // If not the user is taken to the home page
        // and is asked to login.
        if (widget.user().loggedIn() == false) {   
          navigation.doLogin(navigation.getPath(), widget.links().home.route);
        } else if (widget.user().isSessionExpiredDuringSave()) {
          widget.user().isSessionExpiredDuringSave(false);
        } else {
          widget.showViewProfile(true);
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);
           //reset all the password detals
          widget.user().resetPassword();
          widget.user().isChangePassword(true);
          widget.showViewProfile(true);
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);
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
            "iDisplayLength": 2,   
            "retrieve": true,
            "language": {search: "",searchPlaceholder: "Search"}
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
       addNewCard: function () {       
        var widget = this;
        widget.createSpinner();
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
              widget.destroySpinner();
          if (result.hasOwnProperty('cardId')) {
            $('#table-wallet').DataTable().clear().destroy();
            widget.walletData([]);
            widget.fetchCardsData();
            $('#addCardModal').modal('hide');
          } else{
           widget.destroySpinner();
            widget.serviceError(widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError);
          }
        })
        } else {
          widget.destroySpinner();
          widget.validationModel.errors.showAllMessages();
        }      
      },
        updateCard : function(){
          var widget = this;
          widget.createSpinner();
            var token;
          if(widget.cardType() === 'VISA'){
              token = '4222222222222';
          } else if(widget.cardType() === 'MASTERCARD'){
             token = '5555555555554444';
          } else if(widget.cardType() === 'AMEX'){
              token = '4012888888881881';
          }
        if(widget.expiryMonth.isValid() && widget.expiryYear.isValid() && widget.nameOnCard.isValid()){           
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
          widget.destroySpinner();
          if (result.hasOwnProperty('cardId')) {
            $('#table-wallet').DataTable().clear().destroy();
            widget.walletData([]);
            widget.fetchCardsData();
            $('#addCardModal').modal('hide');
          } else{
            widget.destroySpinner();
            widget.serviceError(widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError);
          }
        })
        }
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
      profileEditbtn :function(data){ 
          var widget=this;   
          widget.ShowEditable(true); 
           
           
        if(widget.ShowEditable() == true){   
            $(".profile-Row").css("height", "auto");            
                    
        }
      },
      
      showDeleteCardPop : function(cardData){
          var widget =this;
          $('#CC-deleteCard-modal').modal('show'); 
          widget.selectedDeleteCardId(cardData.id);
      },
      
     deleteCard: function () { 
        var widget = this;
        console.log("cardData---->");   
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
          "enpointUrl": apiHelper.apiEndPoint.updateCard+'?accountId='+ widget.user().currentOrganization().repositoryId +'&cardId=' + widget.selectedDeleteCardId(),       
          "postData": postData
        }
        console.log("dataaaa", data)
        apiHelper.postDataExternal(data, function (err, result) {  
          if (result) {
            $('#table-wallet').DataTable().clear().destroy();   
            widget.walletData([]);
             $('#CC-deleteCard-modal').modal('hide'); 
            widget.fetchCardsData();
          }else{
              notifier.sendError(widget.WIDGET_ID,widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
          }
        })
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
        
         isalphaNumeric: function (e) {  
                var k;
    document.all ? k = e.keyCode : k = e.which;  
    return ((k > 64 && k < 91) || (k > 96 && k < 123) || k == 8 || k == 32 || (k >= 48 && k <= 57));  
            },
      onLoad: function(widget) {
         
        var self = this;
        var isModalVisible = ko.observable(false);
        var clickedElementId = ko.observable(null);
        var isModalSaveClicked = ko.observable(false);
        widget.setEndYear();  
        widget.ErrorMsg = widget.translate('updateErrorMsg');
        widget.passwordErrorMsg = widget.translate('passwordUpdateErrorMsg');
        
        
        
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
          expiryMonth: widget.expiryMonth,
          expiryYear: widget.expiryYear,
          nameOnCard: widget.nameOnCard
        });
        
        console.log("walletDataa---->",widget);  
        
        // for(var i=0; i<widget.walletData().storeCards.length; i++){ 
        //     var walletDataLength = widget.walletData().storeCards[i]
        //     if(walletDataLength == 1){         
        //         $(".profile-Row1").css("height", "197px");                      
        //     }
        // }
        
        
        widget.getProfileLocaleDisplayName = function() {
          //Return the display name of profile locale
          for (var i=0; i<widget.user().supportedLocales.length; i++) {
            if (widget.user().locale() === widget.user().supportedLocales[i].name) {
              return widget.user().supportedLocales[i].displayName; 
            }
          }
        };
        
        //returns the edited locale to be displayed in non-edit mode
        widget.getFormattedProfileLocaleDisplayName = function(item) {
          return item.name.toUpperCase() + ' - ' + item.displayName;
        };
        
        widget.showViewProfile = function (refreshData) {
          // Fetch data in case it is modified or requested to reload.
          // Change all div tags to view only.
          if(refreshData) {
            widget.user().getCurrentUser(false);
          }
        };
        /**
         * Ignores the blur function when mouse click is up
         */
        // widget.handleMouseUp = function() {
        //     var widget = this; 
               
        //     widget.ignoreBlur(false);
        //     return true;
        //   };
          
        //   /**
        //   * Ignores the blur function when mouse click is down
        //   */
        //   widget.handleMouseDown = function() {
        //     this.ignoreBlur(true);
        //     return true;
        //   };
          
        // widget.hideModal = function () {
        //   if(isModalVisible() || widget.user().isSearchInitiatedWithUnsavedChanges()) {
        //     $("#CC-customerProfile-modal-1").modal('hide');
        //     $('body').removeClass('modal-open');
        //     $('.modal-backdrop').remove();
        //   }
        // };
        
        // widget.showModal = function () {
        //   $("#CC-customerProfile-modal-1").modal('show');
        //   isModalVisible(true);
        // };
        
        // Handle cancel update.
        widget.handleCancelUpdateForShopperDetails = function () {         
              
          widget.showViewProfile(true);
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);   
          widget.hideModal();
          widget.user().isUserProfileEdited(false);
          widget.ShowEditable(false);   
           if ($(window).width() > 991) {
            if(widget.ShowEditable() == false){   
                $(".profile-Row").css("height", "187px");                  
            }
           }
        };
        
        // Discards user changes and navigates to the clicked link.
        widget.handleModalCancelUpdateDiscard = function () {
          widget.handleCancelUpdateForShopperDetails();
          if ( widget.user().isSearchInitiatedWithUnsavedChanges() ) {
            widget.hideModal();
            widget.user().isSearchInitiatedWithUnsavedChanges(false);
          }
          else {
            widget.navigateAway();
          }
        };
         
        // Handles User profile update for account details
        widget.handleUpdateProfileForShopperDetails = function () {
          var inputParams = {};
          var isDataInValid = false;
          var isDataModified = false;
          var includeUserProfile = false;
          var includeDynamicProperties = false;
          // checking whether user profile is modified/valid.
          if (widget.user().isProfileModified()) {
           if (!widget.user().isProfileValid()) {
              isDataInValid = true;
           } else {
              includeUserProfile = true;
           }
           isDataModified = true;
            widget.ShowEditable(false);   
           if ($(window).width() > 991) {   
                if(widget.ShowEditable() == false){   
                    $(".profile-Row").css("height", "198px");                         
                }
           } 
          }
           if (widget.user().dynamicProperties().length > 0) {
             if (widget.user().isDynamicPropertiesModified()) {
              for ( var i = 0; i < widget.user().dynamicProperties().length; i++) {
                var dynProp = widget.user().dynamicProperties()[i];
                if (!dynProp.isValid()) {
                   isDataInValid = true;
                   break;
                 }
              }
            if (!isDataInValid) {
                includeDynamicProperties = true;
            }
             isDataModified = true;
           }
          }
          if (!isDataModified) {
           // If data is not modified, show the view profile page.
           $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_NOCHANGE).publish();
           return;
          } else if (isDataInValid) {
           // If data is invalid, show error message.
           $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_INVALID).publish();
           return;
          }
          if(includeUserProfile){
             widget.user().handleAccountDetailsUpdate(inputParams);
          }
          if(includeDynamicProperties){
             widget.user().handleDynamicPropertiesUpdate(inputParams);
          }
           widget.user().invokeUpdateProfile(inputParams);
        };
        
        // Handles User profile update for account details and navigates to the clicked link.
        widget.handleModalUpdateProfile = function () {
          isModalSaveClicked(true);
          if ( widget.user().isSearchInitiatedWithUnsavedChanges() ) {
            widget.handleUpdateProfileForShopperDetails();
            widget.hideModal();
            widget.user().isSearchInitiatedWithUnsavedChanges(false);
            return;
          }
          if (clickedElementId != "CC-loginHeader-myAccount") {
            widget.user().delaySuccessNotification(true);
          }
          widget.handleUpdateProfileForShopperDetails();
        };
        
        
       // Handles if data does not change. 
        $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_NOCHANGE).subscribe(function() {
          // Resetting profile.
          widget.showViewProfile(false);
          // Hide the modal.
          widget.hideModal();
          widget.user().isUserProfileEdited(false);
        });

        //handle if the user logs in with different user when the session expiry prompts to relogin
        $.Topic(PubSub.topicNames.USER_PROFILE_SESSION_RESET).subscribe(function() {
          // Resetting profile.
          widget.showViewProfile(false);
          // Hide the modal.
          widget.hideModal();
          this.user().isUserProfileEdited(false);
        });
        
        // Handles if data is invalid.
        $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_INVALID).subscribe(function() {
          notifier.sendError(widget.WIDGET_ID, widget.ErrorMsg, true);
          if (isModalSaveClicked()) {
            widget.isUserProfileInvalid(true);
            isModalSaveClicked(false);
          }
          widget.user().delaySuccessNotification(false);
          // Hide the modal.
          widget.hideModal();
        });
        
        // Handles if user profile update is saved.
        $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_SUCCESSFUL).subscribe(function() {
          // update user in Social module
        	widget.user().isUserProfileEdited(false);
          if (widget.displaySWM) {
            var successCB = function(result){
              $.Topic(PubSub.topicNames.SOCIAL_SPACE_SELECT).publish();
              $.Topic(PubSub.topicNames.SOCIAL_SPACE_MEMBERS_INFO_CHANGED).publish();
            };
            var errorCB = function(response, status, errorThrown){};
            
            var json = {};
            if (widget.user().emailMarketingMails()) {
              json = {
                firstName : widget.user().firstName()
                , lastName : widget.user().lastName()
              };
            }
            else {
              json = {
	                firstName : widget.user().firstName()
	                , lastName : widget.user().lastName()
	                , notifyCommentFlag : '0'
                  , notifyNewMemberFlag : '0'
	            };
	          }
	          
            swmRestClient.request('PUT', '/swm/rs/v1/sites/{siteid}/users/{userid}', json, successCB, errorCB, {
              "userid" : swmRestClient.apiuserid
            });
          }
          
          widget.showViewProfile(true);
          // Clears error message.
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);
          if (!widget.user().delaySuccessNotification()) {
            notifier.sendSuccess(widget.WIDGET_ID, widget.translate('updateSuccessMsg'), true);
          }
          widget.hideModal();
          if (isModalSaveClicked()) {
            isModalSaveClicked(false);
            widget.navigateAway();
          }
          $.Topic(PubSub.topicNames.DISCARD_ADDRESS_CHANGES).publish();
        });
        
        // Handles if user profile update is failed.
        $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_FAILURE).subscribe(function(data) {
          if (isModalSaveClicked()) {
            widget.isUserProfileInvalid(true);
            isModalSaveClicked(false);
          }
          widget.user().delaySuccessNotification(false);
          // Hide the modal.
          widget.hideModal();
          if (data.status == CCConstants.HTTP_UNAUTHORIZED_ERROR) {
            widget.user().isSessionExpiredDuringSave(true);
            navigation.doLogin(navigation.getPath());
          } else {
            var msg = widget.passwordErrorMsg;
            notifier.clearError(widget.WIDGET_ID);
            notifier.clearSuccess(widget.WIDGET_ID);
            if (data.errorCode === CCConstants.USER_PROFILE_INTERNAL_ERROR) {
              msg = data.message;
              // Reloading user profile and shipping data in edit mode.
              widget.user().getCurrentUser(false);
            } 
            else {
              msg = data.message;
            }
            notifier.sendError(widget.WIDGET_ID, msg, true);
            widget.hideModal();
          }
          $.Topic(PubSub.topicNames.DISCARD_ADDRESS_CHANGES).publish();
        });
        
        $.Topic(PubSub.topicNames.UPDATE_USER_LOCALE_NOT_SUPPORTED_ERROR).subscribe(function() {
          widget.isProfileLocaleNotInSupportedLocales(true);
        });
        
        /**
         *  Navigates window location to the interceptedLink OR clicks checkout/logout button explicitly.
         */
        widget.navigateAway = function() {

          if (clickedElementId === "CC-header-checkout" || clickedElementId === "CC-loginHeader-logout" || clickedElementId === "CC-customerAccount-view-orders" 
              || clickedElementId === "CC-header-language-link" || clickedElementId.indexOf("CC-header-languagePicker") != -1) {
            widget.removeEventHandlersForAnchorClick();
            widget.showViewProfile(false);
            // Get the DOM element that was originally clicked.
            var clickedElement = $("#"+clickedElementId).get()[0];
            clickedElement.click();
          } else if (clickedElementId === "CC-loginHeader-myAccount") {
            // Get the DOM element that was originally clicked.
            var clickedElement = $("#"+clickedElementId).get()[0];
            clickedElement.click();
          } else {
            if (!navigation.isPathEqualTo(widget.interceptedLink)) {
              navigation.goTo(widget.interceptedLink);
              widget.removeEventHandlersForAnchorClick();
            }
          }
        };
        
        // handler for anchor click event.
        var handleUnsavedChanges = function(e, linkData) {
          var usingCCLink = linkData && linkData.usingCCLink;
          
          widget.isProfileLocaleNotInSupportedLocales(false);
          // If URL is changed explicitly from profile.
//          if(!usingCCLink && !navigation.isPathEqualTo(widget.links().profile.route)) {
//            widget.showViewProfile(false);
//            widget.removeEventHandlersForAnchorClick();
//            return true;
//          }
          if (widget.user().loggedIn()) {
            clickedElementId = this.id;
            widget.interceptedLink = e.currentTarget.pathname;
            if (widget.user().isUserProfileEdited()) {
              widget.showModal();
              usingCCLink && (linkData.preventDefault = true);
              return false;
            }
            else {
              widget.showViewProfile(false);
            }
          }
        };
        
        var controlErrorMessageDisplay = function(e) {
          widget.isProfileLocaleNotInSupportedLocales(false);
        };
        
        widget.inputFieldFocused = function(data, event) {
        	this.user().isUserProfileEdited(true);
        	return true;
        };
        
        /**
         *  Adding event handler for anchor click.
         */
        widget.addEventHandlersForAnchorClick = function() {
          $("body").on("click.cc.unsaved","a",handleUnsavedChanges);
          $("body").on("mouseleave", controlErrorMessageDisplay);
        };  
        
        /**
         *  removing event handlers explicitly that has been added when anchor links are clicked.
         */
        widget.removeEventHandlersForAnchorClick = function(){
          $("body").off("click.cc.unsaved","a", handleUnsavedChanges);
        };
        
       
        widget.ErrorMsg = widget.translate('updateErrorMsg');
        widget.passwordErrorMsg = widget.translate('passwordUpdateErrorMsg');      
          
        // widget.showViewProfile = function (refreshData) {
        //   // Fetch data in case it is modified or requested to reload.
        //   // Change all div tags to view only.
        //   if(refreshData) {
        //     widget.user().getCurrentUser(false);
        //   }
        // };

        /**
         * Ignores password validation when the input field is focused.
         */  
        widget.passwordFieldFocused = function(data, event) {
          if (this.ignoreBlur && this.ignoreBlur()) {
            return true;
          }
          this.user().ignorePasswordValidation(true);
          this.user().isUserProfileEdited(true);
          return true;
        };

        /**
         * Password is validated when the input field loses focus (blur).
         */
        widget.passwordFieldLostFocus = function(data, event) {
          if (this.ignoreBlur && this.ignoreBlur()) {
            return true;
          }
          this.user().ignorePasswordValidation(false);        
          return true;
        };  
        
        widget.inputFieldFocused = function(data, event) {
        	this.user().isUserProfileEdited(true);
        	return true;
        };
          
        /**
         * Ignores confirm password validation when the input field is focused.
         */
        widget.confirmPwdFieldFocused = function(data, event) {
          if (this.ignoreBlur && this.ignoreBlur()) {
            return true;
          }
          this.user().isUserProfileEdited(true);
          this.user().ignoreConfirmPasswordValidation(true);
          return true;
        };

        /**
         * Confirm password is validated when the input field loses focus (blur).
         */
        widget.confirmPwdFieldLostFocus = function(data, event) {
          if (this.ignoreBlur && this.ignoreBlur()) {
            return true;
          }
          this.user().ignoreConfirmPasswordValidation(false);
          return true;
        };

        /**
         * Ignores the blur function when mouse click is up
         */
        widget.handleMouseUp = function() {
            this.ignoreBlur(false);
            this.user().ignoreConfirmPasswordValidation(false);
            return true;
          };
          
          /**
           * Ignores the blur function when mouse click is down
           */
          widget.handleMouseDown = function() {
            this.ignoreBlur(true);
            this.user().ignoreConfirmPasswordValidation(true);
            return true;
          };
          
        widget.hideModal = function () {
          if(isModalVisible() || widget.user().isSearchInitiatedWithUnsavedChanges()) {
            $("#CC-customerProfile-modal-2").modal('hide');
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
          }
        }; 
        
        widget.showModal = function () {
          $("#CC-customerProfile-modal-2").modal('show');
          isModalVisible(true);
        };
        
        // Handle cancel update.
        widget.handleCancelUpdateForUpdatePassword = function () {
          widget.showViewProfile(true);
          widget.user().resetPassword();
          notifier.clearError(widget.WIDGET_ID);
          notifier.clearSuccess(widget.WIDGET_ID);
          widget.hideModal();
          widget.user().isUserProfileEdited(false);
          widget.ShowEditable(false); 
           if ($(window).width() > 991) {   
                if(widget.ShowEditable() == false){   
                    $(".profile-Row").css("height", "198px");                         
                }
           }   
        };
        
        // Discards user changes and navigates to the clicked link.
        // widget.handleModalCancelUpdateDiscard = function () {
        //   widget.handleCancelUpdateForUpdatePassword();
        //   if ( widget.user().isSearchInitiatedWithUnsavedChanges() ) {
        //     widget.hideModal();
        //     widget.user().isSearchInitiatedWithUnsavedChanges(false);
        //     widget.user().isUserProfileEdited(false);
        //   } 
        //   else {
        //   	widget.user().isUserProfileEdited(false);
        //     widget.navigateAway();
        //   }
        // };
        
        // Handles User profile update for password change
        widget.handleUpdateProfileForUpdatePassword = function () {
          var inputParams = {};
          var isDataInValid = false;
          var isDataModified = false;
          var includeUserPassword = false;   
          if (!widget.user().isPasswordValid()) {
            isDataInValid = true;
          }else {
            includeUserPassword = true;
          }
          if (widget.user().isPasswordModified()) {
            isDataModified = true;
            
          }
          if (!isDataModified) {
          // If data is not modified, show the view profile page.
          $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_NOCHANGE).publish();
         
           return;
          } else if (isDataInValid) {
          // If data is invalid, show error message.
          $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_INVALID).publish();
           return;
          }
          if(includeUserPassword){
            widget.user().handleUpdatePassword(inputParams);
          }
          widget.user().invokeUpdateProfile(inputParams);
           widget.ShowEditable(false);   
           if ($(window).width() > 991) {   
                if(widget.ShowEditable() == false){   
                    $(".profile-Row").css("height", "198px");                         
                }
           }                
        };
        
        // // Handles User profile update for password change and navigates to the clicked link.
        // widget.handleModalUpdateProfile = function () {  
        //   isModalSaveClicked(true);
        //   if ( widget.user().isSearchInitiatedWithUnsavedChanges() ) {  
        //     widget.handleUpdateProfileForUpdatePassword();  
        //     widget.hideModal();
        //     widget.user().isSearchInitiatedWithUnsavedChanges(false);        
        //     return;
        //   }
        //   if (clickedElementId != "CC-loginHeader-myAccount") {
        //     widget.user().delaySuccessNotification(true);  
        //   }
        //   widget.handleUpdateProfileForUpdatePassword();
        // };
        
        
//       // Handles if data does not change. 
//         $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_NOCHANGE).subscribe(function() {
//           // Resetting profile.
//           widget.showViewProfile(false);
//           // Hide the modal.
//           widget.hideModal();
//         });

//         //handle if the user logs in with different user when the session expiry prompts to relogin
//         $.Topic(PubSub.topicNames.USER_PROFILE_SESSION_RESET).subscribe(function() {
//           // Resetting profile.
//           widget.showViewProfile(false);
//           // Hide the modal.
//           widget.hideModal();
//         });
        
//         // Handles if data is invalid.
//         $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_INVALID).subscribe(function() {
//           notifier.sendError(widget.WIDGET_ID, widget.ErrorMsg, true);
//           if (isModalSaveClicked()) {
//             widget.isUserProfileInvalid(true);
//             isModalSaveClicked(false);
//           }
//           widget.user().delaySuccessNotification(false);
//           // Hide the modal.
//           widget.hideModal();
//         });
        
//         // Handles if user profile update is saved.
//         $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_SUCCESSFUL).subscribe(function() {
//           widget.showViewProfile(true);
//           // Clears error message.
//           notifier.clearError(widget.WIDGET_ID);
//           notifier.clearSuccess(widget.WIDGET_ID);
//           if (!widget.user().delaySuccessNotification()) {
//             notifier.sendSuccess(widget.WIDGET_ID, widget.translate('updateSuccessMsg'), true);
//           }
//           widget.hideModal();
//           widget.user().isUserProfileEdited(false);
//           if (isModalSaveClicked()) {
//             isModalSaveClicked(false);
//             widget.navigateAway();
//           }
//           $.Topic(PubSub.topicNames.DISCARD_ADDRESS_CHANGES).publish();
//         });
        
//         // Handles if user profile update is failed.
//         $.Topic(PubSub.topicNames.USER_PROFILE_UPDATE_FAILURE).subscribe(function(data) {
//           if (isModalSaveClicked()) {
//             widget.isUserProfileInvalid(true);
//             isModalSaveClicked(false);
//           }
//           widget.user().delaySuccessNotification(false);
//           // Hide the modal.
//           widget.hideModal();
//           if (data.status == CCConstants.HTTP_UNAUTHORIZED_ERROR) {
//             widget.user().isSessionExpiredDuringSave(true);
//             navigation.doLogin(navigation.getPath());
//           } else {
//             var msg = widget.passwordErrorMsg;
//             notifier.clearError(widget.WIDGET_ID);
//             notifier.clearSuccess(widget.WIDGET_ID);
//             if (data.errorCode == CCConstants.USER_PROFILE_OLD_PASSWORD_INCORRECT) {
//               $('#CC-customerProfile-soldPassword-phone-error-1').css("display", "block");
//               $('#CC-customerProfile-soldPassword-phone-error-1').text(data.message);
//               $('#CC-customerProfile-soldPassword-phone').addClass("invalid");
//               $('#CC-customerProfile-spassword1-error-1').css("display", "block");
//               $('#CC-customerProfile-spassword1-error-1').text(data.message);
//               $('#CC-customerProfile-soldPassword-1').addClass("invalid");
//             } else if (data.errorCode == CCConstants.USER_PROFILE_PASSWORD_POLICIES_ERROR) {
//               $('#CC-customerProfile-spassword-error-1').css("display", "block");
//               $('#CC-customerProfile-spassword-error-1').text(CCi18n.t('ns.common:resources.passwordPoliciesErrorText'));
//               $('#CC-customerProfile-spassword-1').addClass("invalid");
//               $('#CC-customerProfile-spassword-embeddedAssistance-1').css("display", "block");
//               var embeddedAssistance = CCPasswordValidator.getAllEmbeddedAssistance(widget.passwordPolicies(), true);
//               $('#CC-customerProfile-spassword-embeddedAssistance-1').text(embeddedAssistance);
//             } else if (data.errorCode === CCConstants.USER_PROFILE_INTERNAL_ERROR) {
//               msg = data.message;
//               // Reloading user profile and shipping data in edit mode.
//               widget.user().getCurrentUser(false);
//               widget.reloadShipping();
//             } 
//              else {
//               msg = data.message;
//             }
//             notifier.sendError(widget.WIDGET_ID, msg, true);
//             widget.hideModal();
//           }
//           $.Topic(PubSub.topicNames.DISCARD_ADDRESS_CHANGES).publish();
//         });
        
//         $.Topic(PubSub.topicNames.UPDATE_USER_LOCALE_NOT_SUPPORTED_ERROR).subscribe(function() {
//           widget.isProfileLocaleNotInSupportedLocales(true);
//         });
        
//         /**
//          *  Navigates window location to the interceptedLink OR clicks checkout/logout button explicitly.
         
//         widget.navigateAway = function() {

//           if (clickedElementId === "CC-header-checkout" || clickedElementId === "CC-loginHeader-logout" || clickedElementId === "CC-customerAccount-view-orders" 
//               || clickedElementId === "CC-header-language-link" || clickedElementId.indexOf("CC-header-languagePicker") != -1) {
//             widget.removeEventHandlersForAnchorClick();
//             widget.showViewProfile(false);
//             // Get the DOM element that was originally clicked.
//             var clickedElement = $("#"+clickedElementId).get()[0];
//             clickedElement.click();
//           } else if (clickedElementId === "CC-loginHeader-myAccount") {
//             // Get the DOM element that was originally clicked.
//             var clickedElement = $("#"+clickedElementId).get()[0];
//             clickedElement.click();
//           } else {
//             if (!navigation.isPathEqualTo(widget.interceptedLink)) {
//               navigation.goTo(widget.interceptedLink);
//               widget.removeEventHandlersForAnchorClick();
//             }
//           }
//         };
        
//         // handler for anchor click event.
//         var handleUnsavedChanges = function(e, linkData) {
//           var usingCCLink = linkData && linkData.usingCCLink;
          
//           widget.isProfileLocaleNotInSupportedLocales(false);
//           // If URL is changed explicitly from profile.
// //          if(!usingCCLink && !navigation.isPathEqualTo(widget.links().profile.route)) {
// //            widget.showViewProfile(false);
// //            widget.removeEventHandlersForAnchorClick();
// //            return true;
// //          }
//           if (widget.user().loggedIn()) {
//             clickedElementId = this.id;
//             widget.interceptedLink = e.currentTarget.pathname;
//             if (widget.user().isUserProfileEdited()) {
//               widget.showModal();
//               usingCCLink && (linkData.preventDefault = true);
//               return false;
//             }
//             else {
//               widget.showViewProfile(false);
//             }
//           }
//         };
        
//         var controlErrorMessageDisplay = function(e) {
//           widget.isProfileLocaleNotInSupportedLocales(false);   
//         };
          
//         /**
//          *  Adding event handler for anchor click.
//          */
//         widget.addEventHandlersForAnchorClick = function() {
//           $("body").on("click.cc.unsaved","a",handleUnsavedChanges);   
//           $("body").on("mouseleave", controlErrorMessageDisplay);
//         };
        
//         /**
//          *  removing event handlers explicitly that has been added when anchor links are clicked.
//          */
//         widget.removeEventHandlersForAnchorClick = function(){
//           $("body").off("click.cc.unsaved","a", handleUnsavedChanges);
//         };*/
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
  }
);
