// Favorites functionality

// Function to get user favorites
async function getUserFavorites(page = 1, limit = 20) {
  try {
    const credentials = await getStoredCredentials();
    
    if (!credentials.username || !credentials.apiKey) {
      console.log("No credentials available for favorites");
      return null;
    }

    const url = `https://e621.net/favorites.json?page=${page}&limit=${limit}`;
    
    const headers = {
      'User-Agent': 'Monosodium glutamate/1.0 (Pugsby)',
      'Authorization': `Basic ${btoa(credentials.username + ':' + credentials.apiKey)}`
    };
    
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
        tauriFetch = fetch;
      }
    }
    
    const response = await tauriFetch(url, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.posts;
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return null;
  }
}

// Function to add a post to favorites
async function addToFavorites(postId) {
  try {
    const credentials = await getStoredCredentials();
    
    if (!credentials.username || !credentials.apiKey) {
      console.log("No credentials available for adding favorites");
      return false;
    }

    const url = `https://e621.net/favorites.json`;
    
    const headers = {
      'User-Agent': 'Monosodium glutamate/1.0 (Pugsby)',
      'Authorization': `Basic ${btoa(credentials.username + ':' + credentials.apiKey)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    
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
        tauriFetch = fetch;
      }
    }
    
    const response = await tauriFetch(url, {
      method: 'POST',
      headers: headers,
      body: `post_id=${postId}`
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log(`Post ${postId} added to favorites`);
    return true;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return false;
  }
}

// Function to remove a post from favorites
async function removeFromFavorites(postId) {
  try {
    const credentials = await getStoredCredentials();
    
    if (!credentials.username || !credentials.apiKey) {
      console.log("No credentials available for removing favorites");
      return false;
    }

    const url = `https://e621.net/favorites/${postId}.json`;
    
    const headers = {
      'User-Agent': 'Monosodium glutamate/1.0 (Pugsby)',
      'Authorization': `Basic ${btoa(credentials.username + ':' + credentials.apiKey)}`
    };
    
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
        tauriFetch = fetch;
      }
    }
    
    const response = await tauriFetch(url, {
      method: 'DELETE',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log(`Post ${postId} removed from favorites`);
    return true;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return false;
  }
}

async function isPostFavorited(postId) {
  try {
    // First check if we have credentials
    const credentials = await getStoredCredentials();
    if (!credentials.username || !credentials.apiKey) {
      return false;
    }

    // Get the first page of favorites (most recent)
    const favorites = await getUserFavorites(1, 100); // Get first 100 favorites
    
    // Check if our post exists in the favorites
    return favorites.some(post => post.id === postId);
    
  } catch (error) {
    console.error('Error checking if post is favorited:', error);
    return false;
  }
}

// Updated displayPost function to include the favorite button
async function displayPost(post) {
  // Check if the post is already favorited
  const isFavorited = await isPostFavorited(post.id);
  var pimg = post.file.url;
  if (!tauriAvailable) {
    pimg = post.preview.url;
  }
  const html = `
    <div class="postView">
      <div class="buttonsAndImage">
        <img src="${pimg}" alt="Post ${post.id}" />
        <div class="postButtons">
          <div class="button" id="downloadBtn">
            <div class="icon downloadIcon"></div>
            <p>Download</p>
          </div>
          <div class="button needsAccount ${isFavorited ? 'accountVerified' : ''}" id="favoriteBtn">
            <div class="icon favoriteIcon ${isFavorited ? 'favorited' : ''}"></div>
            <p>${isFavorited ? 'Unfavorite' : 'Favorite'}</p>
          </div>
        </div>
      </div>
      <div class="postInfo">
        <h3>Post #${post.id}</h3>
        <p>Score: ${post.score.total}</p>
        <p>Tags: <div class="tag">${post.tags.general.join('</div>, <div class="tag">')}</div></p>
      </div>
    </div>
  `;
  document.getElementById("mainContent").innerHTML = html;
  
  // Add event listener for the download button
  document.getElementById("downloadBtn").addEventListener("click", () => {
    downloadPost(post);
  });
  
  // Add event listener for the favorite button
  const favoriteBtn = document.getElementById("favoriteBtn");
  if (favoriteBtn) {
    favoriteBtn.addEventListener("click", async () => {
      const icon = favoriteBtn.querySelector('.favoriteIcon');
      const text = favoriteBtn.querySelector('p');

      if (icon.classList.contains('favorited')) {
        // Remove from favorites
        const success = await removeFromFavorites(post.id);
        if (success) {
          icon.classList.remove('favorited');
          text.textContent = 'Favorite';
          console.log("Post unfavorited.");
        }
      } else {
        // Add to favorites
        const success = await addToFavorites(post.id);
        if (success) {
          icon.classList.add('favorited');
          text.textContent = 'Unfavorite';
          console.log("Post favorited.");
        }
      }
    });
  }
  
  // Check credentials on page load to hide/show the favorite button
  checkStoredCredentials();
}

// Function to display user favorites
async function favoritesPage() {
  highlightSidebarItem("favorites");

  document.getElementById("mainContent").innerHTML = `
    <h2>Your Favorites</h2>
    <div class="searchResults"><p>Loading favorites...</p></div>
  `;

  try {
    const favorites = await getUserFavorites();
    if (favorites && favorites.length > 0) {
      displaySearchResults(favorites);
    } else {
      document.querySelector(".searchResults").innerHTML = "<p>You have no favorites yet.</p>";
    }
  } catch (error) {
    console.error("Error fetching favorites:", error);
    document.querySelector(".searchResults").innerHTML = "<p>Error loading favorites. Please ensure you are logged in and your API key is correct.</p>";
  }
}