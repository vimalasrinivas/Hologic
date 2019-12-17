/**
 * @fileoverview hero Widget.
 * 
 * @author 
 */
define(
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  ['knockout', 'jquery','ccResourceLoader!global/api-helper', 'moment', 'ccResourceLoader!global/slick'],     

  function(ko, $,helper, moment) {  

      "use strict";

      return {
      bannerImages : ko.observableArray([]),   
      eventsFeed : ko.observable(),


          slickIntitator : function(){
              //$('.event-carousel_slides img').css("width","100%");
                  setTimeout(function(){ 
                 //  $("#event_Widget").parent().parent().addClass('centerContent');

               /*   $('.event-carousel__slides').on('init', function(event, slick) {
                      $('.Count').html("<span>0" + (slick.currentSlide + 1) + "</span><span>/</span><span>0" + slick.slideCount + "</span>");
                  });
*/
                  $('.event-carousel_slides').slick({
                      dots: true,
                      infinite: true,
                      //autoplay: true,
                      speed: 1000,
                      arrows: true,
                      prevArrow: $('.prev'),
                      nextArrow: $('.next'),
                      slidesToScroll: 1,
                      slidesPerRow: 3,
                       slidesToShow: 3,
                       responsive: [   
                            {   
                              breakpoint: 1000,
                              settings: {
                                slidesToShow: 3,  
                                slidesToScroll: 1
                              }    
                            },
                            {
                              breakpoint: 800,
                              settings: {
                                slidesToShow: 2,
                                slidesToScroll: 1
                              }
                            },
                            {
                              breakpoint: 500,
                              settings: {
                                slidesToShow: 1,
                                slidesToScroll: 1
                              }
                            }                 
                           ]
                       
                  });

                  }, 500); 

          },
          eventsLeftArrow: function() {
                $(".event-carousel_slides").slick('slickPrev');
          },
          eventsRightArrow: function() {
            $(".event-carousel_slides").slick('slickNext');
          },
          resizeSlickHeight: function() {
              setTimeout(function(){
                    var highestBox = 0;
                    $('.event-carousel_slides .slick-track .eventCarouselSlide').each(function(){  
                        //console.log("event slide height.....", $(this).height())
                        if($(this).height() > highestBox){  
                            highestBox = $(this).height();  
                        }
                    });    
                    $('.event-carousel_slides .slick-track .slick-slide').height(highestBox);
                },1000)
          },
          onLoad: function(widget) {  
              
          },   
          getDateData: function(data){
              console.log(data,"datanew");
              var widget=this;  
              var dateshow;
              var newDate;
             if(data){
                var getDay = moment(data.startdate).format("DD");
                var getMonth = moment(data.startdate, "x").format("MMM");
                var getYear = moment(data.startdate).format("YYYY");
                
                return '<p class="date">' + getDay + '</p>' + getMonth + '<br>' +  getYear;
                  
             }
             else{
                 return "";
             }
                
            
                   
          },
          
          externalEventProductsCall: function() {  
              var self=this; 
              var skuData = {
             
              }   
              console.log("helper",helper);
              var data = {
                "enpointUrl": helper.apiEndPoint.eventProductCarousel,
                "postData" : skuData
              }
              helper.getDataExternal(data.enpointUrl,function(err,result){   
                  if(result){
                      self.eventsFeed(result); 
                      console.log("result",result)
                      self.slickIntitator();  
                  }  
              })
          },
          
          
          
          beforeAppear: function(page) {              
            var widget = this ;
            widget.externalEventProductsCall();   
              widget.eventsFeed();
            
            function checkContainer () {
              if($('.eventsCarouselWrapper .slick-track').is(':visible')){ //if the container is visible on the page
              console.log("visible events ..............");
                var evt = window.document.createEvent('UIEvents'); 
                evt.initUIEvent('resize', true, false, window, 0); 
                window.dispatchEvent(evt);
                
                widget.resizeSlickHeight();
                
              } else {
                setTimeout(checkContainer, 50); //wait 50 ms, then try again
              }
            }
            
            $(document).ready(checkContainer);
            $( window ).resize(function() {
              widget.resizeSlickHeight();
            });
          },
      };
  }
);  