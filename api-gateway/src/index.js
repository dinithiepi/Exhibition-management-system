// File : index.js of api-gateway

const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

const verifyToken = require('./middlewares/verifyToken');



//app.use(express.json());   // this one is removed cause It was consuming
                             // the request body, preventing the proxy from forwarding 
                             // it to the User Service.


app.use('/organizers',createProxyMiddleware({
    target: 'http://localhost:5001',
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl.replace(/^\/organizers/, '/organizers')
}));

app.use('/events',createProxyMiddleware({
    target: 'http://localhost:5002',
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl.replace(/^\/events/, '/events')
}));

app.use('/buildings',createProxyMiddleware({
    target: 'http://localhost:5003',
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl.replace(/^\/booths/, '/booths')
}));


app.use('/auths', createProxyMiddleware({
    target: 'http://localhost:5004',
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl.replace(/^\/auths/, '/auths')
}));


// Root route for testing
app.get('/', (req, res) => {
    res.send('API Gateway is running');
});



// Start server
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
