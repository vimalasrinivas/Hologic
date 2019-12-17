/**
 * @fileoverview hero Widget.
 * 
 * @author 
 */
define(
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  ['jquery', 'knockout', 'ccResourceLoader!global/api-helper', 'notifier', 'ccPasswordValidator', 'pubsub',
    'CCi18n', 'ccConstants', 'navigation', 'ccLogger',
    'notifications', 'ccRestClient', 'viewModels/selfRegistrationViewModel', 'viewModels/address'],

  function ($, ko, helper, notifier, CCPasswordValidator, pubsub, CCi18n,
    CCConstants, navigation, ccLogger, notifications, CCRestClient, selfRegistration, Address) {

    "use strict";

    return {
      modalMessageType: ko.observable(''),
      modalMessageText: ko.observable(''),
      showErrorMessage: ko.observable(false),
      firstName: ko.observable(),
      lastName: ko.observable(),
      emailAddress: ko.observable(),
      phoneNo1: ko.observable(""),
      phoneNo2: ko.observable(""),
      phoneNo3: ko.observable(""),
      companyName: ko.observable(),
      accountNumber: ko.observable(),
      countryValues: ko.observable(),
      countryOptions: ko.observable(""),
      phoneNumber: ko.observable(),
      States: ko.observable(),
      stateOptions: ko.observable(""),
      ignoreBlur: ko.observable(false),
      signInUsername: ko.observable(),
      signInPassword: ko.observable(),
      showCaptchaError: ko.observable(false),         
      onLoad: function (widget) {
        var self = this;
        var afterLogIn = false;

        console.log("signinPageshow");
        $('#CC-loginUserPane').show();
        $('#CC-forgotPasswordSectionPane').hide();
        $('#CC-updatePasswordPane').hide();
        $('#CC-updatePasswordMessagePane').hide();
        $('#CC-updatePasswordErrorMessagePane').hide();
      //  widget.removeValidationRules();


        widget.getListCountry();

       // console.log(widget.countryOptions().length, "widget.countryOptions().length");





        widget.firstName.extend({
          required: {
            params: true,
            message: widget.translate('First Name is mandatory.')
          }
        });

        widget.lastName.extend({
          required: {
            params: true,
            message: widget.translate('Last Name is mandatory.')
          }
        });

        widget.emailAddress.extend({
          required: {
            params: true,
            message: widget.translate('Email Address is mandatory.')
          },
          email:{
            params:true,
            message: widget.translate('Please enter a proper email address.')
          }
        });


        widget.phoneNumber.extend({
          required: {
            params: true,
            message: widget.translate('Phone Number is mandatory.'),
          },
          minLength: {
            params: 10,
            message: widget.translate('Invalid Phone Number.')
          }
        });



        widget.companyName.extend({
          required: {
            params: true,
            message: widget.translate('Company Name is mandatory.')
          }
        });

        widget.accountNumber.extend({
          required: {
            params: true,
            message: widget.translate('Account Number is mandatory.')
          },
          alphaNumeric: {
            params: true,
            message: widget.translate('Invalid Account Number')
          }
        });

        widget.countryOptions.extend({
          required: {
            params: true,
            message: widget.translate('Please Select Country.')
          }
        });

        widget.stateOptions.extend({
          required: {
            params: true,
            message: widget.translate('Please Select State.')
          }
        });




        widget.validationModel = ko.validatedObservable({
          firstName: widget.firstName,
          lastName: widget.lastName,
          emailAddress: widget.emailAddress,
          companyName: widget.companyName,
          accountNumber: widget.accountNumber,
          countryOptions: widget.countryOptions

        });

        ko.validation.rules.pattern.message = 'Enter a valid Email Address.';
        ko.validation.init({
          registerExtenders: true,
          messagesOnModified: true,
          insertMessages: false,
          parseInputAttributes: true,
          messageTemplate: null
        }, true);


      },

      updateCountryOptions: function (data, event) {
        var widget = this;
        var getValue = $(event.currentTarget).val();
        // console.log(getValue, "...valu");
        if (getValue) {
          widget.countryOptions(getValue);
        }
        // widget.getListState(getValue);
      },

      // removeValidationRules

      setIsModified: function () {
        var widget = this;
        widget.firstName('');
        widget.lastName('');
        widget.emailAddress('');
        widget.companyName('');
        widget.accountNumber('');
        $('select').val('');
        widget.firstName.isModified(false);
        widget.lastName.isModified(false);
        widget.companyName.isModified(false);
        widget.emailAddress.isModified(false);
        widget.countryOptions.isModified(false);
        widget.accountNumber.isModified(false);
    },

      //getList countries
      

      getListCountry: function () {
        var widget = this;
        var countries = [];
        helper.getDataExternal(helper.apiEndPoint.getListCountry, function (err, result) {
          widget.countryValues(result.countries);
          console.log("getListCountry", countries);
        });

      },
      //submit button functionalities
      submitButton: function (data) {
        var widget = this;
        if (widget.validationModel.isValid() && grecaptcha.getResponse() != "") {
            widget.showCaptchaError(false);
          var skuData = {
            /*Can be added if account id needs to be assigned to created account*/
            "requestedOrganization": {
              "name": data.companyName(),
              "id": data.accountNumber(),

            },
            /*Can be added if account id needs to be assigned to created account*/
            "profile": {
              "firstName": data.firstName(),
              "lastName": data.lastName(),
              "email": data.emailAddress(),
              "company_name": data.companyName(),
              "country_name": data.countryOptions()
            },

          };
          var postData = {
            "enpointUrl": helper.apiEndPoint.createProfile,
            "postData": skuData
          };
          helper.postDataExternal(postData, function (err, result) {
            console.log("profileResult", result);
            if (err) {
              notifier.sendError(widget.WIDGET_ID, widget.translate('This account is already registered, please try again with new email id'), false);
            }
            if (result) {
              grecaptcha.reset();
              $("#myModal").modal('show');
            }
          });
          widget.setIsModified();
        } else {
          widget.validationModel.errors.showAllMessages();
          if(grecaptcha.getResponse() === ""){
            widget.showCaptchaError(true);  
          }
        }
        //widget.resetFields();
     
      },

      // resetFields: function (data) {
      //   var widget = this;
      //   widget.firstName('');
      //   widget.lastName('');
      //   widget.emailAddress('');
        
      //   widget.accountNumber('');
      //   widget.companyName('');
      // //  $("form p").hide();
      // },

      beforeAppear: function (page) {
          var widget = this;
        var correctCaptcha = function (response) {
          //alert(response);
         widget.showCaptchaError(false); 
        };

        if ($("#html_element").length) {
          var node = document.createElement('script');
          node.type = 'text/javascript';
          node.id = 'GoogleMaps';
          node.onload = setTimeout(function () {
            grecaptcha.render('html_element', {
              'sitekey': widget.site().extensionSiteSettings.externalSiteSettings.googleApiKey,
              'callback': correctCaptcha
            });
          }, 2000);
          node.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
          // node.src = envConfig.mapUrl + envConfig.mapKey;
          node.async = true;
          node.defer = true;
          document.getElementsByTagName('head')[0].appendChild(node);
        }


        $(".small-Size").keypress(function () {
          if (this.value.length == 3) return false;
        });
        $(".xmedium-Size").keypress(function () {
          if (this.value.length == 4) return false;
        });
      },
    };
  }
);