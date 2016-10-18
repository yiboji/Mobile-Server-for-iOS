var Coupon = Parse.Object.extend('testClickedCoupons');
var Store = Parse.Object.extend('testEnteredStores');

Parse.Cloud.define('testRecordClickedCoupons', function(req, res) {
	console.log(req.params.userID);
	console.log(req.params.couponIDArray);
    console.log(req.params.timeClickedArray);
    console.log(req.params.userFoundCouponUsefulArray);
	var userID = req.params.userID;
	var couponList = req.params.couponIDArray;
	var timeList = req.params.timeClickedArray;
    var foundUserfulList = req.params.userFoundCouponUsefulArray
	var length = couponList.length;
	for (var i=0; i<length; i++){
		var coupon = new Coupon();
		coupon.set("userID",userID);
		coupon.set("couponID",couponList[i]);
        coupon.set("tappedTime",timeList[i]);
        coupon.set("markedUsefulOrNot",foundUserfulList[i]);
		coupon.save();
	}
	res.success("Successfully uploaded clicked coupons!");
});

Parse.Cloud.define('testRecordEnteredStores',function(req,res){
	console.log(req.params.userID);
	console.log(req.params.storeIDArray);
	console.log(req.params.timeEnteredArray);
	var userID = req.params.userID;
	var storeList = req.params.storeIDArray;
	var timeList = req.params.timeEnteredArray;
	var length = storeList.length;
	for (var i=0; i<length; i++){
		var store = new Store();
		store.set("userID",userID);
		store.set("storeID",storeList[i]);
		store.set("visitedTime",timeList[i]);
		store.save();
	}
	res.success("Succesfully uploaded entered stores!");
});

Parse.Cloud.define('testLoadCouponStore',function(request,response){
	var currPoint = request.params.geoLocation;
	var radius = request.params.radius;
	var targetCollection = request.params.targetCollection;

	var date = new Date();
	console.log(date);
	if(targetCollection==="TestCouponStore"){
		var storeObj = Parse.Object.extend('TestCouponStore');
		var query = new Parse.Query(storeObj);
		query.withinMiles("geoPoint",currPoint,radius); 

		query.find().then(function(result){
			//result = JSON.stringify(result);
			console.log("testCouponStore Result:");
			console.log(result);
			response.success(result);
		},function(error){
			response.error(error);
			console.log(error);
		})
	}
	else if(targetCollection==="FirstBatchTestStores"){
		var storeObj = Parse.Object.extend('FirstBatchTestStores');
		var query = new Parse.Query(storeObj);
		query.withinMiles("merchantGeoPoint",currPoint,radius); 

		var storeList = new Array();
		query.each(function(store){
			console.log("found a stroe in range!");
			console.log(store);
			var promise = Parse.Promise.as();
			promise = promise.then(function(){
				var couponQuery = new Parse.Query(Parse.Object.extend('FirstBatchTestCoupons'));
				var storename = store.get('merchantName');
                var storeGeoPoint = store.get('merchantGeoPoint');
                                   
				couponQuery.equalTo('merchantName',storename);	
				return couponQuery.find({success:function(couponList){
					var noExpire = false;
                    var withinEffectiveRadius = false;
					console.log(storename);
                                        
                    // compute expiration
					var latestCouponUpdatedAt = new Date(-8640000000000000); //Tuesday, April 20th, 271,821 BCE
					console.log("recently date is: "+latestCouponUpdatedAt);
					for(var i=0; i<couponList.length; i++){
						var expireDate = couponList[i].get('couponExpireDate');
						var updatedDate = couponList[i].get('updatedAt');
						console.log("expireData is: "+expireDate);
						console.log("updateDate: "+updatedDate);
						if(expireDate>date){
							console.log("found a non expire store: "+store +"! expiredate: "+expireDate);
							noExpire = true;
                                        
						}
						if(updatedDate>latestCouponUpdatedAt){
							latestCouponUpdatedAt = updatedDate;
						}
                           
                        if (noExpire == true) {
                            var couponGeoPoint = couponList[i].get('couponCoordinate');
                            var couponRadius = couponList[i].get('couponRadius');       // meters
                        
                            var distance = storeGeoPoint.kilometersTo(couponGeoPoint);
                            if (distance < couponRadius/1000) {
                                withinEffectiveRadius = true;
                                break;
                            }
                        }
					}
                                        
					if(noExpire==true && withinEffectiveRadius==true){
						var retval = store.set({'latestCouponUpdatedAt':latestCouponUpdatedAt});
                        store.dirty = function() {return false};
						storeList.push(store);
					}
				},error:function(error){
                    response.error("coupon query error");
					console.log(error);
				}});
			});
			return promise;
		}).then(function(){
			console.log("firstBatchTestCouponStore result");
			console.log(storeList);
			response.success(storeList);
		},function(error){
			console.log(error);
			response.error("store query error");
		});
	}
	else{
		response.error("invalid coupon table name!!!");
	}
});

Parse.Cloud.define('testNewLoadCouponStore',function(request,response){
	var currPoint = request.params.geoLocation;
    var storeType = request.params.storeType;
	var radius = request.params.radius;
	var targetCollection = request.params.targetCollection;
	if(targetCollection==="TestCouponStore"){
		var storeObj = Parse.Object.extend('TestCouponStore');
		var query = new Parse.Query(storeObj);
		query.withinMiles("geoPoint",currPoint,radius); 
		query.find().then(function(result){
			//result = JSON.stringify(result);
			console.log("testCouponStore Result:");
			console.log(result);
			response.success(result);
		},function(error){
			response.error(error);
			console.log(error);
		})
	}
	else if(targetCollection==="FirstBatchTestStores"){
		var storeObj = Parse.Object.extend('FirstBatchTestStores');
		var query = new Parse.Query(storeObj);
                   
        if (storeType == "" || storeType == "All") {
            query.withinMiles("merchantGeoPoint",currPoint,radius);
        } else {
            query.withinMiles("merchantGeoPoint",currPoint,radius);
            query.equalTo('merchantType', storeType);
        }

		var couponDict = new Map();
		var storeList = new Array();
		var storetest = new Array();
		var coupontest = new Array();
		query.find(function(stores){
			var retStores = stores;
			for(var i=0; i<stores.length; i++){
				storetest.push(stores[i].get("merchantName"));
			}
			var couponQuery = new Parse.Query(Parse.Object.extend('FirstBatchTestCoupons'));
			var radiusKm = radius*1.60;
			console.log(currPoint.latitude);
			console.log(currPoint.longitude);
			var deltaLat = (1/110.54)*radiusKm;
			var northeast = new Parse.GeoPoint(currPoint.latitude+deltaLat, currPoint.longitude+(1/(111.320*Math.cos((currPoint.latitude+deltaLat)/90)))*radiusKm);
			var southwest = new Parse.GeoPoint(currPoint.latitude-deltaLat, currPoint.longitude-(1/(111.320*Math.cos((currPoint.latitude-deltaLat)/90)))*radiusKm);
			couponQuery.withinGeoBox("couponCoordinate",southwest,northeast);
			var bigCouponQuery = new Parse.Query(Parse.Object.extend('FirstBatchTestCoupons'));
			var bigRadiusKm = 200*1.60;
			var bigDeltaLat = (1/110.54)*bigRadiusKm;
			var bigNortheast = new Parse.GeoPoint(currPoint.latitude+bigDeltaLat, currPoint.longitude+(1/(111.320*Math.cos((currPoint.latitude+bigDeltaLat)/90)))*bigRadiusKm);
			var bigSouthwest = new Parse.GeoPoint(currPoint.latitude-bigDeltaLat, currPoint.longitude-(1/(111.320*Math.cos((currPoint.latitude-bigDeltaLat)/90)))*bigRadiusKm);
			bigCouponQuery.withinGeoBox("couponCoordinate",bigSouthwest,bigNortheast);
			bigCouponQuery.greaterThan('couponRadius',10*1.6*1000);
			var compoundQuery = Parse.Query.or(couponQuery,bigCouponQuery);
			console.log(northeast);
			console.log(southwest);
			console.log(bigNortheast);
			console.log(bigSouthwest);

			compoundQuery.find({
				success:function(coupons){
					 console.log(coupons);
					for(var i=0; i<coupons.length; i++){
						var coupon = coupons[i];
						var storename = coupon.get("merchantName");
						coupontest.push(storename);
						if(couponDict.has(storename)==false){
							couponDict.set(storename,new Array());
						}
						couponDict.get(storename).push(coupon);
					}
					var currDate = new Date();
					for(var i=0; i<retStores.length; i++){
						var store = retStores[i];
						var storename = store.get("merchantName");
						var storeGeoPoint = store.get("merchantGeoPoint");
						if(couponDict.has(storename)==true){
							var noExpire = false;
							var withinEffectiveRadius = true;
							var latestCouponUpdatedAt = new Date(-8640000000000000); //Tuesday, April 20th, 271,821 BCE
							var couponList = couponDict.get(storename);

							for(var j=0; j<couponList.length; j++){
								var expireDate = couponList[j].get('couponExpireDate');
								var updatedDate = couponList[j].get('updatedAt');
								if(expireDate>currDate){
									console.log("found a non expire store");
									noExpire = true;
								}
								if(updatedDate>latestCouponUpdatedAt){
									latestCouponUpdatedAt = updatedDate;
								}
								var couponGeoPoint = couponList[j].get('couponCoordinate');		
	                            var couponRadius = couponList[j].get('couponRadius');       // meters
	                            var distance = storeGeoPoint.kilometersTo(couponGeoPoint);
	                            if (distance >= couponRadius/1000) {
	                            	console.log("can't pass distance check!");
	                                withinEffectiveRadius = false;
	                            }
							}
							if(noExpire==true && withinEffectiveRadius==true){
								var retval = store.set({'latestCouponUpdatedAt':latestCouponUpdatedAt});
			                    store.dirty = function() {return false};
								storeList.push(store);
							}
						}
					}
					console.log("result :");
					console.log(storeList);
					response.success(storeList);
				},
			error: function(error){
				console.log(error);
				}
			});
		});
	}
    else if(targetCollection==="Stores"){
        var storeObj = Parse.Object.extend('Stores');
        var query = new Parse.Query(storeObj);
                   
        if (storeType == "" || storeType == "All") {
            query.withinMiles("merchantGeoPoint",currPoint,radius);
        } else {
            query.withinMiles("merchantGeoPoint",currPoint,radius);
            query.equalTo('merchantType', storeType);
        }
                   
        var couponDict = new Map();
        var storeList = new Array();
        var storetest = new Array();
        var coupontest = new Array();
        query.find(function(stores){
            var retStores = stores;
            for(var i=0; i<stores.length; i++){
                storetest.push(stores[i].get("merchantName"));
            }
            var couponQuery = new Parse.Query(Parse.Object.extend('Coupons'));
            var radiusKm = radius*1.60;
            console.log(currPoint.latitude);
            console.log(currPoint.longitude);
            var deltaLat = (1/110.54)*radiusKm;
            var northeast = new Parse.GeoPoint(currPoint.latitude+deltaLat, currPoint.longitude+(1/(111.320*Math.cos((currPoint.latitude+deltaLat)/90)))*radiusKm);
            var southwest = new Parse.GeoPoint(currPoint.latitude-deltaLat, currPoint.longitude-(1/(111.320*Math.cos((currPoint.latitude-deltaLat)/90)))*radiusKm);
            couponQuery.withinGeoBox("couponCoordinate",southwest,northeast);
            var bigCouponQuery = new Parse.Query(Parse.Object.extend('Coupons'));
            var bigRadiusKm = 200*1.60;
            var bigDeltaLat = (1/110.54)*bigRadiusKm;
            var bigNortheast = new Parse.GeoPoint(currPoint.latitude+bigDeltaLat, currPoint.longitude+(1/(111.320*Math.cos((currPoint.latitude+bigDeltaLat)/90)))*bigRadiusKm);
            var bigSouthwest = new Parse.GeoPoint(currPoint.latitude-bigDeltaLat, currPoint.longitude-(1/(111.320*Math.cos((currPoint.latitude-bigDeltaLat)/90)))*bigRadiusKm);
            bigCouponQuery.withinGeoBox("couponCoordinate",bigSouthwest,bigNortheast);
            bigCouponQuery.greaterThan('couponRadius',10*1.6*1000);
            var compoundQuery = Parse.Query.or(couponQuery,bigCouponQuery);
            console.log(northeast);
            console.log(southwest);
            console.log(bigNortheast);
            console.log(bigSouthwest);
                   
            compoundQuery.find({
                success:function(coupons){
                console.log(coupons);
                for(var i=0; i<coupons.length; i++){
                    var coupon = coupons[i];
                    var storename = coupon.get("merchantName");
                    coupontest.push(storename);
                    if(couponDict.has(storename)==false){
                        couponDict.set(storename,new Array());
                    }
                    couponDict.get(storename).push(coupon);
                }
                               
                var currDate = new Date();
                for(var i=0; i<retStores.length; i++){
                    var store = retStores[i];
                    var storename = store.get("merchantName");
                    var storeGeoPoint = store.get("merchantGeoPoint");
                    if(couponDict.has(storename)==true){
                        var noExpire = false;
                        var withinEffectiveRadius = true;
                        var latestCouponUpdatedAt = new Date(-8640000000000000); //Tuesday, April 20th, 271,821 BCE
                        var couponList = couponDict.get(storename);
             
                        for(var j=0; j<couponList.length; j++){
                            var expireDate = couponList[j].get('couponExpireDate');
                            var updatedDate = couponList[j].get('updatedAt');
                               
                            if(expireDate>currDate){
                                console.log("found a non expire store");
                                noExpire = true;
                            }
                               
                            if(updatedDate>latestCouponUpdatedAt){
                                latestCouponUpdatedAt = updatedDate;
                            }
                               
                            var couponGeoPoint = couponList[j].get('couponCoordinate');
                            var couponRadius = couponList[j].get('couponRadius');       // meters
                            var distance = storeGeoPoint.kilometersTo(couponGeoPoint);
                               
                            if (distance >= couponRadius/1000) {
                                console.log("can't pass distance check!");
                                withinEffectiveRadius = false;
                            }
                        }
                               
                        if(noExpire==true && withinEffectiveRadius==true){
                        var retval = store.set({'latestCouponUpdatedAt':latestCouponUpdatedAt});
                            store.dirty = function() {return false};
                            storeList.push(store);
                        }
                    }
                }
                console.log("result :");
                console.log(storeList);
                response.success(storeList);
            },
            error: function(error){
                console.log(error);
            }
            });
        });
    }
	else{
		response.error("invalid coupon table name!!!");
	}
});

Parse.Cloud.define('loadCouponStoreWithSubType',function(request,response){
	var currPoint = request.params.geoLocation;
    var storeType = request.params.storeType;
    var storeSubType = request.params.storeSubType;
	var radius = request.params.radius;
	var targetCollection = request.params.targetCollection;
	if(targetCollection==="TestCouponStore"){
		var storeObj = Parse.Object.extend('TestCouponStore');
		var query = new Parse.Query(storeObj);
		query.withinMiles("geoPoint",currPoint,radius); 
		query.find().then(function(result){
			//result = JSON.stringify(result);
			console.log("testCouponStore Result:");
			console.log(result);
			response.success(result);
		},function(error){
			response.error(error);
			console.log(error);
		})
	}
    else if(targetCollection==="Stores"){
        var storeObj = Parse.Object.extend('Stores');
        var query = new Parse.Query(storeObj);
                   
        if (storeType == "" || storeType == "All") {
            query.withinMiles("merchantGeoPoint",currPoint,radius);
        } else {
            query.withinMiles("merchantGeoPoint",currPoint,radius);
            query.equalTo('merchantType', storeType);
          	if(storeSubType!="All"){
          		query.equalTo('merchantSubType', storeSubType);
          	}
        }
                   
        var couponDict = new Map();
        var storeList = new Array();
        var storetest = new Array();
        var coupontest = new Array();
        query.find(function(stores){
            var retStores = stores;
            for(var i=0; i<stores.length; i++){
                storetest.push(stores[i].get("merchantName"));
            }
            var couponQuery = new Parse.Query(Parse.Object.extend('Coupons'));
            var radiusKm = radius*1.60;
            console.log(currPoint.latitude);
            console.log(currPoint.longitude);
            var deltaLat = (1/110.54)*radiusKm;
            var northeast = new Parse.GeoPoint(currPoint.latitude+deltaLat, currPoint.longitude+(1/(111.320*Math.cos((currPoint.latitude+deltaLat)/90)))*radiusKm);
            var southwest = new Parse.GeoPoint(currPoint.latitude-deltaLat, currPoint.longitude-(1/(111.320*Math.cos((currPoint.latitude-deltaLat)/90)))*radiusKm);
            couponQuery.withinGeoBox("couponCoordinate",southwest,northeast);
            var bigCouponQuery = new Parse.Query(Parse.Object.extend('Coupons'));
            var bigRadiusKm = 200*1.60;
            var bigDeltaLat = (1/110.54)*bigRadiusKm;
            var bigNortheast = new Parse.GeoPoint(currPoint.latitude+bigDeltaLat, currPoint.longitude+(1/(111.320*Math.cos((currPoint.latitude+bigDeltaLat)/90)))*bigRadiusKm);
            var bigSouthwest = new Parse.GeoPoint(currPoint.latitude-bigDeltaLat, currPoint.longitude-(1/(111.320*Math.cos((currPoint.latitude-bigDeltaLat)/90)))*bigRadiusKm);
            bigCouponQuery.withinGeoBox("couponCoordinate",bigSouthwest,bigNortheast);
            bigCouponQuery.greaterThan('couponRadius',10*1.6*1000);
            var compoundQuery = Parse.Query.or(couponQuery,bigCouponQuery);
            console.log(northeast);
            console.log(southwest);
            console.log(bigNortheast);
            console.log(bigSouthwest);
                   
            compoundQuery.find({
                success:function(coupons){
                console.log(coupons);
                for(var i=0; i<coupons.length; i++){
                    var coupon = coupons[i];
                    var storename = coupon.get("merchantName");
                    coupontest.push(storename);
                    if(couponDict.has(storename)==false){
                        couponDict.set(storename,new Array());
                    }
                    couponDict.get(storename).push(coupon);
                }
                               
                var currDate = new Date();
                for(var i=0; i<retStores.length; i++){
                    var store = retStores[i];
                    var storename = store.get("merchantName");
                    var storeGeoPoint = store.get("merchantGeoPoint");
                    if(couponDict.has(storename)==true){
                        var noExpire = false;
                        var withinEffectiveRadius = true;
                        var latestCouponUpdatedAt = new Date(-8640000000000000); //Tuesday, April 20th, 271,821 BCE
                        var couponList = couponDict.get(storename);
             
                        for(var j=0; j<couponList.length; j++){
                            var expireDate = couponList[j].get('couponExpireDate');
                            var updatedDate = couponList[j].get('updatedAt');
                               
                            if(expireDate>currDate){
                                console.log("found a non expire store");
                                noExpire = true;
                            }
                               
                            if(updatedDate>latestCouponUpdatedAt){
                                latestCouponUpdatedAt = updatedDate;
                            }
                               
                            var couponGeoPoint = couponList[j].get('couponCoordinate');
                            var couponRadius = couponList[j].get('couponRadius');       // meters
                            var distance = storeGeoPoint.kilometersTo(couponGeoPoint);
                               
                            if (distance >= couponRadius/1000) {
                                console.log("can't pass distance check!");
                                withinEffectiveRadius = false;
                            }
                        }
                               
                        if(noExpire==true && withinEffectiveRadius==true){
                        var retval = store.set({'latestCouponUpdatedAt':latestCouponUpdatedAt});
                            store.dirty = function() {return false};
                            storeList.push(store);
                        }
                    }
                }
                console.log("result :");
                console.log(storeList);
                response.success(storeList);
            },
            error: function(error){
                console.log(error);
            }
            });
        });
    }
	else{
		response.error("invalid coupon table name!!!");
	}
});
