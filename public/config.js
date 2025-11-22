// Configuration for deployment
const CONFIG = {
    // Change this to your deployed backend URL after deployment
    API_BASE_URL: process.env.VITE_API_URL || 'http://localhost:8001',
    // For production, set this in Vercel environment variables
    // Example: https://your-backend.vercel.app
};

export default CONFIG;
