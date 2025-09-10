// utils.js

// smart split a text string and returns array
// it split by different chars in the array splitters
// the function splitter('5+6-A9', ['+', '-']) will return [5,+,6,-,A9]
function splitter(text, splitters) {
	let rv = [];

	let e = '';
	for(let i = 0; i < text.length; i++) {
		let v = text[i];
		
		// is it a splitter?
		if(splitters.indexOf(v) != -1 && e !== '') {
			rv.push(e);
			rv.push(v);
			e = '';
		} else {
			e += v;
		}
	}

	if(e !== '') {
		rv.push(e);
	}

	return rv;
}


/**
 * Checks if the caret (cursor) is at the very end of a contenteditable element.
 * This version tries to be more robust by navigating the DOM tree.
 *
 * @param {HTMLElement} element The contenteditable HTML element.
 * @returns {boolean} True if the caret is at the end, false otherwise.
 */
function isCursorAtEndOfContentEditable(element) {
    if (!element || !element.isContentEditable) {
        return false;
    }

    const selection = window.getSelection();

    // No selection or cursor present
    if (selection.rangeCount === 0) {
        return false;
    }

    const range = selection.getRangeAt(0);

    // We are looking for a collapsed range (caret), not a selection
    if (!range.collapsed) {
        return false;
    }

    const focusNode = selection.focusNode;
    const focusOffset = selection.focusOffset;

    // Helper to find the last *meaningful* node (e.g., non-empty text node or an element)
    // that is a descendant of the contenteditable element.
    function findLastMeaningfulNode(node) {
        let lastNode = node;
        while (lastNode.lastChild) {
            // Skip empty text nodes if they are at the very end and have no effective content
            if (lastNode.lastChild.nodeType === Node.TEXT_NODE && lastNode.lastChild.textContent.trim() === '') {
                 // Special handling for empty text nodes at the end, especially if they are the only child
                 if (!lastNode.lastChild.previousSibling && lastNode.lastChild.nextSibling) {
                    // If it's the only text node child and there's a next sibling element
                    // we might need to go deeper into that sibling instead of stopping here.
                    // This scenario is tricky; for now, we'll just check if it's trim == ''
                 }
                // If it's an empty text node and not the only child of its parent,
                // we should probably step back to the previous sibling if possible.
                // However, directly jumping to previousSibling might miss nested structures.
                // For robustness, let's assume `lastChild` gives us what we need,
                // and if it's empty text, the offset will be 0.
            }
            lastNode = lastNode.lastChild;
        }
        return lastNode;
    }

    const lastNodeInContentEditable = findLastMeaningfulNode(element);

    // Case 1: The focusNode is the same as the last node in the contenteditable.
    // This is the simplest and most common scenario.
    if (focusNode === lastNodeInContentEditable) {
        // If it's a text node, check if the offset is its length.
        if (focusNode.nodeType === Node.TEXT_NODE) {
            return focusOffset === focusNode.length;
        }
        // If it's an element node (e.g., <p>, <div>, <span>),
        // check if the offset is the number of its children.
        // This signifies the cursor is after all its children.
        else if (focusNode.nodeType === Node.ELEMENT_NODE) {
            // A common case when focusNode is the contenteditable itself and it's empty or has block children.
            // Or if focusNode is an empty paragraph at the end.
            return focusOffset === focusNode.childNodes.length;
        }
    }

    // Case 2: The focusNode is *inside* a descendant of the contenteditable,
    // and that descendant is the last logical container/text node.
    // We need to check if the focusNode is contained within the lastNodeInContentEditable's subtree.
    if (element.contains(focusNode)) {
        // Check if the focusNode is *after* or *at the end* of all preceding siblings
        // and its own offset is at its end.
        // This is where it gets complex. The `compareBoundaryPoints` could still be useful
        // if we construct the range correctly for the `element`'s actual end.

        // Let's try the `compareBoundaryPoints` again, but ensure `fullRange` is truly at the end.
        // It should work if the `fullRange` is collapsed to the very end of the LAST text node
        // or just after the last element.

        const tempRange = document.createRange();
        // Set the start of the range to the end of the element
        tempRange.selectNodeContents(element);
        tempRange.collapse(false); // Collapse to the end of the element

        // Now, compare the current range's end with the constructed end range.
        // We use Range.END_TO_END to compare the end point of the current selection's range
        // with the end point of the tempRange (which is at the very end of the contenteditable).
        return range.compareBoundaryPoints(Range.END_TO_END, tempRange) === 0;
    }

    return false;
}