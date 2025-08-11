// Supabase Configuration
const SUPABASE_URL = 'https://mgkcxhywnqalinailuxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na2N4aHl3bnFhbGluYWlsdXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTM0MTYsImV4cCI6MjA3MDQ4OTQxNn0.RWkv1k2642nuMYaIkzUxoHDmwOkAVImXo9gIWhSFkjw';

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

    // LinkedIn OAuth functions
    initiateLinkedInAuth() {
        return new Promise((resolve, reject) => {
            // Use LinkedIn JavaScript SDK
            if (typeof IN === 'undefined') {
                reject(new Error('LinkedIn SDK not loaded'));
                return;
            }

            IN.User.authorize(() => {
                // Get user profile data
                IN.API.Profile('me')
                .fields(['firstName', 'lastName', 'emailAddress', 'headline', 'industry', 'positions', 'publicProfileUrl', 'pictureUrl'])
                .result((profile) => {
                    const user = profile.values[0];
                    const linkedinData = {
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.emailAddress,
                        headline: user.headline,
                        industry: user.industry,
                        company: user.positions?.values?.[0]?.company?.name || 'LinkedIn User',
                        profileUrl: user.publicProfileUrl,
                        profilePicture: user.pictureUrl
                    };
                    resolve(linkedinData);
                })
                .error((error) => {
                    reject(new Error('Failed to get LinkedIn profile: ' + error.message));
                });
            }, (error) => {
                reject(new Error('LinkedIn authorization failed: ' + error.message));
            });
        });
    }
};

// Export for use in other scripts
window.SupabaseDB = SupabaseDB;