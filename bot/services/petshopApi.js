const axios = require('axios');

const api = axios.create({
  baseURL: process.env.PETSHOP_API_URL || 'http://localhost:8080',
  timeout: 8000,
});

async function getCounts() {
  const { data } = await api.get('/api/debug/counts');
  return data;
}

async function getProdutos() {
  const { data } = await api.get('/api/produtos');
  return Array.isArray(data) ? data : [];
}

async function getPromocoesAtivas() {
  const { data } = await api.get('/api/promocoes/ativas');
  return Array.isArray(data) ? data : [];
}

async function getCategorias() {
  const { data } = await api.get('/api/categorias');
  return Array.isArray(data) ? data : [];
}

module.exports = {
  getCounts,
  getProdutos,
  getPromocoesAtivas,
  getCategorias,
};
