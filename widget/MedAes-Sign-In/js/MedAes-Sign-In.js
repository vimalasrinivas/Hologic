/**
 * @fileoverview hero Widget.
 * 
 * @author 
 */
define(
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  ['jquery', 'knockout','ccResourceLoader!global/api-helper','notifier', 'ccPasswordValidator', 'pubsub',
  'CCi18n', 'ccConstants', 'navigation', 'ccLogger',
  'notifications', 'ccRestClient', 'viewModels/selfRegistrationViewModel','viewModels/address','spinner'],   

  function($, ko,helper, notifier, CCPasswordValidator, pubsub, CCi18n,
    CCConstants, navigation, ccLogger, notifications, CCRestClient, selfRegistration, Address,spinner) {     

      "use strict";

      return {  
           modalMessageType : ko.observable(''),     
          modalMessageText : ko.observable(''),      
          showErrorMessage : ko.observable(false),      
          firstName : ko.observable(),
          lastName : ko.observable(),  
          emailAddress : ko.observable(),
          phoneNo1 : ko.observable(""),
          phoneNo2 : ko.observable(""),
          phoneNo3 : ko.observable(""),
          companyName : ko.observable(),
          accountNumber : ko.observable(),
          countryValues : ko.observable(),
          countryOptions : ko.observable(""),
          phoneNumber : ko.observable(),
          States : ko.observable(),
          stateOptions : ko.observable(""),
          ignoreBlur : ko.observable(false),   
          signInUsername: ko.observable(),
          signInPassword: ko.observable(),       
          onLoad: function(widget) {   
              var self = this;
              var afterLogIn = false;
             
             console.log("signinPageshow");  
                $('#CC-loginUserPane').show();   
               $('#CC-forgotPasswordSectionPane').hide(); 
               $('#CC-updatePasswordPane').hide();
               $('#CC-updatePasswordMessagePane').hide();
                $('#CC-updatePasswordErrorMessagePane').hide();    
              
         
                  
              widget.getListCountry();
   
               console.log(widget.countryOptions().length,"widget.countryOptions().length"); 
               widget.firstName.extend({
                required: {
                  params: true,
                  message: widget.translate('First Name is mandatory.')
                },
               alphaNumeric: {
       params: true,
       message: widget.translate('Invalid First Name.')
         }
              });
      
                 widget.lastName.extend({
                required: {
                  params: true,
                  message: widget.translate('Last Name is mandatory.')
                },
                alphaNumeric: {
       params: true,
       message: widget.translate('Invalid Last Name.')
         }
              });
              
                  widget.emailAddress.extend({
                  required: {
                  params: true,
                  message: widget.translate('Email Address is mandatory.')
                }
              });
               
          
               widget.phoneNumber.extend({
                  required: {
                  params: true,
                  message: widget.translate('Phone Number is mandatory.'),
                },
                minLength:{
                    params: 10,
                    message: widget.translate('Invalid Phone Number.')
                }
              });
              
            
                    
                  widget.companyName.extend({
                  required: {
                  params: true,
                  message: widget.translate('Company Name is mandatory.')
                },
               alphaNumeric: {
       params: true,
       message: widget.translate('Invalid Company Name.')
         }
              });
              
                 widget.accountNumber.extend({
                  required: {
                  params: true,
                  message: widget.translate('Account Number is mandatory.')
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
              
                  widget.destroySpinner = function () {
           // console.log("destroyed");
                $('#loadingModal').hide();
                spinner.destroy();
        };
        widget.createSpinner = function () {
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
        };
               widget.validationModel = ko.validatedObservable({
                   firstName: widget.firstName,
                   lastName: widget.lastName,
                   emailAddress: widget.emailAddress,
                   companyName : widget.companyName,
                   accountNumber : widget.accountNumber,
                   countryOptions : widget.countryOptions,
                   stateOptions : widget.stateOptions,
                   phoneNumber : widget.phoneNumber
                  
              });  
              
               $.Topic(pubsub.topicNames.USER_RESET_PASSWORD_SUCCESS).subscribe(function(data) {
                   var widget=this; 
                   
                   console.log("successmsgcame-->");
                   
                  $('#CC-forgotPasswordSectionPane').hide();
                  $('#CC-headermodalpane').modal('hide');
                   $('#CC-updatePasswordErrorMessagePane').modal('hide');    
                  $('body').removeClass('modal-open');
                  $('.modal-backdrop').remove();
                  notifier.sendSuccess(widget.WIDGET_ID, CCi18n.t('ns.common:resources.resetPasswordMessage'), true);
                });
            
                $.Topic(pubsub.topicNames.USER_RESET_PASSWORD_FAILURE).subscribe(function(data) {
                  notifier.sendError(widget.WIDGET_ID, data.message, true);
                });
            
                $.Topic(pubsub.topicNames.USER_PASSWORD_GENERATED).subscribe(function(data) {
                    var widget =this;  
                  $('#alert-modal-change').text(CCi18n.t('ns.common:resources.resetPasswordModalOpenedText'));
                  widget.user().ignoreEmailValidation(false);
                 // self.hideAllSections();
                 // $('#CC-forgotPasswordSectionPane').show();
                 // $('#CC-forgotPwd-input').focus();
                 //  $('#CC-updatePasswordPane').show();//      
                   $('#CC-loginUserPane').show();   
                   $('.modal-backdrop').remove();      
                   $('#CC-updatePasswordPane').modal('show');  

                  
                  widget.user().emailAddressForForgottenPwd('');
                  widget.user().emailAddressForForgottenPwd.isModified(false);
                });
            
                $.Topic(pubsub.topicNames.USER_PASSWORD_EXPIRED).subscribe(function(data) {
                    var widget =this;   
                  widget.user().ignoreEmailValidation(false);
                  self.hideAllSections();
                  $('#CC-forgotPasswordSectionPane').show();
                  $('#CC-forgotPwd-input').focus();
                  widget.user().emailAddressForForgottenPwd('');
                  widget.user().emailAddressForForgottenPwd.isModified(false);
                });
            
                $.Topic(pubsub.topicNames.USER_LOGIN_FAILURE).subscribe(function(obj) {
                    var self =this;   
                    console.log("loginFailuredata",widget);       
                         notifier.sendError(widget.widgetId(),widget.translate("errorLoginMsg"), true);    
                         widget.destroySpinner();
                  widget.showErrorMessage(true);                
                });
            
                $.Topic(pubsub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(function(obj) {
                  // widget.hideLoginModal();
                  // widget.showErrorMessage(false);  
                  widget.modalMessageType('');     
                  afterLogIn = true;
                  notifier.clearSuccess(widget.WIDGET_ID);
                  $('#CC-loginHeader-myAccount').focus();
                  $('#CC-loginHeader-myAccount-mobile').focus();
                  //widget.destroySpinner();
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
                   
                         console.log("GiventokenCame-->");   
                       // Let's try and update the password.   
                      //  $('#CC-headermodalpane').show();  
                       $('#CC-loginUserPane').show();     
                      //  self.hideAllSections();      
                       $('.modal-backdrop').remove();
                       
                       //navigation.goTo("/signIn"); 
                       
                       $('#CC-updatePasswordPane').modal('show');          
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
          },
          updateCountryOptions: function(data,event){
          var widget =this;
          var getValue =$(event.currentTarget).val();
          console.log(getValue ,"...valu");
          if(getValue){
              widget.countryOptions(getValue);
          }
          widget.getListState(getValue);
           },
           
          updatestateOptions: function(data,event){
          var widget =this;
          var getValue =$(event.currentTarget).val();
          console.log(getValue ,"...valu");
          if(getValue){
              widget.stateOptions(getValue);
          }
           },

           
             //getList countries
              
              getListCountry : function (){
                  var widget=this; 
                  var countries=[];
                  helper.getDataExternal(helper.apiEndPoint.getListCountry,function(err,result){
                      if(result){
                          var country1 = result[39];
                          var country2 = result[223];
                         countries.push(country1,country2);
                      }
                    widget.countryValues(countries);
                     console.log("getListCountry",countries);
                   });
                   
              },
              
              //getState list
              
              getListState : function(getValue){
                  console.log("getList",getValue);
                 var widget=this;
                 var stateList=[];
                 if(widget.countryOptions() == "US"){
                  helper.getDataExternal(helper.apiEndPoint.getUSstates,function(err,result){
                     console.log("getUSState",result);
                     var us = result.regions;
                     widget.States(us);
                   });
                 }
                 if(widget.countryOptions() == "CA"){
                  helper.getDataExternal(helper.apiEndPoint.getCanadastates,function(err,result){
                     console.log("getCanadaState",result);
                     var canada = result.regions;
                     widget.States(canada);
                   });
                 }
                
              },
              
           
          // sign in button
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
              
      handleLogin : function(data,event) {
             console.log("datacameinsidehandle",data); 
             var widget =this;
            //if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
              notifier.clearError(this.WIDGET_ID);
              if (data.user().validateLogin()) {
                  console.log("Insidethe login")   
                  widget.createSpinner();
                data.user().updateLocalData(false, false);
                $.Topic(pubsub.topicNames.USER_LOGIN_SUBMIT).publishWith(data.user(), [{message : "success"}]);  
                   $('#CC-updatePasswordErrorMessagePane').modal('hide');  
               }
           // }
            //return true;
          },
          
          showForgotPasswordSection : function(data) {   
              var widget= this;
              console.log("showForgetSection",data);   
            widget.user().ignoreEmailValidation(false);       
           // this.hideAllSections();      
           // $('#CC-forgotPasswordSectionPane').show();
           $('#CC-forgotPasswordSectionPane').modal('show');     
            $('#CC-forgotPwd-input').focus();
            widget.user().emailAddressForForgottenPwd('');   
            widget.user().emailAddressForForgottenPwd.isModified(false);    
          },
          
           /**
           * Resets the password for the entered email id.
           */         
            resetForgotPassword : function(data, event) {      
              var widget= this;
              console.log("resetPswdFun",widget);                  
            // if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {  
              data.user().ignoreEmailValidation(false);  
               data.user().emailAddressForForgottenPwd.isModified(true);
              if ( data.user().emailAddressForForgottenPwd  &&  data.user().emailAddressForForgottenPwd.isValid()) { 
                 data.user().resetForgotPassword();              
                $('#CC-forgotPasswordSectionPane').modal('hide');   
                $('#CC-loginUserPane').show();      
              }
            // }   
            // return true;           
          },    
              
           handleCancelForgottenPassword: function(data, event) {
               var widget=this;
            if('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
              notifier.clearError(this.WIDGET_ID);
               $('#CC-forgotPsswordSectionPane').modal('hide');  
                $('#CC-updatePasswordPane').modal('hide');
                $('#CC-updatePasswordErrorMessagePane').modal('hide'); 
                $("#CC-updatePasswordPane").modal('hide');
                $('.modal-backdrop').remove();
                navigation.goTo("/signIn");            
                
                
            }
            return true;
          },

          handleSuccessForgottenPassword: function(data, event) {   
              var widget=this;
            if('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {          
              navigation.goTo("/signIn");                           
            }
            return true;      
          },
          
          
          /**
           * This method is triggered when the user clicks on the save on
           * the create new password model
           */
          savePassword : function(data) {     
              var widget = this;      
            // if ('click' === event.type || (('keydown' === event.type || 'keypress' === event.type) && event.keyCode === 13)) {
              notifier.clearError(this.WIDGET_ID);
              widget.user().ignoreConfirmPasswordValidation(false);
              widget.user().ignoreEmailValidation(false);
              widget.user().emailAddressForForgottenPwd.isModified(true);
              if (widget.user().isPasswordValid(true) && 
                  widget.user().emailAddressForForgottenPwd  && 
                  widget.user().emailAddressForForgottenPwd.isValid()) {    
                widget.user().updateExpiredPasswordUsingToken(widget.user().token, 
                  widget.user().emailAddressForForgottenPwd(), widget.user().newPassword(),   
                  widget.user().confirmPassword(),
                  function(retData) {
                    // Success function   
                  //   data['MedAesB2BcontactLoginElement'].hideAllSections();    
                     $('#CC-updatePasswordMessagePane').modal('show');
                     $('#CC-updatePasswordPane').modal('hide');  
                    $('#CC-updatePasswordMsgContinue').focus();    
                  },
                  function(retData) {
                    // Error function - show error message
                   //   data['MedAesB2BcontactLoginElement'].hideAllSections();
                  $('#CC-updatePasswordPane').modal('hide');
                  $('#CC-updatePasswordErrorMessagePane').modal('show');     
                  }
                );
              }   
            // }
            // return true;   
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
           /**
           * Ignores the blur function when mouse click is up.
           */      
          handleMouseUp : function(data) {
              var widget=this;  
            this.ignoreBlur(false);
            widget.user().ignoreConfirmPasswordValidation(false);    
            return true;
          },

          /**
           * Ignores the blur function when mouse click is down
           */
          handleMouseDown : function(data) {
              var widget=this;   
            this.ignoreBlur(true);
            widget.user().ignoreConfirmPasswordValidation(true);
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
           * This method is invoked to hide the login modal.
           */
          // hideLoginModal : function() {
          //   $('#CC-headermodalpane').modal('hide');   
          //   $('body').removeClass('modal-open');
          //   $('.modal-backdrop').remove();
          // },
          
            //submit button functionalities
          submitButton:function(data){
              var widget=this;
              if(widget.phoneNo1().length === 3  && widget.phoneNo2().length === 3  && widget.phoneNo3().length === 4){
                   var phNo=widget.phoneNo1().concat(widget.phoneNo2(),widget.phoneNo3()); 
                   widget.phoneNumber(phNo);
              }
             
             // console.log(data.phoneNumber(),"....phoneNumber");
              if(widget.validationModel.isValid()){
                  
                      var skuData = {
                                    "profile": {
                                    "firstName": data.firstName(),
                                    "lastName": data.lastName(),
                                    "email": data.emailAddress(),
                                    "phoneNumber" : data.phoneNumber()
                                   },
                                   "relatedOrganizationName":data.companyName(),
                                   "name": data.accountNumber()
                  };
                   var postData = {
                        "enpointUrl": helper.apiEndPoint.createProfile,
                        "postData" : skuData
                      };
                      helper.postDataExternal(postData,function(err,result){ 
                       console.log("profileResult",result);
                       if(err){
                        notifier.sendError(widget.WIDGET_ID, widget.translate('This account is already registered, please try again with new email id'),false);
                       }
                       if(result){
                         putSkuData = {
                           "organization":{
                             "id": data.accountNumber()
                           },
                           "profile": {
                            "firstName": data.firstName(),
                            "lastName": data.lastName(),
                            "email": data.emailAddress(),
                            "phoneNumber" : data.phoneNumber(),
                            "profileType": "b2b_user_pending"
                           }
                         }
                        var putData = {
                          "enpointUrl": helper.apiEndPoint.createProfile+'/'+result.id,
                          "postData" : skuData
                        };
                         helper.putDataExternal(putSkuData,function(err,res){ 
                          if(err){
                            notifier.sendError(widget.WIDGET_ID, widget.translate('This account is already registered, please try again with new email id'),false);
                           }
                           if(res){
                            $("#myModal").modal('show');
                          }  
                        });                            
                        }                                                   
                      });
              }else{
                      widget.validationModel.errors.showAllMessages();
                      
                  }
          //  widget.resetFields();   
          },
          
          resetFields : function(data){
               var widget = this;
               widget.firstName('');
               widget.lastName('');
               widget.emailAddress('');
              if(widget.phoneNumber().length == 10) {       
                   widget.phoneNo1('');
                   widget.phoneNo2('');
                   widget.phoneNo3('');
              }
               $('select').val('');
               widget.accountNumber('');
               widget.companyName('');   
          },
           
          beforeAppear: function(page) {   
              
               $('#CC-loginUserPane').show();             
          var correctCaptcha = function(response) {
              alert(response);
          };         
          
      if ( $( "#html_element" ).length ){              
          var node = document.createElement('script');
          node.type = 'text/javascript';
          node.id = 'GoogleMaps';
          node.onload = setTimeout(function () {   
              grecaptcha.render('html_element', {
                'sitekey' : '6Ldts7oUAAAAABPN7XjX8NxjdtScU2iKz1aSZ_2n',
                'callback' : correctCaptcha
              });
          },2000);
          node.src ='https://www.google.com/recaptcha/api.js?render=explicit';
          // node.src = envConfig.mapUrl + envConfig.mapKey;
          node.async = true;
          node.defer = true;
          document.getElementsByTagName('head')[0].appendChild(node); 
      }    
              
               $('#CC-forgotPasswordSectionPane').hide(); 
               $('#CC-updatePasswordPane').hide();
                 $('#CC-updatePasswordMessagePane').hide();
                $('#CC-updatePasswordErrorMessagePane').hide();   
              $(".small-Size").keypress(function(){
                if(this.value.length==3) return false;
                });
              $(".xmedium-Size").keypress(function(){
                 if(this.value.length==4) return false;
                }); 
          },
      };
  }
);