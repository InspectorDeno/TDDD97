var passwordLength = 5;


displayView = function(){

    document.getElementById("view").innerHTML = document.getElementById("welcomeview").innerHTML;
};


window.onload = function(){
        document.getElementById("view").innerHTML = document.getElementById("welcomeview").innerHTML;

};

login = function(){

    var email = document.getElementById("email");
    var password = document.getElementById("password");



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
        // Do stuff

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

        console.log("Return: " + returnCode.message);

    } else {
        // Do nothing
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
