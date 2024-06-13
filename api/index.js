const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.json());

const supabase = createClient(process.env.API_URL, process.env.API_KEY);

const axios = require('axios');

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization token is required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Invalid Authorization format. Token missing.' });
    }

    try {
        const response = await axios.get('https://login.xsolla.com/api/users/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.data || response.data.error) {
            return res.status(401).json({ error: response.data.error?.description || 'Invalid token' });
        }

        req.user = response.data;
        next();
    } catch (error) {
        if (error.response && error.response.data && error.response.data.error) {
            console.log('Error response from Xsolla:', error.response.data);
            return res.status(401).json({ error: error.response.data.error.description });
        }
        console.error('An error occurred during authentication:', error);
        return res.status(500).json({ error: 'An error occurred during authentication' });
    }
};



app.get('/v3/marketplace/fetch', async (req, res) => {
    const { limit = 10, page = 1, sort } = req.query;
    const offset = (page - 1) * limit;
    const sortBy = sort || 'created_at';
    const { data, error, count } = await supabase
        .from('marketplace')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    const totalPages = Math.ceil(count / limit);

    res.json({
        data,
        totalPages,
        currentPage: page,
        totalItems: count
    });
});

app.post('/v3/marketplace/insert', authenticate, async (req, res) => {
    const { data, error } = await supabase
        .from('marketplace')
        .insert([req.body]);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ message: 'Data inserted successfully'});
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = app;