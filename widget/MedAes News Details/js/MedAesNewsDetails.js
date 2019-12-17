/**
 * @fileoverview Product Details Widget.
 * 
 */
define(

    //-------------------------------------------------------------------
    // DEPENDENCIES
    //-------------------------------------------------------------------
    ['knockout', 'pubsub', 'ccConstants', 'pageLayout/product','navigation','ccResourceLoader!global/api-helper'],

    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function(ko, pubsub, CCConstants, product,navigation,helper) {

        "use strict";
        var widgetModel;
        

        return {
            createdDate : '',
            viewAllQuery : '',
            onLoad: function(widget) {
                widgetModel = widget;
                var xtypeArr =[];
                var tempDate = new Date(widget.product().creationDate());
                console.log("widgettt",widget.product().creationDate());
                widget.createdDate = tempDate.toLocaleString('default', { month: 'short' }) + ' ' + tempDate.getDate() + ',' + tempDate.getFullYear();
                if (widget.user().loggedIn() === true) {
                    
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
                    
                    widget.viewAllQuery = '/newsSearch?N='+NStr+'&searchType=simple&type=search&Nr=product.x_searchType:news';
                
                }
            },
            
            beforeAppear: function(page) {
                var widget = this;
                 widget.loaded(true);
            },
            viewAllNews : function(){
                navigation.goTo(this.viewAllQuery);
            }

        };
    }
);