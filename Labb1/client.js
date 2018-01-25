var passwordLength = 5;


displayView = function(){

    if(localStorage.getItem("token") !== null){
        console.log("token not null");
        document.getElementById("view").innerHTML = document.getElementById("profileview").innerHTML;
    } else {
        document.getElementById("view").innerHTML = document.getElementById("loginview").innerHTML;
    }

};


window.onload = function(){
    // Temporary lol until logout
    localStorage.removeItem("token");
    displayView();
};

login = function(){

    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;

    var returnCode = serverstub.signIn(email, password);

    if(returnCode.success){
        // Add userToken to local storage
        localStorage.setItem("token", returnCode.data);

        // TODO Add user to system
        // Display their view
        displayView();

    } else {
        // Display error "returnCode.message"
    }

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

    if(validate(password, repeatPassword)) {

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
            // Log in and Update view
        } else {
            // Output server error
        }

        // Temporary
        console.log("Return: " + returnCode.message);

    } else {
        // DO nothing
    }



};

validate = function(pw, rpw){

    var checkOK;

    if(pw < passwordLength){
        // Display error to specific error area and return false
        return false;

    } else {
        checkOK = true;
    }

    if(pw !== rpw){
        // Display error to specific error area and return false
        return false;

    } else {
        return checkOK;
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
        console.log(views[j].id);
        //
        if(views[j].id === tab.id+"view"){
            // set the correct view to be displayed
            views[j].style.display = "flex";
        } else {
            // the other ones are hidden
            views[j].style.display = "none";
        }
    }

};

signout = function(){
    
}
