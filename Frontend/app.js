// Base URL for API requests
const API_BASE_URL = 'http://20.244.56.144/evaluation-service';

let apiCalls = 0;


function updateApiCallCount() {
    document.getElementById('api-call-count').textContent = apiCalls;
}


async function fetchData(url) {
    apiCalls++;
    updateApiCallCount();

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        showError(`Failed to fetch data: ${error.message}`);
        return null;
    }
}


function showError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `<div class="error">${message}</div>`;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorContainer.innerHTML = '';
    }, 5000);
}

// Fetch top users
async function fetchTopUsers() {
    const container = document.getElementById('top-users-content');
    container.innerHTML = '<div class="loading">Loading top users...</div>';

    const data = await fetchData(`${API_BASE_URL}/users`);
    if (!data) return;

    let html = '';
    data.slice(0, 5).forEach((user, index) => {
        html += `
            <div class="user-item">
                <div class="user-info">
                    <div class="user-rank">${index + 1}</div>
                    <div>
                        <strong>${user.username}</strong><br>
                        <small>@${user.handle}</small>
                    </div>
                </div>
                <div class="user-stats">
                    <div class="stat">
                        <span class="stat-icon">📝</span>
                        ${user.postCount} posts
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html || '<p>No users found</p>';
}

// Fetch popular posts
async function fetchPopularPosts() {
    const container = document.getElementById('popular-posts-content');
    container.innerHTML = '<div class="loading">Loading popular posts...</div>';

    const data = await fetchData(`${API_BASE_URL}/posts?type=popular`);
    if (!data) return;

    let html = '';
    data.forEach(post => {
        html += `
            <div class="post-item">
                <div class="post-info">
                    <div>
                        <strong>${post.user.username}</strong>
                        <p>${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}</p>
                    </div>
                </div>
                <div class="post-stats">
                    <div class="stat">
                        <span class="stat-icon">💬</span>
                        ${post.commentCount} comments
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html || '<p>No popular posts found</p>';
}

// Fetch latest posts
async function fetchLatestPosts() {
    const container = document.getElementById('latest-posts-content');
    container.innerHTML = '<div class="loading">Loading latest posts...</div>';

    const data = await fetchData(`${API_BASE_URL}/posts?type=latest`);
    if (!data) return;

    let html = '';
    data.slice(0, 5).forEach(post => {
        html += `
            <div class="post-item">
                <div class="post-info">
                    <div>
                        <strong>${post.user.username}</strong>
                        <p>${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}</p>
                        <small>${new Date(post.timestamp).toLocaleString()}</small>
                    </div>
                </div>
                <div class="post-stats">
                    <div class="stat">
                        <span class="stat-icon">💬</span>
                        ${post.commentCount} comments
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html || '<p>No latest posts found</p>';
}

// Initialize dashboard
window.addEventListener('DOMContentLoaded', () => {
    fetchTopUsers();
    fetchPopularPosts();
    fetchLatestPosts();

    // Set up auto-refresh for latest posts (every 30 seconds)
    setInterval(fetchLatestPosts, 30000);
});