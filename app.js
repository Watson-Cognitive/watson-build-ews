var express = require('express');
var watson = require('watson-developer-cloud');
var fs     = require('fs');
var cfenv = require('cfenv');

var app = express();
app.set('title','Early Warning System');
app.set('view engine','ejs');
app.use(express.static(__dirname + '/public'));
var ibmdb = require('ibm_db');
var appEnv = cfenv.getAppEnv();

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.listen(appEnv.port, '0.0.0.0', function() {
  console.log("server starting on " + appEnv.url);
});

app.get('/',function(req,res){
	res.render('login');
});

app.post('/auth', function(req, res) {
	var u = req.username
	console.log("Trying to get the auth" + u)
	ibmdb.open(connString, function(err, conn) {
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			conn.query("SELECT * FROM EWS.DASHBOARD_EWS", function(err, rows, moreResultSets) {
				if ( !err ) { 
					if(rows.length > 0){
						res.data = rows;
						console.log("There are values" + rows[0].CM_Name);
					}else{
						console.log("There are NO values");
					}
					//cb (res) ;
				}else{
					console.log("error occurred " + err.message);
				}
				conn.close(function(){
					console.log("Connection Closed");
				});
				res.render('dashboard',{page_title:"Dashboard",data:rows});
			});
		}
	});
});

//DB2 Connection
var db2 = {
        db: "BLUDB",
        hostname: "dashdb-txn-flex-yp-dal10-03.services.dal.bluemix.net",
        port: 50000,
        username: "bluadmin",
        password: "ZDNhYjI2NDNjYWQw"
     };

var connString = "DRIVER={DB2};DATABASE=" + db2.db + ";UID=" + db2.username + ";PWD=" + db2.password + ";HOSTNAME=" + db2.hostname + ";port=" + db2.port;