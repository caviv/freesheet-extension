// undo.js

// this is an Undo object - it is actually an item in a linked-list that points backwards to the previous version of Undo with sheetData
class Undo {

	sheetData = null; // the data
	previousVersion = null; // pointer to the previous version of Undo object with sheetData
	forwardVersion = null; // pointer to the forward version of Undo object with sheetData

	constructor(previousVersion, sheetData) {
		if(previousVersion) {
			previousVersion.setForwardVersion(this);
			this.previousVersion = previousVersion;	
		}
		this.sheetData = structuredClone(sheetData);
	}

	getPreviousVersion() {
		// if there is no previousVersion we return the same objet so we will be able to Redo
		if(!this.previousVersion)
			return this;
		return this.previousVersion;
	}

	setForwardVersion(fv) {
		this.forwardVersion = fv;
	}

	getForwardVersion() {
		// if there is no forwardVersion we return the same objet so we will be able to Redo the Undo again :-)
		if(!this.forwardVersion)
			return this;
		return this.forwardVersion;
	}

	getSheetData() {
		return this.sheetData;
	}
}