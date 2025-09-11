-- Create auth_states table for OAuth state management
CREATE TABLE IF NOT EXISTS auth_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    state TEXT NOT NULL UNIQUE,
    code_verifier TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('calendar', 'gmail')),
    redirect_uri TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create index for fast state lookups
CREATE INDEX IF NOT EXISTS idx_auth_states_state ON auth_states(state);
CREATE INDEX IF NOT EXISTS idx_auth_states_expires ON auth_states(expires_at);

-- Create google_tokens table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS google_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('calendar', 'gmail')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_in INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    token_type TEXT DEFAULT 'Bearer',
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, kind)
);

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_google_tokens_workspace_kind ON google_tokens(workspace_id, kind);

-- Add RLS policies
ALTER TABLE auth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for auth_states (only service role can access)
CREATE POLICY "Service role can manage auth states" ON auth_states
    FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for google_tokens (users can only see their workspace tokens)
CREATE POLICY "Users can view their workspace tokens" ON google_tokens
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage tokens" ON google_tokens
    FOR ALL USING (auth.role() = 'service_role');
