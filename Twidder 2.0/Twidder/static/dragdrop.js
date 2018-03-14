
document.addEventListener("dragstart", function (event) {
    event.dataTransfer.setData("Text", event.target.id);
});

document.addEventListener("dragover", function(event) {
    event.preventDefault();
    if(event.target.id === prefix+'writeMessage') {
        event.target.style.outline = "2px solid gold";
    }
});

document.addEventListener("drag", function(event) {
    event.preventDefault();
    document.getElementById(prefix+"writeMessage").style.outline = "4px solid gold";
});

document.addEventListener("dragend", function(event) {
    event.preventDefault();
    document.getElementById(prefix+"writeMessage").style.outline = "";
});

document.addEventListener("drop", function (event) {
    event.preventDefault();
    if(event.target.id === prefix+'writeMessage'){
        var id = event.dataTransfer.getData("Text");
        data = document.getElementById(id).innerHTML;
        event.target.value = data.split('</span>').slice(1)[0];
    }
});