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
                    user_agent: authData.userAgent || navigator.userAgent
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
        const scope = 'openid profile email';
        const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&state=${Date.now()}`;
        
        // Open LinkedIn auth in popup
        const popup = window.open(
            authUrl,
            'linkedin-auth',
            'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        return new Promise((resolve, reject) => {
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    reject(new Error('LinkedIn auth popup was closed'));
                }
            }, 1000);

            // Listen for message from popup
            const messageListener = (event) => {
                if (event.origin !== window.location.origin) return;
                
                if (event.data.type === 'LINKEDIN_AUTH_SUCCESS') {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageListener);
                    popup.close();
                    resolve(event.data.profile);
                } else if (event.data.type === 'LINKEDIN_AUTH_ERROR') {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageListener);
                    popup.close();
                    reject(new Error(event.data.error));
                }
            };

            window.addEventListener('message', messageListener);
        });
    },

    async exchangeLinkedInCode(code) {
        try {
            // In a real implementation, this would go through your backend
            // For now, we'll use a client-side approach (not recommended for production)
            const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    client_id: LINKEDIN_CLIENT_ID,
                    client_secret: LINKEDIN_CLIENT_SECRET,
                    redirect_uri: LINKEDIN_REDIRECT_URI
                })
            });

            const tokenData = await response.json();
            if (tokenData.access_token) {
                return await this.getLinkedInProfile(tokenData.access_token);
            } else {
                throw new Error('Failed to get access token');
            }
        } catch (error) {
            console.error('Error exchanging LinkedIn code:', error);
            throw error;
        }
    },

    async getLinkedInProfile(accessToken) {
        try {
            const [profileResponse, emailResponse] = await Promise.all([
                fetch('https://api.linkedin.com/v2/people/~?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }),
                fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                })
            ]);

            const profile = await profileResponse.json();
            const email = await emailResponse.json();

            return {
                id: profile.id,
                firstName: profile.firstName?.localized?.en_US || '',
                lastName: profile.lastName?.localized?.en_US || '',
                email: email.elements?.[0]?.['handle~']?.emailAddress || '',
                profilePicture: profile.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier || null
            };
        } catch (error) {
            console.error('Error getting LinkedIn profile:', error);
            throw error;
        }
    }
};

// Export for use in other scripts
window.SupabaseDB = SupabaseDB;