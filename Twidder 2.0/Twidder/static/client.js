var passwordLength = 5;
var currentlyVisiting;
var colors = [
    '#d594d4',
    '#9492d5',
    '#a0d5d5',
    '#99d597',
    '#d5d496',
    '#d59699'
];

window.onload = function(){
    webSocketConnect();
    displayView();
};

window.onbeforeunload = function() {
    if(ws !== undefined) {
        console.log("closing socket...");
        ws.onclose = function (){}; // disable onclose handler first
        ws.close();
    } else {
        console.log("Socket was undefined...");
    }
};

displayView = function(){

    var token = localStorage.getItem("token");
    if(token !== null) {
        // User has ongoing session
        document.getElementById("view").innerHTML = document.getElementById("profileview").innerHTML;
        // Redirect to home screen
        selectTab(document.getElementById("home"));
    }
    else {
        console.log("Token was null...");
        document.getElementById("view").innerHTML = document.getElementById("loginview").innerHTML;
    }
};

login = function(){
    var email;
    var password;

    // For auto-login after signup
    if(arguments.length !== 0){
        email = arguments[0];
        password = arguments[1];
    } else {
        email = document.getElementById("email").value;
        password = document.getElementById("password").value;
    }

    var params = {
        "email": email,
        "password": password
    };

    sendPOSTRequest("/signin", params, function (response) {

        if(response.success){

            // Add userToken to local storage
            var sessionToken = response.data;
            localStorage.setItem("token", sessionToken);

            // Send login info over socket
            console.log("token: " + sessionToken);
            currentlyVisiting = email;
            // Send login information via socket
            webSocketConnect();
            displayView();

        } else {
            document.getElementById("signinError").innerHTML = response.message;
            console.log(response.message);
        }
    });
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

        var params = {"email": theUser.email,
            "password": theUser.password,
            "firstname": theUser.firstname,
            "familyname": theUser.familyname,
            "gender": theUser.gender,
            "city": theUser.city,
            "country": theUser.country
        };

        sendPOSTRequest("/signup", params, function (response) {
            if (response.success) {
                login(email, password);
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
        tabs[i].style.backgroundColor = "#b2b8b5";
        if(tabs[i].id === 'home'){
            tabs[i].style.zIndex = '2';
        } else if (tabs[i].id === 'browse'){
            tabs[i].style.zIndex = '1';
        } else {
            tabs[i].style.zIndex = '0';
        }
        console.log(tabs[i].id);
    }
    // specify appearance of specific tab
    tab.style.zIndex = '3';
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
                var sessionToken = localStorage.getItem("token");
                sendGETrequest("/get-user-data-by-token/?token=" + sessionToken, function (response){
                    console.log(response.message);
                    if(response.success){
                        currentlyVisiting = response.data.email;
                        updateUserInfo(response.data);
                        refreshWall();
                    } else {
                        console.log(response.message);
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
    var sessionToken = localStorage.getItem("token");
    var params = {"token": sessionToken};
    sendPOSTRequest("/signout", params, function (response) {
        if (response.success) {
            localStorage.removeItem("token");
            displayView();
        } else {
            //Could happen, sign them out anyways...
            localStorage.removeItem("token");
            displayView();
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

        var params = {
            "token": token,
            "old_password": oldpw,
            "new_password": newpw
        };
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

writePost = function() {
    // Get the message
    var message = document.getElementById("writeMessage").value;

    // Clear message box
    document.getElementById("writeMessage").value = "";

    if(message.length !== 0) {
        var sessionToken = localStorage.getItem("token");
        var params = {
            "message": message,
            "token": sessionToken,
            "email": currentlyVisiting
        };
        sendPOSTRequest("/post-message", params, function (response) {
            if (response.success){
                refreshWall();
            }
        });

    }
}

refreshWall = function() {
    // Clear the photo wall of option elements
    resetPhotoWall();

    // Clear the wall of messages
    var messages = document.getElementById("wall");
    while (messages.firstChild) {
        messages.removeChild(messages.firstChild);
    }

    // Get user data
    var sessionToken = localStorage.getItem("token");
    sendGETrequest("/get-user-messages-by-email/?token=" + sessionToken + "&email=" + currentlyVisiting, function (response) {
        if (response.success) {
            var userData = response.data;
            // Loops through all messages in reverse order
            userData.reverse();
            userData.forEach(function (message, i) {

                // Create a messageDiv to append
                var color = colors[i%5];
                var messageDiv = document.createElement("div");
                messageDiv.id = message.from_user+i;
                messageDiv.className = "wallPost";
                messageDiv.style.wordBreak = "break-all";
                messageDiv.style.background = color+"22";
                messageDiv.style.margin = "4px";
                messageDiv.style.padding = "3px";
                messageDiv.style.whiteSpace = "pre-line";
                messageDiv.style.webkitTextFillColor = "darkslategrey";
                messageDiv.style.fontSize = "small";
                messageDiv.draggable = true;

                // Pimp name of writer
                var writer = document.createTextNode(message.from_user + ": \n");
                var writerStyle = document.createElement("span");
                writerStyle.style.webkitTextFillColor = colors[i%5];
                writerStyle.style.fontWeight = "bold";
                writerStyle.appendChild(writer);

                // Message
                var theMessage = document.createTextNode(message.content);

                messageDiv.appendChild(writerStyle);
                messageDiv.appendChild(theMessage);
                document.getElementById("wall").appendChild(messageDiv);
            });
        }
    })
};

updateUserInfo = function(userInfo){
    document.getElementById("currentName").innerText = userInfo.firstname + " " + userInfo.familyname;
    document.getElementById("currentGender").innerText = userInfo.gender;
    document.getElementById("currentCity").innerText = userInfo.city;
    document.getElementById("currentCountry").innerText = userInfo.country;
    document.getElementById("currentEmail").innerText = userInfo.email;
    // Profile picture
    document.getElementById("pictureArea").innerHTML =
        "<img id='profilePic' src=\"data:image/" + userInfo.profile_pic[0][1] + ';base64,' + userInfo.profile_pic[0][0] + "\" " +
        "style='width: 100%;height: 100%;object-fit: cover'/>";
};

findUser = function() {
    var email = document.getElementById("userToVisit").value;
    var sessionToken = localStorage.getItem("token");

    sendGETrequest("/get-user-data-by-email/?token=" + sessionToken + "&email=" + email, function (response) {
        if (response.success) {
            document.getElementById("homeview").style.display = "flex";
            document.getElementById("noUserError").innerText = "";
            currentlyVisiting = email;
            updateUserInfo(response.data);
            refreshWall();
            downloadMedia(email);
            requestStats(email);
        } else {
            document.getElementById("noUserError").innerText = response.message;
            console.log("lol no friends");
        }
    })
}

// This generates the charts
generateCharts = function () {
    // Random index for chart colors
    var ri = Math.floor(Math.random() * colors.length);

    genderChart = new Chart(document.getElementById("chart1"), {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                backgroundColor: [
                    colors[ri],
                    colors[(ri+1)%5],
                    colors[(ri+2)%5]
                ],
                data: []
            }]
        },
        options: {
            title: {
                display: true,
                text: 'Gender distribution of users'
            },
            legend: {
                display: false
            }
        }
    });

    ri = Math.floor(Math.random() * colors.length);
    usersChart = new Chart(document.getElementById("chart2"), {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                backgroundColor: [
                    colors[ri],
                    colors[(ri+1)%5]
                ],
                data: []
            }]
        },
        options: {
            title: {
                display: true,
                text: 'Logged in users'
            },
            legend: {
                display: false
            }
        }
    });

    messageChart = new Chart(document.getElementById("chart3"), {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                backgroundColor: [],
                data: []
            }]
        },
        options: {
            title: {
                display: true,
                text: 'Best friends by message count'
            },
            legend: {
                display: false
            }
        }
    });
};

// Updates chart data
updateCharts = function(index, chart, stats){
    clearChart(chart);
    switch(index){
        // Gender data
        case 0:
            stats.forEach(function (entry, i) {
                chart.data.labels[i] = entry.gender;
                chart.data.datasets[0].data[i] = entry.count;
            });
            break;
        // Logged in users data
        case 1:
            chart.data.labels[0] = "Logged in users";
            chart.data.labels[1] = "Offline users";

            chart.data.datasets[0].data[0] = stats[0].logged_in;
            chart.data.datasets[0].data[1] = stats[0].total - stats[0].logged_in;

            break;
        // Messages data
        case 2:
            var ri = Math.floor(Math.random() * colors.length);
            stats.forEach(function (entry, i) {
                chart.data.labels[i] = entry.from_user;
                chart.data.datasets[0].data[i] = entry.count;

                chart.data.datasets[0].backgroundColor[i] =
                    colors[(ri + i)%5]
            });
            break;
    }

    chart.update();
}

clearChart = function(chart){
    chart.data.datasets[0].data = [];
    chart.data.labels = [];
}

// For getting the chart data from the server
requestStats = function(){
    console.log("requesting stats");
    var token = localStorage.getItem("token");
    var data;
    if(arguments.length > 0){
        // Data from other user
        var email = arguments[0];
        data = {
            "type": "get-stats",
            "token": token,
            "email": email
        };
    } else {
        // Our data
        data = {
            "type": "get-stats",
            "token": token
        };
    }
    ws.send(JSON.stringify(data));
}

sendPOSTRequest = function(url, params, callback){
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", url, true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4 && xhttp.status === 200) {
            callback(JSON.parse(xhttp.responseText));
        }
    };
    xhttp.send(JSON.stringify(params));
}

sendGETrequest = function(url, callback) {
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", url, true);
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4 && xhttp.status === 200) {
            callback(JSON.parse(xhttp.responseText));
        }
    };
    xhttp.send(null);
}

sendFileRequest = function(url, formData, callback){
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", url, true);
    // xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4 && xhttp.status === 200) {
            callback(JSON.parse(xhttp.responseText));
        }
    };
    xhttp.send(formData);
};

webSocketConnect = function() {
    ws = new WebSocket('ws://localhost:5000/socket-api');
    ws.onopen = function () {
        console.log("Opened socket");

        var sessionToken = localStorage.getItem("token");
        if(sessionToken !== null){
            var message = {
                "type": "login",
                "data": sessionToken
            };
            ws.send(JSON.stringify(message));
            generateCharts();
            requestStats();
            downloadMedia(); // TODO: For now?

        } else {
            console.log("Token was null");
        }
    };

    // Listens for incoming data from server
    ws.onmessage = function (ev) {
        // console.log("server message: " + ev.data);
        var response = JSON.parse(ev.data);
        if(response.type === "signout"){
            console.log("hey I'm signing out");
            signOut();
        }
        if(response.type === "get-stats"){
            console.log("got stats");
            var stats = response.data;
            updateCharts(0, genderChart, stats.gender_stats);
            updateCharts(1, usersChart, stats.login_stats);
            if(stats.message_stats !== undefined){
                updateCharts(2, messageChart, stats.message_stats);
            }
        }
    };
};





