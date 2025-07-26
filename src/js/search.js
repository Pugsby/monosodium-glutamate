// Search functionality

// Updated search function that uses stored credentials if available
async function searchPosts(tags, page = 1, limit = 20) {
  try {
    const credentials = await getStoredCredentials();
    const encodedTags = encodeURIComponent(tags);
    const url = `https://e621.net/posts.json?tags=${encodedTags}&page=${page}&limit=${limit}`;
    
    console.log("Searching with URL:", url);
    
    const headers = {
      'User-Agent': 'Monosodium glutamate/1.0 (Pugsby)'
    };

    // Add auth header if we have credentials
    if (credentials.username && credentials.apiKey) {
      headers['Authorization'] = `Basic ${btoa(credentials.username + ':' + credentials.apiKey)}`;
      console.log('Using authenticated request');
    }
    
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
        // Fallback to regular fetch if Tauri is not available
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
    console.error('Error searching posts:', error);
    return null;
  }
}

// Function to display search results in a grid
function displaySearchResults(posts) {
  const resultsContainer = document.querySelector(".searchResults");
  
  if (!posts || posts.length === 0) {
    resultsContainer.innerHTML = "<p>No results found.</p>";
    return;
  }
  
  // Create HTML for each post - similar to table construction in Lua
  let html = '<div class="resultsGrid">';
  
  // Loop through posts (like ipairs in Lua)
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    
    // Get preview image URL (smaller version)
    const previewUrl = post.preview?.url || post.file?.url;
    const score = post.score?.total || 0;
    
    // Build HTML string (like string concatenation in Lua)
    const artistTag = post.tags.artist?.[0] || "Unknown";

    html += `
      <div class="searchResult" onclick="openPost(${post.id})">
        <div class="resultHeader">
          <span class="artistName">@${artistTag}</span>
          <span class="dateText">Created ${new Date(post.created_at).toLocaleDateString()}</span>
        </div>
      <img src="${previewUrl}" alt="Post ${post.id}" loading="lazy" />
      <div class="tagContainer">
        ${post.tags.general.slice(0, 4).map(tag => `<div class="tag">${tag}</div>`).join('')}
      </div>
    </div>
  `;

  }
  
  html += '</div>';
  resultsContainer.innerHTML = html;
}

function searchPage() {
  document.getElementById("mainContent").innerHTML = `
  <div class="searchBar" contenteditable='true' id="searchInput" placeholder="Enter tags to search..."></div>
  <button id="searchButton"><div></div></button>
  <div class="searchResults"></div>
  `;
  
  // Remove any existing scroll event listener
  if (scrollEventListener) {
    window.removeEventListener("scroll", scrollEventListener);
  }
  
  // Add event listeners for search functionality
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  
  // Search when button is clicked
  searchButton.addEventListener("click", () => {
    const searchTags = searchInput.textContent.trim();
    if (searchTags) {
      search(searchTags);
    }
  });
  
  // Search when Enter key is pressed
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const searchTags = searchInput.textContent.trim();
      if (searchTags) {
        search(searchTags);
      }
    }
  });
  
  // Create a new scroll event listener
  scrollEventListener = () => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;

    if (nearBottom && !loadingMore && !noMoreResults) {
      console.log("Near bottom, loading more results...");
      search(currentSearchTags, currentSearchPage, true);
    }
  };
  
  // Add the scroll event listener
  window.addEventListener("scroll", scrollEventListener);
  
  highlightSidebarItem("search");
}

// Updated search function that actually works
function appendSearchResults(posts) {
  const grid = document.querySelector(".resultsGrid");

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const previewUrl = post.preview?.url || post.file?.url;
    const score = post.score?.total || 0;
    const artistTag = post.tags.artist?.[0] || "Unknown";

    const postHtml = document.createElement("div");
    postHtml.className = "searchResult";
    postHtml.setAttribute("onclick", `openPost(${post.id})`);
    postHtml.innerHTML = `
      <div class="resultHeader">
        <span class="artistName">@${artistTag}</span>
        <span class="dateText">Created ${new Date(post.created_at).toLocaleDateString()}</span>
      </div>
      <img src="${previewUrl}" alt="Post ${post.id}" loading="lazy" />
      <div class="tagContainer">
        ${post.tags.general.slice(0, 4).map(tag => `<div class="tag">${tag}</div>`).join('')}
      </div>
    `;

    grid.appendChild(postHtml);
  }
}

async function search(value, page = 1, append = false) {
  console.log(`Searching for: "${value}" (page ${page})`);

  const resultsContainer = document.querySelector(".searchResults");

  if (!append) {
    resultsContainer.innerHTML = "<p>Searching...</p>";
    currentSearchTags = value;
    currentSearchPage = 1;
    noMoreResults = false;
  } else {
    loadingMore = true;
  }

  try {
    const posts = await searchPosts(value, page);

    if (posts && posts.length > 0) {
      if (!append) {
        displaySearchResults(posts);
      } else {
        appendSearchResults(posts);
      }

      currentSearchPage++;
    } else {
      if (append) {
        console.log("No more results to load.");
        noMoreResults = true;
      } else {
        resultsContainer.innerHTML = "<p>No results found.</p>";
      }
    }
  } catch (error) {
    console.error("Search error:", error);
    if (!append) {
      resultsContainer.innerHTML = "<p>Search error. Check console for details.</p>";
    }
  }

  loadingMore = false;
}

async function getPostInfo(postId) {
  try {
    const credentials = await getStoredCredentials();
    const headers = {
      'User-Agent': 'Monosodium glutamate/1.0 (Pugsby)'
    };

    // Add auth header if we have credentials
    if (credentials.username && credentials.apiKey) {
      headers['Authorization'] = `Basic ${btoa(credentials.username + ':' + credentials.apiKey)}`;
    }

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
        // Fallback to regular fetch if Tauri is not available
        tauriFetch = fetch;
      }
    }

    const response = await tauriFetch(`https://e621.net/posts/${postId}.json`, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.post; // The actual post object
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

async function openPost(pid) {
  document.getElementById("mainContent").innerHTML = "Loading...";
  console.log("PID:" + pid);
  
  const post = await getPostInfo(pid);
  if (post) {
    console.log("Post data:", post);
    // Now you can access post.file.url, post.tags, post.description, etc.
    displayPost(post);
  } else {
    document.getElementById("mainContent").innerHTML = "Error loading post";
  }
}