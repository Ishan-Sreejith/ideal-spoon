// app.js

// WARNING: Placing your API key directly in client-side JavaScript (like this)
// exposes it to anyone who views your page source. For production applications,
// it's highly recommended to use a backend server to proxy your API requests
// so your API key remains hidden and secure.
const chatApiKey = 'AIzaSyCAb8_F8si1N9496ig2zdQx67JyWgMKLx0'; // REPLACE THIS WITH YOUR ACTUAL API KEY FROM GOOGLE AI STUDIO FOR CHAT
const videoApiKey = 'AIzaSyBPHd2fpY64UEOGuX1q6FWWnS6k7DBokCo'; // REPLACE THIS WITH YOUR ACTUAL API KEY FOR YOUTUBE

document.addEventListener('DOMContentLoaded', () => {
    // --- Global Elements and Bootstrap Tab Initialization ---
    // Get Bootstrap tab elements for event listeners
    const newsTabButton = document.getElementById('news-tab');
    const chatTabButton = document.getElementById('chat-tab');
    const videosTabButton = document.getElementById('videos-tab');
    const creditsTabButton = document.getElementById('credits-tab');
    const bookmarksTabButton = document.getElementById('bookmarks-tab'); // NEW

    // --- Chat Specific Elements ---
    const chatLog = document.getElementById('chat-log');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    // const chatInputBar = document.getElementById('chat-input-bar'); // Not directly used in JS logic

    // --- News Specific Elements ---
    const newsQueryInput = document.getElementById("news-query");
    const searchNewsButton = document.getElementById("search-news-button");
    const newsCategoryButtons = document.getElementById("news-category-buttons");
    const newsArticlesContainer = document.getElementById("news-articles");
    const newsErrorMessage = document.getElementById("news-error-message");

    // --- Video Specific Elements ---
    const videoSearchBtn = document.getElementById('search-videos-button');
    const videoQueryInput = document.getElementById('video-query');
    const videoResults = document.getElementById('video-results');
    const videoErrorMsg = document.getElementById('video-error-message');

    // --- Bookmarks Specific Elements --- // NEW
    const bookmarkedItemsContainer = document.getElementById('bookmarked-items');
    const bookmarksErrorMessage = document.getElementById('bookmarks-error-message'); // Not currently used, but good to have

    // --- Chat Logic ---

    /**
     * Appends a new message to the chat log and scrolls to the bottom.
     * @param {string} sender - 'user' or 'model'.
     * @param {string} text - The message content.
     */
    function appendMessage(sender, text) {
        if (!chatLog) {
            console.error('Error: chatLog element not found, cannot append message!');
            return null;
        }

        const div = document.createElement('div');
        div.classList.add('message', sender, 'p-2', 'rounded-3', 'mb-2', 'shadow-sm');
        
        if (sender === 'user') {
            div.classList.add('bg-primary', 'text-white', 'ms-auto'); // User messages: primary background, white text, align right
        } else { // 'model'
            div.classList.add('bg-secondary', 'text-dark', 'me-auto'); // Model messages: secondary background, dark text, align left
        }
        div.textContent = text;
        
        chatLog.appendChild(div);
        
        setTimeout(() => {
            if (chatLog) {
                chatLog.scrollTop = chatLog.scrollHeight;
            }
        }, 0); 

        return div;
    }

    /**
     * Handles sending a chat message to the Gemini API.
     */
    async function sendChatMessage() {
        const message = userInput.value.trim();

        if (!message) {
            return; // Don't send empty messages
        }

        appendMessage('user', message); // Display user's message immediately
        userInput.value = ''; // Clear input field

        // Disable input and button while waiting for response
        userInput.disabled = true;
        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';

        const loadingMessageDiv = appendMessage('model', 'Typing...'); // Display "Typing..." indicator

        try {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${chatApiKey}`;
            const payload = { contents: [{ parts: [{ text: message }] }] };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            // Remove the loading message before displaying actual response
            if (loadingMessageDiv && chatLog.contains(loadingMessageDiv)) {
                chatLog.removeChild(loadingMessageDiv);
            }

            if (!response.ok) { // Check for non-2xx HTTP status codes
                console.error('Gemini API Error (Status: ' + response.status + '):', data);
                appendMessage('model', `Error: ${data.error?.message || 'Could not get a response from Gemini.'}`);
            } else if (data.candidates && data.candidates.length > 0 &&
                       data.candidates[0].content && data.candidates[0].content.parts &&
                       data.candidates[0].content.parts.length > 0) {
                appendMessage('model', data.candidates[0].content.parts[0].text);
            } else {
                console.error('Unexpected Gemini API response structure:', data);
                appendMessage('model', 'Error: Unexpected response from Gemini.');
            }

        } catch (error) {
            console.error('Network or Fetch Error during chat:', error);
            if (loadingMessageDiv && chatLog.contains(loadingMessageDiv)) {
                chatLog.removeChild(loadingMessageDiv);
            }
            appendMessage('model', 'Error: Could not connect to the API. Check your internet connection or server.');
        } finally {
            // Re-enable UI elements
            userInput.disabled = false;
            sendButton.disabled = false;
            sendButton.textContent = 'Send';
            userInput.focus(); // Focus input field for next message
        }
    }

    // Event listeners for sending chat messages
    if (sendButton) {
        sendButton.addEventListener('click', sendChatMessage);
    }
    if (userInput) {
        userInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default form submission
                sendChatMessage();
            }
        });
    }

    // --- Bookmark Logic --- // NEW SECTION

    /**
     * Retrieves all bookmarks from localStorage.
     * @returns {Array} An array of bookmarked items.
     */
    function getBookmarks() {
        try {
            const bookmarks = localStorage.getItem('idealSpoonBookmarks');
            return bookmarks ? JSON.parse(bookmarks) : [];
        } catch (e) {
            console.error("Error parsing bookmarks from localStorage:", e);
            return [];
        }
    }

    /**
     * Saves a bookmark to localStorage.
     * @param {Object} item - The item to bookmark (news article or video). Must have id and type.
     */
    function saveBookmark(item) {
        if (!item || !item.id || !item.type) {
            console.error("Attempted to save invalid bookmark item:", item);
            return;
        }
        const bookmarks = getBookmarks();
        // Prevent duplicates
        if (!bookmarks.some(b => b.id === item.id && b.type === item.type)) {
            bookmarks.push(item);
            localStorage.setItem('idealSpoonBookmarks', JSON.stringify(bookmarks));
            console.log("Bookmark saved:", item);
        } else {
            console.log("Item already bookmarked:", item);
        }
    }

    /**
     * Removes a bookmark from localStorage.
     * @param {string} id - The unique ID of the item.
     * @param {string} type - The type of item ('news' or 'video').
     */
    function removeBookmark(id, type) {
        let bookmarks = getBookmarks();
        const initialLength = bookmarks.length;
        bookmarks = bookmarks.filter(b => !(b.id === id && b.type === type));
        if (bookmarks.length < initialLength) {
            localStorage.setItem('idealSpoonBookmarks', JSON.stringify(bookmarks));
            console.log("Bookmark removed:", id, type);
        } else {
            console.log("Bookmark not found for removal:", id, type);
        }
    }

    /**
     * Checks if an item is bookmarked.
     * @param {string} id - The unique ID of the item.
     * @param {string} type - The type of item ('news' or 'video').
     * @returns {boolean} True if bookmarked, false otherwise.
     */
    function isBookmarked(id, type) {
        const bookmarks = getBookmarks();
        return bookmarks.some(b => b.id === id && b.type === type);
    }

    /**
     * Renders all bookmarked items in the bookmarks tab.
     */
    function displayBookmarks() {
        bookmarkedItemsContainer.innerHTML = ''; // Clear previous content
        bookmarksErrorMessage.classList.add('d-none'); // Hide any previous error

        const bookmarks = getBookmarks();

        if (bookmarks.length === 0) {
            bookmarkedItemsContainer.innerHTML = `
                <p class="text-center text-muted mt-5">No bookmarks yet. Add news articles or videos to your bookmarks!</p>
            `;
            return;
        }

        // Create a temporary container for improved performance when appending many elements
        const fragment = document.createDocumentFragment();

        bookmarks.forEach(item => {
            let itemHtml = '';
            const isItemBookmarked = true; // Always true for items displayed here, as they ARE bookmarks

            if (item.type === 'news') {
                const title = item.title?.trim() || 'No Title Available';
                const summary = item.summary?.trim() || 'No summary available.';
                const articleUrl = item.url?.trim() || '#';
                const imageUrl = (item.urlToImage && item.urlToImage.startsWith('http'))
                               ? item.urlToImage
                               : 'https://placehold.co/400x200/e0e0e0/555555?text=No+Image';

                itemHtml = `
                    <div class="news-item card mb-3 shadow-sm" data-id="${item.id}" data-type="${item.type}">
                        <div class="row g-0">
                            <div class="col-md-4">
                                <img src="${imageUrl}" class="img-fluid rounded-start news-img" alt="${title}" onerror="this.onerror=null;this.src='https://placehold.co/400x200/e0e0e0/555555?text=No+Image';">
                            </div>
                            <div class="col-md-8">
                                <div class="card-body text-start">
                                    <h5 class="card-title">${title}</h5>
                                    <p class="card-text">${summary}</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <a href="${articleUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-link p-0 text-decoration-none">
                                            Read more
                                            <i class="fas fa-external-link-alt ms-1"></i>
                                        </a>
                                        <button class="btn btn-link bookmark-toggle-btn p-0" data-id="${item.id}" data-type="${item.type}" aria-label="Remove from bookmarks">
                                            <i class="${isItemBookmarked ? 'fas' : 'far'} fa-heart text-danger"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (item.type === 'video') {
                const videoId = item.id;
                const videoTitle = item.title;
                // You might need to save thumbnailUrl when bookmarking for consistent display
                // For now, it will just show the iframe
                
                itemHtml = `
                    <div class="video-item card mb-3 shadow-sm" data-id="${videoId}" data-type="${item.type}">
                        <div class="card-body text-center">
                            <h5 class="card-title">${videoTitle}</h5>
                            <div class="embed-responsive embed-responsive-16by9 mx-auto" style="max-width: 400px; margin-bottom: 10px;">
                                <iframe 
                                  class="embed-responsive-item"
                                  src="http://www.youtube.com/embed/${videoId}" 
                                  title="${videoTitle}" 
                                  allowfullscreen 
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  loading="lazy"></iframe>
                            </div>
                            <button class="btn btn-link bookmark-toggle-btn p-0" data-id="${videoId}" data-type="${item.type}" aria-label="Remove from bookmarks">
                                <i class="${isItemBookmarked ? 'fas' : 'far'} fa-heart text-danger"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
            if (itemHtml) {
                const div = document.createElement('div');
                div.innerHTML = itemHtml;
                fragment.appendChild(div.firstElementChild); // Append the actual card/div element
            }
        });
        bookmarkedItemsContainer.appendChild(fragment);

        // Attach event listeners to the new bookmark toggle buttons in the bookmarks tab
        // These will ONLY remove bookmarks and re-render the list
        bookmarkedItemsContainer.querySelectorAll('.bookmark-toggle-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const id = button.dataset.id;
                const type = button.dataset.type;
                removeBookmark(id, type);
                displayBookmarks(); // Re-render the bookmarks list after removal
            });
        });
    }


    // --- News Logic (MODIFIED to include bookmark button) ---

    /**
     * Fetches and displays news articles from the backend based on query or category.
     * @param {string} query - Search keywords.
     * @param {string} category - News category. Defaults to 'general'.
     */
    async function fetchNews(query = '', category = 'general') {
        newsErrorMessage.classList.add('d-none');
        newsErrorMessage.textContent = '';

        // Only set loading if it's not the initial placeholder already in HTML AND no query/category is active
        if (newsArticlesContainer.innerHTML.trim() === '<p class="text-center text-muted mt-5">Search for news or select a category to get summaries.</p>' && !query && category === 'general') {
            // Do nothing if it's the default placeholder and no action taken yet
        } else {
             newsArticlesContainer.innerHTML = `
                <div class="d-flex flex-column justify-content-center align-items-center mt-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="ms-2 text-muted mt-2">Loading and summarizing news...</p>
                </div>
            `;
        }

        try {
            const url = query ? `/news?query=${encodeURIComponent(query)}` : `/news?category=${encodeURIComponent(category)}`;
            const response = await fetch(url);

            console.log("News fetch: Frontend received raw response from backend:", response);

            if (!response.ok) {
                const errorData = await response.json();
                console.error("News fetch: Failed from backend. Status:", response.status, "Error:", errorData.error);
                newsArticlesContainer.innerHTML = '';
                newsErrorMessage.classList.remove('d-none');
                newsErrorMessage.innerHTML = `
                    <strong>Error!</strong> Failed to load news. Server responded with status ${response.status}: ${errorData.error || 'Unknown error'}.
                    <br>Please ensure your Node.js server is running and configured correctly (check .env file for API keys).
                `;
                return;
            }

            const data = await response.json();
            console.log("News fetch: Frontend received parsed data from backend:", data);

            newsArticlesContainer.innerHTML = "";

            if (data.articles && data.articles.length > 0) {
                // Create a temporary container for improved performance
                const fragment = document.createDocumentFragment();

                data.articles.forEach(article => {
                    const title = article.title?.trim() || 'No Title Available';
                    const summary = article.summary?.trim() || article.description?.trim() || 'No summary available.';
                    const articleUrl = article.url?.trim() || '#';
                    const imageUrl = (article.urlToImage && article.urlToImage.startsWith('http'))
                                   ? article.urlToImage
                                   : 'https://placehold.co/400x200/e0e0e0/555555?text=No+Image';
                    
                    // Use URL as unique ID for news articles
                    const uniqueId = article.url; 
                    const bookmarked = isBookmarked(uniqueId, 'news');

                    const newsItemDiv = document.createElement("div");
                    newsItemDiv.className = "news-item card mb-3 shadow-sm";
                    newsItemDiv.innerHTML = `
                        <div class="row g-0">
                            <div class="col-md-4">
                                <img src="${imageUrl}" class="img-fluid rounded-start news-img" alt="${title}" onerror="this.onerror=null;this.src='https://placehold.co/400x200/e0e0e0/555555?text=No+Image';">
                            </div>
                            <div class="col-md-8">
                                <div class="card-body text-start">
                                    <h5 class="card-title">${title}</h5>
                                    <p class="card-text">${summary}</p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <a href="${articleUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-link p-0 text-decoration-none">
                                            Read more
                                            <i class="fas fa-external-link-alt ms-1"></i>
                                        </a>
                                        <button class="btn btn-link bookmark-toggle-btn p-0" data-id="${uniqueId}" data-type="news" aria-label="${bookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}">
                                            <i class="${bookmarked ? 'fas' : 'far'} fa-heart text-danger"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    fragment.appendChild(newsItemDiv);
                });
                newsArticlesContainer.appendChild(fragment);

                // Attach event listeners to the new bookmark toggle buttons
                newsArticlesContainer.querySelectorAll('.bookmark-toggle-btn').forEach(button => {
                    button.addEventListener('click', handleBookmarkToggle);
                });

            } else {
                newsArticlesContainer.innerHTML = `
                    <p class="text-center text-muted mt-5">No news articles found for "${query || category}". Try different keywords or categories.</p>
                `;
            }

        } catch (err) {
            console.error("News fetch: Network or unexpected error:", err);
            newsArticlesContainer.innerHTML = '';
            newsErrorMessage.classList.remove('d-none');
            newsErrorMessage.innerHTML = `
                <strong>Network Error!</strong> Failed to connect to the news server. Please ensure your Node.js server is running.
            `;
        }
    }

    // --- Event Listeners for News Section (UNCHANGED) ---
    if (searchNewsButton) {
        searchNewsButton.addEventListener('click', () => fetchNews(newsQueryInput.value.trim()));
    }

    if (newsQueryInput) {
        newsQueryInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                fetchNews(newsQueryInput.value.trim());
            }
        });
    }

    if (newsCategoryButtons) {
        newsCategoryButtons.addEventListener('click', (event) => {
            if (event.target.tagName === 'BUTTON' && event.target.dataset.category) {
                newsQueryInput.value = ''; // Clear search query when category is selected
                fetchNews('', event.target.dataset.category);
            }
        });
    }

    // --- Videos Tab: Youtube & Display (MODIFIED to include bookmark button) ---

    async function searchYouTubeVideos(query) {
        videoErrorMsg.classList.add('d-none');
        videoResults.innerHTML = '<p class="text-center text-muted">Loading videos...</p>';

        if (!query.trim()) {
            videoErrorMsg.textContent = 'Please enter a search term.';
            videoErrorMsg.classList.remove('d-none');
            videoResults.innerHTML = '';
            return;
        }

        try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=4&type=video&q=${encodeURIComponent(query)}&key=${videoApiKey}`;

            const res = await fetch(url);
            const data = await res.json();

            if (res.status !== 200) {
                videoErrorMsg.textContent = data.error?.message || 'YouTube API error.';
                videoErrorMsg.classList.remove('d-none');
                videoResults.innerHTML = '';
                return;
            }

            if (!data.items || data.items.length === 0) {
                videoErrorMsg.textContent = 'No videos found for this search.';
                videoErrorMsg.classList.remove('d-none');
                videoResults.innerHTML = '';
                return;
            }

            videoResults.innerHTML = ''; // Clear previous results

            // Create a temporary container for improved performance
            const fragment = document.createDocumentFragment();

            // Create iframe embeds for each video (max 4)
            data.items.forEach(item => {
                const videoId = item.id.videoId;
                const videoTitle = item.snippet.title;
                const thumbnailUrl = item.snippet.thumbnails.high.url; // Get high quality thumbnail

                const bookmarked = isBookmarked(videoId, 'video');

                const videoDiv = document.createElement('div');
                videoDiv.classList.add('video-item', 'card', 'mb-3', 'shadow-sm', 'text-center'); // Added Bootstrap card classes
                videoDiv.title = videoTitle;

                videoDiv.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">${videoTitle}</h5>
                        <div class="embed-responsive embed-responsive-16by9 mx-auto" style="max-width: 400px; margin-bottom: 10px;">
                            <iframe 
                              class="embed-responsive-item"
                              src="http://www.youtube.com/embed/${videoId}" 
                              title="${videoTitle}" 
                              allowfullscreen 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              loading="lazy"></iframe>
                        </div>
                        <button class="btn btn-link bookmark-toggle-btn p-0" data-id="${videoId}" data-type="video" aria-label="${bookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}">
                            <i class="${bookmarked ? 'fas' : 'far'} fa-heart text-danger"></i>
                        </button>
                    </div>
                `;

                fragment.appendChild(videoDiv);
            });
            videoResults.appendChild(fragment);

            // Attach event listeners to the new bookmark toggle buttons
            videoResults.querySelectorAll('.bookmark-toggle-btn').forEach(button => {
                button.addEventListener('click', handleBookmarkToggle);
            });

        } catch (error) {
            videoErrorMsg.textContent = 'Failed to fetch videos. Please try again later.';
            videoErrorMsg.classList.remove('d-none');
            videoResults.innerHTML = '';
            console.error('YouTube video search error:', error);
        }
    }

    // Event listener for video search button (UNCHANGED)
    if (videoSearchBtn) {
        videoSearchBtn.addEventListener('click', () => {
            const query = videoQueryInput.value;
            searchYouTubeVideos(query);
        });
    }

    // Optional: Allow Enter key on input (UNCHANGED)
    if (videoQueryInput) {
        videoQueryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchYouTubeVideos(videoQueryInput.value);
            }
        });
    }

    /**
     * Generic handler for bookmark toggle buttons.
     * Toggles bookmark state and updates UI.
     * @param {Event} event - The click event.
     */
    function handleBookmarkToggle(event) {
        const button = event.currentTarget;
        const id = button.dataset.id;
        const type = button.dataset.type;
        const icon = button.querySelector('i.fa-heart');

        // Prepare item data for saving
        let item = { id: id, type: type };

        // For news, we need more data to display in bookmarks tab
        if (type === 'news') {
            const newsItemDiv = button.closest('.news-item');
            if (newsItemDiv) {
                item.title = newsItemDiv.querySelector('.card-title')?.textContent || '';
                item.summary = newsItemDiv.querySelector('.card-text')?.textContent || '';
                item.url = newsItemDiv.querySelector('a')?.href || '';
                item.urlToImage = newsItemDiv.querySelector('img')?.src || '';
            }
        } else if (type === 'video') {
            const videoItemDiv = button.closest('.video-item');
            if (videoItemDiv) {
                item.title = videoItemDiv.querySelector('.card-title')?.textContent || '';
                // For videos, if you fetched thumbnail URL, you'd save it here too:
                // item.thumbnailUrl = videoItemDiv.querySelector('img')?.src || ''; 
            }
        }

        if (isBookmarked(id, type)) {
            removeBookmark(id, type);
            icon.classList.remove('fas'); // Filled heart
            icon.classList.add('far');   // Outlined heart
            button.setAttribute('aria-label', 'Add to bookmarks');
        } else {
            saveBookmark(item);
            icon.classList.remove('far'); // Outlined heart
            icon.classList.add('fas');   // Filled heart
            button.setAttribute('aria-label', 'Remove from bookmarks');
        }

        // If currently on the bookmarks tab, re-render it to reflect changes immediately
        if (bookmarksTabButton.classList.contains('active')) {
            displayBookmarks();
        }
    }


    // --- Initial Load Logic ---
    // Use Bootstrap's 'shown.bs.tab' event to trigger actions when tabs become active.

    newsTabButton.addEventListener('shown.bs.tab', () => {
        // Only fetch if the news container is empty or showing the default message
        // This prevents re-fetching every time the tab is switched, unless needed
        if (newsArticlesContainer.innerHTML.trim() === '<p class="text-center text-muted mt-5">Search for news or select a category to get summaries.</p>') {
            fetchNews('', 'general'); // Fetch general news on first visit to tab
        } else {
            // Re-render news articles to update bookmark icons if user has bookmarked/unbookmarked
            // while on another tab. We need to pass current search or category.
            const currentQuery = newsQueryInput.value.trim();
            const activeCategoryButton = newsCategoryButtons.querySelector('.btn.active');
            const currentCategory = activeCategoryButton ? activeCategoryButton.dataset.category : 'general';
            fetchNews(currentQuery, currentCategory);
        }
    });

    videosTabButton.addEventListener('shown.bs.tab', () => {
        // Re-render videos to update bookmark icons if user has bookmarked/unbookmarked
        // while on another tab. Only re-render if there's an existing query.
        if (videoQueryInput.value.trim()) {
            searchYouTubeVideos(videoQueryInput.value.trim());
        }
    });


    chatTabButton.addEventListener('shown.bs.tab', () => {
        userInput.focus(); // Focus on chat input when chat tab is opened
    });

    bookmarksTabButton.addEventListener('shown.bs.tab', () => { // NEW
        displayBookmarks(); // Display bookmarks whenever the tab is activated
    });

    // Initial fetch for news if it's the default active tab on page load
    // (This part will run only once when the page initially loads)
    if (newsTabButton.classList.contains('active')) {
        fetchNews('', 'general');
    }
});