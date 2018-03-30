

var ctx = document.getElementById('myChart').getContext('2d');
var data = [20, 10];
var options = {
    scale: {
        // Hides the scale
        display: false
    }
};
var myChart = new Chart(ctx, {
    type: 'radar',
    data: data,
    options: options
});

