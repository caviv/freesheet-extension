// keys.js

// TODO: change this to be associative array (object) so we can check key exists - which is much faster than searching array
var printableKeys = ['KeyQ', 'KeyA', 'KeyZ', 'KeyX', 'KeyS', 'KeyW', 'KeyE', 'KeyD', 'KeyC', 'KeyV', 'KeyF', 'KeyR', 'KeyT', 'KeyG', 'KeyB', 'KeyN', 'KeyH', 'KeyY', 'KeyU', 'KeyJ', 'KeyM', 'KeyI', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 
	'Comma', 'Period', 'Slash', 'Semicolon', 'Quote', 'Backslash', 'BracketRight', 'BracketLeft', 'KeyP', 'IntlBackslash', 'Backquote', 
	'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 
	'Minus', 'Equal', 'Space', 
	'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9', 'Numpad0'];

function isPrintable(keycode) {
	if (printableKeys.indexOf(keycode) !== -1) {
    	return true;
	}

	return false;
}