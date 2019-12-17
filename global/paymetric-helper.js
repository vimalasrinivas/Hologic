define(
    ['jquery', 'knockout','pubsub','ccRestClient'],
    function ($, ko, pubsub,restClient) {
      "use strict";

      var paymetricHelper = {
        loadPaymetricJs : function(){
            var node = document.createElement('script');
                node.type = 'text/javascript';
                node.id = 'paymetric';
                node.onload = function () {
                   // isScriptLoaded.next(true);
                }
                node.src = 'https://prdapp02.xisecurenet.com/DIeComm/Scripts/XIFrame/XIFrame-1.1.0.js';
                node.async = true;
                node.defer = true;
                document.getElementsByTagName('head')[0].appendChild(node);
          },
          fetchFrameUrl : function(callback) {
            var widget = this;
            restClient.authenticatedRequest('/ccstorex/custom/v1/payments/accessToken',{}, function (data) {
                console.log("data in frame urlll",data)
             callback(data);
            }, function (err) { console.log('Get Service Failure', err); callback(err) }, "GET");
          },
          addCard : function(widgetModel,callback){
            console.log("addNewCardFromFrame");  
            $XIFrame.submit({
                iFrameId: 'addcardFrame',
                targetUrl: widgetModel.iframeData().iframeUrl,
                onSuccess: function (e) {
                    console.log("success");
                    var data = {
                        "enpointUrl":'/ccstorex/custom/v1/payments/ccToken',
                        "postData" :{
                            "accessToken": widgetModel.iframeData().accessToken,
                            "isDefault" : widgetModel.isDefaultCard(),
                            "storeCard" : widgetModel.saveNewCard(),
                            "accountId" : widgetModel.user().currentOrganization().repositoryId,                        
                            "site": { 
                                "siteURL": widgetModel.site().extensionSiteSettings.externalSiteSettings.siteUrl, 
                                "siteName": widgetModel.site().extensionSiteSettings.externalSiteSettings.siteName
                            }
                            }
                    }
                    restClient.authenticatedRequest(data.enpointUrl, data.postData, function (data) {
                      callback(data);
                    }, function (err) { console.log('Post Service Failure', err); callback(err) }, "POST");
                 },
                onError: function (e) {
                    console.log("errorrrr",e);
                    callback(e)
                }
            });
      
          }
      }
      return paymetricHelper;
    })     