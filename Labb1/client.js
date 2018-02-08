var passwordLength = 5;
var sessionToken = null;
var currentlyVisiting;

displayView = function(){

    if(sessionToken !== null){
        console.log("token not null, token is " + sessionToken);
        document.getElementById("view").innerHTML = document.getElementById("profileview").innerHTML;
        // Redirect to home screen
        selectTab(document.getElementById("home"));
    } else {
        console.log("token is null loading loginView");
        document.getElementById("view").innerHTML = document.getElementById("loginview").innerHTML;
    }

};


window.onload = function(){
    // TODO:Temporary lol until logout
    displayView();
};

login = function(){

    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;

    var returnCode = serverstub.signIn(email, password);

    if(returnCode.success){
        // Add userToken to local storage
        localStorage.setItem("token", returnCode.data);
        sessionToken = returnCode.data;

        // Display their view
        displayView();
        currentlyVisiting = email;
        updateUserInfo(currentlyVisiting);

    } else {
        document.getElementById("signinError").innerHTML += returnCode.message;
        console.log(returnCode.message);
        // TODO:Display error "returnCode.message"
    }

    // For now...
    console.log(returnCode.message);
};

autoLogin = function (email, password) {
        var returnCode = serverstub.signIn(email, password);

        localStorage.setItem("token", returnCode.data);
        sessionToken = returnCode.data;

        // Display their view
        displayView();
        currentlyVisiting = email;
        updateUserInfo(currentlyVisiting);
}


signup = function(){

    var email = document.getElementById("signup-email").value;
    var password = document.getElementById("signup-pw").value;
    var firstName = document.getElementById("signup-firstName").value;
    var familyName = document.getElementById("signup-familyName").value;
    var gender = document.getElementById("signup-gender").value;
    var city = document.getElementById("signup-city").value;
    var country = document.getElementById("signup-country").value;

    var repeatPassword = document.getElementById("signup-rpw").value;

    var changePass = validate(password, repeatPassword);

    if(changePass === "OK") {

        // Convert to JSON-object
        var theUser = {
            "email":email,
            "password":password,
            "firstname":firstName,
            "familyname":familyName,
            "gender":gender,
            "city":city,
            "country":country
        }

        var returnCode = serverstub.signUp(theUser);

        if(returnCode.success){
            autoLogin(email, password);
        } else {
            console.log(returnCode.message);
            document.getElementById("signupError").innerHTML = returnCode.message;
        }

    } else {
        document.getElementById("signupError").innerHTML = changePass;
        console.log(changePass);
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
                currentlyVisiting = serverstub.getUserDataByToken(sessionToken).data.email;
                updateUserInfo(currentlyVisiting);
                refreshWall();
            }
        } else {
            // the other ones are hidden
            views[j].style.display = "none";
        }
    }
};

signOut = function(){
    console.log("signing out. removing token...");
    localStorage.removeItem("token");
    sessionToken = null;
    displayView();
};

changePassword = function(){

    var oldpw = document.getElementById("oldpw").value;
    var newpw = document.getElementById("newpw").value;
    var rnewpw = document.getElementById("rnewpw").value;
    var changePass = validate(newpw, rnewpw);
    if(changePass === "OK"){
        var token = localStorage.getItem("token");
        var returnCode = serverstub.changePassword(token, oldpw, newpw);

        //TODO: Output message to user. Also maybe clear input fields if success == false;
        console.log("changePass: " + returnCode.message);
                    document.getElementById("changePassError").innerText = returnCode.message;


    } else {
        // Output error to user, passwords don't match
        document.getElementById("changePassError").innerText = changePass;

        console.log("changePass error: " + changePass);
    }

};

function writePost() {
    // Get the message
    var message = document.getElementById("writeMessage").value;

    // Our name to display in message
    var myUserdata = serverstub.getUserDataByToken(sessionToken);
    var name = myUserdata.data.firstname + " " + myUserdata.data.familyname;
    // Clear message box
    document.getElementById("writeMessage").value = "";

    if(message.length !== 0) {
        serverstub.postMessage(sessionToken, message, currentlyVisiting);
        refreshWall();
    }

};

function updateUserInfo(email){
    var userInfo = serverstub.getUserDataByEmail(sessionToken, email);

    document.getElementById("currentName").innerText = userInfo.data.firstname + " " + userInfo.data.familyname;
    document.getElementById("currentGender").innerText = userInfo.data.gender;
    document.getElementById("currentCity").innerText = userInfo.data.city;
    document.getElementById("currentCountry").innerText = userInfo.data.country;
    document.getElementById("currentEmail").innerText = userInfo.data.email;

};

function refreshWall() {
    // first clear the wall
    var messages = document.getElementById("wall");
    while(messages.firstChild){
        messages.removeChild(messages.firstChild);
    }

    var userdata = serverstub.getUserMessagesByEmail(sessionToken, currentlyVisiting).data;
    console.log("refreshing wall");
    console.log(userdata);

    for(var i=0; i < userdata.length; i++)
    {
        // Create a messageDiv to append
        var messageDiv = document.createElement("div");
        messageDiv.className = "wallPost";
        messageDiv.style.wordBreak = "break-all";
        messageDiv.style.background = "rgba(198, 106, 26, 0.16)";
        messageDiv.style.margin = "4px 25px 4px 0";
        messageDiv.style.padding = "3px";
        messageDiv.style.whiteSpace = "pre-line";
        messageDiv.style.webkitTextFillColor = "#9C4E1A";


        var theMessage = document.createTextNode(userdata[i].writer + ": \n" + userdata[i].content);
        messageDiv.appendChild(theMessage);
        document.getElementById("wall").appendChild(messageDiv);


    }

};

function findUser() {
    var email = document.getElementById("userToVisit").value;
    var userData = serverstub.getUserDataByEmail(sessionToken, email);

    if(userData.success){
        document.getElementById("homeview").style.display = "inherit";
        document.getElementById("noUserError").innerText = "";
        currentlyVisiting = email;
        updateUserInfo(currentlyVisiting);
        refreshWall();
    } else {
        document.getElementById("noUserError").innerText = userData.message;
        console.log("lol no friends");
    }
}