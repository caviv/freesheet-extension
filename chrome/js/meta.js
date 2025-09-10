// meta.js

// login
const LOGIN_KEY = 'login'; // {sessionId, email}

function getLoginData() {
    if(!localStorage[LOGIN_KEY]) {
        localStorage[LOGIN_KEY] = '{}';
    }

    return JSON.parse(localStorage[LOGIN_KEY]);
}

function saveLoginData(loginData) {
    localStorage[LOGIN_KEY] = JSON.stringify(loginData);
}

function loginLogout() {
    let loginData = getLoginData();
    loginData.sessionId = null;
    saveLoginData(loginData);
}


/**
 * Removes all text from the end of a string until it reaches one of the specified characters.
 * * @param {string} str - The original string (haystack).
 * @param {string[]} until - An array of characters to stop the removal at.
 * @returns {string} The new string with the end text removed.
 * e.g. calling with those params "=SUM(E4:E5, saf", ['(', ',']" will return "=SUM(E4:E5,"
 */
function removeTextAtTheEnd(str, until) {
  // We'll iterate backward from the last character of the string.
  // This is more efficient than repeatedly slicing and checking the end.
  for (let i = str.length - 1; i >= 0; i--) {
    const currentChar = str[i];

    // Check if the current character is one of the "until" characters.
    if (until.includes(currentChar)) {
      // If we find a match, slice the string from the beginning up to and
      // including the found character.
      return str.slice(0, i + 1);
    }
  }

  // If the loop completes and none of the "until" characters are found,
  // return the original string unchanged.
  return str;
}