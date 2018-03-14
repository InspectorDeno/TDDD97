ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif','mp4', 'ogg'];

/**
 * Uploads media to the server
 */
uploadMedia = function() {
    var file = document.getElementById(prefix+"browsefile").files[0];
    if (file === undefined) {
        // displayMessage('File type is undefined');
    } else {

        var token = localStorage.getItem("token");
        var formData = new FormData();
        formData.append("token", token);
        formData.append("file", file);

        sendFileRequest('/upload-media', formData, function (response) {
            if (response.success) {
                displayMessage(response.message, true);
                downloadMedia();
            } else {
                displayMessage(response.message, false);
            }
        });
    }
};

/**
 * Download media files from server
 */
downloadMedia = function() {
    console.log("Fetching media files...");
    console.log("prefix is " + prefix);

    var token = localStorage.getItem("token");
    var params;
    // Downloading other users media (their email as argument)
    if (arguments.length > 0){
        params = {
            "email": arguments[0]
        };
        sendPOSTRequest('/download-media/email', params, function (response) {
            if(response.success){
                displayMedia(response.data, false);
            }
        });

    } else {
        // Downloading our own media (from token)
        params = {
            "token": token
        };
        sendPOSTRequest('/download-media/token', params, function(response) {
            if(response.success){
                displayMedia(response.data, true);
                // Reset upload form
                document.getElementById(prefix+"uploadForm").reset();
                document.getElementById(prefix+'uploadFile').style.display = 'none';
            }
        });
    }
};

/**
 * Displays downloaded audio/video or image files
 * @param media array of media files to be displayed
 * @param displayOptions True if we want to show media options onclick, false if not
 */
displayMedia = function(media, displayOptions) {
    document.getElementById(prefix+"uploads").innerHTML = "";
    if(displayOptions){
        // Show upload elements
        document.getElementById(prefix+"uploadMedia").style.display = 'flex';
    } else {
        document.getElementById(prefix+"uploadMedia").style.display = 'none';
    }
    media.forEach(function (file) {
        if(isPhoto(file[1])){
            document.getElementById(prefix+"uploads").innerHTML +=
                "<div class='gridItem'>" +
                '<img id='+file[2]+' src=\"data:image/' + file[1] + ';base64,' + file[0] + "\" onclick='displayOptions(this)'/></div>";
        } else {
            document.getElementById(prefix+"uploads").innerHTML +=
                "<div class='gridItem gridVideo'>" +
                "<video controls><source src=\"data:audio/" + file[1] + ";base64," + file[0] + "\"/></video></div>";
        }
    });
};

/**
 * Visual element of the filename of the file to be uploaded
 * @param element file element
 */
displayFileName = function (element) {
    var file = element.files[0].name;
    if (allowedExtensions(file)) {
        document.getElementById(prefix+'uploadFile').style.display = 'inline-block';
        displayMessage(file, true);
    } else {
        displayMessage('Unsupported file format', false);
    }
};

/**
 * Checks if file is ok to upload
 * @param filename name of the file to upload
 * @returns {boolean} true if allowed, false if not
 */
allowedExtensions = function (filename) {
    return ALLOWED_EXTENSIONS.indexOf(filename.split('.').slice(1).toString()) > -1;
};

/**
 * Checks if file is a photo or not
 * @param ext file extension to be checked
 * @returns {boolean} true if photo, false if video
 */
isPhoto = function (ext) {
    return ext !== 'ogg' && ext !== 'mp4';
};

/**
 * For displaying error message during media upload
 * @param message message to display
 * @param success displays green border if true, red if false
 */
displayMessage = function (message, success) {
    document.getElementById(prefix+'file-selected').innerText = message;
    if (success){
        document.getElementById(prefix+'file-selected').style.borderBottomColor = 'lime';
    } else {
        document.getElementById(prefix+'file-selected').style.borderBottomColor = 'red';
        document.getElementById(prefix+'uploadFile').style.display = 'none';
    }
};

/**
 * For creating option elements for when clicking on an image
 * @param image Image that was clicked
 */
displayOptions = function (image) {
    // Clear options
    resetPhotoWall();
    // image.style.border = '5px solid gold';

    var optionsDiv = document.createElement("div");
    optionsDiv.style.display = "block";
    optionsDiv.style.textAlign = "center";
    optionsDiv.style.margin = "-50px 0 23px 0";

    // Create option element 1
    var setAsPicDiv = document.createElement("div");
    setAsPicDiv.className = "optionElement";
    setAsPicDiv.innerText = "Set profile picture";
    // Onclick listener for setting profile picture
    setAsPicDiv.addEventListener('click', function () {
        console.log("Choosing this one!");
        changeProfPic(image);
        resetPhotoWall();
    });

    // Create option element 2
    var deletePicDiv = document.createElement("div");
    deletePicDiv.className = "optionElement";
    deletePicDiv.innerText = "Delete";
    deletePicDiv.addEventListener('click', function () {
        console.log("Deleting this one!");
        deleteMedia(image);
        resetPhotoWall();
    });

    var br = document.createElement("br");
    image.parentNode.appendChild(br);
    optionsDiv.appendChild(setAsPicDiv);
    optionsDiv.appendChild(deletePicDiv);
    image.parentNode.appendChild(optionsDiv);
};

/**
 * Clears photo wall of option elements and other elements
 */
resetPhotoWall = function () {
    var allDivs = document.getElementsByClassName("gridItem");
    for(var i = 0; i < allDivs.length; i++){
        while(allDivs[i].childElementCount > 1){
            allDivs[i].removeChild(allDivs[i].lastChild);
        }
        allDivs[i].childNodes[0].style.border = '';
    }
    // Reset upload form
    document.getElementById(prefix+"uploadForm").reset();
    document.getElementById(prefix+'uploadFile').style.display = 'none';
    // Clear message text
    document.getElementById(prefix+'file-selected').style.borderBottomColor = '#e0e7e3';
    document.getElementById(prefix+'file-selected').innerText = '';
};

/**
 * Sends request to change profile picture to the server
 * @param file The picture to change to
 */
changeProfPic = function (file) {
    var token = localStorage.getItem("token");
    var params = {
        'token': token,
        'id': file.id
    };
    sendPOSTRequest('/change-profile-pic', params, function (response) {
        console.log(response.message);
        if(response.success){
            // Update picture by fetching user data
            sendGETrequest("/get-user-data-by-token/?token=" + token, function (response){
                if(response.success){
                    updateUserInfo(response.data, false);
                } else {
                    console.log(response.message);
                }
            });
            displayMessage(response.message, true)
        } else {
            displayMessage(response.message, false);
        }
    });
};


deleteMedia = function (file) {
    var token = localStorage.getItem("token");
    var params = {
        'token': token,
        'id': file.id
    };
    sendPOSTRequest('/delete-media', params, function (response) {
        console.log(response.message);
        if(response.success){
            displayMedia(response.data, true);
            resetPhotoWall();
        }
    });
};