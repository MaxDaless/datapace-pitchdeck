// Supabase Edge Function for LinkedIn OAuth
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS headers inline to avoid import issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// Secure access codes - only stored server-side
const VALID_ACCESS_CODES = [
  'DATAPACE2024',
  'INVESTOR001', 
  'DEMO123'
]

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    console.log('Received request:', requestBody)
    
    const { action, code, redirectUri, accessToken, accessCode } = requestBody
    
    // Validate access code for authentication actions
    if (action === 'validate_access_code') {
      console.log('Validating access code:', accessCode)
      console.log('Valid codes:', VALID_ACCESS_CODES)
      
      if (!accessCode || !VALID_ACCESS_CODES.includes(accessCode)) {
        console.log('Access code validation failed')
        return new Response(
          JSON.stringify({ error: 'Invalid access code. Please contact Datapace for access.' }),
          { 
            status: 403,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
      }
      
      console.log('Access code validation successful')
      return new Response(
        JSON.stringify({ valid: true }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    if (action === 'exchange_token') {
      // Exchange authorization code for access token
      const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken'
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: Deno.env.get('LINKEDIN_CLIENT_ID') || '77bb4l8debdzn3',
        client_secret: Deno.env.get('LINKEDIN_CLIENT_SECRET') || ''
      })

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      })

      if (!response.ok) {
        throw new Error(`LinkedIn token exchange failed: ${response.status}`)
      }

      const tokenData = await response.json()
      
      return new Response(
        JSON.stringify(tokenData),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    if (action === 'get_profile') {
      // Get user profile data from LinkedIn
      const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!profileResponse.ok) {
        throw new Error(`LinkedIn profile fetch failed: ${profileResponse.status}`)
      }

      const profileData = await profileResponse.json()
      
      return new Response(
        JSON.stringify(profileData),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('LinkedIn auth error:', error)
    
    // More specific error handling
    if (error instanceof SyntaxError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})