const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const app = express();
const PORT = process.env.PORT || 3000;

// Base URL for the social media test server
const API_BASE_URL = 'http://20.244.56.144/evaluation-service';

// Authentication token
const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQzNjA3NTEzLCJpYXQiOjE3NDM2MDcyMTMsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6Ijk2OGFjMzY0LTIyMmEtNGM0Yi1iY2FlLTY0ZWNhYzE5OGUwOCIsInN1YiI6IjIyMDUzMDI1QGtpaXQuYWMuaW4ifSwiZW1haWwiOiIyMjA1MzAyNUBraWl0LmFjLmluIiwibmFtZSI6InNpZGRoYW50IHJhaSIsInJvbGxObyI6IjIyMDUzMDI1IiwiYWNjZXNzQ29kZSI6Im53cHdyWiIsImNsaWVudElEIjoiOTY4YWMzNjQtMjIyYS00YzRiLWJjYWUtNjRlY2FjMTk4ZTA4IiwiY2xpZW50U2VjcmV0IjoidUF2dWJoUlpjeG1YbUh6dSJ9.SsXYt1qxEhwILY1FPQ--V-aWTF6UILXRFbQSA_5GgAQ";

// Cache configuration with TTL in seconds
const cache = new NodeCache({
    stdTTL: 60, // 60 seconds standard TTL
    checkperiod: 120 // Check for expired keys every 120 seconds
});

// In-memory data structures for efficient lookups
let userPostCounts = new Map(); // Map of userId -> post count
let userPostsMap = new Map();   // Map of userId -> array of posts
let postsWithCommentCounts = new Map(); // Map of postId -> comment count
let allPosts = [];              // Array of all posts with timestamps

// Initial data loading
async function initializeData() {
    try {
        const users = await fetchUsers();
        for (const userId in users) {
            await fetchPostsForUser(userId);
        }
        console.log('Initial data loaded successfully');
    } catch (error) {
        console.error('Error initializing data:', error.message);
    }
}

// Fetch users from the API
async function fetchUsers() {
    try {
        const response = await axios.get(`${API_BASE_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        });
        const users = response.data.users;
        cache.set('allUsers', users);
        return users;
    } catch (error) {
        console.error('Error fetching users:', error.message);
        return cache.get('allUsers') || {};
    }
}

// Fetch posts for a specific user
async function fetchPostsForUser(userId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/users/${userId}/posts`, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        });
        const posts = response.data.posts;
        userPostCounts.set(userId, posts.length);
        userPostsMap.set(userId, posts);
        posts.forEach(post => {
            post.timestamp = Date.now();
            allPosts.push(post);
            fetchCommentsForPost(post.id);
        });
        return posts;
    } catch (error) {
        console.error(`Error fetching posts for user ${userId}:`, error.message);
        return [];
    }
}

// Fetch comments for a specific post
async function fetchCommentsForPost(postId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/posts/${postId}/comments`, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        });
        const comments = response.data.comments;
        postsWithCommentCounts.set(postId, comments.length);
        return comments;
    } catch (error) {
        console.error(`Error fetching comments for post ${postId}:`, error.message);
        return [];
    }
}

// Refresh data periodically
function scheduleDataRefresh() {
    setInterval(async () => {
        console.log('Performing full data refresh');
        await initializeData();
    }, 5 * 60 * 1000);

    setInterval(async () => {
        console.log('Performing light data refresh');
        const users = cache.get('allUsers') || await fetchUsers();
        const userIds = Object.keys(users);
        const sampleSize = Math.min(5, userIds.length);
        for (let i = 0; i < sampleSize; i++) {
            const randomIndex = Math.floor(Math.random() * userIds.length);
            const userId = userIds[randomIndex];
            await fetchPostsForUser(userId);
        }
    }, 60 * 1000);
}

// API Endpoints
app.get('/users', (req, res) => {
    try {
        const users = cache.get('allUsers');
        if (!users) {
            return res.status(503).json({ error: 'Users data not available yet' });
        }
        const userPostCountArray = Array.from(userPostCounts.entries());
        userPostCountArray.sort((a, b) => b[1] - a[1]);
        const topUsers = userPostCountArray.slice(0, 5).map(([userId, postCount]) => {
            return {
                id: userId,
                name: users[userId],
                postCount: postCount
            };
        });
        res.json({ topUsers });
    } catch (error) {
        console.error('Error in /users endpoint:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/posts', (req, res) => {
    try {
        const type = req.query.type;
        if (type !== 'latest' && type !== 'popular') {
            return res.status(400).json({ error: 'Invalid type parameter. Use "latest" or "popular".' });
        }
        if (type === 'latest') {
            const sortedPosts = [...allPosts].sort((a, b) => b.timestamp - a.timestamp);
            const latestPosts = sortedPosts.slice(0, 5);
            res.json({ posts: latestPosts });
        } else if (type === 'popular') {
            if (postsWithCommentCounts.size === 0) {
                return res.status(503).json({ error: 'Comments data not available yet' });
            }
            let maxCommentCount = Math.max(...postsWithCommentCounts.values());
            const popularPosts = allPosts.filter(post => postsWithCommentCounts.get(post.id) === maxCommentCount);
            popularPosts.forEach(post => {
                post.commentCount = postsWithCommentCounts.get(post.id) || 0;
            });
            res.json({ posts: popularPosts });
        }
    } catch (error) {
        console.error('Error in /posts endpoint:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initializeData();
    scheduleDataRefresh();
});

module.exports = app;
