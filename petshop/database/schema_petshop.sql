CREATE DATABASE IF NOT EXISTS petshop;
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

CREATE TABLE IF NOT EXISTS categoria (
    id_categoria BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(500),
    ativo BOOLEAN DEFAULT TRUE,
    icon VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS produto (
    id_produto BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(500),
    preco DECIMAL(10,2) NOT NULL,
    preco_desconto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    imagem LONGTEXT,
    qtd_estoque INT DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    id_categoria BIGINT,
    CONSTRAINT fk_produto_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categoria(id_categoria)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    usuario VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(160) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(30) NOT NULL DEFAULT 'USUARIO',
    ativo BOOLEAN DEFAULT TRUE,
    foto_perfil LONGTEXT,
    telefone VARCHAR(30),
    cep VARCHAR(20),
    endereco VARCHAR(160),
    numero VARCHAR(20),
    complemento VARCHAR(120),
    bairro VARCHAR(120),
    cidade VARCHAR(120),
    estado VARCHAR(2),
    id_cargo BIGINT,
    CONSTRAINT fk_usuario_cargo
        FOREIGN KEY (id_cargo)
        REFERENCES cargo(id_cargo)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS promocao (
    id_promocao BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome_evento VARCHAR(120) NOT NULL,
    descricao VARCHAR(500),
    percentual_desconto DECIMAL(5,2) NOT NULL,
    data_inicio DATETIME NOT NULL,
    data_fim DATETIME NOT NULL,
    ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS promocao_produto (
    id_promocao BIGINT NOT NULL,
    id_produto BIGINT NOT NULL,
    PRIMARY KEY (id_promocao, id_produto),
    CONSTRAINT fk_promocao_produto_promocao
        FOREIGN KEY (id_promocao)
        REFERENCES promocao(id_promocao)
        ON DELETE CASCADE,
    CONSTRAINT fk_promocao_produto_produto
        FOREIGN KEY (id_produto)
        REFERENCES produto(id_produto)
        ON DELETE CASCADE
);

-- O admin é criado automaticamente pelo arquivo AdminInitializer.java ao iniciar o Spring Boot.
-- As credenciais não aparecem no HTML de login.
