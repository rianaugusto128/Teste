function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function limitText(text, max = 1024) {
  const value = String(text || '-');
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function boolText(value) {
  return value ? 'Sim' : 'Não';
}

module.exports = {
  money,
  limitText,
  boolText,
};
