ALTER TABLE cargo ADD COLUMN acesso_suporte BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS suporte_ticket (
  id_ticket BIGINT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  assunto VARCHAR(160),
  status VARCHAR(30) NOT NULL DEFAULT 'ABERTO',
  discord_channel_id VARCHAR(64),
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fechado_em DATETIME NULL,
  fechado_por_usuario_id BIGINT NULL,
  CONSTRAINT fk_suporte_fechado_por FOREIGN KEY (fechado_por_usuario_id) REFERENCES usuario(id_usuario)
);

CREATE TABLE IF NOT EXISTS suporte_mensagem (
  id_mensagem BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_ticket BIGINT NOT NULL,
  autor_tipo VARCHAR(30) NOT NULL,
  autor_nome VARCHAR(120),
  mensagem TEXT NOT NULL,
  discord_message_id VARCHAR(64),
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_suporte_msg_ticket FOREIGN KEY (id_ticket) REFERENCES suporte_ticket(id_ticket) ON DELETE CASCADE
);

INSERT INTO cargo (
  nome, descricao, ativo,
  acesso_produtos, acesso_categorias, acesso_promocoes,
  acesso_usuarios, acesso_cargos, acesso_estoque, acesso_suporte
)
SELECT 'Suporte', 'Atende clientes na aba de suporte e fecha conversas.', true,
       false, false, false, false, false, false, true
WHERE NOT EXISTS (SELECT 1 FROM cargo WHERE LOWER(nome) = 'suporte');
