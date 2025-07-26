// Initialization and core setup
var tauriAvailable = false
var operatingSystem = "Unknown"
if (window.__TAURI__) {
  const { invoke } = window.__TAURI__.core;
  tauriAvailable = true
  document.getElementById("downloads").style.display = "flex";
} else {
  document.getElementById("downloads").style.display = "none";
}
if (window.navigator) {
  operatingSystem = window.navigator.platform
}
console.log("Operating system: " + operatingSystem)
console.log("Tauri available: " + tauriAvailable)
if (tauriAvailable) {
  console.log("Tauri is available therefore Downloads are available.")
}

// Global variables
let currentSearchTags = "";
let currentSearchPage = 1;
let loadingMore = false;
let noMoreResults = false;
let scrollEventListener = null;

// Function to check if we have valid stored credentials
async function checkStoredCredentials() {
  try {
    const credentials = await getStoredCredentials();
    
    if (!credentials.username || !credentials.apiKey) {
      console.log("No stored credentials found");
      return false;
    }
    
    console.log("Found stored credentials, verifying...");
    const userInfo = await verifyApiKey(credentials.username, credentials.apiKey);
    
    if (userInfo) {
      console.log("Stored credentials are valid!");
      // Show all elements that need an account - override !important with class manipulation
      const needsAccountElements = document.querySelectorAll('.needsAccount');
      needsAccountElements.forEach(element => {
        element.classList.add('accountVerified');
        element.style.setProperty('display', 'flex', 'important');
      });
      return true;
    } else {
      console.log("Stored credentials are invalid");
      // Hide elements if credentials are invalid
      const needsAccountElements = document.querySelectorAll('.needsAccount');
      needsAccountElements.forEach(element => {
        element.classList.remove('accountVerified');
        element.style.setProperty('display', 'none', 'important');
      });
      return false;
    }
  } catch (error) {
    console.error('Error checking stored credentials:', error);
    return false;
  }
}

// Initialize the app - check credentials on startup
async function initializeApp() {
  console.log("Operating system: " + operatingSystem)
  console.log("Tauri available: " + tauriAvailable)
  if (tauriAvailable) {
    console.log("Tauri is available therefore Downloads are available.")
  }
  
  // Check if we have valid stored credentials
  await checkStoredCredentials();
  
  // Load the home page
  home();
}

// Settings storage functions
async function saveSettings(settings) {
  if (!tauriAvailable) {
    // Fallback for web environment
    localStorage.setItem('monosodium-settings', JSON.stringify(settings));
    return;
  }

  try {
    const { writeTextFile, BaseDirectory } = window.__TAURI__.fs;
    await writeTextFile('settings.json', JSON.stringify(settings, null, 2), {
      baseDir: BaseDirectory.AppData
    });
    console.log('Settings saved successfully');
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

async function loadSettings() {
  if (!tauriAvailable) {
    // Fallback for web environment
    const stored = localStorage.getItem('monosodium-settings');
    return stored ? JSON.parse(stored) : {};
  }

  try {
    const { readTextFile, BaseDirectory } = window.__TAURI__.fs;
    const settingsStr = await readTextFile('settings.json', {
      baseDir: BaseDirectory.AppData
    });
    return JSON.parse(settingsStr);
  } catch (error) {
    // File doesn't exist yet, return empty settings
    console.log('No settings file found, using defaults');
    return {};
  }
}

// Function to get stored credentials (for use in API calls)
async function getStoredCredentials() {
  const settings = await loadSettings();
  return {
    username: settings.username || null,
    apiKey: settings.apiKey || null
  };
}

// Function to verify API key and get user info
async function verifyApiKey(username, apiKey) {
  try {
    console.log("=== API VERIFICATION DEBUG ===");
    console.log("Username:", username);
    console.log("API Key length:", apiKey.length);
    console.log("API Key first 4 chars:", apiKey.substring(0, 4));
    
    const authString = `${username}:${apiKey}`;
    const encodedAuth = btoa(authString);
    console.log("Auth string length:", authString.length);
    console.log("Base64 auth:", encodedAuth.substring(0, 20) + "...");

    // Use Tauri's HTTP client to bypass CORS
    let tauriFetch;
    try {
      tauriFetch = window.__TAURI__.http.fetch;
    } catch (e) {
      console.log("Trying alternative HTTP import...");
      try {
        const { fetch } = await import("@tauri-apps/api/http");
        tauriFetch = fetch;
      } catch (e2) {
        throw new Error("Could not access Tauri HTTP client");
      }
    }

    const url = `https://e621.net/users/${username}.json`;
    console.log("Request URL:", url);

    const response = await tauriFetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Monosodium glutamate/1.0 (Pugsby)',
        'Authorization': `Basic ${encodedAuth}`
      }
    });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    if (!response.ok) {
      // Try to get the response body for more details
      let errorBody = '';
      try {
        const text = await response.text();
        errorBody = text;
        console.log("Error response body:", errorBody);
      } catch (e) {
        console.log("Could not read error response body");
      }
      
      throw new Error(`HTTP error! status: ${response.status}${errorBody ? ` - ${errorBody}` : ''}`);
    }

    const data = await response.json();
    console.log("API verification successful!");
    return data;
  } catch (error) {
    console.error('API verification failed:', error);
    return null;
  }
}

// Utility functions
function highlightSidebarItem(name) {
  const sidebarItems = document.getElementById("sidebar").children;
  for (const item of sidebarItems) {
    item.classList.remove("current");
  }
  document.getElementById(name).classList.add("current");
}

// Event listeners setup
document.getElementById("homeButton").addEventListener("click", () => {
  home()
})
document.getElementById("search").addEventListener("click", () => {
  searchPage()
})
document.getElementById("downloads").addEventListener("click", () => {
  openDownloadsPage();
});
document.getElementById("settings").addEventListener("click", () => {
  settingsPage();
});
document.getElementById("favorites").addEventListener("click", () => {
  favoritesPage();
});

// Make functions globally available
window.openPost = openPost;
window.openLocalPost = openLocalPost;

// Initialize the app when the script loads
initializeApp();