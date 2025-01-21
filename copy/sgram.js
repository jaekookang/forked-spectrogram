// Variables
let message = " ";
let message0 = " ";
let message1 = " ";
let message2 = " ";
let message3 = " ";
let message4 = " ";

let canvas_height_ratio = 400 / 700;

const canvas = document.querySelector(".canvas");
const canvasCtx = canvas.getContext("2d", { willReadFrequently: true });
let colormap;
let border_canvas_plot_left;
let border_canvas_plot_right;
let border_canvas_plot_bottom;
let border_canvas_plot_top;

applyOrientation();

window.onresize = (event) => {
    applyOrientation();
}

let counter = 0;
let stop_sound = 0;
let max_intensity;
let sensibility;
let sensibility_temp;

let audioCtx;
let analyser;
let bufferLength;
let dataTime;
let dataFrec;
let fftSize = parseInt(document.getElementById("sizeFFT").value);
let minDecibels = -40;
let sampleRate = 44100;

let frec_max1;
let bin_width = 4;
let my_x;
let my_Y_abs;

let startTime;
let endTime;

let f_Nyquist;
let f_min;
let f_max;
let i_min;
let i_max;
let num_bin = Math.floor((900 - border_canvas_plot_left - border_canvas_plot_right) / bin_width);


// Main logic
if (navigator.mediaDevices.getUserMedia) {
    console.log("getUserMedia supported.");

    let chunks = [];
    let onSuccess = (stream) => {
        callback(stream);
    }
    let onError = (err) => {
        console.log("Error occurred: " + err);
    }
    navigator.mediaDevices.getUserMedia({
        audio: true
    }).then(onSuccess, onError);
} else {
    console.log("getUserMedia is NOT supported on your browser!");
}

function callback(stream) {
    if (!audioCtx) {
        audioCtx = new AudioContext({
            latencyHint: 'interactive',
            sampleRate: sampleRate,
        })
    }

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.minDecibels = minDecibels;
    bufferLength = analyser.frequencyBinCount;

    dataTime = new Float32Array(bufferLength * 2);
    dataFrec = new Float32Array(bufferLength);
    const sr = audioCtx.sampleRate;

    message0 = "Sampling rate: " + sr.toString() + " Hz";
    source.connect(analyser);

    Plot();

    /**
     * Function to plot the current microphone data. It first gets the
     * time and frequency data from the analyser node, then applies a
     * window function and computes the FFT. It then plots the FFT
     * data on the canvas and updates the labels.
     */
    function Plot() {
        // analyser.fftSize = fftSize;
        bufferLength = analyser.frequencyBinCount;
        dataTime = new Uint8Array(bufferLength * 2);
        dataFrec = new Float32Array(bufferLength);
        YaxisMarks();
    }
}

function myFFT(signal) {

}

function Complex(re, im) {

}

const HSLToRGB = () => {

}

function PlotMic() {

}

function PlotFFT() {

}

function PlotSpectro1() {

}

function YaxisMarks() {
    canvasCtx.fillStyle = "white";
    let X0 = canvas.width / 10 + border_canvas_plot_left;
    let Y0 = canvas.height / 10 + border_canvas_plot_top;
    let deltaY0 = 0.9 * canvas.height - border_canvas_plot_bottom - border_canvas_plot_top;

    canvasCtx.fillRect(0.9 * canvas.width / 10, Y0 - border_canvas_plot_top, 0.1 * canvas.width / 10 + border_canvas_plot_left, Y0 + deltaY0);
    canvasCtx.fillStyle = "black";
    canvasCtx.font = getFont(10);
    canvasCtx.textAlign = "right";

    // Linear scale (START FROM HERE! SEE: https://github.com/jaekookang/forked-spectrogram/blob/ef19d58b42633a79fa94c8381cf17c9fdcbe5422/spectrogram.js#L527)
    if (document.getElementById("scale").value === "Linear") {


    // Mel scale
    } else if (document.getElementById("scale").value == "Mel") {

    }
}

function applyOrientation() {

    // Adjust inner width and height realtime
    if (window.innerHeight > window.innerWidth) {
        canvas.width = window.innerWidth;
        canvas.height = canvas.width * canvas_height_ratio;
    } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * 0.8;
    }

    border_canvas_plot_left = canvas.width / 20;
    border_canvas_plot_right = canvas.width / 10;

    let scale_v = canvas.height / 760;
    border_canvas_plot_bottom = 80 * scale_v;
    border_canvas_plot_top = 10 * scale_v;
    plot_colormap();
    let my_element = document.getElementById("my_element_top");

    my_element.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest"
    });
}

/**
 * Plots the colormap bar on the right side of the canvas.
 * 
 * It first gets the colormap value from the dropdown menu,
 * then locates the bar within the canvas on the right side.
 * It then computes the rgb value for each y position and
 * plots it as a single pixel. The position of the pixel is
 * from top to bottom, and the color is from the top of the bar
 * to the bottom.
 */
function plot_colormap() {
    colormap = document.getElementById("colormap").value;

    // Locate colormap bar within canvas on the right side
    let Y0 = Math.floor(0.1 * canvas.height + border_canvas_plot_top);
    let deltaY0 = Math.floor(0.9 * canvas.height - border_canvas_plot_bottom - border_canvas_plot_top);
    let x0 = Math.floor(0.9 * canvas.width + border_canvas_plot_top);

    // Plot colors from top to bottom by 1 pixel
    for (let y = Y0; y <= Y0 + deltaY0; y++) {
        let myrgb = evaluate_cmap(1 - (y - Y0) / deltaY0, colormap, false);
        canvasCtx.fillStyle = "rgb(" + myrgb + ")";
        canvasCtx.fillRect(x0, y, canvas.width / 30, 1);
    }
}

function DisplayMultiLineAlert() {
    let newLine = "\r\n";
    message = message0 + newLine;
    message += message1 + newLine;
    message += message2 + newLine;
    message += message3 + newLine;
    message4 = "Screen resolution is: " + screen.width + "x" + screen.height + " " + window.screen.availWidth +
        " " + window.screen.availHeight + " " + window.innerWidth + " " + window.innerHeight + " " + canvas.width + " " + canvas.height + newLine;
    message += message4;
    alert(message);
}

function ColormapMarks() {

}

/**
 * Get a font size based on the width of the canvas.
 * @param {number} s - A number between 0 and 1 to scale the font size.
 * @returns {string} A font size in pixels, e.g. '22px sans-serif'.
 */
function getFonts(s) {
    let fontBase = 1000;
    let ratio = s / fontBase;
    let size = canvas.width * ratio;
    return (size | 0) + 'px sans-serif';
}