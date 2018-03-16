var passwordLength = 5;
var currentlyVisiting;
var visiting, setInfo = false;
var prefix = "";
var colors = [
    '#d594d4',
    '#9492d5',
    '#a0d5d5',
    '#99d597',
    '#d5d496',
    '#d59699'
];
var myCharts = [];
var vCharts = [];


window.onload = function(){
    clearData();
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

function displayView(){

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
}

function login(){
    var email;
    var password;

    // For auto-login after signup
    if(arguments.length !== 0){
        email = arguments[0];
        password = arguments[1];
    } else {
        email = document.getElementById("signin-email").value;
        password = document.getElementById("signin-password").value;
    }

    var params = {
        "email": email,
        "password": password
    };

    sendPOSTRequest("/signin", params, function (response) {

        if(response.success){

            // Add userToken to local storage
            localStorage.setItem("token", response.data);
            localStorage.setItem("email", email);
            currentlyVisiting = email;

            // Send login information via socket
            webSocketConnect();
            displayView();

        } else {
            document.getElementById("signinError").innerHTML = response.message;
            console.log(response.message);
        }
    });
}

function signup(){

    var email = document.getElementById("signup-email").value;
    var password = document.getElementById("signup-pw").value;
    var firstName = document.getElementById("signup-firstName").value;
    var familyName = document.getElementById("signup-familyName").value;
    var gender = document.getElementById("signup-gender").value;
    var city = document.getElementById("signup-city").value;
    var country = document.getElementById("signup-country").value;
    var repeatPassword = document.getElementById("signup-rpw").value;

    var checkPass = validatePassword(password, repeatPassword);

    // Password isn't valid
    if (checkPass !== "OK") {
        document.getElementById("signupError").innerHTML = checkPass;
        console.log(checkPass);
    } else {

        // Convert to JSON-object
        var params = {
            "email": email,
            "password": password,
            "firstname": firstName,
            "familyname": familyName,
            "gender": gender,
            "city": city,
            "country": country
        };

        sendPOSTRequest("/signup", params, function (response) {
            if (response.success) {
                login(email, password);
            } else {
                document.getElementById("signupError").innerHTML = response.message;
            }
        });
    }
}

function signOut(){
    var token = localStorage.getItem("token");
    var params = {"token": token};
    clearData();
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    sendPOSTRequest("/signout", params, function () {
        displayView();
    })
}

function validatePassword(pw, rpw){

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
}

function selectTab(tab){

    var tabs = document.getElementById("tabs").getElementsByTagName("div");
    // Style tabs for appearance
    for(var i=0; i < tabs.length; i++){
        tabs[i].style.backgroundColor = "#b2b8b5";
        if(tabs[i].id === 'home'){
            tabs[i].style.zIndex = '2';
        } else if (tabs[i].id === 'browse'){
            tabs[i].style.zIndex = '1';
        } else {
            tabs[i].style.zIndex = '0';
        }
    }
    // specify appearance of specific tab
    tab.style.zIndex = '3';
    tab.style.backgroundColor = "#c7ceca";

    var views = document.getElementById("pcontainer").getElementsByClassName("pcontent");
    // loop through all three views
    for(var j=0; j < views.length; j++) {
        // Corresponds to the view of the selected tab
        if(views[j].id === tab.id+"view"){
            // Display it
            views[j].style.display = "flex";

            if(tab.id !== "browse"){
                document.getElementById("browseContainer").style.display = "none";
            }
            if(tab.id === "home"){
                currentlyVisiting = localStorage.getItem("email");
                visiting = false;
                prefix = "";
                // Only get User Data once
                if(!setInfo) {
                    var token = localStorage.getItem("token");
                    sendGETrequest("/get-user-data-by-token/?token=" + token, function (response) {
                        if (response.success) {
                            updateUserInfo(response.data);
                            refreshWall();
                        } else {
                            console.log(response.message);
                        }
                    });
                    setInfo = true;
                }
            }
        } else {
            // Hide all other viees
            views[j].style.display = "none";
        }
    }
}

function changePassword(){
    var oldpw = document.getElementById("oldpw").value;
    var newpw = document.getElementById("newpw").value;
    var rnewpw = document.getElementById("rnewpw").value;

    // Reset the fields
    document.getElementById("changePassForm").reset();
    var changePassMessage = validatePassword(newpw, rnewpw);
    if(changePassMessage === "OK"){
        var params = {
            "token": localStorage.getItem("token"),
            "old_password": oldpw,
            "new_password": newpw
        };
        // Request to change password
        sendPOSTRequest("/change-password", params, function (response) {
            document.getElementById("changePassError").innerText = response.message;
        })

    } else {
        // Output error to user, passwords don't match
        document.getElementById("changePassError").innerText = changePassMessage;
    }
}

function writePost(writeForm) {
    // Get the message from
    var textArea = writeForm[0];
    var message = textArea.value;

    // Clear message box
    textArea.value = "";

    if(message.length !== 0) {
        var params = {
            "token": localStorage.getItem("token"),
            "email": currentlyVisiting,
            "message": message
        };
        sendPOSTRequest("/post-message", params, function (response) {
            console.log(response);
            if (response.success){
                refreshWall();
            }
        });

    }
}

function refreshWall() {
    // Clear the photo wall of option elements
    if(!visiting){
        // We only need to do this with our own photos
        resetPhotoWall();
    }

    // Clear the wall of messages
    var messages = document.getElementById(prefix+"wall");
    while (messages.firstChild) {
        messages.removeChild(messages.firstChild);
    }

    // Get user data
    var token = localStorage.getItem("token");
    sendGETrequest("/get-user-messages-by-email/?token=" + token + "&email=" + currentlyVisiting, function (response) {
        if (response.success) {
            var userData = response.data;
            // Loops through all messages in reverse order
            userData.reverse();
            userData.forEach(function (message, i) {

                // Create a messageDiv to append
                var color = colors[i%5];
                var messageDiv = document.createElement("div");
                messageDiv.id = prefix+message.from_user+i;
                messageDiv.className = "wallPost grabbable";
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
                writerStyle.style.webkitTextFillColor = color;
                writerStyle.style.fontWeight = "bold";
                writerStyle.appendChild(writer);

                // Message
                var theMessage = document.createTextNode(message.content);

                messageDiv.appendChild(writerStyle);
                messageDiv.appendChild(theMessage);
                document.getElementById(prefix+"wall").appendChild(messageDiv);
            });
        } else {
            console.log(response.message);
        }
    })
}

function updateUserInfo(userInfo){
    document.getElementById(prefix+"name").innerText = userInfo.firstname + " " + userInfo.familyname;
    document.getElementById(prefix+"gender").innerText = userInfo.gender;
    document.getElementById(prefix+"city").innerText = userInfo.city;
    document.getElementById(prefix+"country").innerText = userInfo.country;
    document.getElementById(prefix+"email").innerText = userInfo.email;
    // Profile picture
    document.getElementById(prefix+"pictureArea").innerHTML =
        "<img id='profilePic' src=\"data:image/" + userInfo.profile_pic[0][1] + ';base64,' + userInfo.profile_pic[0][0] + "\" " +
        "style='width: 100%;height: 100%;object-fit: cover'/>";
}

function findUser() {
    visiting = true;
    prefix = "v-";
    var email = document.getElementById("userToVisit").value;
    var token = localStorage.getItem("token");

    sendGETrequest("/get-user-data-by-email/?token=" + token + "&email=" + email, function (response) {
        if (response.success) {
            // Show the visited user's elements
            document.getElementById("browseContainer").style.display = "flex";
            document.getElementById("noUserError").innerText = "";
            currentlyVisiting = email;
            updateUserInfo(response.data);
            refreshWall();
            downloadMedia(email);
            if(vCharts.length===0){
                generateCharts();
            }
            requestStats(email);
        } else {
            document.getElementById("noUserError").innerText = response.message;
        }
    })
}
// This generates the charts
function generateCharts() {
    // Random index for chart colors
    var ri = Math.floor(Math.random() * colors.length);
    var ri2 = Math.floor(Math.random() * colors.length);
    var charts = [];
    charts[0] = new Chart(document.getElementById(prefix+"chart1"), {
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
    charts[1] = new Chart(document.getElementById(prefix+"chart2"), {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                backgroundColor: [
                    colors[ri2],
                    colors[(ri2+1)%5]
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
    charts[2] = new Chart(document.getElementById(prefix+"chart3"), {
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

    charts.forEach(function (chart,i) {
        if(visiting){
            vCharts[i] = chart;
        } else {
            myCharts[i] = chart;
        }
    });
}

function updateChart(index, chart, stats){
    // Clear chart data
    // chart.data.datasets[0].data = [];
    // chart.data.labels = [];
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
            stats.forEach(function (entry, i) {
                chart.data.labels[i] = entry.from_user;
                chart.data.datasets[0].data[i] = entry.count;
                chart.data.datasets[0].backgroundColor[i] =
                    colors[(i)%5]
            });
            break;
    }

    chart.update();
}

// For getting the chart data from the server
function requestStats(){
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

function sendPOSTRequest(url, params, callback){
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

function sendFileRequest(url, formData, callback){
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", url, true);
    xhttp.onreadystatechange = function () {
        if (xhttp.readyState === 4 && xhttp.status === 200) {
            callback(JSON.parse(xhttp.responseText));
        }
    };
    xhttp.send(formData);
}

function webSocketConnect() {
    ws = new WebSocket('ws://localhost:5000/socket-api');
    ws.onopen = function () {
        console.log("Opened socket, clearing data");
        clearData();
        var token = localStorage.getItem("token");
        if(token !== null){
            var message = {
                "type": "login",
                "data": token
            };
            ws.send(JSON.stringify(message));
            currentlyVisiting = localStorage.getItem("email");
            if(myCharts.length === 0){
                generateCharts();
            }
            downloadMedia();
            requestStats();

        } else {
            console.log("Token was null");
        }
    };

    // Listens for incoming data from server
    ws.onmessage = function (ev) {
        var response = JSON.parse(ev.data);
        if(response.type === "signout"){
            console.log("hey I'm signing out");
            signOut();
        }
        if(response.type === "get-stats"){
            var stats = response.data;
            if(visiting){
                updateChart(0, vCharts[0], stats.gender_stats);
                updateChart(1, vCharts[1], stats.login_stats);
                if (stats.message_stats !== undefined) {
                    updateChart(2, vCharts[2], stats.message_stats);
                }
            } else {
                updateChart(0, myCharts[0], stats.gender_stats);
                updateChart(1, myCharts[1], stats.login_stats);
                if (stats.message_stats !== undefined) {
                    updateChart(2, myCharts[2], stats.message_stats);
                }
            }
        }
    };
}

function clearData(){

    visiting = false;
    prefix = "";
    setInfo = false;
    myCharts = [];
    vCharts = [];
}





