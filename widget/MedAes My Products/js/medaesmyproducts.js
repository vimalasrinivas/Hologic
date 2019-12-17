define(['knockout', 'CCi18n',
    'navigation', 'pubsub', 'notifier','ccRestClient','ccConstants','pageViewTracker',"ccResourceLoader!global/api-helper",'spinner','ccResourceLoader!global/slick'
],

    function (ko, CCi18n, navigation, pubsub,  notifier,ccRestClient,ccConstants,pageViewTracker,helper,spinner) {

        return {
            accountBrands  : ko.observable([]),
            bucketstr      : ko.observable(),
            productData    : ko.observable([]),
            onLoad: function (widget) {
                var bucketTempStr = '';
                var xtypeArr = [];
                if (widget.user().loggedIn() === true) {
                    var catalogBrandsObj = "";
                    var accBrands = widget.user().currentOrganization().account_catalog_brands;
                    var tempBrandsArray = [];
                    if (helper.isHTML(accBrands)) {
                        catalogBrandsObj = $(accBrands);
                        if (catalogBrandsObj[0].textContent) {
                          tempBrandsArray = catalogBrandsObj[0].textContent.split('|');
                          widget.accountBrands(tempBrandsArray);
                        }
                    }else {
                        catalogBrandsObj = accBrands;
                        tempBrandsArray = catalogBrandsObj.split('|');
                        widget.accountBrands(tempBrandsArray);
                    }
                    
                    var catalogHtmlObj = "";
                    var accBuckets = widget.user().currentOrganization().account_catalog_buckets;
                    var tempArray = [];
                    if (helper.isHTML(accBuckets)) {
                        catalogHtmlObj = $(accBuckets);
                        if (catalogHtmlObj[0].textContent) {
                            tempArray = catalogHtmlObj[0].textContent.split('|');
                            for(var i=0;i<tempArray.length; i++){
                                xtypeArr.push('product.x_types:'+tempArray[i]);
                            }
                            bucketTempStr = xtypeArr.length > 0 ? xtypeArr.length > 1 ? xtypeArr.join(',') : xtypeArr[0] : '';
                            widget.bucketstr(bucketTempStr);
                        }
                    } else {
                        catalogHtmlObj = accBuckets;
                        tempArray = catalogHtmlObj.split('|');
                        for(var j=0;j<tempArray.length; j++){
                            xtypeArr.push('product.x_types:'+tempArray[j]);
                        }
                        bucketTempStr = xtypeArr.length > 0 ? xtypeArr.length > 1 ? xtypeArr.join(',') : xtypeArr[0] : '';
                        widget.bucketstr(bucketTempStr);
                    }
                 } 
                //widget.getDataByBrand(); 
             },

            beforeAppear: function (page) {
                this.createSpinner();
               this.getDataByBrand();
             },
             
             setAddButtonText : function(){   
                /** Added timeout for changing button text to Add to cart from Quickview */
                setTimeout(function(){
                      $('.nopad').find('.cc-product-quickview').text("ADD TO CART");   
                },1000);
            },
             
             getDataByBrand : function(){
                 var widget = this;
                var tempBrandsArray = [];
                
                var tempCatBrands = this.accountBrands();
                
                for (a = 0; a < tempCatBrands.length; a++) {
                    for (b = 0; b < window.hologicNvalueList.length; b++) {
                        if(tempCatBrands[a] == window.hologicNvalueList[b].displayName) {
                            tempBrandsArray.push(window.hologicNvalueList[b]);
                            
                        }
                    }
                    
                }
                console.log("tempBrandsArray.........", tempBrandsArray)
                var tempProdArray = [];
                var skuIds = [];
                var prodArray = [];
                var index = -1;
                
                for(var i=0;i<tempBrandsArray.length;i++){
                    var nrQueryStr = 'Nr=AND(OR('+ this.bucketstr() + '),product.x_searchType:products)';
                    console.log("NrQueryStr",nrQueryStr);
                    var searchQuery = '/ccstoreui/v1/search?N=0+'+tempBrandsArray[i].nValue+'&'+ccConstants.SEARCH_SUPPRESS_RESULTS+'=false&searchType='+ccConstants.SEARCH_TYPE_SIMPLE+'&Nrpp=12&Ns=sku.activePrice&'+nrQueryStr;
                    
                    //var nrQueryParam = 'Nr=AND(OR(product.brand:' + tempBrandsArray[i] +'),OR('+ widget.bucketstr() + '))';
                    
                    
                    var tempObj = {
                        "name": tempBrandsArray[i].displayName,
                        "products" : [],
                        "navigationState" : '/searchresults?N=0+'+tempBrandsArray[i].nValue+'&searchType=simple&type=search&'+nrQueryStr
                    }
                    tempProdArray.push(tempObj);
                   // console.log("tempProdArray",tempProdArray);
                     
                    ccRestClient.authenticatedRequest(searchQuery, {}, function (result) {
                        index = index+1;
                        widget.externalPricingCall(result,index,function(data,idx){
                            if(data.resultsList && data.resultsList.records && data.resultsList.records.length > 0 && data.resultsList.records[0].records && data.resultsList.records[0].records.length > 0) {
                               // console.log("data.resultsList.records[0].records...",data.resultsList.records[0].records[0].attributes['product.brand'][0]);
                                for(var a=0;a<tempProdArray.length;a++){
                                    if(data.resultsList.records[0].records[0].attributes['product.brand'].indexOf(tempProdArray[a].name) >-1) {
                                           for(var i =0; i<data.resultsList.records.length;i++){
                                            if(data.resultsList.records[i].records){
                                                for(var x=0;x<data.resultsList.records[i].records.length;x++){
                                                    data.resultsList.records[i].records[x].attributes.id = ko.observable(data.resultsList.records[i].records[x].attributes['product.id'][0]);
                                                    break;
                                                }
                                            }
                                        }
                                        tempProdArray[a].products = data.resultsList.records;
                                    }
                                
                                }
                            }
                            /** Added timeout for setting data*/
                            setTimeout(function(){
                                if(idx == tempBrandsArray.length-1){   
                                widget.productData([]);
                                widget.productData(tempProdArray);
                                widget.productData.valueHasMutated();
                                setTimeout(function(){
                                    widget.addSlickEvent();
                                     widget.destroySpinner();
                                },2000);
                               // console.log("widget.productData()",widget.productData());
                            }    
                            },1000);
                        });
                    },function(data){
                       index = idx+1;
                    })    
                    
                }
             },
             redirectToCategory : function(data){
                 navigation.goTo(data);
             },
             externalPricingCall : function(result,i,callback){
                 //console.log("iiiiiiiii",i);
                 //console.log("resultresult",result);
                 var widget = this;
                 var skuIds = [];
                 var skuId,quotingCatId='';
                 for(var j=0; j < result.resultsList.records.length; j++){
                            var recordData = result.resultsList.records[j].records[0].attributes;
                            if(recordData['sku.repositoryId']){
                                        //console.log("recordData",recordData);
                                        skuId = recordData['sku.repositoryId'][0];   
                                     }
									if(recordData.hasOwnProperty("sku.x_quotingCategoryIDs")){
										var temp = recordData["sku.x_quotingCategoryIDs"];
										quotingCatId = temp.length > 0 ? temp[0].replace(/\n/ig, '') : '';
									}  
									if(skuId !== ''){
                                    skuIds.push({
                                        "itemId": skuId,
                                        "quotingCatIds": quotingCatId
                                    });     
                                }
                                var skuData = {
                                    "itemIds": skuIds,
                                    "custAccountId": widget.user().currentOrganization().external_account_id,
                                    "pricingListId": widget.user().currentOrganization().external_price_list_id,
                                    "currency": widget.site().currency.currencyCode,
                                    "site": {
                                        "siteURL": widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                                        "siteName": widget.site().extensionSiteSettings.externalSiteSettings.siteName
                                  }
                                };
                                var data = {
                                    "enpointUrl": helper.apiEndPoint.pricing,
                                    "postData": skuData
                                };
                                if(j+1 == result.resultsList.records.length){
                                 helper.postDataExternal(data, function(err, response) {
                                    if (response.hasOwnProperty('pricingRecords')) {
                                        for(var k=0; k < result.resultsList.records.length; k++){
                                            for (var l = 0; l < response.pricingRecords.length; l++) {
                                             var recordNewData = result.resultsList.records[k].records[0].attributes;
                                             if(recordNewData['sku.repositoryId']){
                                                if(recordNewData['sku.repositoryId'][0] === response.pricingRecords[l].itemId){
                                                 recordNewData['externalPrice'] = response.pricingRecords[l].salePrice ? response.pricingRecords[l].salePrice : response.pricingRecords[l].listPrice;
                                                }  
                                             } else{
                                               recordNewData['externalPrice'] = recordNewData['sku.listPrice'][0];  
                                             }
                                            } 
                                        }    
                                       // console.log("before callbackkkkkkkk",result)
                                        callback(result,i);
                                    } else{
                                        callback(result,i);
                                    }
                                 });
                                }    
                        }
             },
             addCustomClass : function(){
                $(".prod-container").parents(".redBox").parent().addClass('siteBackground');
				$(".prod-container").parents(".redBox").parent().wrapInner( "<div class='container'></div>");  
             },
             addSlickEvent : function(){
                 var widget = this;
                 //console.log("inside event functionnnnnn",widget.productData());
                 for(var i=0;i<widget.productData().length;i++){
                    var slickId = '#slick'+i;
                     //console.log("inside addSlickEvent",$(slickId));
                      $(slickId).slick({
                        dots: false,
                        infinite: false,
                        autoplay: false,
                        speed: 1000,
                        arrows: true,
                        prevArrow: $('#slick-prev'+i),
                        nextArrow: $('#slick-next'+i),
                        slidesToScroll: 1,
                        slidesPerRow: 2,
                         slidesToShow: 2,
                         responsive: [
                        {
                          breakpoint: 1024,
                          settings: {
                            slidesToShow: 2,
                            slidesToScroll: 2,
                            infinite: true,
                            dots: true
                          }
                        },
                        {
                          breakpoint: 991,
                          settings: {
                            slidesToShow: 1,
                            slidesToScroll: 1
                          }
                        },
                        {
                          breakpoint: 480,
                          settings: {
                            slidesToShow: 1,
                            slidesToScroll: 1
                          }
                        }
                      ]
                         
                    });
                 }
             },
              addToCart: function(getProductData) {
                var widget = this;
                var orderRequestHeader = {};
                 var newProduct = {};
                // console.log("getProductData",getProductData)
                newProduct = $.extend(true, {}, getProductData, true);
                orderRequestHeader['x-ccsite'] = widget.site().siteInfo.id;
                orderRequestHeader["x-ccorganization"] = widget.user().parentOrganization.id();
                //console.log("newProduct",newProduct)
                var productId = newProduct['product.repositoryId'][0];
                var skuId =newProduct['sku.repositoryId'][0];
                var catSkuList = [];
                var catSkuListIds = {};
                var id = newProduct['product.repositoryId'][0];
                var quanty = 1;
                catSkuList.push(productId);
                catSkuListIds["dataItems"] = "repositoryid";
                catSkuListIds["debugOn"] = "true";
                ccRestClient.authenticatedRequest("/ccstoreui/v1/products?productIds=" +catSkuList.toString() + "&fields=parentCategories,childSKUs,productVariantOptions,selectedOptions,testingRevNumber,orderQuantity,primaryThumbImageURL,primarySmallImageURL,displayName,id,listPrice,route", catSkuListIds , function(result) {
                    if (result.length > 0) {
                        result[0].externalPriceQuantity = -1;
                        if(getProductData.externalPrice && getProductData.externalPrice !== null){
                            result[0].externalPrice = getProductData.externalPrice;
                        } else{
                            result[0].externalPrice = getProductData['product.listPrice'];
                        }
                        result[0].orderQuantity = 1;
                       // console.log('product data resulttt',result);
                        $.Topic(pubsub.topicNames.CART_ADD).publishWith(result[0], [{
                            message: "success"
                        }]);
                    }
                }, function (data) {}, "GET", false, true, orderRequestHeader);

        },
        addToFav: function(data) {
            console.log("dataaa",data);
            var productItem = {
                "productId": data['product.repositoryId'][0],
                "catRefId": data['sku.repositoryId'][0],
                "quantityDesired": 1,
                "displayName": data['product.displayName'][0]
            };
            console.log("productItem", productItem);
            var productItemArray = [];
            productItemArray.push(productItem);
            $.Topic('PURCHASE_LIST.memory').publish(productItemArray);
            $('#CC-newPurchaseList-modal').modal('show');

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
          }
        };
    });