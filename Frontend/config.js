
const AppConfig = {
    // API Configuration
    api: {
        baseUrl: 'http://20.244.56.144/evaluation-service',
        endpoints: {
            users: '/users',
            posts: '/posts',
            userPosts: '/users/:userid/posts',
            postComments: '/posts/:postid/comments'
        },
        refreshInterval: 30000,
        requestTimeout: 10000
    },

    // UI Configuration
    ui: {
        theme: 'light',         // 'light', 'dark', or 'system'
        itemsPerPage: 20,       // Default items per page
        maxItemsPerPage: 100,   // Maximum items per page
        dashboardCards: {
            topUsers: 5,        // Number of top users to display
            popularPosts: 5,     // Number of popular posts to display
            latestPosts: 5       // Number of latest posts to display
        },
        notificationDuration: 5000 // milliseconds
    },

    // Cache Configuration
    cache: {
        enabled: true,
        duration: 300000,       // Cache duration in milliseconds (5 minutes)
        storageKey: 'socialMediaAnalytics'
    },

    // Default Filters
    defaultFilters: {
        posts: {
            sortBy: 'comments', // 'comments' or 'recent'
            type: 'popular'     // 'popular' or 'latest'
        }
    }
};

// Load user settings from localStorage if available
function loadUserSettings() {
    try {
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);

            // Update API settings
            if (parsedSettings.api && parsedSettings.api.baseUrl) {
                AppConfig.api.baseUrl = parsedSettings.api.baseUrl;
            }
            if (parsedSettings.api && parsedSettings.api.refreshInterval) {
                AppConfig.api.refreshInterval = parsedSettings.api.refreshInterval * 1000; // Convert to milliseconds
            }

            // Update UI settings
            if (parsedSettings.ui && parsedSettings.ui.theme) {
                AppConfig.ui.theme = parsedSettings.ui.theme;
                applyTheme(parsedSettings.ui.theme);
            }
            if (parsedSettings.ui && parsedSettings.ui.itemsPerPage) {
                AppConfig.ui.itemsPerPage = parseInt(parsedSettings.ui.itemsPerPage, 10);
            }
        }
    } catch (error) {
        console.error('Error loading user settings:', error);
    }
}

// Apply theme based on user preference
function applyTheme(theme) {
    if (theme === 'system') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark-theme', prefersDark);

        // Listen for changes in system theme
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            document.body.classList.toggle('dark-theme', e.matches);
        });
    } else {
        document.body.classList.toggle('dark-theme', theme === 'dark');
    }
}

// Initialize configuration
function initConfig() {
    loadUserSettings();

    // Apply initial theme if not done in loadUserSettings
    if (!localStorage.getItem('userSettings')) {
        applyTheme(AppConfig.ui.theme);
    }

    // Populate UI elements with config values
    document.addEventListener('DOMContentLoaded', () => {
        // Set API endpoint input value
        const apiEndpointInput = document.getElementById('api-endpoint');
        if (apiEndpointInput) {
            apiEndpointInput.value = AppConfig.api.baseUrl;
        }

        // Set refresh interval input value
        const refreshIntervalInput = document.getElementById('refresh-interval');
        if (refreshIntervalInput) {
            refreshIntervalInput.value = AppConfig.api.refreshInterval / 1000; // Convert to seconds
        }

        // Set theme select value
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = AppConfig.ui.theme;
        }

        // Set items per page select value
        const itemsPerPageSelect = document.getElementById('items-per-page');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.value = AppConfig.ui.itemsPerPage.toString();
        }
    });
}

// Call initConfig to load and apply settings
initConfig();