const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3001;

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'documents';

// Add CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Proxy route for images
app.get('/image', async (req, res) => {
    try {
        const imagePath = req.query.path;
        if (!imagePath) {
            return res.status(400).send('Missing path parameter');
        }

        // Construct Supabase URL
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${imagePath}`;

        // Fetch image from Supabase
        const response = await fetch(imageUrl);

        if (!response.ok) {
            return res.status(response.status).send('Image not found');
        }

        // Set content type from response headers
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.set('Content-Type', contentType);
        }

        // Add caching headers
        res.set('Cache-Control', 'public, max-age=31536000');

        // Stream image data
        response.body.pipe(res);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).send('Internal server error');
    }
});

app.listen(PORT, () => {
    console.log(`Image proxy server running on port ${PORT}`);
});