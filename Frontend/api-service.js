/**
 * API Service for Social Media Analytics Dashboard
 * Handles communication with the backend API
 */
class ApiService {
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.endpoints = config.endpoints;
        this.timeout = config.requestTimeout || 5000;
        this.cache = new Map();
        this.cacheEnabled = config.cache?.enabled || false;
        this.cacheDuration = config.cache?.duration || 300000; // 5 minutes default
        this.requestQueue = [];
        this.isPolling = false;
        this.statusListeners = [];
        this.connectionStatus = 'unknown'; // 'connected', 'disconnected', 'unknown'
    }

    /**
     * Makes an HTTP request to the API
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise} - Promise with response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const cacheKey = this.getCacheKey(url, options);

        // Check cache if enabled
        if (this.cacheEnabled && !['POST', 'PUT', 'DELETE'].includes(options.method || 'GET')) {
            const cachedResponse = this.getFromCache(cacheKey);
            if (cachedResponse) {
                return cachedResponse;
            }
        }

        // Add default options
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add request body if provided
        if (options.body) {
            requestOptions.body = JSON.stringify(options.body);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            requestOptions.signal = controller.signal;

            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Update connection status
            this.updateConnectionStatus('connected');

            // Cache response if enabled
            if (this.cacheEnabled && !['POST', 'PUT', 'DELETE'].includes(options.method || 'GET')) {
                this.addToCache(cacheKey, data);
            }

            return data;
        } catch (error) {
            // Check if it's a timeout error
            if (error.name === 'AbortError') {
                this.updateConnectionStatus('disconnected');
                throw new Error('Request timeout. Please try again later.');
            }

            // Handle network errors
            if (error.message.includes('Failed to fetch')) {
                this.updateConnectionStatus('disconnected');
                throw new Error('Network error. Please check your connection.');
            }

            // Handle other errors
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * Gets all users from the API
     * @returns {Promise} - Promise with users data
     */
    async getUsers() {
        return this.request(this.endpoints.users);
    }

    /**
     * Gets a specific user by ID
     * @param {string|number} userId - User ID
     * @returns {Promise} - Promise with user data
     */
    async getUserById(userId) {
        const users = await this.getUsers();
        return users.users?.[userId] ? { id: userId, name: users.users[userId] } : null;
    }

    /**
     * Gets all posts from the API
     * @param {string} type - Post type (popular, latest)
     * @returns {Promise} - Promise with posts data
     */
    async getPosts(type = 'popular') {
        return this.request(`${this.endpoints.posts}?type=${type}`);
    }

    /**
     * Gets posts for a specific user
     * @param {string|number} userId - User ID
     * @returns {Promise} - Promise with user's posts data
     */
    async getUserPosts(userId) {
        const endpoint = this.endpoints.userPosts.replace(':userid', userId);
        return this.request(endpoint);
    }

    /**
     * Gets comments for a specific post
     * @param {string|number} postId - Post ID
     * @returns {Promise} - Promise with post's comments data
     */
    async getPostComments(postId) {
        const endpoint = this.endpoints.postComments.replace(':postid', postId);
        return this.request(endpoint);
    }

    /**
     * Gets the top users by post count
     * @param {number} limit - Number of users to return
     * @returns {Promise} - Promise with top users data
     */
    async getTopUsers(limit = 5) {
        try {
            const users = await this.getUsers();
            const usersArray = Object.entries(users.users || {}).map(([id, name]) => ({ id, name }));

            // Get post counts for all users
            const usersWithPostCounts = await Promise.all(
                usersArray.map(async user => {
                    const posts = await this.getUserPosts(user.id);
                    return {
                        ...user,
                        postCount: posts.posts?.length || 0
                    };
                })
            );

            // Sort by post count descending and limit results
            return usersWithPostCounts
                .sort((a, b) => b.postCount - a.postCount)
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting top users:', error);
            throw new Error('Failed to get top users');
        }
    }

    /**
     * Gets a cache key for the given URL and options
     * @private
     */
    getCacheKey(url, options) {
        return `${url}:${JSON.stringify(options)}`;
    }

    /**
     * Gets data from cache
     * @private
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    /**
     * Adds data to cache
     * @private
     */
    addToCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Updates connection status and notifies listeners
     * @private
     */
    updateConnectionStatus(status) {
        if (this.connectionStatus !== status) {
            this.connectionStatus = status;
            this.statusListeners.forEach(listener => listener(status));
        }
    }

    /**
     * Adds a connection status listener
     */
    addStatusListener(listener) {
        this.statusListeners.push(listener);
        return () => {
            this.statusListeners = this.statusListeners.filter(l => l !== listener);
        };
    }
}

// Example usage:
const apiService = new ApiService({
    baseUrl: 'http://20.244.56.144/evaluation-service',
    endpoints: {
        users: '/users',
        posts: '/posts',
        userPosts: '/users/:userid/posts',
        postComments: '/posts/:postid/comments'
    },
    requestTimeout: 10000,
    cache: {
        enabled: true,
        duration: 300000 // 5 minutes
    }
});

// Add connection status listener
apiService.addStatusListener(status => {
    console.log('Connection status changed:', status);
});