/**
 * @fileoverview Footer Widget.
 *
 * @author Taistech
 */
define(
	//-------------------------------------------------------------------
	// DEPENDENCIES
	// Adding knockout
	//-------------------------------------------------------------------
	['knockout', 'ccResourceLoader!global/api-helper'],

	//-------------------------------------------------------------------
	// MODULE DEFINITION
	//-------------------------------------------------------------------
	function (ko, helper) {

		"use strict";

		return {
			getNewResultData: ko.observable(""),
			noRecordsFound: ko.observable(false),
			getSearchTermText:ko.observable(''),
			onLoad: function (widget) {


			},
			resizeSlickHeight: function() {
                setTimeout(function(){
                        var highestBox = 0;
                        $('.news-search .product-wrapper').each(function(){  
                            //console.log("event slide height.....", $(this).height());
                            if($(this).height() > highestBox){  
                                highestBox = $(this).height();  
                            }
                        });    
                        $('.news-search .product-wrapper').height(highestBox);
                    },1000);
            },

			beforeAppear: function (page) {
				var widget = this;
				widget.newsSearchResult();
			//	$("#MedAesNewsSearchResultWidget_v1-wi400036").parent('.col-sm-12').css("background-color", "#f6f6f6");
    			$( window ).resize(function() {
                  widget.resizeSlickHeight();
                });
    		

			},
			newsSearchResult: function () {
				var widget = this;
				widget.noRecordsFound(false);
				var searchQuery = window.location.search.replace('?', "");
				var postData = "/ccstoreui/v1/search?suppressResults=false&searchType=simple&No=0&" + searchQuery;
				helper.getDataExternal(postData, function (err, result) {
					console.log(result, "...data...");
					if (result) {
						if (result.hasOwnProperty('resultsList')) {
							if (result.resultsList.hasOwnProperty('records')) {
								if (result.resultsList.records.length > 0) {
									if (result.resultsList.records[0].hasOwnProperty('records')) {
										widget.getNewResultData(result.resultsList.records);
										 widget.resizeSlickHeight();
									}
								} else {
									widget.noRecordsFound(true);
								}  
							}
						}
						var sPageURL = window.location.search.substring(1),
							sURLVariables = sPageURL.split('&'),
							sParameterName,
							i, flag;
						var flag = false;  
						for (i = 0; i < sURLVariables.length; i++) {  
							sParameterName = sURLVariables[i].split('=');

							if (sParameterName[0] === 'Ntt') {
								flag = true;
								widget.getSearchTermText(sParameterName[1]);
								//console.log(sParameterName[1],"...search query...");  
							}
						}
						if (!flag) {
							$('#searchTitle').addClass('hide');
						} else {
							$('#searchTitle').removeClass('hide');
						}

					}

				})
			}

		};
	}
);