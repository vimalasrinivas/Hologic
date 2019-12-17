/**
 * @fileoverview footer Widget.
 * 
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub','jquery'],
    
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, pubsub,$) {
  
    "use strict";
        
    return {
      onLoad: function(widget) {         
          
      
       
      },    
      loadShippingSection :function(){
                 if($('#stepOne.showTickMark').text()=="1"){
                        $(".progressTracker-navigation").find("li").removeClass("active");
                        $(".tab-content").find(".tab-pane").removeClass("active");
                        $('.progressTracker-navigation').find('li:nth-child(1)').addClass('active');
                        $(".tab-content").find(".tab-pane:nth-child(1)").addClass("active");
                        $('.trackerBtn').addClass("hide");
                        $('.trackerBtn[area-val="paymentBtn"]').removeClass('hide');
                        $('#CC-checkoutOrderSummary-orderTotal').addClass('hide');
                        $('.taxCalculationMsg').removeClass('hide');
                        $('.billing-address-section,.checkout-reviewOrder').addClass('hide');
                        $('.shipping-address-section').removeClass('hide');
                        $('.progressTracker-navigation').find('li:nth-child(1)').find('.progressTrackerClick').removeClass('showTickMark');
                        $('.progressTracker-navigation').find('li:nth-child(2)').find('.progressTrackerClick').removeClass('showTickMark');
                         $('#frieghtSection,#taxSection').addClass('hide');
                    }
                 
                        
                    
      },
      loadPaymentSection :function(){
            if($('#stepTwo.showTickMark').text()=="2"){
                    $(".progressTracker-navigation").find("li").removeClass("active");
                    $(".tab-content").find(".tab-pane").removeClass("active");
                    $('.progressTracker-navigation').find('li:nth-child(2)').addClass('active');
                    $(".tab-content").find(".tab-pane:nth-child(2)").addClass("active");
                    $('.trackerBtn').addClass("hide");
                    $('.trackerBtn[area-val="confirmationBtn"]').removeClass('hide');
                    $('#CC-checkoutOrderSummary-orderTotal').addClass('hide');
                    $('.taxCalculationMsg').removeClass('hide');
                    $('.billing-address-section').removeClass('hide');
                    $('.checkout-reviewOrder,.shipping-address-section').addClass('hide');
                    $('.progressTracker-navigation').find('li:nth-child(2)').find('.progressTrackerClick').removeClass('showTickMark');
                    $('#frieghtSection,#taxSection').addClass('hide');
                    $.Topic('BACK_TO_PAYMENT.memory').publish();
            }
      },
      beforeAppear: function(widget){            
     
 
    
      } ,
    };
  }
);
