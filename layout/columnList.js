// summary:
//		Sort a list of items into columns, distributing items evenly.
// description:
//		Sort a list of items into columns, evenly distributing the items
//		between each column.  The css-equivilant does not work in IE8 or IE9.
//		Also, wrapping between columns can be problematic as no way of
//		stopping items wrapping across columns.
// author:
//		Stephen Simpson <me@simpo.org>, <http://simpo.org>
// todo:
//		Distribution according to item screen space rather than item number.
//		Better styling of gaps.
//		Add a clear both to the end of the containerNode.
define([
	"dojo/_base/declare",
	"./_columnListMixin",
	"./_columnListDomMixin",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-attr",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/dom-class",
	"dojo/query",
	"dojo/NodeList-manipulate"
], function(
	declare, _columnListMixin, _columnListDomMixin, lang, array,
	domAttr, domConstr, domStyle, domClass, $, on
){
	"use strict";
	
	var construct = declare([_columnListMixin, _columnListDomMixin], {
		// cols: integer
		//		Number of columns to display.
		"cols": 2,
		
		// _cols: integer
		//		Actual number of colunms on-screen, may be different to
		//		this.cols if the number of items is less than the total
		//		number of columns.
		"_cols": 2,
		
		// columnTagName: string
		//		The column tag, normally ul or ol.  Will take the value of
		//		domNode tagname if not supplied.
		"columnTagName": null,
		
		// itemTagName: string
		//		The column-item tag (default = li).  Should be li unless some
		//		clever is required in conjunction with columnTagName.
		"itemTagName": "li",
		
		// class: string
		//		Class to apply to each column item (will add to any class element
		//		given in declarative markup).
		"class": "",
		
		// gap: integer
		//		Percentage gap to apply between columns.
		"gap": 5,
		
		// _columnNodes: array()
		//		Columns currently showing on the screen.
		"_columnNodes": [],
		
		// _items: array()
		//		Items currently showing om the screen.
		"_items": [],
		
		// _parentNode: object XMLNode
		//		The current parent of domNode, used to move columns when
		//		domNode moves.
		"_parentNode": null,
		
		// _itemCount: integer
		//		Keeps a count of the current on-screen items so removal and
		//		additions can be detected
		"_itemCount": 0,
		
		// _clearNode: object XMLNode
		//		Node added after the container node to stop items floating
		//		after the columns.
		"_clearNode": null,
		
		constructor: function(params, srcNodeRef){
			if(srcNodeRef === undefined){
				if(!this._isProperty(params,"columnTagName")){
					this.columnTagName = "ul";
				}
			}
		},
		
		postCreate: function(){
			this._init();
		},
		
		_init: function(){
			// summary:
			//		Call all the initialization methods.
			
			try{
				this._parentNode = this.domNode.parentNode;
				this._cols = this.cols;
				this._initProperties();
				this._initDom();
				this._intervalDefaultFunction = this._domCheck;
				this._setupInterval();
			}catch(e){
				console.info("Could not initiate the widget.");
			}
		},
		
		_initProperties: function(){
			// summary:
			//		Call all the widget property initialization methods.
			
			try{
				this._initClass();
				this._initColumnTagName();
			}catch(e){
				console.info("Could not initiate the widget properties.");
			}
		},
		
		_initDom: function(){
			// summary:
			//		Call all the widget DOM initialization methods.
			
			try{
				this._hideNode(this.domNode);
				this._initWidgetNode();
				this._initColumns();
			}catch(e){
				console.info("Could not initiate the widget Dom.");
			}
		},
		
		_initClass: function(){
			// summary:
			//		Set the class to apply to each column tag.
			
			try{
				var cClass = domAttr.get(this.domNode, "class");
				if(cClass !== null){
					this["class"] = this._appandItem(this["class"], cClass);
				}
			}catch(e){
				console.info("Could not initiate class name for columns.");
			}
		},
		
		_initColumnTagName: function(){
			// summary:
			//		Set the type to use for columns.
			
			try{
				if(this.columnTagName === null){
					this.columnTagName = this.domNode.tagName.toLowerCase();
				}
			}catch(e){
				console.info("Could not initiate column tag name.");
			}
		},
		
		_initColumns: function(){
			// summary:
			//		Create the columns.
			
			try{
				this._cols = this._calcColumnCount();
				if(this.cols !== this._cols){
					this._emitColumnCountChange(this.cols, this._cols);
				}
			
				var columnMixin = this._createColumnMixin();
				for(var i = 1; i <= this._cols; i++){
					this._columnNodes.push(
						this._createNewColumn(columnMixin)
					);
				}
			}catch(e){
				console.info("Could not initiate columns.");
			}
		},
		
		clear: function(){
			try{
				$(this.itemTagName, this._holdingArea).remove();
				$(this.itemTagName, this.containerNode).remove();
				$(this.itemTagName, this.domNode).remove();
			}catch(e){
				console.info("Could not clear the widget of items.");
			}
		},
		
		_domCheck: function(){
			// summary:
			//		Carry-out various dom check to see what has changed and
			//		act accordingly.
			// description:
			//		Check for new items added to the this.domNode. Ran at
			//		intervals to dynamically add new items, change the number
			//		of columns or move the dom location of the on-screen
			//		widget content.
			
			this._clearInterval();
			try{
				this._checkParentNode();
				this._checkItemsAddedOrRemoved();
				var colCheck = this._checkColumnCount();
				this._checkNewItems(colCheck);
				this._checkItemsAddedOrRemoved();
			}catch(e){
				console.info("Could not perform the dom checks.");
			}
			this._setupInterval();
		},
		
		_checkItemsAddedOrRemoved: function(){
			try{
				var items = this._getCurrentItems();
				if(items.count !== this._itemCount){
					if(items.count > this._itemCount){
						this._emitItemsAdded(items.count - this._itemCount);
					}else if(items.count < this._itemCount){
						this._emitItemsRemoved(this._itemCount - items.count);
					}
					this._itemCount = items.count;
				}
			}catch(e){
				console.info("Could not perform check for added or removed items.");
			}
		},
		
		_checkNewItems: function(force){
			// summary:
			//		Check for new items and apply to the screen if found.
			// description:
			//		Check for new items added to the this.domNode and
			//		move them to the correct column.  Ran at intervals
			//		so that elements can be dynamically added via JavaScript
			//		as well as declarative in the HTML.
			// force: boolean
			//		Force a colum re-draw even of no new items detected. Used
			//		mainly when columns are added or removed and items need
			//		redistributing among the columns.
			
			try{
				var items = this._getNewItems();
				if((items.length > 0) || force){
					this._moveNewItems(items);
				}
			}catch(e){
				console.info("Could not perform check for new items.");
			}
		},
		
		_checkParentNode: function(){
			// summary:
			//		Ensure that nodes associated with this widget stay together.
			// description:
			//		Ensure all the widget nodes stay together.  If someone moves
			//		this.domNode then it the other nodes need to move with it.
			// todo:
			//		Will not work if the nodes position in parent node is moved.
			
			try{
				if(this.domNode.parentNode !== this._parentNode){
					this._parentNode = this.domNode.parentNode;
					domConstr.place(this.widgetNode, this.domNode, "after");
					//this._redraw();
				}
			}catch(e){
				console.info("Could not perform parent node check.");
			}
		},
		
		/*_redraw: function() {
			var n = document.createTextNode(' ');
			this.containerNode.appendChild(n);
			setTimeout(function(){ n.parentNode.removeChild(n) }, 0);
			return this.containerNode;
		},*/
		
		_checkColumnCount: function(){
			// summary:
			//		Check if the number of columns has changed.
			// returns: boolean
			
			var colCheck = false;
			
			try{
				var currentColCount = this._columnNodes.length;
				this._cols = this._calcColumnCount();
				if (this._columnNodes.length !== this._cols){
					if(this._cols > this._columnNodes.length){
						this._addColumns();
						colCheck = true;
					}else if(this._cols < this._columnNodes.length){
						this._removeColumns();
						colCheck = true;
					}
				}
			
				if(colCheck){
					this._emitColumnCountChange(currentColCount, this._cols);
				}
			}catch(e){
				console.info("Could not perform column count check.");
			}
			
			return colCheck;
		},
		
		_createNewColumn: function(columnMixin){
			// summary:
			//		Create a new column within the container node.
			// columnMixin: object
			//		The object to use for construction of the
			//		column-tag attributes.  Defaults to an empty object.
			// returns: object XMLNode
			//		The new column element
			
			try{
				columnMixin = ((columnMixin === undefined) ? {} : columnMixin);
			
				return domConstr.create(
					this.columnTagName, columnMixin, this.containerNode
				);
			}catch(e){
				console.info("Could not create a new column.");
				return null;
			}
		},
		
		_createColumnMixin: function(){
			// summary:
			//		Create the mixin for creating each column.
			// returns: object
			//		The object to use in column creation.
			
			try{
				var width = parseInt((100/this._cols), 10) - this.gap;
				width = width.toString() + "%";
			
				var columnMixin = {
					"style": {
						"float": "left",
						"width": width
					}
				};
			
				if(this["class"] != ""){
					columnMixin["class"] = this["class"];
				}
			
				return columnMixin;
			}catch(e){
				console.info("Could not create the column element creation mixin object.");
				return {};
			}
		},
		
		_addColumns: function(){
			// summary:
			//		Add a new column, if one is needed.
			
			try{
				var colsToAdd = (this._cols-this._columnNodes.length);
				if(colsToAdd > 0){
					var columnMixin = this._createColumnMixin();
					for(var i = 1; i <= colsToAdd; i++){
						this._columnNodes.push(this._createNewColumn(columnMixin));
					}
					this._recalcColStyle();
				}
			}catch(e){
				console.info("Could not add columns.");
			}
		},
		
		_removeColumns: function(){
			// summary:
			//		Remove a column, if one needs removing.
			
			try{
				var colsToRemove = (this._columnNodes.length-this._cols);
				if(colsToRemove > 0){
					for(var i = 1; i <= colsToRemove; i++){
						var cCol = this._columnNodes.pop();
						var items = this._getNewItems(cCol);
						for(var ii = (items.length - 1); ii >= 0; ii--){
							domConstr.place(items[ii], this._holdingArea, "first");
						}
						domConstr.destroy(cCol);
					}
					this._recalcColStyle();
				}
			}catch(e){
				console.info("Could not remove columns.");
			}
		},
		
		_recalcColStyle: function(){
			// summary:
			//		Re-apply the correct style to each column.
			
			try{
				var mixin = this._createColumnMixin();
				array.forEach(this._columnNodes, function(colNode){
					domStyle.set(colNode, mixin.style);
				}, this);
			}catch(e){
				console.info("Could not recalculate and apply the column styles.");
			}
		},
		
		_getNewItems: function(parentNode){
			// summary:
			//		Get all the new items that need adding.
			// pasrentNode: object XMLNode
			//		The node to check for new items (default to this.domNode).
			// returns: array() XMLNode()
			
			try{
				parentNode = ((parentNode === undefined) ? this.domNode : parentNode);
			
				var newItems = new Array();
				var items = $(this.itemTagName, parentNode);
				array.forEach(items, function(item){
					if(item.parentNode === parentNode){
						newItems.push(item);
					}
				}, this);
			
				return newItems;
			}catch(e){
				console.info("Could not get new items");
				return new Array();
			}
		},
		
		_getCurrentItems: function(){
			// summary:
			//		Get an array of all the current on-screen items.
			// returns: array() XMLNode()
			
			try{
				var currentItems = new Array();
				array.forEach(this._columnNodes, function(colNode){
					currentItems = currentItems.concat(
						this._getNewItems(colNode)
					)
				}, this);
			
				return currentItems;
			}catch(e){
				console.info("Could not get current items");
				return new Array();
			}
		},
		
		_getNewAndCurrentItems: function(){
			// summary:
			//		Get an array of all the new items to add and current
			//		on-screen items.
			// returns: array() XMLNode()
			
			try{
				var currentItems = this._getCurrentItems();
				return currentItems.concat(
					this._getNewItems(this._holdingArea)
				);
			}catch(e){
				console.info("Could not get new and current items");
				return new Array();
			}
		},
		
		_getAllCurrentItems: function(){
			// summary:
			//		Get all the on-screen and off-screen items.
			// returns: array() XMLNode()
			
			try{
				var currentItems = this._getNewAndCurrentItems();
				return currentItems.concat(this._getNewItems());
			}catch(e){
				console.info("Could not get all current items");
				return new Array();
			}
		},
		
		_moveNewItems: function(items){
			// summary:
			//		Move new items added to the domNode to the correct column.
			// items: array XMLNode()
			//		Nodes (items) to move to the screen columns.
			
			try{
				if(this._columnNodes.length > 0){
					this._moveItemsToHoldingArea(items);
					items = this._getNewAndCurrentItems();
					this._rewrapColumns(items);
				}
			}catch(e){
				console.info("Could not move new items");
			}
		},
		
		_moveItemsToHoldingArea: function(items){
			// summary:
			//		Move supplied items to the holding area ready to be
			//		displayed on-screen.
			// items: array() XMLNode()
			
			try{
				array.forEach(items, function(item){
					domConstr.place(item, this._holdingArea, "last");
				}, this);
			}catch(e){
				console.info("Could not move items to holding area");
			}			
		},
		
		_rewrapColumns: function(items){
			// summary:
			//		Apply column items to the correct column.
			// items: array XMLNode()
			//		Nodes (items) to assign to the columns.
			
			try{
				var colSizes = this._calcColumnSize(items);
				var cCol = 1;
				var cColItem = 1;
			
				array.forEach(items, function(item, n){
					domConstr.place(item, this._columnNodes[cCol-1], "last");
					cColItem++;
					if(cColItem > colSizes[cCol-1]){
						cCol++;
						cColItem = 1;
					}
				}, this);
			}catch(e){
				console.info("Could not rewrap columns");
			}
		},
		
		_calcColumnCount: function(){
			// summary:
			//		Get the number of columns to display on-screen.
			// description:
			//		Get the number of columns to display on-screen.  May be
			//		less than this.cols if the number of items is less than the
			//		number of columns.
			
			try{
				var items = this._getAllCurrentItems();
			
				return ((this.cols > items.length) ? items.length : this.cols);
			}catch(e){
				console.info("Could not calculate column count");
				return 0;
			}
		},
		
		_calcColumnSize: function(items){
			// summary:
			//		Calculate the number of items to apply to each column.
			// items: array XMLNode()
			//		Current items being assigned to on-screen columns.
			// returns: array()
			//		The sizes of each column.
			
			var sizes = new Array();
			
			try{
				var itemsPerColumn = parseInt((items.length / this._cols), 10);
				var itemsPerRem = (items.length % this._cols);
			
				for(var colNo = 0; colNo < this._columnNodes.length; colNo++){
					sizes[colNo] = itemsPerColumn;
					if(colNo < itemsPerRem){
						sizes[colNo]++;
					}
				}
			}catch(e){
				console.info("Could not calculate column sizes array");
			}
			
			return sizes;
		}
	});
	
	return construct;
});