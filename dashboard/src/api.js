import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001/api', // Altere para a URL de produção depois
    withCredentials: true
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
