import { corsHeaders, okJson, errorJson, verifyState, getWorkspaceCreds, upsertUserIntegration, createSupabaseAdmin, getEnvVar } from '../_shared/oauth-utils.ts';

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders(getEnvVar('APP_URL')),
        });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return errorJson(405, 'Method not allowed', getEnvVar('APP_URL'));
    }

    try {
        console.log('=== OAuth Exchange Debug ===');
        console.log('Request method:', req.method);
        console.log('Request headers:', Object.fromEntries(req.headers.entries()));

        // Get authorization header
        const authHeader = req.headers.get('authorization');
        console.log('Auth header:', authHeader ? 'Present' : 'Missing');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('ERROR: Missing or invalid authorization header');
            return errorJson(401, 'Missing or invalid authorization header', getEnvVar('APP_URL'));
        }

        const accessToken = authHeader.slice('Bearer '.length);
        console.log('Access token length:', accessToken.length);

        // Get request body
        const body = await req.json();
        console.log('Request body keys:', Object.keys(body));
        const { code, state } = body;

        if (!code || !state) {
            console.log('ERROR: Missing code or state parameter');
            console.log('Code present:', !!code);
            console.log('State present:', !!state);
            return errorJson(400, 'Missing code or state parameter', getEnvVar('APP_URL'));
        }

        // Create Supabase admin client
        const supabaseAdmin = createSupabaseAdmin();

        // Verify user token and get user info
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

        if (userError || !user) {
            return errorJson(401, 'Invalid user token', getEnvVar('APP_URL'));
        }

        // Verify state
        console.log('Verifying state:', state);
        console.log('JWT_SECRET available:', !!getEnvVar('JWT_SECRET'));

        const stateData = verifyState(state, getEnvVar('JWT_SECRET'));
        console.log('State verification result:', stateData);

        if (!stateData) {
            console.log('ERROR: State verification failed');
            return errorJson(400, 'Invalid or expired state', getEnvVar('APP_URL'));
        }

        console.log('State verification successful:', stateData);

        const { user_id, workspace_id, kind } = stateData;

        // Verify user matches state
        if (user_id !== user.id) {
            return errorJson(400, 'User mismatch', getEnvVar('APP_URL'));
        }

        // Get workspace credentials
        console.log('Getting workspace credentials for:', { workspace_id, kind });
        const credentials = await getWorkspaceCreds(supabaseAdmin, workspace_id, kind);
        console.log('Workspace credentials retrieved:', !!credentials);

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: credentials.client_id,
                client_secret: credentials.client_secret,
                code,
                grant_type: 'authorization_code',
                redirect_uri: `${getEnvVar('APP_URL')}/oauth/callback`, // Use frontend redirect URI
            }),
        });

        if (!tokenResponse.ok) {
            return errorJson(400, 'Failed to exchange code for tokens', getEnvVar('APP_URL'));
        }

        const { access_token, refresh_token, expires_in, scope } = await tokenResponse.json();

        // Get user email
        let email: string;
        if (kind === 'gmail') {
            console.log('Fetching Gmail profile with access token length:', access_token.length);
            const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                },
            });

            console.log('Gmail profile response status:', profileResponse.status);
            if (!profileResponse.ok) {
                const errorText = await profileResponse.text();
                console.error('Gmail profile error:', errorText);
                return errorJson(400, `Failed to get Gmail profile: ${errorText}`, getEnvVar('APP_URL'));
            }

            const profileData = await profileResponse.json();
            console.log('Gmail profile data:', profileData);
            email = profileData.emailAddress;
        } else {
            console.log('Fetching Calendar user info with access token length:', access_token.length);
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                },
            });

            console.log('Calendar user info response status:', userInfoResponse.status);
            if (!userInfoResponse.ok) {
                const errorText = await userInfoResponse.text();
                console.error('Calendar user info error:', errorText);
                return errorJson(400, `Failed to get user info: ${errorText}`, getEnvVar('APP_URL'));
            }

            const userInfoData = await userInfoResponse.json();
            console.log('Calendar user info data:', userInfoData);
            email = userInfoData.email;
        }

        // Calculate expiration time
        const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

        // Save user integration
        await upsertUserIntegration(supabaseAdmin, {
            user_id,
            workspace_id,
            provider: 'google',
            kind,
            email,
            access_token,
            refresh_token,
            expires_at: expiresAt,
            scopes: scope.split(' '),
            last_synced_at: new Date().toISOString(),
        });

        return okJson({ success: true, email, kind }, getEnvVar('APP_URL'));

    } catch (error) {
        console.error('OAuth exchange error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return errorJson(500, `Internal server error: ${errorMessage}`, getEnvVar('APP_URL'));
    }
});
