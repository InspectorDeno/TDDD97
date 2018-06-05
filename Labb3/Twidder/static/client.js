var passwordLength = 5;
var sessionToken = null;
var currentlyVisiting;
var ws;


window.onload = function(){
    displayView();
};

// Close socket if window unloads
window.onbeforeunload = function() {
    if(ws !== undefined){
        console.log("closing socket...");
        ws.onclose = function () {};
        ws.close();
    } else {
        console.log("Socket was undefined..")
    }
};


displayView = function(){

    if(sessionToken !== null){
        document.getElementById("view").innerHTML = document.getElementById("profileview").innerHTML;
        // Redirect to home screen
        selectTab(document.getElementById("home"));
    } else {
        console.log("token is null loading loginView");
        document.getElementById("view").innerHTML = document.getElementById("loginview").innerHTML;
    }
};

login = function(){

    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;

    var params = "email="+email+"&password="+password;

    sendPOSTRequest("/signin", params, function (response) {

        if(response.success){

            // Add userToken to local storage
            localStorage.setItem("token", response.data);
            sessionToken = response.data;

            // Send token over socket to log out potential older session
            webSocketConnect(sessionToken);

            // Display their view
            currentlyVisiting = email;
            displayView();
        } else {
            document.getElementById("signinError").innerHTML = response.message;
            console.log(response.message);
        }
    })
};

autoLogin = function (email, password) {

    var params = "email="+email+"&password="+password;
    sendPOSTRequest("/signin", params, function (response) {

        if(response.success){

            // Add userToken to local storage
            localStorage.setItem("token", response.data);
            sessionToken = response.data;

            // Display their view
            displayView();
            currentlyVisiting = email;
        } else {
            document.getElementById("signinError").innerHTML = response.message;
            console.log(response.message);
        }
    })
};

signup = function(){

    var email = document.getElementById("signup-email").value;
    var password = document.getElementById("signup-pw").value;
    var firstName = document.getElementById("signup-firstName").value;
    var familyName = document.getElementById("signup-familyName").value;
    var gender = document.getElementById("signup-gender").value;
    var city = document.getElementById("signup-city").value;
    var country = document.getElementById("signup-country").value;

    var repeatPassword = document.getElementById("signup-rpw").value;

    var checkPass = validate(password, repeatPassword);

    // Password isn't valid
    if (checkPass !== "OK") {
        document.getElementById("signupError").innerHTML = checkPass;
        console.log(checkPass);
    } else {

        // Convert to JSON-object
        var theUser = {
            "email": email,
            "password": password,
            "firstname": firstName,
            "familyname": familyName,
            "gender": gender,
            "city": city,
            "country": country
        };

        var params = "email=" + theUser.email +
            "&password=" + theUser.password +
            "&firstname=" + theUser.firstname +
            "&familyname=" + theUser.familyname +
            "&gender=" + theUser.gender +
            "&city=" + theUser.city +
            "&country=" + theUser.country;

        sendPOSTRequest("/signup", params, function (response) {
            if (response.success) {
                autoLogin(email, password);
            } else {
                document.getElementById("signupError").innerHTML = response.message;
            }
        });
    }
};

validate = function(pw, rpw){

    // Password needs to be long enough
    if(pw.length >= passwordLength) {
        // And match with repeatet password
        if(pw === rpw){
            return "OK"
        } else {
            return "Passwords don't match";
        }
    } else {
        return "Password has to be at least " + passwordLength + " characters long";
    }
};

selectTab = function(tab){

    var tabs = document.getElementById("tabs").getElementsByTagName("div");
    // loop through all tabs
    for(var i=0; i < tabs.length; i++){
        tabs[i].style.borderBottomColor = "black";
        tabs[i].style.backgroundColor = "#969c99";
    }
    // specify appearance of specific tab
    tab.style.borderBottomColor = "#c7ceca";
    tab.style.backgroundColor = "#c7ceca";

    var views = document.getElementById("pcontainer").getElementsByClassName("pcontent");
    // loop through all views
    for(var j=0; j < views.length; j++) {
        if(views[j].id === tab.id+"view"){
            // set the correct view to be displayed
            views[j].style.display = "flex";
            if(views[j].id === "homeview"){
                // Get user data from server
                sendGETrequest("/get-user-data-by-token/?token=" + sessionToken, function (response){
                    if(response.success){
                        currentlyVisiting = response.data.email;
                        updateUserInfo(response.data);
                        refreshWall();
                    } else {
                        //TODO: do something?
                    }
                });
            }
        } else {
            // the other ones are hidden
            views[j].style.display = "none";
        }
    }
};

signOut = function(){
    var params = "token="+sessionToken;
     sendPOSTRequest("/signout", params, function (response) {
         if (response.success) {
             localStorage.removeItem("token");
             sessionToken = null;
             displayView();
         } else {
             //TODO: idk, sign out anyways?
         }
     })
};

changePassword = function(){
    var oldpw = document.getElementById("oldpw").value;
    var newpw = document.getElementById("newpw").value;
    var rnewpw = document.getElementById("rnewpw").value;

    // Reset the fields
    document.getElementById("changePassForm").reset();
    var changePass = validate(newpw, rnewpw);
    if(changePass === "OK"){
        var token = localStorage.getItem("token");

        var params = "token="+token+"&old_password="+oldpw+"&new_password="+newpw;
        sendPOSTRequest("/change-password", params, function (response) {

            document.getElementById("changePassError").innerText = response.message;
            console.log("changePass error: " + changePass);

        })

    } else {
        // Output error to user, passwords don't match
        document.getElementById("changePassError").innerText = changePass;
        console.log("changePass error: " + changePass);
    }

};

function writePost() {
    // Get the message
    var message = document.getElementById("writeMessage").value;

    // Clear message box
    document.getElementById("writeMessage").value = "";

    if(message.length !== 0) {

        var params = "message=" + message + "&token=" + sessionToken + "&email=" + currentlyVisiting;
        sendPOSTRequest("/post-message", params, function (response) {
            if (response.success){
                refreshWall();
            }
        });

    }

}

function refreshWall() {
    // first clear the wall
    var messages = document.getElementById("wall");
    while (messages.firstChild) {
        messages.removeChild(messages.firstChild);
    }

    // Get user data
    sendGETrequest("/get-user-messages-by-email/?token=" + sessionToken + "&email=" + currentlyVisiting, function (response) {
        if (response.success) {
            var userdata = response.data;
            console.log(userdata);
            // Loops through all messages in reverse order
            for(var i = userdata.content.length - 1; i >= 0; i--){

                // Create a messageDiv to append
                var messageDiv = document.createElement("div");
                messageDiv.className = "wallPost";
                messageDiv.style.wordBreak = "break-all";
                messageDiv.style.background = "rgba(173, 216, 230, 0.5)";
                messageDiv.style.margin = "4px 25px 4px 0";
                messageDiv.style.padding = "3px";
                messageDiv.style.whiteSpace = "pre-line";
                messageDiv.style.webkitTextFillColor = "darkcyan";

                // Pimp name of writer
                var writer = document.createTextNode(userdata.writer[i] + ": \n");
                var writerStyle = document.createElement("span");
                writerStyle.style.webkitTextFillColor = "#00494e";
                writerStyle.style.fontWeight = "bold";
                writerStyle.appendChild(writer);

                // Message
                var theMessage = document.createTextNode(userdata.content[i]);

                messageDiv.appendChild(writerStyle);
                messageDiv.appendChild(theMessage);
                document.getElementById("wall").appendChild(messageDiv);
            }
        }
    })
}

function updateUserInfo(userInfo){

    document.getElementById("currentName").innerText = userInfo.firstname + " " + userInfo.familyname;
    document.getElementById("currentGender").innerText = userInfo.gender;
    document.getElementById("currentCity").innerText = userInfo.city;
    document.getElementById("currentCountry").innerText = userInfo.country;
    document.getElementById("currentEmail").innerText = userInfo.email;
}

function findUser() {
    var email = document.getElementById("userToVisit").value;

    sendGETrequest("/get-user-data-by-email/?token=" + sessionToken + "&email=" + email, function (response) {
        if (response.success) {
            document.getElementById("homeview").style.display = "flex";
            document.getElementById("noUserError").innerText = "";
            currentlyVisiting = email;
            updateUserInfo(response.data);
            refreshWall();
        } else {
            document.getElementById("noUserError").innerText = response.message;
            console.log("lol no friends");
        }
    })

}

function sendPOSTRequest(url, params, callback){
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", url, true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4 && xhttp.status === 200) {
            callback(JSON.parse(xhttp.responseText));
        }
    };
    xhttp.send(params)
}

function sendGETrequest(url, callback) {
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", url, true);
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4 && xhttp.status === 200) {
            callback(JSON.parse(xhttp.responseText));
        }
    };
    xhttp.send(null);
}

function webSocketConnect(token) {
    var ws = new WebSocket('ws://localhost:5000/socket');
    ws.onopen = function () {
        if(token!== null){
            var data = {
                "type": "login",
                "data": token
            };
            ws.send(JSON.stringify(data));
        }

    };
    ws.onmessage = function (ev) {
        var response = JSON.parse(ev.data);
        if(response.type === "signout"){
            console.log("Hey, logging out")
            signOut();
        }
    };
}