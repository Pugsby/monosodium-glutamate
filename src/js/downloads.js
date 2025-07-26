// Downloads functionality

async function downloadPost(post) {
  if (!tauriAvailable) {
    console.log("Downloads not available - not in Tauri environment");
    return;
  }

  try {
    const { mkdir, writeTextFile, writeFile, BaseDirectory } = window.__TAURI__.fs;
    const { appDataDir } = window.__TAURI__.path;
    
    // In Tauri v2, the HTTP API might be different
    // Try both the old and new ways to import fetch
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
    
    // Get the actual paths for debugging
    const appDataPath = await appDataDir();
    console.log("App Data Directory:", appDataPath);
    
    // Use AppData directory - this should be allowed
    const folderName = `downloads/${post.id}`;
    
    console.log(`Creating directory: ${folderName}`);
    await mkdir(folderName, { 
      baseDir: BaseDirectory.AppData, 
      recursive: true 
    });
    
    // Prepare metadata
    const metadataJson = JSON.stringify({
      "id": post.id,
      "tags": post.tags,
      "score": post.score,
      "file": post.file,
      "metadata": {
        "source": "monosodium-glutamate",
        "version": "0.1.0",
        "downloadedAt": new Date().toISOString(),
        "savedTo": `${appDataPath}/${folderName}`
      }
    }, null, 2);
    
    console.log("=== DOWNLOAD DEBUG INFO ===");
    console.log("Post ID:", post.id);
    console.log("Image URL:", post.file.url);
    console.log("Expected file extension:", post.file.ext);
    console.log("Expected file size:", post.file.size);
    
    console.log("Attempting Tauri v2 fetch...");
    
    // Try the Tauri v2 way - different response handling
    const imageResponse = await tauriFetch(post.file.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Monosodium glutamate/1.0 (Pugsby)'
      }
    });
    
    console.log("=== RESPONSE ANALYSIS ===");
    console.log("Response object:", imageResponse);
    console.log("Response status:", imageResponse.status);
    console.log("Response ok:", imageResponse.ok);
    console.log("Response keys:", Object.keys(imageResponse));
    
    // In Tauri v2, we might need to call a method to get the data
    let imageData;
    
    // Try different ways to get the binary data
    if (imageResponse.arrayBuffer) {
      console.log("Trying arrayBuffer method...");
      const buffer = await imageResponse.arrayBuffer();
      imageData = new Uint8Array(buffer);
      console.log("ArrayBuffer method success, length:", imageData.length);
    } else if (imageResponse.bytes) {
      console.log("Using bytes property...");
      imageData = new Uint8Array(imageResponse.bytes);
      console.log("Bytes property success, length:", imageData.length);
    } else if (imageResponse.data) {
      console.log("Using data property...");
      if (imageResponse.data instanceof ArrayBuffer) {
        imageData = new Uint8Array(imageResponse.data);
      } else if (imageResponse.data instanceof Uint8Array) {
        imageData = imageResponse.data;
      } else if (Array.isArray(imageResponse.data)) {
        imageData = new Uint8Array(imageResponse.data);
      } else {
        imageData = new Uint8Array(imageResponse.data);
      }
      console.log("Data property success, length:", imageData.length);
    } else if (imageResponse.body) {
      console.log("Using body property...");
      if (typeof imageResponse.body === 'string') {
        // If it's a base64 string or similar
        const binaryString = atob(imageResponse.body);
        imageData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageData[i] = binaryString.charCodeAt(i);
        }
      } else {
        imageData = new Uint8Array(imageResponse.body);
      }
      console.log("Body property success, length:", imageData.length);
    } else {
      throw new Error("Could not find response data in any expected location");
    }
    
    console.log("Final image data:");
    console.log("- Length:", imageData.length);
    console.log("- First 10 bytes:", Array.from(imageData.slice(0, 10)));
    
    if (imageData.length === 0) {
      throw new Error("Image data is empty");
    }
    
    if (imageData.length !== post.file.size) {
      console.warn(`Size mismatch: expected ${post.file.size}, got ${imageData.length}`);
    }
    
    // Get file extension
    const fileExt = post.file.ext || 'jpg';
    const imageFileName = `${folderName}/image.${fileExt}`;
    const metadataFileName = `${folderName}/metadata.json`;
    
    console.log("=== WRITING FILES ===");
    console.log("Writing image to:", imageFileName);
    
    // Write the files
    await writeFile(imageFileName, imageData, { 
      baseDir: BaseDirectory.AppData 
    });
    console.log("Image file written successfully");
    
    await writeTextFile(metadataFileName, metadataJson, { 
      baseDir: BaseDirectory.AppData 
    });
    console.log("Metadata file written successfully");
    
    const fullPath = `${appDataPath}/downloads/${post.id}`;
    console.log(`Files saved to: ${fullPath}`);
    alert(`Post ${post.id} downloaded successfully!\nSaved to: ${fullPath}\nFile size: ${imageData.length} bytes`);
    
  } catch (error) {
    console.error('=== DOWNLOAD FAILED ===');
    console.error('Error:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    alert(`Download failed: ${error?.message || 'Unknown error'}\nCheck the console for detailed debug info.`);
  }
}

async function openDownloadsPage() {
  highlightSidebarItem("downloads");

  // Remove the search scroll event listener if it exists
  if (scrollEventListener) {
    window.removeEventListener("scroll", scrollEventListener);
    scrollEventListener = null;
  }

  document.getElementById("mainContent").innerHTML = `
    <h2>Downloaded Posts</h2>
    <div class="searchResults"><p>Loading downloads...</p></div>
  `;

  try {
    // Get the required functions from the Tauri API
    const { readDir, readTextFile, BaseDirectory } = window.__TAURI__.fs;
    const { appDataDir } = window.__TAURI__.path;

    // First, check if the downloads directory exists and get its contents
    const downloadsDir = await readDir("downloads", { baseDir: BaseDirectory.AppData });
    
    // Get the absolute path to the AppData directory. We'll need this to create asset URLs.
    const appDataPath = await appDataDir();

    const allPosts = [];

    for (const postFolder of downloadsDir) {
      if (postFolder.children) continue; // skip nested dirs, if any

      const postId = postFolder.name;
      const metaPath = `downloads/${postId}/metadata.json`;

      try {
        const metadataStr = await readTextFile(metaPath, { baseDir: BaseDirectory.AppData });
        const metadata = JSON.parse(metadataStr);
        allPosts.push(metadata);
      } catch (e) {
        console.warn(`Failed to load metadata for post ${postId}:`, e);
      }
    }

    if (allPosts.length === 0) {
      document.querySelector(".searchResults").innerHTML = "<p>No downloaded posts found.</p>";
    } else {
      // Pass the list of posts AND the appDataPath to the display function
      displayDownloadedPosts(allPosts, appDataPath);
    }
  } catch (err) {
    // This error often means the "downloads" directory doesn't exist.
    if (err.includes("os error 2") || err.includes("path not found")) {
        document.querySelector(".searchResults").innerHTML = "<p>You haven't downloaded any posts yet.</p>";
    } else {
        console.error("Failed to read downloads:", err);
        document.querySelector(".searchResults").innerHTML = "<p>Error loading downloads. Check console.</p>";
    }
  }
}

async function displayDownloadedPosts(posts) {
  const container = document.querySelector(".searchResults");
  container.innerHTML = `<div class="resultsGrid"></div>`;
  const grid = container.querySelector(".resultsGrid");

  // Process posts one by one to load their images
  for (const post of posts) {
    const imageFilePath = `downloads/${post.id}/image.${post.file.ext}`;
    const artistTag = post.tags.artist?.[0] || "Unknown";

    // Get the data URI for the image
    const dataUri = await getImageDataUri(imageFilePath);

    const postHtml = document.createElement("div");
    postHtml.className = "searchResult";
    postHtml.setAttribute("onclick", `openLocalPost('${post.id}')`);
    postHtml.innerHTML = `
      <div class="resultHeader">
        <span class="artistName">@${artistTag}</span>
        <span class="dateText">Downloaded ${new Date(post.metadata.downloadedAt).toLocaleDateString()}</span>
      </div>
      <img src="${dataUri}" alt="Downloaded Post ${post.id}" loading="lazy" />
      <div class="tagContainer">
        ${post.tags.general.slice(0, 4).map(tag => `<div class="tag">${tag}</div>`).join('')}
      </div>
    `;
    grid.appendChild(postHtml);
  }
}

async function openLocalPost(postId) {
  document.getElementById("mainContent").innerHTML = "Loading...";

  try {
    const { readTextFile, BaseDirectory } = window.__TAURI__.fs;
    const metadataStr = await readTextFile(`downloads/${postId}/metadata.json`, {
      baseDir: BaseDirectory.AppData
    });
    const post = JSON.parse(metadataStr);

    // Build image file path
    const imageFilePath = `downloads/${postId}/image.${post.file.ext}`;

    // Get data URI of the image
    const dataUri = await getImageDataUri(imageFilePath);

    // Override file.url with data URI
    post.file.url = dataUri;

    displayLocalPost(post);
  } catch (err) {
    console.error("Failed to load local post:", err);
    document.getElementById("mainContent").innerHTML = "<p>Error loading post.</p>";
  }
}

function displayLocalPost(post) {
  const html = `
    <div class="postView">
      <div class="buttonsAndImage">
        <img src="${post.file.url}" alt="Post ${post.id}" />
      </div>
      <div class="postInfo">
        <h3>Post #${post.id} (Local)</h3>
        <p>Score: ${post.score.total}</p>
        <p>Tags: <div class="tag">${post.tags.general.join('</div>, <div class="tag">')}</div></p>
      </div>
    </div>
  `;
  document.getElementById("mainContent").innerHTML = html;
}

async function getImageDataUri(filePath) {
  try {
    const { readFile, BaseDirectory } = window.__TAURI__.fs;

    // Use relative path with baseDir AppData (no leading slash)
    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

    console.log("Reading file at relative path:", relativePath);

    const fileData = await readFile(relativePath, { baseDir: BaseDirectory.AppData });
    const bytes = fileData;

    if (!bytes) {
      console.error("No bytes returned from readFile for", relativePath);
      return '';
    }

    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }

    const base64String = btoa(binary);

    const ext = relativePath.split('.').pop().toLowerCase();
    let mimeType = 'image/jpeg';

    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'webp') mimeType = 'image/webp';
    else if (ext === 'bmp') mimeType = 'image/bmp';

    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    console.error('Failed to read image file for data URI:', error);
    return '';
  }
}