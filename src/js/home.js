// Home page functionality
function home() {
  document.getElementById("mainContent").innerHTML = ""
  document.getElementById("mainContent").innerHTML += `
  <h1>Welcome to Monosodium glutamate.</h1>
  <p>This is a web-based client for the e621 API, allowing you to search for and download posts from e621.net.</p>
  <p>The home page is still in early development, so be patient until I finish it (probably v2)</p>
  <p>Please report any bugs or issues on the GitHub repository.</p>
  <p>Please make a pull request if you want to contribute.</p>
  <p>I have a mockup of the home page here:</p>
  <img src="images/homePreview.png" alt="Home page mockup" width="80%">
  <p>Tags and plugin support are coming soon.</p>
  `
  highlightSidebarItem("homeButton")
}