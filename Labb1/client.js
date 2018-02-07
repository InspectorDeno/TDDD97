var passwordLength = 5;
var sessionToken;

displayView = function(){

    if(localStorage.getItem("token") !== null){
        console.log("token not null, token is " + sessionToken);
        document.getElementById("view").innerHTML = document.getElementById("profileview").innerHTML;
       // Redirect to home screen

        selectTab(document.getElementById("home"));
        updateUserInfo();
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

    } else {
        document.getElementById("signinError").innerHTML += returnCode.message;
        console.log(returnCode.message);
        // TODO:Display error "returnCode.message"
    }

    // For now...
    console.log(returnCode.message);


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
            displayView();
        } else {
            console.log(returnCode.message);
            document.getElementById("signupError").innerHTML = returnCode.message;
            // TODO: Output server error
        }

    } else {
        // TODO: Return error message
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
        } else {
            // the other ones are hidden
            views[j].style.display = "none";
        }
    }
};

signOut = function(){
    console.log("signing out. removing token...");
    localStorage.removeItem("token");
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

    } else {
        // TODO: Output error to user
        console.log("changePass error: " + changePass);
    }

};

function updateUserInfo(){
    var userInfo = serverstub.getUserDataByToken(sessionToken);

    var eName = document.createElement("p");
    var eGender = document.createElement("p");
    var eCity = document.createElement("p");
    var eCountry = document.createElement("p");
     var eEmail = document.createElement("p");

    eName.appendChild(document.createTextNode(userInfo.data.firstname + " " + userInfo.data.familyname));
    eGender.appendChild(document.createTextNode(userInfo.data.gender));
    eCity.appendChild(document.createTextNode(userInfo.data.city));
    eCountry.appendChild(document.createTextNode(userInfo.data.country));
    eEmail.appendChild(document.createTextNode(userInfo.data.email));

    document.getElementById("userInfoInput").appendChild(eName);
    document.getElementById("userInfoInput").appendChild(eGender);
     document.getElementById("userInfoInput").appendChild(eCity);
      document.getElementById("userInfoInput").appendChild(eCountry);
      document.getElementById("userInfoInput").appendChild(eEmail);
    console.log(userInfo);

}

function writePost() {
    // Get the message
    var message = document.getElementById("writeMessage").value;
    console.log(message);
    // TEMPORARILY show user's own userdata TODO: fix this
    var userdata = serverstub.getUserDataByToken(sessionToken);
    document.getElementById("writeMessage").value = "";

    if(message.length !== 0) {
        // Create a div to append
        var messageDiv = document.createElement("div");
        messageDiv.style.wordBreak = "break-all";
        messageDiv.style.background = "#FF22AD";
        messageDiv.style.margin = "4px";
        messageDiv.style.whiteSpace = "pre-line";
        var theMessage = document.createTextNode(message);
        messageDiv.appendChild(theMessage);
        document.getElementById("wall").appendChild(messageDiv);

        serverstub.postMessage(sessionToken, message, userdata.data.email);
    }

};

function refreshWall() {
    var userdata = serverstub.getUserDataByToken(sessionToken);
    var messages = serverstub.getUserMessagesByEmail(sessionToken, userdata.data.email);
    console.log("refreshing wall");
    console.log(messages.data);
};