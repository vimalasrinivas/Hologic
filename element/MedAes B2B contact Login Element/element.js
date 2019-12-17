define(
  // -------------------------------------------------------------------
// DEPENDENCIES
// -------------------------------------------------------------------
[ 'jquery', 'knockout', 'notifier', 'ccPasswordValidator', 'pubsub',
  'CCi18n', 'ccConstants', 'navigation', 'ccLogger',
  'notifications', 'ccRestClient', 'viewModels/selfRegistrationViewModel','viewModels/address', 'storageApi'],

// -------------------------------------------------------------------
// MODULE DEFINITION
// -------------------------------------------------------------------
function($, ko, notifier, CCPasswordValidator, pubsub, CCi18n,
    CCConstants, navigation, ccLogger, notifications, CCRestClient, selfRegistration, Address, storageApi) {

"use strict";

var HEADER_ORGANIZATION_PICKER = '#headerOrganizationPicker';

return {
  elementName : 'MedAesB2BcontactLoginElement',

  modalMessageType : ko.observable(''),
  modalMessageText : ko.observable(''),
  showErrorMessage : ko.observable(false),
  userCreated : ko.observable(false),
  ignoreBlur : ko.observable(false),
  defaultOrganization : ko.observable(),
  secondaryOrganizations : ko.observableArray([]),
  organizationDropdownVisible : ko.observable(false),
  currentOrganizationPosition : ko.observable(),
  organizationName : ko.observable(),
  noMatchFound : ko.observable(false),
  showPicker : ko.observable(false),
  ignoreOrgRequestEmailValidation: ko.observable(true), 
  countryData: {},
  showAccountTitle : ko.observable(false),
  onLoad : function(widget) {
    var self = this;
    var afterLogIn = false;
    self.showAccountTitle(false);
    setTimeout(function() {
      if(self.secondaryOrganizations().length == 0){    
          $("#CC-organizationDropdown").removeClass("content");          
      }
          }, 500);

    $.Topic(pubsub.topicNames.USER_AUTO_LOGIN_SUCCESSFUL).subscribe(self.loadPicker.bind(self, widget.user()));
    $.Topic(pubsub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(self.loadPicker.bind(self, widget.user()));
    self.successFunc = function(data) {
      self.secondaryOrganizations.removeAll();
      if(data.items.length == 0) {
        self.noMatchFound(true);
      }
      for ( var i = 0; i < data.items.length; i++) {
        self.noMatchFound(false);
        self.secondaryOrganizations.push(data.items[i]);
      }
    }
    self.errorFunc = function(error) {
      notifier.sendError(widget.WIDGET_ID,
          error.message, true);
    }
    self.organizationName.subscribe(function(pOrgName) {
      if (pOrgName.length >= 1) {
        var inputData = {};
        inputData[CCConstants.OFFSET] = 0;
        inputData[CCConstants.LIMIT] = 20;
        inputData[CCConstants.Q] = 'name co \"' + pOrgName + '\"';
        CCRestClient.request(CCConstants.ENDPOINT_B2B_ADMINISTRATION_LIST_ORGANIZATIONS,
            inputData, self.successFunc.bind(this),
            self.errorFunc.bind(this));
      } else {
        self.noMatchFound(false);
        self.loadPicker(widget.user());
      }
    }, this);

    self.loadPicker(widget.user());
    widget.user().ignoreEmailValidation(false);

    self.handleOrganizationChange = function(orgPosition) {
      var selectedOrganization = this;
      var displayedOrganization = widget.user().currentOrganization();

      // check if the cart contains any item with child-items
      // (i.e. check for Configurable Product)
      self.currentOrganizationPosition(orgPosition);
      if (self.getRepositoryId(selectedOrganization) != self.getRepositoryId(displayedOrganization)) {
        self.storeOrganizationInLocalStorage(selectedOrganization);
        widget.cart().clearCartForProfile();
        var newURL = navigation.getBaseURL();
        window.location.assign(newURL);
      }
      self.hideOrganizationDropDown();
    }

    // To display success notification after redirection from
    // customerProfile page.
    if (widget.user().delaySuccessNotification()) {
      notifier.sendSuccess(widget.WIDGET_ID, widget.translate('updateSuccessMsg'), true);
      widget.user().delaySuccessNotification(false);
    }

    $.Topic(pubsub.topicNames.USER_RESET_PASSWORD_SUCCESS).subscribe(function(data) {
      $('#CC-forgotPasswordSectionPane').hide();
      $('#CC-headermodalpane').modal('hide');
      $('body').removeClass('modal-open');
      $('.modal-backdrop').remove();
      notifier.sendSuccess(widget.WIDGET_ID, CCi18n.t('ns.common:resources.resetPasswordMessage'), true);
    });

    $.Topic(pubsub.topicNames.USER_RESET_PASSWORD_FAILURE).subscribe(function(data) {
      notifier.sendError(widget.WIDGET_ID, data.message, true);
    });

    $.Topic(pubsub.topicNames.USER_PASSWORD_GENERATED).subscribe(function(data) {
      $('#alert-modal-change').text(CCi18n.t('ns.common:resources.resetPasswordModalOpenedText'));
      widget.user().ignoreEmailValidation(false);
      self.hideAllSections();
      $('#CC-forgotPasswordSectionPane').show();
      $('#CC-forgotPwd-input').focus();
      widget.user().emailAddressForForgottenPwd('');
      widget.user().emailAddressForForgottenPwd.isModified(false);
    });

    $.Topic(pubsub.topicNames.USER_PASSWORD_EXPIRED).subscribe(function(data) {
      widget.user().ignoreEmailValidation(false);
      self.hideAllSections();
      $('#CC-forgotPasswordSectionPane').show();
      $('#CC-forgotPwd-input').focus();
      widget.user().emailAddressForForgottenPwd('');
      widget.user().emailAddressForForgottenPwd.isModified(false);
    });

    $.Topic(pubsub.topicNames.USER_LOGIN_FAILURE).subscribe(function(obj) {
      self.modalMessageType("error");

      if (obj.errorCode && obj.errorCode === CCConstants.ACCOUNT_ACCESS_ERROR_CODE) {
        self.modalMessageText(CCi18n.t('ns.common:resources.accountError'));
      } 
      else {
        self.modalMessageText(CCi18n.t('ns.common:resources.loginError'));
      }

      self.showErrorMessage(true);
    });

    $.Topic(pubsub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(function(obj) {
      self.hideLoginModal();
      self.showErrorMessage(false);
      afterLogIn = true;
      notifier.clearSuccess(widget.WIDGET_ID);
      $('#CC-loginHeader-myAccount').focus();
      $('#CC-loginHeader-myAccount-mobile').focus();
    });

    $.Topic(pubsub.topicNames.PAGE_LAYOUT_UPDATED).subscribe(function() {
      // Replacing pub-sub subscription with this. PubSub's getting called multiple times,
      // causing this method to be called multiple times, causing login modal to appear
      // and disappear at times.
      navigation.setLoginHandler(function(data) {
        if (data && data[0] && data[0].linkToRedirect) {
          widget.user().pageToRedirect(data[0].linkToRedirect);
          if (widget.user().loggedInUserName() != '' && !widget.user().isUserSessionExpired()) {
            widget.user().handleSessionExpired();
          }
        }

        setTimeout(function() {
          $('#CC-headermodalpane').modal('show');
          self.hideAllSections();
          self.userCreated(false);
          $('#CC-loginUserPane').show();
          $('#CC-headermodalpane').on('shown.bs.modal', function() {
            if (!widget.user().loggedIn() && !widget.user().isUserLoggedOut() && widget.user().login() 
                && widget.user().login() != '' && widget.user().isUserSessionExpired()) {
              widget.user().populateUserFromLocalData(true);
              $('#CC-login-password-input').focus();
              widget.user().password.isModified(false);
            } else {
              $('#CC-login-input').focus();
              widget.user().login.isModified(false);
            }
          });
          
          $('#CC-headermodalpane').on('hidden.bs.modal', function() {
            if (!(self.userCreated() || widget.user().loggedIn()) &&
                (($('#CC-loginUserPane').css('display') == 'block') ||
                ($('#CC-updatePasswordPane').css('display') == 'block') ||
                ($('#CC-forgotPasswordSectionPane').css('display') == 'block') ||
                ($('#CC-updatePasswordErrorMessagePane').css('display') == 'block'))) {
              self.cancelLoginModal(widget);
            }
          });
        },
        CCConstants.PROFILE_UNAUTHORIZED_DEFAULT_TIMEOUT);
      });
    });

    // This pubsub checks for the page parameters and if there is a token
    // in the page URL, validates it and then starts the update expired/
    // forgotten password modal.
    $.Topic(pubsub.topicNames.PAGE_PARAMETERS).subscribe(function() {
      var token = this.parameters.occsAuthToken;
      // Proceed only if there is a token on the parameters
      if (token) {
       // Validate the token to make sure that it is valid
       // before proceeding to update the password.
       widget.user().validateTokenForPasswordUpdate(token,
         // Success callback
         function(data){
           // Let's try and update the password.
          //  navigation.goTo("/signinPageTest");   
          $('#CC-headermodalpane').modal('show');
          self.hideAllSections();   
           $('#CC-updatePasswordPane').show();
           $('#CC-headermodalpane').on('shown.bs.modal', function () {
             $('#CC-updatePassword-email').focus();
           });
         },
         // Error callback
         function(data) {
           // Error function - show error message
           $('#CC-headermodalpane').modal('show');
           self.hideAllSections();
           $('#CC-updatePasswordErrorMessagePane').show();
       });
      }
    });
  
    self.selfRegistrationRequest = new selfRegistration(); 
    if(self.countryData.length){
      self.addAddressToOrganization(self.countryData);
    }else{
      //load the country and state data
      var queryParams = {};
      queryParams[CCConstants.REGIONS] = true;
      CCRestClient.request(CCConstants.LIST_COUNTRIES, queryParams, function(data){
        self.countryData = data;
        self.addAddressToOrganization(self.countryData);
      },
          function(){});
    }
    self.addValidationsForSelfRegistration();

    widget.user().previousVisitDate.subscribe(function(newValue){
    if(afterLogIn){
      if(newValue===null && (!widget.user().GDPRProfileP13nConsentGranted() && widget.site().requireGDPRP13nConsent)){
        self.showConsentModal();
      }
    }
    afterLogIn = false;
  });

    // Added handlers to catch the ESC button when the password related models are open and closed with ESC.
    $(document).on('hidden.bs.modal','#CC-headermodalpane', function () {
      if (!(self.userCreated() || widget.user().loggedIn()) &&
        (($('#CC-loginUserPane').css('display') == 'block') ||
        ($('#CC-updatePasswordPane').css('display') == 'block') ||
        ($('#CC-forgotPasswordSectionPane').css('display') == 'block') ||
        ($('#CC-updatePasswordMessagePane').css('display') == 'block') ||
        ($('#CC-updatePasswordErrorMessagePane').css('display') == 'block'))) {
          self.cancelLoginModal(widget);
        }
    });

  },
  
  /*
   * Check to run email validations only after
   * input field is blurred out.
   */
  ignoreOrgReqEmailValidation: function(){
    this.ignoreOrgRequestEmailValidation(false);
  },
  
  /*
   * Adds UI validations for account request
   */
  addValidationsForSelfRegistration: function(){
    var self = this;
    //Adding validations for first name, last name, company name and emailAddress
    self.selfRegistrationRequest.profile.firstName.extend({ required: { params: true, message: CCi18n.t('ns.common:resources.firstNameRequired')},
      maxLength: {params: CCConstants.REPOSITORY_STRING_MAX_LENGTH, 
        message: CCi18n.t('ns.common:resources.maxlengthValidationMsg',{maxLength:CCConstants.REPOSITORY_STRING_MAX_LENGTH})}});
    self.selfRegistrationRequest.profile.lastName.extend({ required: { params: true, message: CCi18n.t('ns.common:resources.lastNameRequired')},
      maxLength: {params: CCConstants.REPOSITORY_STRING_MAX_LENGTH, 
        message: CCi18n.t('ns.common:resources.maxlengthValidationMsg',{maxLength:CCConstants.REPOSITORY_STRING_MAX_LENGTH})}});
    self.selfRegistrationRequest.name.extend({ required: { params: true, message: CCi18n.t('ns.common:resources.companyNameRequired')},
      maxLength: {params: CCConstants.ORG_REQ_NAME_MAX_LENGTH, 
        message: CCi18n.t('ns.common:resources.maxlengthValidationMsg',{maxLength:CCConstants.ORG_REQ_NAME_MAX_LENGTH})}});
    self.selfRegistrationRequest.profile.email.extend({ required: { params: true, message: CCi18n.t('ns.common:resources.emailAddressRequired')},
       email:{ params: true, onlyIf:function(){return !self.ignoreOrgRequestEmailValidation()}, message: CCi18n.t('ns.common:resources.emailAddressInvalid')},
       maxLength: {params:  CCConstants.EMAIL_ID_MAX_LENGTH, 
         message: CCi18n.t('ns.common:resources.maxlengthValidationMsg',{maxLength: CCConstants.EMAIL_ID_MAX_LENGTH})}});
    self.selfRegistrationRequest.requesterComments.extend({maxLength: {params:1000,message: CCi18n.t('ns.common:resources.requesterCommentMaxLengthText')}});
    self.selfRegistrationRequest.relatedOrganizationName.extend({maxLength: {params: CCConstants.REPOSITORY_STRING_MAX_LENGTH, 
        message: CCi18n.t('ns.common:resources.maxlengthValidationMsg',{maxLength:CCConstants.REPOSITORY_STRING_MAX_LENGTH})}});
  },

  /*
   * Method to supports multiple addresses in organization
   */
  addAddressToOrganization : function(countryList){
    var self = this;
    // Translation helper for address
    var translateHelper =  {
      translate: 
        function(key, options) {
          return CCi18n.t('ns.common:resources.' + key, options);
        }
    };
    var address = new Address(CCConstants.ACCOUNTS, null,translateHelper, countryList );
    address.country.rules.remove(function (item) {return item.rule == "required";});
    address.country.extend({ required: { params: true, onlyIf: function () { return (address.city() || address.postalCode() || address.phoneNumber() || 
        address.address1() ||address.address2())},
      message: CCi18n.t('ns.common:resources.countryMandatoryText')}});
    address.state.rules.remove(function (item) {return item.rule == "required";});
    address.state.extend({ required: { params: true, onlyIf: function () { return (address.city() || address.postalCode() || address.phoneNumber() || 
        address.address1() ||address.address2() || address.country())},
      message: CCi18n.t('ns.common:resources.stateMandatoryText')}});  
    address.address1.rules.remove(function (item) {return item.rule == "required";});
    address.address1.extend({ required: { params: true, onlyIf: function () { return (address.city() || address.postalCode() || 
        address.country() || address.phoneNumber() || address.address2())}, 
      message:  CCi18n.t('ns.common:resources.addressOneMandatoryText')}});
    address.city.rules.remove(function (item) {return item.rule == "required";});
    address.city.extend({ required: { params: true, onlyIf: function () { return (address.address1() || address.postalCode() || address.country() || 
        address.phoneNumber() || address.address2())},
      message:  CCi18n.t('ns.common:resources.cityMandatoryText')}, 
      maxLength: {params: CCConstants.CYBERSOURCE_CITY_MAXIMUM_LENGTH,
      message: CCi18n.t('ns.common:resources.invalidInput')}
    });
    address.postalCode.rules.remove(function (item) {return item.rule == "required";});
    address.postalCode.extend({ required: { params: true, onlyIf: function () { return (address.address1() || address.city() || address.country() || address.phoneNumber() || 
        address.address2()); },
      message:  CCi18n.t('ns.common:resources.postalMandatoryText')},
      maxLength: {params: CCConstants.CYBERSOURCE_POSTAL_CODE_MAXIMUM_LENGTH,message: CCi18n.t('ns.common:resources.invalidInput')}
    });
    address.phoneNumber.rules.remove(function (item) {return item.rule == "required";});
    address.phoneNumber.extend({ required: { params: true,onlyIf: function () { return (address.address1() || address.postalCode() || address.country() || 
        address.city() || address.address2()); }, 
      message:  CCi18n.t('ns.common:resources.phoneNumberMandatoryText')},
      pattern: { params: "^[0-9()+ -]+$", message: CCi18n.t('ns.common:resources.invalidInput')},
      maxLength: { params:  CCConstants.CYBERSOURCE_PHONE_NUMBER_MAXIMUM_LENGTH,message: CCi18n.t('ns.common:resources.invalidInput')}
    });
    self.selfRegistrationRequest.organization.secondaryAddresses.push({address:address});
  },
  
  loadPicker : function(pUserData) {
      console.log("loadpicker is coming");
    var self = this;
    self.organizationDropdownVisible(false);
    console.log("-----------",pUserData.loggedIn() && !pUserData.isUserLoggedOut() && !pUserData.isUserSessionExpired());
    if(pUserData.loggedIn() && !pUserData.isUserLoggedOut() && !pUserData.isUserSessionExpired()){
      
      
      self.secondaryOrganizations.removeAll();
      var inputData = {};
      inputData[CCConstants.OFFSET] = 0;
      inputData[CCConstants.LIMIT] = 20;
      CCRestClient.request(CCConstants.ENDPOINT_B2B_ADMINISTRATION_LIST_ORGANIZATIONS,
          inputData,function(data) {
        if (data && data.items) {
          console.log("loadpicker data",data);
          var displayedOrgId = self.getRepositoryId(pUserData.currentOrganization());
          self.secondaryOrganizations.removeAll();
          if(data.items.length>1){
            self.showPicker(true);
            console.log("loadpicker dataitems",data.items.length);
          }
          else{
            self.showPicker(false);
          }
          for ( var i = 0; i < data.items.length; i++) {
            if (self.getRepositoryId(data.items[i]) !== displayedOrgId){
              self.secondaryOrganizations.push(data.items[i]);
            }
          }
          if(self.secondaryOrganizations().length > 0) {
            self.showAccountTitle(true);
          }
        }
      }, 
      function(error) {
        notifier.sendError("header", error.message, true);
      });
    }
  },

  removeMessageFromPanel : function() {
    var message = this;
    var messageId = message.id();
    var messageType = message.type();
    notifier.deleteMessage(messageId, messageType);
  },

  emailAddressFocused : function(data) {
    if (this.ignoreBlur && this.ignoreBlur()) {
      return true;
    }
    this.user().ignoreEmailValidation(true);
    return true;
  },

  emailAddressLostFocus : function(data) {
    if (this.ignoreBlur && this.ignoreBlur()) {
      return true;
    }
    this.user().ignoreEmailValidation(false);
    return true;
  },

  passwordFieldFocused : function(data) {
    if (this.ignoreBlur && this.ignoreBlur()) {
      return true;
    }
    this.user().ignorePasswordValidation(true);
    return true;
  },

  passwordFieldLostFocus : function(data) {
    if (this.ignoreBlur && this.ignoreBlur()) {
      return true;
    }
    this.user().ignorePasswordValidation(false);
    return true;
  },

  confirmPwdFieldFocused : function(data) {
    if (this.ignoreBlur && this.ignoreBlur()) {
      return true;
    }
    this.user().ignoreConfirmPasswordValidation(true);
    return true;
  },

  confirmPwdFieldLostFocus : function(data) {
    if (this.ignoreBlur && this.ignoreBlur()) {
      return true;
    }
    this.user().ignoreConfirmPasswordValidation(false);
    return true;
  },

  handleLabelsInIEModals : function() {
    if (!!(navigator.userAgent.match(/Trident/))) {
      $("#CC-LoginModal label").removeClass("inline");
    }
  },

  /**
   * This method is invoked to hide the login modal.
   */
  hideLoginModal : function() {
    $('#CC-headermodalpane').modal('hide');
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
  },

  /**
   * Invoked when Login method is called
   */
  handleLogin : function(data, event) {
    if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
      notifier.clearError(this.WIDGET_ID);
      if (data.user().validateLogin()) {
        data.user().updateLocalData(false, false);
        $.Topic(pubsub.topicNames.USER_LOGIN_SUBMIT).publishWith(data.user(), [{message : "success"}]);
      }
    }
    return true;
  },

  /**
   * Invoked when cancel button is clicked on login modal
   */
  handleCancel : function(data, event) {
    if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
      notifier.clearError(this.WIDGET_ID);
      if (data.user().isUserSessionExpired()) {
        $.Topic(pubsub.topicNames.USER_LOGOUT_SUBMIT).publishWith([{message : "success"}]);
        this.hideLoginModal();
      }
    }
    return true;
  },

  handleCancelForgottenPassword: function(data, event) {
    if('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
      notifier.clearError(this.WIDGET_ID);
      navigation.doLogin(navigation.getPath(), data.links().home.route);
    }
    return true;
  },

  handleSuccessForgottenPassword: function(data, event) {
    if('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
      navigation.doLogin(data.links().home.route, data.links().home.route);
    }
    return true;
  },

  /**
   * Click handler for canceling in the SSO login modal.
   * @param data Data that is passed on the click event.
   * @param event jQuery event of the click event on the cancel button.
   */
  handleCancelSsoLogin: function(data, event) {
    if('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
      notifier.clearError(this.WIDGET_ID);
      navigation.doLogin(navigation.getPath(), data.links().home.route);
    }
    return true;
  },
  
  /**
   * This method is triggered when the user clicks on the save on
   * the create new password model
   */
  savePassword : function(data, event) {
    if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
      notifier.clearError(this.WIDGET_ID);
      data.user().ignoreConfirmPasswordValidation(false);
      data.user().ignoreEmailValidation(false);
      data.user().emailAddressForForgottenPwd.isModified(true);
      if (data.user().isPasswordValid(true) && 
          data.user().emailAddressForForgottenPwd  && 
          data.user().emailAddressForForgottenPwd.isValid()) {
        data.user().updateExpiredPasswordUsingToken(data.user().token, 
          data.user().emailAddressForForgottenPwd(), data.user().newPassword(), 
          data.user().confirmPassword(),
          function(retData) {
            // Success function
            data['MedAesB2BcontactLoginElement'].hideAllSections();    
            $('#CC-updatePasswordMessagePane').show();
            $('#CC-updatePasswordMsgContinue').focus();
          },
          function(retData) {
            // Error function - show error message
            data['MedAesB2BcontactLoginElement'].hideAllSections();
            $('#CC-updatePasswordErrorMessagePane').show();
          }
        );
      }
    }
    return true;
  },

  /**
   * Invoked when cancel button is called on.
   */
  cancelLoginModal : function(widget) {
    if (widget.hasOwnProperty("user")) {
      widget.user().handleCancel();
      if (widget.user().pageToRedirect() && widget.user().pageToRedirect() == widget.links().checkout.route && widget.cart().items().length > 0) {
        var hash = widget.user().pageToRedirect();
        widget.user().pageToRedirect(null);
        navigation.goTo(hash);
      } else {
        navigation.cancelLogin();
      }
      widget.user().pageToRedirect(null);
      notifier.clearError(widget.WIDGET_ID);
      widget.user().clearUserData();
      widget.user().profileRedirect();
    } else {
      navigation.cancelLogin();
    }
  },

  /**
   * Invoked when Logout method is called.
   */
  handleLogout : function(data) {
    // returns if the profile has unsaved changes.
    if (data.isUserProfileEdited()) {
      return true;
    }
    // Clearing the auto-login success message
    notifier.clearSuccess(this.WIDGET_ID);
    // Clearing any other notifications
    notifier.clearError(this.WIDGET_ID);
    data.updateLocalData(data.loggedinAtCheckout(), false);
    $.Topic(pubsub.topicNames.USER_LOGOUT_SUBMIT).publishWith([{message : "success"}]);
  },
  
  translate: function(key) {
      return CCi18n.t('ns.common:resources.' + key);
    },

  /**
   * Invoked when login link is clicked.
   */
  clickLogin : function(data) {
    notifier.clearSuccess(this.WIDGET_ID);
    notifier.clearError(this.WIDGET_ID);
    data.reset();
    this.hideAllSections();
    $('#CC-loginUserPane').show();
    $('#CC-headermodalpane').children(".modal-dialog").css('top', '20%');
    this.showErrorMessage(false);
    $('#CC-headermodalpane').on('shown.bs.modal', function() {
      if (!data.loggedIn() && data.login() && data.login() != '' && data.isUserSessionExpired()) {
        data.populateUserFromLocalData(true);
        $('#CC-login-password-input').focus();
        data.password.isModified(false);
      } else {
        $('#CC-login-input').focus();
        data.login.isModified(false);
      }
    });
  },

  /**
   * Ignores the blur function when mouse click is up.
   */
  handleMouseUp : function(data) {
    this.ignoreBlur(false);
    data.user().ignoreConfirmPasswordValidation(false);
    return true;
  },

  /**
   * Ignores the blur function when mouse click is down
   */
  handleMouseDown : function(data) {
    this.ignoreBlur(true);
    data.user().ignoreConfirmPasswordValidation(true);
    return true;
  },

  /**
   * Ignores the blur function when mouse click is down outside
   * the modal dialog(backdrop click).
   */
  handleModalDownClick : function(data, event) {
    if (event.target === event.currentTarget) {
      this.ignoreBlur(true);
      this.user().ignoreConfirmPasswordValidation(true);
    }
    return true;
  },

  /**
   * Invoked when forgotten Password link is clicked.
   */
  showForgotPasswordSection : function(data) {
    data.ignoreEmailValidation(false);
    this.hideAllSections();
    $('#CC-forgotPasswordSectionPane').show();
    $('#CC-forgotPwd-input').focus();
    data.emailAddressForForgottenPwd('');
    data.emailAddressForForgottenPwd.isModified(false);
  },

  /**
   * Event handler for the login with sso link on the B2B login modal.
   * It shows the SSO login modal.
   * @param data Data passed when the link is clicked.
   */
  showSsoLoginSection: function(data) {
    this.hideAllSections();
    $('#CC-ssoLoginPane').show();
    $('#CC-sso-login-account-input').focus();
    data.ssoLoginAccountName('');
  },
  
  /**
   * Invoked when request new account link is clicked.
   */
  showOrganizationRequestSection : function(data) {
    this.selfRegistrationRequest.reset();
    this.hideAllSections();
    $('#CC-headermodalpane').children(".modal-dialog").css('top', '5%');         
    $('#CC-organizationRequestPane').show();  
    $('#firstName').focus();
    this.ignoreOrgRequestEmailValidation(true);
  },
  
  /**
   * Hides all the sections of modal dialogs.
   */
  hideAllSections : function() {
    $('#CC-loginUserPane').hide();
    $('#CC-forgotPasswordSectionPane').hide();
    $('#CC-ssoLoginPane').hide();
    $('#CC-updatePasswordMessagePane').hide();
    $('#CC-updatePasswordPane').hide();
    $('#CC-updatePasswordErrorMessagePane').hide();
    $('#CC-organizationRequestPane').hide();     
    $('#CC-organizationRequestSuccessPane').hide();
    $('#CC-personalizationConsentPane').hide();
  },

  showConsentModal : function() {
    $('#CC-headermodalpane').modal('show');
    this.hideAllSections();
    $('#CC-personalizationConsentPane').show();
  },

  handlePersonalizationConsent : function(data, event) {
    if('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)){
      data.user().handleUpdateProfile();
    }
    this.hideConsentModal();
  },

  hideConsentModal : function() {
    $('#CC-headermodalpane').modal('hide');
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
  },
  
  /**
   * Click event handler for the Login button in SSO Login modal.
   * @param data Data passed when the login button is clicked.
   * @param event jQuery event for the click event.
   */
  doSsoLogin: function(data, event) {
    if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
      data.user().handleSamlLogin();
    }
    return true;
  },

  createOrganizationRequestSuccess: function(){     
    this.hideAllSections();     
    $('#CC-headermodalpane').children(".modal-dialog").css('top', '20%');
    $('#CC-organizationRequestSuccessPane').show();                     
  },      
                                     
  createOrganizationRequestFailure: function(pResponse){      
    this.modalMessageText(pResponse.message);     
    this.showErrorMessage(true);                                       
  },      
  
  /**
   * Resets the password for the entered email id.
   */
  resetForgotPassword : function(data, event) {
    if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
      data.user().ignoreEmailValidation(false);
      data.user().emailAddressForForgottenPwd.isModified(true);
      if (data.user().emailAddressForForgottenPwd  && data.user().emailAddressForForgottenPwd.isValid()) {
        data.user().resetForgotPassword();
      }
    }
    return true;
  },

  /**
   * Shows the Organization dropdown based on visible flag
   */
  showOrganizationDropDown : function(data) {
    var self = this;
    self.organizationName('');
    $(HEADER_ORGANIZATION_PICKER).addClass('active');

    // Tell the template its OK to display the currency picker.
    self.loadPicker(data);
    notifications.emptyGrowlMessages();

    $(document).on('mouseleave', HEADER_ORGANIZATION_PICKER, function() {
      self.hideOrganizationDropDown();
    });

    // to handle the mouseout/mouseleave events for ipad for currency-picker
    var isiPad = navigator.userAgent.match(CCConstants.IPAD_STRING) != null;
    if (isiPad) {
      $(document).on('touchend', function(event) {
        if (!($(event.target).closest(HEADER_ORGANIZATION_PICKER).length)) {
          self.hideOrganizationDropDown();
        }
      });
    }
    self.organizationDropdownVisible(true);
  },

  /**
   * Hides the organization dropdown based on visible flag
   */
  hideOrganizationDropDown : function() {
    // Tell the template the currency should no longer be visible.
    this.organizationDropdownVisible(false);
    $(HEADER_ORGANIZATION_PICKER).removeClass('active');
    return true;
  },

  /**
   * Adds the passed price list group to window local storage
   */
  storeOrganizationInLocalStorage : function(pOrganization) {
    var self = this;
    var displayedOrgId = self.getRepositoryId(pOrganization);
    storageApi.getInstance().setItem("orgSwitch", true);
    CCRestClient.setStoredValue(CCConstants.LOCAL_STORAGE_ORGANIZATION_ID, 
        ko.toJSON(displayedOrgId));
  },

  /**
   * Toggles the currency dropdown to show/hide it upon click on
   * link
   */
  toggleOrganizationsDropDown : function(data) {
    if ($(HEADER_ORGANIZATION_PICKER).hasClass('active')) {
      this.hideOrganizationDropDown();
    } else {
      this.showOrganizationDropDown(data);
    }
  },

  /**
   * fetches the repositoryId of an object
   */
  getRepositoryId : function(pObject) {
    var repoId = null;
    if(pObject != null){
      if (ko.isObservable(pObject.repositoryId)) {
        repoId = pObject.repositoryId();
      } else {
        repoId = pObject.repositoryId;
      }
    }
    return repoId;
  },
  
  submitSelfRegistrationRequest: function(data,event){
    console.log(data,"submitSelfRegistrationRequest");
    var self = data;
    if('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
      self.selfRegistrationRequest.organization.secondaryAddresses()[0].address.companyName(self.selfRegistrationRequest.name());
      self.selfRegistrationRequest.createSelfRegistrationRequest(self.createOrganizationRequestSuccess.bind(self),self.createOrganizationRequestFailure.bind(self));
    }
    return true;
  },

  getDisplayName: function (string, limit) {
    var dots = "...";
    if (string.length > limit) {
        string = string.substring(0, limit) + dots;
    }
    return string;
},

  };
}
);
