/**
 * @fileoverview Global Widget.
 *
 * @author Taistech
 */
define(
    //-------------------------------------------------------------------
    // DEPENDENCIES
    // Adding knockout
    //-------------------------------------------------------------------
    ['knockout', 'pubsub', 'navigation', 'ccResourceLoader!global/api-helper','spinner'],

    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function(ko, pubsub, n, helper,spinner) {

        "use strict";
        var getWidget = '';
        var redirectToHome = false;
        return {
            onLoad: function(widget) {
                getWidget = widget;

                $.Topic(pubsub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(function(obj) {
                   redirectToHome = true;
                });
                $.Topic(pubsub.topicNames.USER_LOGOUT_SUCCESSFUL).subscribe(function(obj) {
                    //n.goTo('/signIn');
                     window.location.href='/signIn';
                });

                $.Topic(pubsub.topicNames.CART_LOADED_FOR_PROFILE).subscribe(function(obj) {
                    if(redirectToHome) {
                        redirectToHome = false;
                        setTimeout(function(){
                            $('#loadingModal').hide();
                           spinner.destroy();    
                       },300);
                        window.location.href='/home';
                    }
                   
                });


                helper.checkUserLoggedInOrNot(widget, n);
                // setting the external sale price & list price to all items in cart Object, setting record id ..
                $.Topic(pubsub.topicNames.CART_PRICE_COMPLETE).subscribe(function(obj) {
                    if (widget.cart().allItems().length > 0) {
                        for (var i = 0; i < widget.cart().allItems().length > 0; i++) {
                            if (widget.cart().allItems()[i].productData().childSKUs.length > 0) {
                                for (var j = 0; j < widget.cart().allItems()[i].productData().childSKUs.length > 0; j++) {
                                    if(widget.cart().allItems()[i].productData().x_businessUnit !== '0'){
                                         widget.cart().allItems()[i].business_unit(widget.cart().allItems()[i].productData().x_businessUnit);    
                                    }
                                    //console.log(widget.cart().allItems()[i].productData().x_businessUnit,"widget.cart().allItems()[i].productData().x_businessUnit");
                                    //console.log( widget.cart().allItems()[i],".. widget.cart().allItems()[i]...");
                                }
                            }
                        }
                    }


                });
               

                /*Force Logout after session timed out*/
                if (widget.user().isUserSessionExpired()) {
                    $.Topic(pubsub.topicNames.USER_LOGOUT_SUBMIT).publishWith([{
                        message: "success"
                    }]);
                }


                /*End of Force Logout after session timed out*/
                //USER_SESSION_EXPIRED
                
                $.Topic(pubsub.topicNames.USER_SESSION_EXPIRED).subscribe(function(obj) {
                    $.Topic(pubsub.topicNames.USER_LOGOUT_SUBMIT).publishWith([{
                        message: "success"
                    }]);
                        //n.goTo('/signIn');
                });
                
            },

            beforeAppear: function(page) {
                var widget = this;         
                getWidget.twoColumnLayout();
            },
            twoColumnLayout: function() {
                setTimeout(function() {
                    if ($("#CC-guidedNavigation-column").parents().find(".twoColumnContainer").length == 0) {
                        $("#CC-guidedNavigation-column").parents(".redBox").addClass("twoColumnContainer");
                        $(".twoColumnContainer").wrapInner("<div class='container' style='padding:0px'></div>");
                        $('.twoColumnContainer').css("background-color", "#f6f6f6");
                    }
                    $('#CC-checkoutAddressBook-section').parents('.redBox').addClass("checkoutCloumnContainer");
                    $(".checkoutCloumnContainer").wrapInner("<div class='container' style='padding:0px'></div>");
                    $('.checkoutCloumnContainer').css("background-color", "#f6f6f6");
                    $('#quickOrderWidget').parents('.redBox').addClass("quickOrderCloumnContainer");
                    $(".quickOrderCloumnContainer").wrapInner("<div class='container' style='padding:0px'></div>");
                    $('.quickOrderCloumnContainer').css("background-color", "#f6f6f6");
                          
                }, 300);

            }


        };
    }
);