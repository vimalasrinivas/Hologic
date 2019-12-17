define(['knockout', 'CCi18n',
    'navigation', 'pubsub', 'storageApi', 'ccStoreConfiguration', 'notifier', 'ccResourceLoader!global/api-helper'
],

    function (ko, CCi18n, navigation, pubsub, storageApi, CCStoreConfiguration, notifier, helper) {
        var widgetModel = '';
        return {
            catalogBuckets: ko.observable([]),
            catalogBrands: ko.observable([]),
            onLoad: function (widget) {
                widgetModel = widget;
                widget.catalogBuckets([]);
                widget.catalogBrands([]);
                if (widget.user().loggedIn() === true) {
                    var catalogBrandsObj = "";
                    var tempBrandsArray = [];
                    var catalogHtmlObj = '';
                    var tempArray = [];
                    var accBucket = widget.user().currentOrganization().account_catalog_buckets;
                    if (helper.isHTML(accBucket)) {
                        catalogHtmlObj = $(accBucket);
                        if (catalogHtmlObj[0].textContent) {
                            tempArray = catalogHtmlObj[0].textContent.split('|');
                        }
                    } else {
                        catalogHtmlObj = accBucket;
                        tempArray = catalogHtmlObj.split('|');
                    }
                    console.log("catalogBuckets", tempArray);
                    for (i = 0; i < tempArray.length; i++) {
                        var catalogObj = {
                            "name": tempArray[i],
                            "imgUrl": 'file/general/' + tempArray[i] + '.png'
                        }
                        widget.catalogBuckets().push(catalogObj);

                    }
                    console.log("widget.catalogBuckets()", widget.catalogBuckets());
                    var accBrand = widget.user().currentOrganization().account_catalog_brands;    
                    if (helper.isHTML(accBrand)) {
                        catalogBrandsObj = $(accBrand);
                        if (catalogBrandsObj[0].textContent) {
                            tempBrandsArray = catalogBrandsObj[0].textContent.split('|');
                            widget.catalogBrands(tempBrandsArray);
                        }
                    } else {
                        catalogBrandsObj = accBrand;
                        tempBrandsArray = catalogBrandsObj.split('|');
                        widget.catalogBrands(tempBrandsArray);
                    }
                }
            },

            beforeAppear: function (page) {
                //var widget = this;
                //widget.catalogBuckets([]);
                //widget.catalogBrands([]);
            },
            redirectToCategory: function (data) {
                var brandStr = '';
                var tempCatBrands = this.catalogBrands();
                var NStr = "0";
                for (i = 0; i < tempCatBrands.length; i++) {
                    for (j = 0; j < window.hologicNvalueList.length; j++) {
                        if(tempCatBrands[i] == window.hologicNvalueList[j].displayName) {
                            NStr=NStr+"+"+window.hologicNvalueList[j].nValue;
                        }
                    }
                    
                    /*var delimiter = i + 1 == tempCatBrands.length ? '' : ',';
                    brandStr += 'product.brand:' + tempCatBrands[i] + delimiter;
                    if (i + 1 == tempCatBrands.length) {
                        var searchQuery = '/searchresults?N=0&searchType=simple&type=search&Nr=AND(AND(OR(' + encodeURIComponent(brandStr) + '),product.x_types:' + data.name + ')),product.x_searchType:products)';
                        navigation.goTo(searchQuery);
                    }*/
                }
                if(NStr !== '0'){
                    var searchQuery = '/searchresults?N='+NStr+'&searchType=simple&type=search&Nr=AND(OR(product.x_types:' + data.name + '),product.x_searchType:products)';
                console.log("searchQuery...........", searchQuery);
                navigation.goTo(searchQuery);    
                } else {
                    /** If N value is empty redirect to no search results page*/
                    console.log("no N value");
                    navigation.goTo('/noSearchResults');    
                }
            },
            /* addCustomClass: function () {
                 $(".shop-now-container").parents(".redBox").parent().addClass('siteBackground');
                 if(widgetModel.pageContext().page.name=="shopNow"){
                     $(".shop-now-container").parents(".redBox").parent().wrapInner("<div class='container'></div>"); 
                 }
             }*/
        };
    });