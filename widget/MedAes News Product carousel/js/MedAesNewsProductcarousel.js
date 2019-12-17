/**
 * @fileoverview hero Widget.
 * 
 * @author 
 */
define(
    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    ['knockout', 'jquery','ccResourceLoader!global/api-helper','ccConstants','ccRestClient', 'moment', 'ccResourceLoader!global/slick'],     

    function(ko, $, helper, CCConstants, ccRestClient, moment) {  

        "use strict";

        return {
        newsResults : ko.observableArray([]),
        newsViewAllLink : ko.observable(),

            slickIntitator : function(){
                //$('.news-carousel_slides img').css("width","100%");
                    setTimeout(function(){ 
                    $('.news-carousel_slides').slick({
                        dots: true,
                        infinite: true,
                        autoplay: false,
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
                    //  $('.event-carousel__slides1').slick("unslick");
                     }, 500); 
                  
             
            },
            newsLeftArrow: function() {
                $(".news-carousel_slides").slick('slickPrev');
            },
            newsRightArrow: function() {
                $(".news-carousel_slides").slick('slickNext');
            },
            resizeSlickHeight: function() {
                setTimeout(function(){
                        var highestBox = 0;
                        $('.news-carousel_slides .slick-track .eventCarouselSlide').each(function(){  
                            //console.log("event slide height.....", $(this).height());
                            if($(this).height() > highestBox){  
                                highestBox = $(this).height();  
                            }
                        });    
                        $('.news-carousel_slides .slick-track .slick-slide').height(highestBox);
                    },1000);
            },
            onLoad: function(widget) {  
             
              if (widget.user().loggedIn() === true) {
                var xtypeArr = [];
                var catalogBrandsObj = "";
                var accBrands = widget.user().currentOrganization().account_catalog_brands;
                var tempBrandsArray = [];
                if (helper.isHTML(accBrands)) {
                    catalogBrandsObj = $(accBrands);
                    if (catalogBrandsObj[0].textContent) {
                      tempBrandsArray = catalogBrandsObj[0].textContent.split('|');
                      for(var i=0;i<tempBrandsArray.length; i++){
                        xtypeArr.push(tempBrandsArray[i]);
                      }
                    }
                } else {
                    catalogBrandsObj = accBrands;
                    tempBrandsArray = catalogBrandsObj.split('|');
                    for(var j=0;j<tempBrandsArray.length; j++){
                        xtypeArr.push(tempBrandsArray[j]);
                    }
                }
                  var brandTempStr = xtypeArr;
                  
                  var NStr = "0";
                    for (var a = 0; a < xtypeArr.length; a++) {
                        for (var b = 0; b < window.hologicNvalueList.length; b++) {
                            if(xtypeArr[a] == window.hologicNvalueList[b].displayName) {
                                NStr=NStr+"+"+window.hologicNvalueList[b].nValue;
                            }
                        }
                        
                    }
                    console.log("Nstr.........", NStr);
                  
                  
                  widget.newsViewAllLink('/newsSearch?N='+NStr+'&searchType=simple&type=search&Nr=product.x_searchType:news');
                  
                  var nrQueryStr = '&Nr=product.x_searchType:news';
                  var searchQuery = '/ccstoreui/v1/search?N='+NStr+'&'+CCConstants.SEARCH_SUPPRESS_RESULTS+'=false&searchType='+CCConstants.SEARCH_TYPE_SIMPLE+nrQueryStr;
                  console.log("searchQuery.........", searchQuery);
                    ccRestClient.authenticatedRequest(searchQuery, {}, function (result) {
                        widget.newsResults(result.resultsList.records);
                        console.log("search query resultssssss", widget.newsResults());
                            widget.slickIntitator();
                    },function(data){
                    }) 
                  } 
                  //widget.viewAllQuery = '/newsSearch?N=0&searchType=simple&type=search&Nr=AND(OR('+ brandTempStr +'),product.x_searchType:news))';
               //widget.slickIntitator();  
            },   

        beforeAppear: function(page) {
          var widget = this;
          console.log('newsResult',widget.newsResults())
          if(widget.newsResults().length > 0) {
              widget.slickIntitator();
          }
          function checkContainer () {
              if($('.newsCarouselWrapper .slick-track').is(':visible')){ //if the container is visible on the page
              console.log("visible news ..............");
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
        getCreatedDate : function(date){
            var getDay = moment(date, "x").format("DD");
            var getMonth = moment(date, "x").format("MMM");
            var getYear = moment(date, "x").format("YYYY");
            
            return '<p class="date">' + getDay + '</p>' + getMonth + '<br>' +  getYear;
        }
        };
    }   
);  