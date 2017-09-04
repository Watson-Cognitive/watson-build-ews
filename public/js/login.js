'use strict';

$(document).ready(function() { 
	$("#auth-form").submit(function(){
		var userName =  document.getElementById("username").value ;
	    var pass =  document.getElementById("password").value ;
	    localStorage.setItem("username", userName);
	    var auth = false;
	    if(userName != "client1" && pass != "client1") auth = true;
	    else if(userName != "client2" && pass != "client2") auth = true;
	    if(!auth) return false;
	})
});