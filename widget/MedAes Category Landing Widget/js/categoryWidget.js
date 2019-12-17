define(['knockout', 'CCi18n',
	'navigation', 'pubsub', 'notifier', 'ccRestClient', 'ccConstants'
],
	function (ko, CCi18n, navigation, pubsub, notifier, ccRestClient, ccConstants) {


		"use strict";

		return {
			accountBrands: ko.observableArray([]),
			bucketstr: ko.observable(),
			productData: ko.observableArray([]),
			onLoad: function (widget) {
              
				var bucketTempStr = '';
				var xtypeArr = [];
				if (widget.user().loggedIn() === true) {
					var catalogBrandsObj = $(widget.user().currentOrganization().account_catalog_brands);
					if (catalogBrandsObj[0].textContent) {
						var tempBrandsArray = catalogBrandsObj[0].textContent.split('|');
						widget.accountBrands(tempBrandsArray);
					}
					var catalogHtmlObj = $(widget.user().currentOrganization().account_catalog_buckets);
					if (catalogHtmlObj[0].textContent) {
						var tempArray = catalogHtmlObj[0].textContent.split('|');
						for (var i = 0; i < tempArray.length; i++) {
							xtypeArr.push('product.x_types:' + tempArray[i]);
						}
						bucketTempStr = xtypeArr.length > 0 ? xtypeArr.length > 1 ? xtypeArr.join(',') : xtypeArr[0] : '';
						widget.bucketstr(bucketTempStr);
						console.log(bucketTempStr, "..bucketTempStr...");

					}
				};
			},

			beforeAppear: function (page) {
				this.getDataByBrand();
			    $("#MedAesCategoryLandingWidget_v1-wi400046").parent('.col-sm-12').css("padding","0px");        
			},     

			getDataByBrand: function () {   
				var widget = this;
				var tempObj;
				var tempBrandsArray = this.accountBrands();
				for (var i = 0; i < tempBrandsArray.length; i++) {
					var nrQueryParam = 'Nr=AND(OR(product.brand:' + tempBrandsArray[i] + '),OR(' + widget.bucketstr() + '))';
					tempObj = {
						"name": tempBrandsArray[i],
						"navigationState": '/searchresults?N=0&searchType=simple&type=search&' + nrQueryParam
					}
					widget.productData.push(tempObj);
				
				}
	        console.log(widget.productData(), "..........product data........");   
			}

		}


	})