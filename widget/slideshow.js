// summary:
//
// description:
//
// author:
//		Stephen Simpson <me@simpo.org>, <http://simpo.org>
define([
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/i18n",
	"dojo/i18n!./nls/slideshow",
	"dojo/text!./views/slideshow.html",
	"dojo/on",
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/promise/all",
	"dojo/_base/lang",
	"dojo/dom-construct",
	"dojo/dom-style",
	"simpo/typeTest"
], function(
	declare, _widget, _templated, _wTemplate, i18n, strings, template, on,
	array, Deferred, defAll, lang, domConstr, domStyle, typeTest
){
	"use strict";
	
	var construct = declare([_widget, _templated, _wTemplate], {
		// i18n: object
		//		The internationalisation text-strings for current browser language.
		"i18n": strings,
		
		// templateString: string
		//		The loaded template string containing the HTML formatted template for this widget.
		"templateString": template,
		
		"src": null,
		"_imageData": [],
		"_context": null,
		"height": 350,
		"width": 350,
		"stripes": 10,
		"interval": 900,
		"speed": 100,
		"_stripeWidths":null,
		"_timer": null,
		"_pos": 0,
		"_tPos": 0,
		"_cImageNo":0,
		"type":"blinds",
		"squaresSize":50,
		"_squares":null,
		
		_setSrcAttr: function(src){
			this.src = src;
			this._loadImages(src);
		},
		
		_setWidthAttr: function(width){
			this.width = width;
			domStyle.set(this.domNode, "width", width+"px");
			domStyle.set(this.container, "width", width+"px");
			this._setStripeWidths();
		},
		
		_setHeightAttr: function(height){
			this.height = height;
			domStyle.set(this.domNode, "height", height+"px");
			domStyle.set(this.container, "height", height+"px");
		},
		
		_setSquaresSizeAttr: function(value){
			this.squaresSize = value;
			this._setSquarePoints();
		},
		
		_calculateRowAndColCount: function(dimension){
			var rowOrCol = Math.floor(dimension/this.squaresSize);
			rowOrCol = (
				((dimension%this.squaresSize) == 0)?
					rowOrCol:
					rowOrCol+1
			);
			
			return rowOrCol;
		},
		
		_calculateCurrentBoxDimension: function(dimension, count, cCount){
			if(cCount == (count-1)){
				var cDimension = this.squaresSize;
				return (
					((dimension%this.squaresSize) == 0)?
						cDimension:
						(dimension%this.squaresSize)
				);
			}else{
				return this.squaresSize;
			}
		},
		
		_setSquarePoints: function(){
			this._squares = new Array();
			
			var cols = this._calculateRowAndColCount(this.width);
			var rows = this._calculateRowAndColCount(this.height);
			
			for(var cCol = 0, i = 0; cCol < cols; cCol++){
				for(var cRow = 0; cRow < rows; cRow++, i++){
					var width = this._calculateCurrentBoxDimension(
						this.width, cols, cCol
					);
					var height = this._calculateCurrentBoxDimension(
						this.height, rows, cRow
					);
					
					this._squares[i] = {
						"x":(cCol*this.squaresSize), "y":(cRow*this.squaresSize),
						"height":height, "width":width
					};
				}
			}
		},
		
		_setStripeWidths: function(){
			this._stripeWidths =  new Array();
			
			var stripeWidth = parseInt((this.width/this.stripes), 10);
			var stripeWidthSpare = (this.width%this.stripes);
			for(var i=0; i<this.stripes; i++){
				this._stripeWidths[i] = stripeWidth;
				if(i<stripeWidthSpare){
					this._stripeWidths[i]++;
				}
			}
		},
		
		_loadImages: function(src){
			var defs = new Array();
			
			array.forEach(src, function(cSrc, n){
				this._imageData[n] = new Image();
				this._imageData[n].src = cSrc;
				
				var def = new Deferred;
				defs.push(def);
				on(this._imageData[n], 'load', function(){
					def.resolve();
				});
			}, this);
			
			defAll(defs).then(lang.hitch(this, this._imagesLoaded));
		},
		
		_imagesLoaded: function(response){
			this._createCanvas();
			this._displayImage();
		},
		
		_createCanvas: function(){
			var canvas = domConstr.create("canvas", {
				"width":this.width,
				"height":this.height
			}, this.container);
			this._context = canvas.getContext("2d");
		},
		
		_displayImage: function(){
			this._pos = 0;
			this._tPos = 0;
			
			if(this.type == "blinds"){
				this._drawStripe(this._cImageNo);
			}else if(this.type == "squares"){
				this._drawSquare(this._cImageNo);
			}
			
			this._cImageNo++;
			if(this._cImageNo >= this._imageData.length){
				this._cImageNo = 0;
			}
		},
		
		_clearTimeout: function(reference){
			if(reference !== null){
				clearTimeout(reference);
			}
		},
		
		_setTimeout: function(func, interval, args){
			args = (
				(typeTest.isArray(args))?
					args:((args === null)||(args === undefined))?[]:[args]
			);
			
			return setTimeout(
				lang.hitch(this, function(){
					func.apply(this, args)
				}),
				interval
			);
		},
		
		_drawSquare: function(imageNo){
			this._clearTimeout(this._timer);
			
			array.forEach(this._squares, function(square, n){
				var width = this._getCurrentSquareDimension("width", square);
				var height = this._getCurrentSquareDimension("height", square);
				
				this._context.drawImage(
					this._imageData[imageNo],
					square.x, square.y, width, height,
					square.x, square.y, width, height
				);
			}, this);
			
			this._pos+=2;
			this._drawSquareNext(imageNo);
		},
		
		_getCurrentSquareDimension: function(dimension, square){
			var value = this._pos;
			return ((value > square[dimension])?square[dimension]:value);
		},
		
		_drawSquareNext: function(imageNo){
			if(this._pos <= this.squaresSize){
				this._timer = this._setTimeout(
					this._drawSquare, this.speed, imageNo
				);
			}else{
				this._timer = this._setTimeout(
					this._displayImage, this.interval
				);
			}
		},
		
		_drawStripeLine: function(imageNo, ccPos){
			this._context.drawImage(
				this._imageData[imageNo],
				this._pos+ccPos,0,1,this.height,
				this._pos+ccPos,0,1,this.height
			);
		},
		
		_calculateCanvasPosition: function(stripeNo){
			var pos = 0;
			for(var i=0; i<stripeNo; i++){
				pos += this._stripeWidths[i];
			}
			
			return pos;
		},
		
		_drawStripe: function(imageNo){
			if(this._timer !== null){
				clearTimeout(this._timer);
			}
			
			for(var i=0; i<this.stripes; i++){
				if(this._pos < this._stripeWidths[i]){
					var ccPos = this._calculateCanvasPosition(i);
					this._drawStripeLine(imageNo, ccPos);
					this._tPos++;
				}
			}
			this._pos++;
			this._callInterval(imageNo);
		},
		
		_callInterval: function(imageNo){
			if(this._tPos < this.width){
				this._timer = setTimeout(
					lang.hitch(this, this._drawStripe, imageNo),
					this.speed
				);
			}else{
				this._timer = setTimeout(
					lang.hitch(this, this._displayImage),
					this.interval
				);
			}
		}
	});
	
	return construct;
});