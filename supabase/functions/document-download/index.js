// Netlify Edge Function using Node.js runtime
export default async function handler(request) {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            {
                status: 405,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }

    try {
        const url = new URL(request.url);
        const documentId = url.searchParams.get('document_id');

        if (!documentId) {
            return new Response(
                JSON.stringify({ error: 'Missing document_id parameter' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Get environment variables
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            return new Response(
                JSON.stringify({ error: 'Missing environment variables' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Get user's access token from Authorization header
        const auth = request.headers.get("authorization") || "";
        if (!auth.startsWith("Bearer ")) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }
        const accessToken = auth.slice("Bearer ".length);

        // Create Supabase client with user's access token
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } },
        });

        // Get document info (with updated column names)
        const { data: document, error: documentError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (documentError || !document) {
            return new Response(
                JSON.stringify({ error: 'Document not found' }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Get file from storage using storage_path
        const { data: fileData, error: fileError } = await supabase.storage
            .from('documents')
            .download(document.storage_path);

        if (fileError || !fileData) {
            return new Response(
                JSON.stringify({ error: 'File not found in storage' }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Convert file to blob
        const blob = new Blob([fileData], { type: document.mime_type || 'application/octet-stream' });

        // Return file with proper headers
        return new Response(blob, {
            status: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': document.mime_type || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${document.file_name || 'document'}"`,
                'Content-Length': blob.size.toString(),
            },
        });

    } catch (error) {
        console.error('Error in document-download function:', error);
        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
}
