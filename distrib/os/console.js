/* ------------
     Console.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */
var TSOS;
(function (TSOS) {
    var Console = /** @class */ (function () {
        function Console(currentFont, currentFontSize, currentXPosition, currentYPosition, buffer, bufHistory, bufHistoryPos, predictionBase, predictionNum, ctrlPressed) {
            if (currentFont === void 0) { currentFont = _DefaultFontFamily; }
            if (currentFontSize === void 0) { currentFontSize = _DefaultFontSize; }
            if (currentXPosition === void 0) { currentXPosition = 0; }
            if (currentYPosition === void 0) { currentYPosition = _DefaultFontSize; }
            if (buffer === void 0) { buffer = ""; }
            if (bufHistory === void 0) { bufHistory = []; }
            if (bufHistoryPos === void 0) { bufHistoryPos = -1; }
            if (predictionBase === void 0) { predictionBase = ""; }
            if (predictionNum === void 0) { predictionNum = 0; }
            if (ctrlPressed === void 0) { ctrlPressed = false; }
            this.currentFont = currentFont;
            this.currentFontSize = currentFontSize;
            this.currentXPosition = currentXPosition;
            this.currentYPosition = currentYPosition;
            this.buffer = buffer;
            this.bufHistory = bufHistory;
            this.bufHistoryPos = bufHistoryPos;
            this.predictionBase = predictionBase;
            this.predictionNum = predictionNum;
            this.ctrlPressed = ctrlPressed;
        }
        Console.prototype.init = function () {
            this.clearScreen();
            this.resetXY();
        };
        Console.prototype.clearScreen = function () {
            _DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
        };
        Console.prototype.blueScreen = function (error) {
            this.resetXY();
            //draw a big ol blue box over the whole screen
            _DrawingContext.fillStyle = "blue";
            _DrawingContext.beginPath();
            _DrawingContext.fillRect(0, 0, _Canvas.width, _Canvas.height);
            _DrawingContext.stroke();
            //print the error
            this.putText(error);
        };
        Console.prototype.clearAfterCurrentPos = function () {
            //clear everything after the current position
            //it's a little hacky, but since i know the backspaced text will always be at
            //the bottom of the canvas I can just add a big value to the height instead of
            //bothering myself with the descent calculation.
            _DrawingContext.clearRect(this.currentXPosition, this.currentYPosition - this.currentFontSize, 1000, 1000);
        };
        Console.prototype.clearCurrentLine = function () {
            //measure the buffer width then clear it
            var bufferwidth = _DrawingContext.measureText(this.currentFont, this.currentFontSize, this.buffer);
            this.buffer = "";
            //reset x position to before the buffer
            this.currentXPosition -= bufferwidth;
            this.clearAfterCurrentPos();
        };
        Console.prototype.addTypedText = function (text) {
            //draw the text and add it to the buffer
            this.putText(text);
            this.buffer += text;
        };
        Console.prototype.resetXY = function () {
            this.currentXPosition = 0;
            this.currentYPosition = this.currentFontSize;
        };
        Console.prototype.handleInput = function () {
            while (_KernelInputQueue.getSize() > 0) {
                // Get the next character from the kernel input queue.
                var chr = _KernelInputQueue.dequeue();
                // Check to see if it's "special" (enter or ctrl-c) or "normal"
                // (anything else that the keyboard device driver gave us).
                if (chr === '#Enter') { // the Enter key
                    // The enter key marks the end of a console command, so ...
                    // ... tell the shell ...
                    _OsShell.handleInput(this.buffer);
                    //... push the command to the front of our history...
                    this.bufHistory.unshift(this.buffer);
                    // ... and reset our buffer.
                    this.buffer = "";
                    this.bufHistoryPos = -1;
                    this.predictionNum = 0;
                }
                else if (chr === '#Backspace') { // backspace
                    //if backspace was hit, remove the last character from the buffer
                    var lastchr = this.buffer.slice(-1);
                    this.buffer = this.buffer.slice(0, -1);
                    //measure the size of the last character, and remove it from the X pos
                    var backoffset = _DrawingContext.measureText(this.currentFont, this.currentFontSize, lastchr);
                    this.currentXPosition -= backoffset;
                    this.clearAfterCurrentPos();
                    this.bufHistoryPos = -1;
                    this.predictionNum = 0;
                }
                else if (chr === '#Tab') { // tab
                    //if it's your first time predicting, use the current buffer as a base
                    if (this.predictionNum == 0) {
                        this.predictionBase = this.buffer;
                    }
                    //get a list of predictions from the shell
                    var predictions = _OsShell.predictInput(this.predictionBase);
                    //if you found any,
                    if (predictions.length > 0) {
                        //make sure you haven't exceeded the predicitons
                        if (this.predictionNum >= predictions.length) {
                            this.predictionNum = 0;
                        }
                        //type out the prediction
                        this.clearCurrentLine();
                        console.log(predictions[this.predictionNum]);
                        this.addTypedText(predictions[this.predictionNum]);
                        //advance to the next prediction
                        this.predictionNum++;
                    }
                    this.bufHistoryPos = -1;
                }
                else if (chr === '#Up') { //up
                    //go back in the command history
                    this.bufHistoryPos++;
                    //top out at length-1 (start of history)
                    if (this.bufHistoryPos >= this.bufHistory.length) {
                        this.bufHistoryPos = this.bufHistory.length - 1;
                    }
                    else {
                        //clear whatever you'd typed previously
                        this.clearCurrentLine();
                        //type out the history entry
                        this.addTypedText(this.bufHistory[this.bufHistoryPos]);
                    }
                    this.predictionNum = 0;
                }
                else if (chr === '#Down') { //down
                    //go back in the command history
                    this.bufHistoryPos--;
                    //bottom out at 0 (end of history)
                    if (this.bufHistoryPos < 0) {
                        this.bufHistoryPos = 0;
                    }
                    else {
                        //clear whatever you'd typed previously
                        this.clearCurrentLine();
                        //type out the history entry
                        this.addTypedText(this.bufHistory[this.bufHistoryPos]);
                    }
                    this.predictionNum = 0;
                }
                else if (chr === '#LControl') {
                    this.ctrlPressed = true;
                }
                else if (chr === '#LShift') {
                    //do nothing for now
                }
                else {
                    if (this.ctrlPressed &&
                        (chr == 'c' || chr == 'C')) {
                        _OsShell.shellKill(["" + _CPU.PID]);
                        this.putLine("CPU force halt");
                        _Kernel.krnTrace("CPU force halt");
                    }
                    else {
                        this.ctrlPressed = false;
                        // This is a "normal" character, so
                        // draw it on the screen and add it to our buffer.
                        this.addTypedText(chr);
                        this.bufHistoryPos = -1;
                        this.predictionNum = 0;
                    }
                }
                // TODO: Add a case for Ctrl-C that would allow the user to break the current program.
            }
        };
        Console.prototype.putText = function (text) {
            /*  My first inclination here was to write two functions: putChar() and putString().
                Then I remembered that JavaScript is (sadly) untyped and it won't differentiate
                between the two. (Although TypeScript would. But we're compiling to JavaScipt anyway.)
                So rather than be like PHP and write two (or more) functions that
                do the same thing, thereby encouraging confusion and decreasing readability, I
                decided to write one function and use the term "text" to connote string or char.
             */
            if (text !== "") {
                //split the text into individual words for line wrapping 
                //(but use regex lookahead to preserve whitespace)
                var words = text.split(/(?= )/g);
                for (var i in words) {
                    //determine the word's length in pixels
                    var offset = _DrawingContext.measureText(this.currentFont, this.currentFontSize, words[i]);
                    //wrap the line if we went too far
                    if (this.currentXPosition + offset > _Canvas.width) {
                        this.advanceLine();
                    }
                    // Draw the word at the current X and Y coordinates.
                    _DrawingContext.drawText(this.currentFont, this.currentFontSize, this.currentXPosition, this.currentYPosition, words[i]);
                    // Move the current X position.
                    this.currentXPosition = this.currentXPosition + offset;
                    // If current word contains a newline, advance line
                    if (words[i].search("\n") >= 0) {
                        this.advanceLine();
                    }
                }
            }
        };
        Console.prototype.advanceLine = function () {
            this.currentXPosition = 0;
            /*
             * Font size measures from the baseline to the highest point in the font.
             * Font descent measures from the baseline to the lowest point in the font.
             * Font height margin is extra spacing between the lines.
             */
            var lineHeight = _DefaultFontSize +
                _DrawingContext.fontDescent(this.currentFont, this.currentFontSize) +
                _FontHeightMargin;
            this.currentYPosition += lineHeight;
            // if you exceeded canvas size, translate the whole canvas up by the line height
            if (this.currentYPosition > _Canvas.height) {
                this.currentYPosition -= lineHeight;
                //copy the canvas data, clear canvas, and replace the data translated up a bit
                var img = _DrawingContext.getImageData(0, 0, _Canvas.width, _Canvas.height);
                this.clearScreen();
                _DrawingContext.putImageData(img, 0, -lineHeight);
            }
        };
        Console.prototype.putLine = function (line) {
            this.putText(line);
            this.advanceLine();
        };
        return Console;
    }());
    TSOS.Console = Console;
})(TSOS || (TSOS = {}));
