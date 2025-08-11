// Supabase Configuration
const SUPABASE_URL = 'https://mgkcxhywnqalinailuxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na2N4aHl3bnFhbGluYWlsdXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTM0MTYsImV4cCI6MjA3MDQ4OTQxNn0.RWkv1k2642nuMYaIkzUxoHDmwOkAVImXo9gIWhSFkjw';

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
    }
};

// Export for use in other scripts
window.SupabaseDB = SupabaseDB;