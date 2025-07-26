// Settings functionality

// Function to load and apply theme on DOM load
async function initializeTheme() {
  const settings = await loadSettings();
  const theme = settings.theme || 'frappe'; // Default to frappe
  document.body.className = theme;
  console.log(`Initialized theme: ${theme}`);
}

// Initialize theme when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTheme);

// Function to load and display user profile picture
async function loadUserProfile(username, apiKey) {
  try {
    const userInfo = await verifyApiKey(username, apiKey);
    if (userInfo && userInfo.avatar_id) {
      // Avatar is a post ID, so we need to fetch that post to get the image URL
      console.log("User avatar ID:", userInfo.avatar_id);
      
      // Get the post info for the avatar
      const avatarPost = await getPostInfo(userInfo.avatar_id);
      if (avatarPost && avatarPost.file && avatarPost.file.url) {
        document.getElementById("apiPfp").src = avatarPost.file.url;
        console.log("Loaded avatar from post:", userInfo.avatar_id);
      } else {
        console.log("Could not load avatar post");
        document.getElementById("apiPfp").src = '';
      }
    } else {
      console.log("User has no avatar set");
      document.getElementById("apiPfp").src = '';
    }
  } catch (error) {
    console.error('Failed to load user profile:', error);
    document.getElementById("apiPfp").src = '';
  }
}

// Function to apply theme
async function applyTheme(themeName) {
  document.body.className = themeName;
  
  // Save theme preference
  const settings = await loadSettings();
  settings.theme = themeName;
  await saveSettings(settings);
  
  console.log(`Applied theme: ${themeName}`);
}

// Function to get current theme
async function getCurrentTheme() {
  const settings = await loadSettings();
  return settings.theme || 'frappe'; // Default to frappe
}

async function settingsPage() {
  // Get current theme for the selector
  const currentTheme = await getCurrentTheme();
  
  document.getElementById("mainContent").innerHTML = `
    <div class="settings-container">
      <h1>Settings</h1>
      <p>Configure your application preferences below.</p>
      
      <!-- API Settings Section -->
      <div class="settings-section">
        <h2>API Settings</h2>
        <p>Connect your e621 account to enable downloads, favorites, and other account features.</p>
        
        <div class="form-group">
          <label for="usernameInput">Username:</label>
          <input type="text" placeholder="Enter your e621 username" id="usernameInput" class="settings-input">
        </div>
        
        <div class="form-group">
          <label for="apiKeyInput">API Key:</label>
          <input type="password" placeholder="Enter your API key" id="apiKeyInput" class="settings-input">
          <small>You can find your API key in your e621 account settings</small>
        </div>
        
        <div class="button-group">
          <button id="saveAccountButton" class="primary-button">Save Credentials</button>
          <button id="testApiButton" class="secondary-button">Test Connection</button>
        </div>
        
        <div id="apiStatus" class="status-message"></div>
        
        <div class="profile-preview">
          <p>Profile Picture Preview:</p>
          <img id="apiPfp" class="profile-picture" alt="Profile picture will appear here when credentials are valid">
        </div>
      </div>
      
      <!-- Theme Settings Section -->
      <div class="settings-section">
        <h2>Appearance</h2>
        <p>Choose your preferred color theme.</p>
        
        <div class="form-group">
          <label>Theme:</label>
          <div class="theme-radial-menu">
            <div class="theme-option ${currentTheme === 'frappe' ? 'active' : ''}" data-theme="frappe">
              <div class="theme-color-preview frappe-preview frappe"></div>
              <span>Frappé</span>
            </div>
            <div class="theme-option ${currentTheme === 'macchiato' ? 'active' : ''}" data-theme="macchiato">
              <div class="theme-color-preview macchiato-preview macchiato"></div>
              <span>Macchiato</span>
            </div>
            <div class="theme-option ${currentTheme === 'mocha' ? 'active' : ''}" data-theme="mocha">
              <div class="theme-color-preview mocha-preview mocha"></div>
              <span>Mocha</span>
            </div>
            <div class="theme-option ${currentTheme === 'latte' ? 'active' : ''}" data-theme="latte">
              <div class="theme-color-preview latte-preview latte"></div>
              <span>Latte</span>
            </div>
          </div>
        </div>
        
        <div class="theme-preview">
          <p>Theme Preview:</p>
          <div class="theme-preview-box">
            <div class="preview-element">Sample content with current theme</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  highlightSidebarItem("settings");

  // Load existing settings
  const settings = await loadSettings();
  if (settings.username) {
    document.getElementById("usernameInput").value = settings.username;
  }
  if (settings.apiKey) {
    document.getElementById("apiKeyInput").value = settings.apiKey;
    // Try to load profile picture if we have saved credentials
    loadUserProfile(settings.username, settings.apiKey);
  }

  // Apply current theme (this ensures the theme is applied even if the page is loaded directly)
  if (settings.theme) {
    document.body.className = settings.theme;
  }

  // Add event listeners for API settings
  document.getElementById("saveAccountButton").addEventListener("click", async () => {
    const username = document.getElementById("usernameInput").value.trim();
    const apiKey = document.getElementById("apiKeyInput").value.trim();

    if (!username || !apiKey) {
      document.getElementById("apiStatus").innerHTML = '<p style="color: var(--red, #e78284); background: var(--surface0, #414559); padding: 8px 12px; border-radius: 6px;">Please enter both username and API key</p>';
      return;
    }

    const settings = await loadSettings();
    settings.username = username;
    settings.apiKey = apiKey;
    
    await saveSettings(settings);
    document.getElementById("apiStatus").innerHTML = '<p style="color: var(--green, #a6d189); background: var(--surface0, #414559); padding: 8px 12px; border-radius: 6px;">Credentials saved successfully!</p>';
    
    // Check credentials and update UI
    await checkStoredCredentials();
    
    // Clear the status message after 3 seconds
    setTimeout(() => {
      document.getElementById("apiStatus").innerHTML = '';
    }, 3000);
  });

  document.getElementById("testApiButton").addEventListener("click", async () => {
    const username = document.getElementById("usernameInput").value.trim();
    const apiKey = document.getElementById("apiKeyInput").value.trim();

    if (!username || !apiKey) {
      document.getElementById("apiStatus").innerHTML = '<p style="color: var(--red, #e78284); background: var(--surface0, #414559); padding: 8px 12px; border-radius: 6px;">Please enter both username and API key</p>';
      return;
    }

    document.getElementById("apiStatus").innerHTML = '<p style="color: var(--blue, #8caaee); background: var(--surface0, #414559); padding: 8px 12px; border-radius: 6px;">Testing connection...</p>';
    
    const userInfo = await verifyApiKey(username, apiKey);
    if (userInfo) {
      document.getElementById("apiStatus").innerHTML = '<p style="color: var(--green, #a6d189); background: var(--surface0, #414559); padding: 8px 12px; border-radius: 6px;">API connection successful!</p>';
      loadUserProfile(username, apiKey);
      
      // Also check and update the needsAccount elements
      await checkStoredCredentials();
    } else {
      document.getElementById("apiStatus").innerHTML = '<p style="color: var(--red, #e78284); background: var(--surface0, #414559); padding: 8px 12px; border-radius: 6px;">Invalid credentials or connection failed</p>';
      document.getElementById("apiPfp").src = '';
    }
    
    // Clear the status message after 5 seconds
    setTimeout(() => {
      document.getElementById("apiStatus").innerHTML = '';
    }, 5000);
  });

  // Add event listeners for theme selection
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', async (event) => {
      const selectedTheme = event.currentTarget.getAttribute('data-theme');
      
      // Remove active class from all options
      document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
      
      // Add active class to selected option
      event.currentTarget.classList.add('active');
      
      // Apply the theme
      await applyTheme(selectedTheme);
    });
  });
}