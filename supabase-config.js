// Supabase Configuration - Make globally available
window.SUPABASE_URL = 'https://mgkcxhywnqalinailuxu.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na2N4aHl3bnFhbGluYWlsdXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTM0MTYsImV4cCI6MjA3MDQ4OTQxNn0.RWkv1k2642nuMYaIkzUxoHDmwOkAVImXo9gIWhSFkjw';
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

// LinkedIn OAuth Configuration
const LINKEDIN_CLIENT_ID = '77bb4l8debdzn3';
const LINKEDIN_CLIENT_SECRET = 'WPL_AP1.Cv5aW2w3PwyMmJ8g.HLAB4w==';
const LINKEDIN_REDIRECT_URI = window.location.origin + '/oauth/linkedin';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database helper functions
const SupabaseDB = {
    // Store authentication session
    async createAuthSession(authData) {
        try {
            const { data, error } = await supabaseClient
                .from('auth_sessions')
                .insert([{
                    email: authData.email,
                    company: authData.company,
                    full_name: authData.fullName || null,
                    access_code: authData.accessCode,
                    ip_address: authData.ipAddress || null,
                    user_agent: authData.userAgent || navigator.userAgent,
                    linkedin_id: authData.linkedinId || null,
                    linkedin_profile_url: authData.linkedinProfileUrl || null,
                    linkedin_profile_picture: authData.linkedinProfilePicture || null,
                    auth_method: authData.authMethod || 'manual'
                }])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error creating auth session:', error);
            return { success: false, error: error.message };
        }
    },

    // Store NDA signature
    async createNDASignature(ndaData) {
        try {
            const { data, error } = await supabaseClient
                .from('nda_signatures')
                .insert([{
                    session_id: ndaData.sessionId,
                    full_name: ndaData.fullName,
                    digital_signature: ndaData.signature,
                    nda_version: '1.0'
                }])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error creating NDA signature:', error);
            return { success: false, error: error.message };
        }
    },

    // Validate session token
    async validateSession(sessionToken) {
        try {
            const { data, error } = await supabaseClient
                .from('auth_sessions')
                .select('*')
                .eq('session_token', sessionToken)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error validating session:', error);
            return { success: false, error: error.message };
        }
    },

    // Get user's IP address (optional)
    async getUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.error('Error getting IP:', error);
            return null;
        }
    },

    // LinkedIn OAuth functions - Modern OAuth 2.0 flow
    initiateLinkedInAuth() {
        return new Promise((resolve, reject) => {
            // Generate OAuth URL
            const scope = 'openid profile email';
            const state = this.generateRandomState();
            const redirectUri = window.location.origin + window.location.pathname;
            
            const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
                `response_type=code&` +
                `client_id=${LINKEDIN_CLIENT_ID}&` +
                `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                `scope=${encodeURIComponent(scope)}&` +
                `state=${state}`;

            // Store state for validation
            sessionStorage.setItem('linkedin_oauth_state', state);
            sessionStorage.setItem('linkedin_oauth_resolver', 'pending');

            // Open LinkedIn auth in popup
            const popup = window.open(
                authUrl,
                'linkedin-auth',
                'width=600,height=700,scrollbars=yes,resizable=yes,status=1'
            );

            if (!popup) {
                reject(new Error('Popup blocked. Please allow popups for this site.'));
                return;
            }

            // Store resolver functions
            this._linkedinResolve = resolve;
            this._linkedinReject = reject;

            // Monitor popup
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    if (sessionStorage.getItem('linkedin_oauth_resolver') === 'pending') {
                        sessionStorage.removeItem('linkedin_oauth_resolver');
                        sessionStorage.removeItem('linkedin_oauth_state');
                        reject(new Error('LinkedIn authentication was cancelled'));
                    }
                }
            }, 1000);

            // Check for URL changes in popup (will be handled by URL params on return)
            const urlCheck = setInterval(() => {
                try {
                    if (popup.location.search) {
                        const urlParams = new URLSearchParams(popup.location.search);
                        if (urlParams.has('code') || urlParams.has('error')) {
                            clearInterval(urlCheck);
                            clearInterval(checkClosed);
                            this.handleLinkedInCallback(urlParams, popup);
                        }
                    }
                } catch (e) {
                    // Cross-origin error is expected until redirect
                }
            }, 500);
        });
    },

    generateRandomState() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    },

    async handleLinkedInCallback(urlParams, popup) {
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        const storedState = sessionStorage.getItem('linkedin_oauth_state');

        popup.close();
        sessionStorage.removeItem('linkedin_oauth_resolver');
        sessionStorage.removeItem('linkedin_oauth_state');

        if (error) {
            this._linkedinReject(new Error(`LinkedIn OAuth error: ${error}`));
            return;
        }

        if (state !== storedState) {
            this._linkedinReject(new Error('Invalid OAuth state parameter'));
            return;
        }

        if (!code) {
            this._linkedinReject(new Error('No authorization code received'));
            return;
        }

        try {
            // For demo purposes, we'll simulate the profile data since the token exchange requires backend
            // In production, you'd exchange the code for an access token server-side
            const mockLinkedInProfile = {
                id: 'linkedin_' + Date.now(),
                firstName: 'LinkedIn',
                lastName: 'User',
                email: 'linkedin.user@company.com',
                company: 'LinkedIn User Company',
                headline: 'Professional User',
                profileUrl: 'https://linkedin.com/in/user',
                profilePicture: null
            };

            this._linkedinResolve(mockLinkedInProfile);
        } catch (error) {
            this._linkedinReject(error);
        }
    }
};

// Export for use in other scripts
window.SupabaseDB = SupabaseDB;