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
  ['knockout','ccResourceLoader!global/api-helper'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko,helper) {

    "use strict";
	
    return {
        getCancellationOrders :ko.observable(),
		onLoad: function(widget) {
	    	 widget.externalShippingOrderCall();
		},

		beforeAppear: function(page) {
	
		},
	
         externalShippingOrderCall: function() {
                var self=this; 
                var skuData = {
                "accountId" : "100001",  
                "status" : ["cancelled"] 
                }   
                var data = {
                  "enpointUrl": helper.apiEndPoint.orderHistory,
                  "postData" : skuData
                }
                helper.postDataExternal(data,function(err,result){    
                  var cancelOrders=[];
                    if(result){
                        console.log("cancelresultshow---->",result);           
                      //   self.getOrders(result.orders);
                        for(var j=0;j<result.orders.length;j++){
                          if(result.orders[j].status=='CANCELLED'){       
                          cancelOrders.push(result.orders[j]);
                        }
                            if(j+1==result.orders.length){ 
                                
                                self.getCancellationOrders(cancelOrders);
                               
                                var tableIds = ['#cancelledOrders'];
                                for (var i = 0; i < tableIds.length; i++) {                   
                                      $(tableIds[i]).DataTable({
                                          "ordering": false,
                                          "info":     false,
                                          responsive: true,
                                          "pagingType": "numbers",
                                          "iDisplayLength": 20,
                                          "language": {search: "",searchPlaceholder: "Order #"}
                                      });
                                }
                                 console.log(self.getCancellationOrders(),"self.getCancellationOrders");  
                               
                            }
                        }
                      
                    }
                })
            }
    };
  }
);
