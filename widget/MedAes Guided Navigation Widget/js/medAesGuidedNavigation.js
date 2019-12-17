/**
 * @fileoverview Guided Navigation Widget. 
 * 
 */
define(

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'viewModels/guidedNavigationViewModel', 'CCi18n',
    'ccConstants', 'pubsub', 'navigation', 'ccResourceLoader!global/api-helper'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, GuidedNavigationViewModel, CCi18n, CCConstants, pubsub, navigation, helper) {

    "use strict";

    return {
      displayRefineResults: ko.observable(false),
      getPlpResultsData: ko.observable(""),
      selectedBrand: ko.observable([]),
      catalogBuckets: ko.observable([]),
      catalogBrands: ko.observable([]),
      selectedBucket: ko.observable([]),
      brand: ko.observable(""),
      urlNrParam: [],
      selectedBucketList: ko.observable([]),
      selectedBrandList: ko.observable([]),
      isNavAvailable: ko.observable(false),
      navStr: '',
      accountBrands: ko.observable([]),
      accountBuckets: ko.observable([]),
      /**
        Guided Navigation Widget.
        @private
        @name guided-navigation
        @property {observable GuidedNavigationViewModel} view model object representing the guided navigation details
       */
      onLoad: function (widget) {
        if (document.location.pathname == '/searchresults' && widget.user().loggedIn() === true) {
            widget.setAccountFacets();          
        }
        widget.isNavAvailable(false);
        widget.guidedNavigationViewModel = ko.observable();
        widget.guidedNavigationViewModel(new GuidedNavigationViewModel(widget.maxDimensionCount(), widget.maxRefinementCount(), widget.locale()));
        $.Topic(pubsub.topicNames.SEARCH_RESULTS_FOR_CATEGORY_UPDATED).subscribe(function (obj) {
          if (!this.navigation || this.navigation.length == 0) {
            widget.displayRefineResults(false);
          }
          else {
            widget.displayRefineResults(true);
          }
        });

        $.Topic(pubsub.topicNames.SEARCH_FAILED_TO_PERFORM).subscribe(function (obj) {
          widget.displayRefineResults(false);
        });

        $.Topic(pubsub.topicNames.SEARCH_RESULTS_UPDATED).subscribe(function (obj) {
          if ((this.navigation && this.navigation.length > 0) || (this.breadcrumbs && this.breadcrumbs.refinementCrumbs && this.breadcrumbs.refinementCrumbs.length > 0)) {
            widget.displayRefineResults(true);
          }
          else {
            widget.displayRefineResults(false);
          }
        });

        $.Topic('plpResultData.memory').subscribe(function (data) {
          widget.getPlpResultsData(data);
           console.log(widget.getPlpResultsData(),"getPlpResultsData")
           if(widget.getPlpResultsData().categoryName !== undefined){
               $('#cc-area-controls').css('margin','25px 0px');
           }
           else{
                $('#cc-area-controls').css('margin','25px 0px 0px');
           }  
        })
        widget.isNavAvailable.subscribe(function (data) {
          if (data) {
            navigation.goTo(widget.navStr);  
          }
        });
        $(document).on('change', '.account-buckets', function () {
          widget.changeBucketsCheckbox();
        });
        
        $( window ).resize(function() {
                widget.checkDeviceWidth();
                if(($(window).width()<=991) && ($(window).width() > 319)){  
                    //widget.toggleFilterSection();
                }
            });
      },
      handleCustomFeature: function(data, event) {
          
          console.log("handleCustomFeature........", $(event.target).find('option:selected').text())
          var selectedSort = $(event.target).find('option:selected').text();
          $("#CC-product-listing-sortby option").each(function () {
                if ($(this).html() == selectedSort) {
                    $(this).attr("selected", "selected");
                    return;
                }
          });
          $("#CC-product-listing-sortby").trigger("change");
      },
      
      checkDeviceWidth: function(){
          if($(window).width()<=991){
              $('#CC-guidedNavigation-column').parent().parent().removeClass('col-sm-2').addClass('col-sm-12');  
              $('#CC-guidedNavigation-column').css('display','none');
          }
          else{
                $('#CC-guidedNavigation-column').parent().parent().addClass('col-sm-2').removeClass('col-sm-12'); 
                $('#CC-guidedNavigation-column').css('display','block');
              
          }
        
      },
      toggleFilterSection:function(){
           $('#CC-guidedNavigation-column').toggle();  
           /* if(($(window).width()<=768) && ($(window).width() > 319)){         
                if((document.getElementById('CC-guidedNavigation-column').style.display != "none")){
                    $('#sort-option-dropdown').addClass('dropdownArrow');    
                    $('#sort-option-dropdown').addClass("addAfterArrow");  
                }
                else{  
                   $('#sort-option-dropdown').removeClass('dropdownArrow');
                   $('#sort-option-dropdown').removeClass("addAfterArrow");    
                }  
            }
            if(($(window).width()<=768) && ($(window).width() > 737)){         
                if((document.getElementById('CC-guidedNavigation-column').style.display != "none")){  
                    $('#CC-product-listing-sortby').attr('style', 'top: -328px !important');  
                }  
                else{    
                   $('#CC-product-listing-sortby').attr('style', 'top: -59px !important');    
                }
            }
             if(($(window).width()<=425) && ($(window).width() > 320)){             
                if((document.getElementById('CC-guidedNavigation-column').style.display != "none")){  
                    $('#CC-product-listing-sortby').attr('style', 'top: -326px !important');  
                    //$('.productListAndroid #CC-product-listing-sortby').attr('style', 'top: -351px !important');
                }    
                else{    
                   $('#CC-product-listing-sortby').attr('style', 'top: -60px !important');           
                }
            }
            if(($(window).width()<=736) && ($(window).width() > 426)){           
                if((document.getElementById('CC-guidedNavigation-column').style.display != "none")){
                    $('#CC-product-listing-sortby').attr('style', 'top: -325px !important');    
                    //$('.productListAndroid #CC-product-listing-sortby').attr('style', 'top: -351px !important');
                }    
                else{    
                   $('#CC-product-listing-sortby').attr('style', 'top: -59px !important');         
                }
            }*/
      },  
      getParameterByName: function(name, url) {
          if (!url) url = window.location.href;
          name = name.replace(/[\[\]]/g, "\\$&");
          var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
              results = regex.exec(url);
          if (!results) return null;
          if (!results[2]) return '';
          return decodeURIComponent(results[2].replace(/\+/g, " "));
        },
      beforeAppear: function (page) {    
        var widget = this;
        if (document.location.pathname == '/searchresults') {
          widget.getQueryString();
        }
        widget.isNavAvailable(false);  
        widget.checkDeviceWidth();
        
        /*** Pre selecting custom sort dropdown based on Product listing sort dropdown */
        var selectedSortQuery = widget.getParameterByName("Ns");
        var selectedSort = "Sort By : Featured";
        if(selectedSortQuery && selectedSortQuery.indexOf("x_itemNumber") !=-1) {
            selectedSort = "Sort By : Item Number";
        }
        //console.log("selectedSortQuery.........", selectedSortQuery)
        //console.log("selectedSort.........", selectedSort)
          $("#guided-product-listing-sortby option").each(function () {
                if ($(this).html() == selectedSort) {
                    $(this).attr("selected", "selected");
                    return;
                }
          });
        //setTimeout(function(){
            /*if((document.getElementById('CC-guidedNavigation-column').style.display !== "none")){
                 widget.checkDeviceWidth();
              if(($(window).width()<=991) && ($(window).width() > 319)){  
                    widget.toggleFilterSection();
                }
            }*/
        //},500)
        
          
      },
      getQueryString: function () {
        var widget = this;
        var queries = {};
        var tempbucket = [], tempBrand = [] , brandStr = '' , nrParam;
        var tempBrandsArray = this.accountBrands();
        var tempBucketArray = this.accountBuckets();
        this.selectedBrand([]);
        this.selectedBucketList([]);
        this.selectedBrandList([]);
        this.catalogBuckets([]);
        this.catalogBrands([]);
        widget.urlNrParam = [];
        widget.selectedBucket([]);
        widget.selectedBrand([]);
        $.each(document.location.search.substr(1).split('&'), function (c, q) {
          if(q.indexOf('page') == -1){
            widget.urlNrParam.push(q);
          }          
          var i = q.split('=');
          if (i.length > 1) {
            queries[i[0].toString()] = decodeURIComponent(i[1].toString());
          }
        });
        nrParam = queries.Nr;
        if (nrParam) {
          if (nrParam.indexOf('AND') > -1) {
            nrParam = nrParam.split('AND').join('');
          }
          if (nrParam.indexOf('OR') > -1) {
            nrParam = nrParam.split('OR').join('');
          }
          if (nrParam.indexOf('(') > -1) {
            nrParam = nrParam.split('(').join('');
          }
          if (nrParam.indexOf(')') > -1) {
            nrParam = nrParam.split(')').join('');
          }
          var tempArr = nrParam.split(',');
          
          
          for (var i = 0; i < tempArr.length; i++) {
            var tempData = tempArr[i].split(':');
            
            if (tempData[0].indexOf('product.x_types') > -1) {
              var tempStr = tempData[1].indexOf('+') > -1 ? tempData[1].replace('+', ' ') : tempData[1];
              widget.selectedBucket().push(tempStr);
              widget.selectedBucketList().push(tempArr[i]);
            }
          }
        }
        
        var tempN = widget.getParameterByName("N");
        if(tempN) {
            var tempNList = tempN.split(" ");
            tempNList.shift();
            
            
            var eligibleBrandList = [];
            var eligibleBrandNameList = [];
            
            for (var j = 0; j < tempBrandsArray.length; j++) {
              for (var b = 0; b < window.hologicNvalueList.length; b++) {
                    if(tempBrandsArray[j] == window.hologicNvalueList[b].displayName) {
                        eligibleBrandList.push(window.hologicNvalueList[b].nValue);
                        eligibleBrandNameList.push(window.hologicNvalueList[b]);
                        
                    }
                }
            }
            //console.log("eligibleBrandNameList..........", eligibleBrandNameList);
            //console.log("eligibleBrandList..........", eligibleBrandList);
            
            tempBrand.push({
              "label": "All",
              "navigationState": eligibleBrandList.join("+"),
              "selectedValue": tempNList.length === eligibleBrandList.length ? eligibleBrandList.join("+") : ''
            })
            
            
            
             var tempBrandVal = tempNList.length === eligibleBrandList.length ? eligibleBrandList.join("+")  : tempNList[0];
            widget.brand(tempBrandVal);
            
            for (var k = 0; k < eligibleBrandNameList.length; k++) {
              var selValue = eligibleBrandNameList.length === tempNList.length ? false : eligibleBrandNameList[k].nValue == tempNList[0] ? true : false;
              var brandObj = {
                "label": eligibleBrandNameList[k].displayName,
                "navigationState": eligibleBrandNameList[k].nValue,
                "selectedValue": selValue ?  eligibleBrandNameList[k].nValue : ''
              }
              tempBrand.push(brandObj);
            }
            console.log("tempBrand..........", tempBrand);
           
        }
        
        
        
        
        
        for (var l = 0; l < tempBucketArray.length; l++) {
          var isChecked = this.selectedBucket().indexOf(tempBucketArray[l]) > -1 ? true : false;
          var catalogObj = {
            "label": tempBucketArray[l],
            "navigationState": "product.x_types:" + tempBucketArray[l],
            "checkedValue": ko.observable(isChecked)
          }
          tempbucket.push(catalogObj);
        }
        this.catalogBuckets(tempbucket);
        this.catalogBrands(tempBrand);
      },
      setAccountFacets: function () {
         var catalogBrandsObj = "";
         var accBrands = this.user().currentOrganization().account_catalog_brands;
         var tempBrandsArray = [];
         if (helper.isHTML(accBrands)) {
            catalogBrandsObj = $(accBrands);
            if (catalogBrandsObj[0].textContent) {
              tempBrandsArray = catalogBrandsObj[0].textContent.split('|');
              tempBrandsArray = tempBrandsArray.sort();
              this.accountBrands(tempBrandsArray);
            }
         } else {
             catalogBrandsObj = accBrands;
             tempBrandsArray = catalogBrandsObj.split('|');
             tempBrandsArray = tempBrandsArray.sort();
             this.accountBrands(tempBrandsArray);
         }
         
         var catalogHtmlObj = "";
         var accBucket = this.user().currentOrganization().account_catalog_buckets;
         var tempArray = [];
         if (helper.isHTML(accBucket)) {
            catalogHtmlObj = $(accBucket);
            if (catalogHtmlObj[0].textContent) {
              tempArray = catalogHtmlObj[0].textContent.split('|');
              this.accountBuckets(tempArray);
            }
         } else {
            catalogHtmlObj = accBucket;
           tempArray = catalogHtmlObj.split('|'); 
           this.accountBuckets(tempArray); 
         }
      },
      onBrandChange: function (e) {
        e.preventDefault();
        var widget = this;
        widget.brand(event.target.value);
        var NStr = "0";
        NStr = NStr+"+"+widget.brand();
        var NRStr = "";
        for (var i = 0; i < widget.urlNrParam.length; i++) {
            if (widget.urlNrParam[i].indexOf('Nr') > -1) {
                NRStr = widget.urlNrParam[i];
                break;
            }
        }
        widget.navStr  = '/searchresults?N='+NStr+'&searchType=simple&type=search&'+NRStr;
        console.log("widget.navStr.......", widget.navStr);
        widget.isNavAvailable(true);
        
        /*var brandStr = 'OR(' + event.target.value + ')',
          bucketStr = '';
        
        console.log("widget.urlNrParam..........", widget.urlNrParam);
        for (var i = 0; i < widget.urlNrParam.length; i++) {
          if (widget.urlNrParam[i].indexOf('Nr') > -1) {
            if (widget.selectedBucketList().length > 1) {
              bucketStr = 'OR(' + widget.selectedBucketList().join(',') + ')';
            }
            if (widget.selectedBucketList().length > 0 && widget.selectedBucketList().length == 1) {
              bucketStr = widget.selectedBucketList()[0];
            }
            bucketStr = bucketStr !== '' ? ',' + bucketStr : ''
            this.urlNrParam[i] = 'Nr=AND(AND(' + brandStr + bucketStr + '),product.x_searchType:products)';
            widget.navStr = '/searchresults?' + widget.urlNrParam.join('&');
            
            console.log("widget.navStr.......", widget.navStr);
            //widget.isNavAvailable(true);
            break;
          }
        }*/
        

      },
      changeBucketsCheckbox: function () {
        var widget = this;
        widget.selectedBucketList([]);
        var isCategorySelected = false;
        $.each(widget.catalogBuckets(), function (index, value) {
          var newValue = value.checkedValue();
          if (newValue) {
              isCategorySelected = true;
            widget.selectedBucketList().push(widget.catalogBuckets()[index].navigationState);
            var bucketStr = '';
            for (var i = 0; i < widget.urlNrParam.length; i++) {
              if (widget.urlNrParam[i].indexOf('Nr') > -1) {
                if (widget.selectedBucketList().length > 1) {
                  bucketStr =  widget.selectedBucketList().join(',') ;
                }
                if (widget.selectedBucketList().length > 0 && widget.selectedBucketList().length == 1) {
                  bucketStr = widget.selectedBucketList()[0];
                }
                //bucketStr = bucketStr !== '' ? ',' + bucketStr : ''
                widget.urlNrParam[i] = 'Nr=AND(OR('+ bucketStr + '),product.x_searchType:products)';
                widget.navStr = '/searchresults?' + widget.urlNrParam.join('&');
                break;
              }
            }

          }
        });
        
        console.log("widget.navStr.......", widget.navStr);
        if(isCategorySelected) {
            widget.isNavAvailable(true);
            $(".product-result .showResults").removeClass("medHideVisibility");
            $("#CC-product-listing-sortby-controls").removeClass("medHideVisibility");
            $("#CC-product-listing-container").removeClass("hide");
            $("#CC-product-listing-no-container").addClass("hide");
            $("#CC-guidedNavigation-accordionSection .panel-default").removeClass("hide");
        } else {
            widget.isNavAvailable(false);
            $(".product-result .showResults").addClass("medHideVisibility");
            $("#CC-product-listing-sortby-controls").addClass("medHideVisibility");
            $("#CC-product-listing-container").addClass("hide");
            $("#CC-product-listing-no-container").removeClass("hide");
            $("#CC-guidedNavigation-accordionSection .panel-default").addClass("hide");
            $("#CC-guidedNavigation-collapseList-bucket").parents(".panel-default").removeClass("hide");
            for (var j = 0; j < widget.urlNrParam.length; j++) {
                
              if (widget.urlNrParam[j].indexOf('N=') > -1) {
                  console.log("widget.urlNrParam[j]....", widget.urlNrParam[j]);
                  console.log("widget.urlNrParam[j].indexOf('N').....", widget.urlNrParam[j].indexOf('N'));
                  widget.urlNrParam[j] = "N=0"
                  break;
              }
              
            }
        }
      }

    };
  }
);