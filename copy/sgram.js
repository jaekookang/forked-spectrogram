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
let scale_demon = 760;

applyOrientation();

window.onresize = (event) => {
    applyOrientation();
}

let stop_sound = 0;
let max_intensity;
let sensibility;
let sensibility_temp;

let audioCtx;
let analyser;
let bufferLength;
let dataTime;
let dataFreq;
let fftSize = parseInt(document.getElementById("sizeFFT").value);
let minDecibels = -40;
let sampleRate = 44100;

let freq_max1;
let bin_width = 4;
let x_data;

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

    dataTime = new Uint8Array(bufferLength * 2);
    dataFreq = new Float32Array(bufferLength);
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
        dataTime = new Uint8Array(bufferLength * 2); // data in time domain [0-255]
        dataFreq = new Float32Array(bufferLength); // data in frequency domain

        colormap = document.getElementById("colormap").value;
        f_min = parseFloat(document.getElementById("f_min").value);
        f_max = parseFloat(document.getElementById("f_max").value);
        bin_width = parseInt(document.getElementById("speed").value);
        startTime = performance.now();

        YaxisMarks();

        analyser.getByteTimeDomainData(dataTime); // copy time-domain data
        analyser.getFloatFrequencyData(dataFreq); // copy freq data

        x_data = [...dataTime];
        let sum = 0
        x_data.forEach(val => { sum += val })
        let mean = sum / x_data.length;
        let windowType = document.getElementById("windowType").value;
        let BH7 = [
            0.27105140069342,
            -0.43329793923448,
            0.21812299954311,
            -0.06592544638803,
            0.01081174209837,
            -0.00077658482522,
            0.00001388721735
        ];
        for (let i=0; i < x_data.length; i++) {
            let x_centered = x_data[i] - mean;
            if (windowType == "None") {
                x_data[i] = x_centered
            } else if (windowType == "Cosine") {
                x_data[i] = x_centered * Math.sin(Math.PI * i / x_data.length);
            } else if (windowType == "Hanning") { // precisely "Hann" window
                x_data[i] = x_centered * 0.5 * (1 - Math.cos(2 * Math.PI * i / x_data.length));
            } else if (windowType == "BH7") { // blackman-harris
                let w = 0;
                for (let j=0; j < BH7.length; j++) {
                    w += BH7[j] * Math.cos(2 * Math.PI * j * i / x_data.length);
                }
                x_data[i] = x_centered * w;
            }
        }

        // Plot microphone input
        PlotMic();

        // Prepare frequency data (options: myFFT or WebAudio)
        x_data_abs = new Float64Array(Math.floor(x_data.length / 2)).fill(0);
        if (document.getElementById("FFT").value == "myFFT") {
            fft = myFFT(x_data);

            max_intensity = -100;
            for (let i=1; i < x_data.length / 2; i += 1) {
                // Get amplitude by summing squared real and imaginary parts
                x_data_abs[i] = 10 * Math.log10((fft[i].re * fft[i].re + fft[i].im * fft[i].im)) - 20;
                if (x_data_abs[i] > max_intensity) max_intensity = x_data_abs[i];
            }
        } else if (document.getElementById("FFT").value == "WebAudio") {
            const aa = document.getElementById("windowType");
            aa.value = "None";
            let x_freq = [...dataFreq];
            for (let i=1; i < x_data.length / 2; i++) {
                x_freq[i] = x_freq[i] + 125; // ??
                if (x_freq[i] > max_intensity) max_intensity = x_freq[i];
            }
            x_data_abs = x_freq;
        }
        // Get minimum and maximum range indices in x_data_abs
        i_min = Math.floor(x_data_abs.length * f_min / f_Nyquist);
        i_max = Math.floor(x_data_abs.length * f_max / f_Nyquist);

        // Get the maximum frequency
        let ts = new Array(x_data.length / 2).fill(0);
        let freq1 = new Array(x_data.length / 2).fill(0);
        let freq2 = new Array(x_data.length).fill(0);
        const max_freq = Math.max(...x_data_abs);
        const i_max_freq = x_data_abs.indexOf(max_freq);

        // Annotate the max frequency on left-top corner
        canvasCtx.fillStyle = "lightblue";
        canvasCtx.fillRect(border_canvas_plot_top, border_canvas_plot_top, canvas.width / 10 + border_canvas_plot_left - 2 * border_canvas_plot_top, canvas.height / 10 - border_canvas_plot_top);
        canvasCtx.fillStyle = "black";
        canvasCtx.font = getFonts(25);
        let centro = (border_canvas_plot_top + canvas.height / 10) / 2;
        canvasCtx.textAlign = "right";
        canvasCtx.fillText(Math.round(max_freq).toString() + " Hz", canvas.width/8, centro);

        endTime = performance.now();
        message3 = "Time between animation frames: " + Math.round((endTime - startTime)).toString() + " ms";


        // Plot FFT
        PlotFFT();

        // Plot spectrogram
        PlotSpectro1();

        // Animate
        requestAnimationFrame(Plot);
    }
}

function myFFT(signal) {
    // TODO: Check https://en.wikipedia.org/wiki/Cooley%E2%80%93Tukey_FFT_algorithm
    // TODO: Understand the algorithm
    if (signal.length == 1) {
        return signal;
    }
    let halfLength = signal.length / 2;
    let even = [];
    let odd = [];
    even.length = halfLength;
    odd.length = halfLength;
    for (let i=0; i < halfLength; ++i) {
        even[i] = signal[i * 2];
        odd[i] = signal[i * 2 + 1];
    }
    even = myFFT(even);
    odd = myFFT(odd);
    for (let k=0; k < halfLength; ++k) {
        if (!(even[k] instanceof Complex))
            even[k] = new Complex(even[k], 0);
        if (!(odd[k] instanceof Complex))
            odd[k] = new Complex(odd[k], 0);
        let a = Math.cos( 2 * Math.PI * k / signal.length);
        let b = Math.sin(-2 * Math.PI * k / signal.length);
        let temp_k_real = odd[k].re * a - odd[k].im * b;
        let temp_k_imag = odd[k].re * b + odd[k].im * a;
        let A_k = new Complex(even[k].re + temp_k_real, even[k].im + temp_k_imag);
        let B_k = new Complex(even[k].re - temp_k_real, even[k].im - temp_k_imag);
        signal[k] = A_k;
        signal[k + halfLength] = B_k;
    }

    return signal;
}

function Complex(re, im) {
    this.re = re;
    this.im = im || 0.0;
}

const HSLToRGB = () => {

}

/**
 * Draws the microphone bar on the spectrogram canvas.
 *
 * This function renders a small bar on the upper left corner of the
 * spectrogram canvas to represent the loudness of the microphone input.
 * The bar's height scales with the loudness, and the bar is drawn with a
 * white color. The function uses global variables and HTML elements for
 * configuration.
 */
function PlotMic() {
    // TODO: Slow the window so that waveforms are plotted longer in the window
    let scale_v = canvas.height / scale_demon;
    let atenuacion = 0.4;
    let X0 = canvas.width / 10 + border_canvas_plot_left;
    let mic_width = 0.9 * canvas.width - border_canvas_plot_right - border_canvas_plot_left;
    let mic_height = canvas.height / 10 + border_canvas_plot_top;
    f_Nyquist = audioCtx.sampleRate / 2;
    canvasCtx.lineWidth = 1;
    canvasCtx.fillStyle = "#003B5C";
    canvasCtx.fillRect(X0, 0, mic_width, mic_height);    

    let x = canvas.width / 10 + border_canvas_plot_left;
    canvasCtx.beginPath();
    canvasCtx.strokeStyle = "white";
    let centro = mic_height / 2;
    for (let i=0; i < x_data.length; i++) {
        let y = x_data[i] * atenuacion; 
        if (i == 0) {
            canvasCtx.moveTo(x, centro);
        } else {
            y = centro + y * scale_v;
            if (y > mic_height - 1) {
                y = mic_height - 1;
            }
            canvasCtx.lineTo(x, y);
        }
        x += mic_width / x_data.length;
    }
    canvasCtx.stroke();
}

function PlotFFT() {
    let scale_h = canvas.width / 1440;
    let mic_height = canvas.height / 10 + border_canvas_plot_top;
    let rect_X0 = 0.9 * canvas.width / 10;
    let deltaY0 = 0.9 * canvas.height - border_canvas_plot_bottom - border_canvas_plot_top;

    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = "hsl(" + 360 * 0 + ",100%,50%)";
    canvasCtx.fillStyle = "#003B5C";
    canvasCtx.fillRect(0, mic_height, rect_X0, deltaY0);

    let y;
    let Y0 = canvas.height / 10 + border_canvas_plot_top;
    // 250122수 여기서부터 다시할 것: https://github.com/jaekookang/forked-spectrogram/blob/ef19d58b42633a79fa94c8381cf17c9fdcbe5422/spectrogram.js#L356C18-L356C125
    let deltaY = (canvas.height - canvas.height / 10 - border_canvas_plot_top - border_canvas_plot_bottom) / (i_max - i_min);
}

function PlotSpectro1() {

}

function YaxisMarks() {
    let X0 = canvas.width / 10 + border_canvas_plot_left;
    let Y0 = canvas.height / 10 + border_canvas_plot_top;
    let deltaY0 = 0.9 * canvas.height - border_canvas_plot_bottom - border_canvas_plot_top;
    let rect_X0 = 0.9 * canvas.width / 10;
    let rect_width = 0.1 * canvas.width / 10 + border_canvas_plot_left;
    let rect_height = Y0 + deltaY0;

    // for debugging
    drawCircle(canvasCtx, X0, Y0, "(X0,Y0)");

    canvasCtx.fillStyle = "white";
    canvasCtx.fillRect(rect_X0, Y0 - border_canvas_plot_top, rect_width, rect_height);
    canvasCtx.fillStyle = "black";
    canvasCtx.font = getFonts(10);
    canvasCtx.textAlign = "right";

    if (document.getElementById("scale").value === "Linear") {
        let Yaxis = [100, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000];
        for (let j = 0; j < Yaxis.length; j++) {
            let y = Y0 + deltaY0 - deltaY0 * (Yaxis[j] - f_min) / (f_max - f_min);

            // Add ytick labels
            if (Yaxis[j] <= f_max) {
                canvasCtx.textBaseline = "middle";
                canvasCtx.fillText(Yaxis[j].toString() + " Hz", X0 - border_canvas_plot_top, y);
            }

            // Add ytick marks
            canvasCtx.strokeStyle = "black";
            canvasCtx.beginPath();
            if (Yaxis[j] <= f_max) {
                canvasCtx.moveTo(X0, y);
                canvasCtx.lineTo(X0 - 4, y);
                canvasCtx.moveTo(rect_X0, y);
                canvasCtx.lineTo(rect_X0 + 4, y);
            }
            canvasCtx.stroke();
        }

        // Mel scale
    } else if (document.getElementById("scale").value == "Mel") {
        let Yaxis = [100, 200, 400, 600, 800, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 13000, 15000, 17000, 20000];
        let y0 = canvas.height - border_canvas_plot_bottom;
        let mel_const = 1127.01048
        for (let j = 0; j < Yaxis.length; j++) {
            let mel_i = mel_const * Math.log(Yaxis[j] / 700 + 1);
            let mel_i_min = mel_const * Math.log(f_min / 700 + 1);
            let mel_i_max = mel_const * Math.log(f_max / 700 + 1);
            let y = Y0 + deltaY0 - deltaY0 * (mel_i - mel_i_min) / (mel_i_max - mel_i_min);

            // Add ytick labels
            if (Yaxis[j] <= f_max) {
                canvasCtx.textBaseline = "middle";
                canvasCtx.fillText(Yaxis[j].toString() + " Hz", X0 - border_canvas_plot_top, y);
            }

            // Add ytick marks
            canvasCtx.strokeStyle = "black";
            canvasCtx.beginPath();
            if (Yaxis[j] <= f_max) {
                canvasCtx.moveTo(X0, y);
                canvasCtx.lineTo(X0 - 4, y);
                canvasCtx.moveTo(0.9 * canvas.width / 10, y);
                canvasCtx.lineTo(0.9 * canvas.width / 10 + 4, y);
            }
            canvasCtx.stroke();
        }
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

    let scale_v = canvas.height / scale_demon;
    border_canvas_plot_bottom = 80 * scale_v;
    border_canvas_plot_top = 10 * scale_v;
    plot_colormap();
    let my_element = document.getElementById("my_element_top");

    my_element.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest"
    });

    drawCircle(canvasCtx, border_canvas_plot_left, border_canvas_plot_top, "L,T");
    drawCircle(canvasCtx, canvas.width - border_canvas_plot_right, canvas.height - border_canvas_plot_bottom, "R,B");
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

    drawCircle(canvasCtx, x0, Y0);

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

// Draw a circle at a point (x, y) for checking locations
function drawCircle(context, x, y, text = "", radius = 3, color = "red") {
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.fillStyle = color;
    context.fill();
    context.closePath();

    if (text) {
        context.fillStyle = "red";
        context.font = "10px Arial";
        context.textAlign = "left";
        context.fillText(text, x + radius + 2, y);
    }
}
