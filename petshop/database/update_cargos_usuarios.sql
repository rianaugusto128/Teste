USE petshop;

CREATE TABLE IF NOT EXISTS cargo (
    id_cargo BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao VARCHAR(500),
    ativo BOOLEAN DEFAULT TRUE,
    acesso_produtos BOOLEAN DEFAULT FALSE,
    acesso_categorias BOOLEAN DEFAULT FALSE,
    acesso_promocoes BOOLEAN DEFAULT FALSE,
    acesso_usuarios BOOLEAN DEFAULT FALSE,
    acesso_cargos BOOLEAN DEFAULT FALSE,
    acesso_estoque BOOLEAN DEFAULT FALSE
);

ALTER TABLE usuario ADD COLUMN IF NOT EXISTS id_cargo BIGINT;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS foto_perfil LONGTEXT;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS telefone VARCHAR(30);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS cep VARCHAR(20);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS endereco VARCHAR(160);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS complemento VARCHAR(120);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS bairro VARCHAR(120);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS cidade VARCHAR(120);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS estado VARCHAR(2);

INSERT IGNORE INTO cargo (nome, descricao, ativo, acesso_produtos, acesso_categorias, acesso_promocoes, acesso_usuarios, acesso_cargos, acesso_estoque)
VALUES
('Administrador', 'Acesso total ao painel administrativo.', true, true, true, true, true, true, true),
('Gerente', 'Gerencia produtos, categorias, promoções e estoque.', true, true, true, true, false, false, true),
('Estoquista', 'Controla somente o estoque dos produtos.', true, false, false, false, false, false, true),
('Marketing', 'Gerencia promoções e eventos.', true, false, false, true, false, false, false),
('Atendente', 'Atendimento ao cliente sem acesso ao painel administrativo.', true, false, false, false, false, false, false);

UPDATE usuario u
JOIN cargo c ON c.nome = 'Administrador'
SET u.id_cargo = c.id_cargo
WHERE UPPER(u.perfil) = 'ADMIN' AND u.id_cargo IS NULL;


-- CORREÇÃO DE PERMISSÕES PADRÃO
-- Rode esta parte para corrigir cargos já existentes.
UPDATE cargo
SET acesso_produtos = TRUE,
    acesso_categorias = TRUE,
    acesso_promocoes = TRUE,
    acesso_usuarios = TRUE,
    acesso_cargos = TRUE,
    acesso_estoque = TRUE,
    ativo = TRUE
WHERE nome = 'Administrador';

UPDATE cargo
SET acesso_produtos = TRUE,
    acesso_categorias = TRUE,
    acesso_promocoes = TRUE,
    acesso_usuarios = FALSE,
    acesso_cargos = FALSE,
    acesso_estoque = TRUE,
    ativo = TRUE
WHERE nome = 'Gerente';

UPDATE cargo
SET acesso_produtos = FALSE,
    acesso_categorias = FALSE,
    acesso_promocoes = FALSE,
    acesso_usuarios = FALSE,
    acesso_cargos = FALSE,
    acesso_estoque = TRUE,
    ativo = TRUE
WHERE nome = 'Estoquista';

UPDATE cargo
SET acesso_produtos = FALSE,
    acesso_categorias = FALSE,
    acesso_promocoes = TRUE,
    acesso_usuarios = FALSE,
    acesso_cargos = FALSE,
    acesso_estoque = FALSE,
    ativo = TRUE
WHERE nome = 'Marketing';

UPDATE cargo
SET acesso_produtos = FALSE,
    acesso_categorias = FALSE,
    acesso_promocoes = FALSE,
    acesso_usuarios = FALSE,
    acesso_cargos = FALSE,
    acesso_estoque = FALSE,
    ativo = TRUE
WHERE nome = 'Atendente';
