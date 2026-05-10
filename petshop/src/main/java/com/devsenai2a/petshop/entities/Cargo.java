package com.devsenai2a.petshop.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "cargo")
public class Cargo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cargo")
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String nome;

    @Column(length = 500)
    private String descricao;

    private Boolean ativo = true;

    @Column(name = "acesso_produtos")
    private Boolean acessoProdutos = false;

    @Column(name = "acesso_categorias")
    private Boolean acessoCategorias = false;

    @Column(name = "acesso_promocoes")
    private Boolean acessoPromocoes = false;

    @Column(name = "acesso_usuarios")
    private Boolean acessoUsuarios = false;

    @Column(name = "acesso_cargos")
    private Boolean acessoCargos = false;

    @Column(name = "acesso_estoque")
    private Boolean acessoEstoque = false;

    @Column(name = "acesso_suporte")
    private Boolean acessoSuporte = false;

    public Cargo() {}

    public Cargo(String nome, String descricao, Boolean ativo) {
        this.nome = nome;
        this.descricao = descricao;
        this.ativo = ativo;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public Boolean getAtivo() { return ativo; }
    public void setAtivo(Boolean ativo) { this.ativo = ativo; }
    public Boolean getAcessoProdutos() { return acessoProdutos; }
    public void setAcessoProdutos(Boolean acessoProdutos) { this.acessoProdutos = acessoProdutos; }
    public Boolean getAcessoCategorias() { return acessoCategorias; }
    public void setAcessoCategorias(Boolean acessoCategorias) { this.acessoCategorias = acessoCategorias; }
    public Boolean getAcessoPromocoes() { return acessoPromocoes; }
    public void setAcessoPromocoes(Boolean acessoPromocoes) { this.acessoPromocoes = acessoPromocoes; }
    public Boolean getAcessoUsuarios() { return acessoUsuarios; }
    public void setAcessoUsuarios(Boolean acessoUsuarios) { this.acessoUsuarios = acessoUsuarios; }
    public Boolean getAcessoCargos() { return acessoCargos; }
    public void setAcessoCargos(Boolean acessoCargos) { this.acessoCargos = acessoCargos; }
    public Boolean getAcessoEstoque() { return acessoEstoque; }
    public void setAcessoEstoque(Boolean acessoEstoque) { this.acessoEstoque = acessoEstoque; }

    public Boolean getAcessoSuporte() { return acessoSuporte; }
    public void setAcessoSuporte(Boolean acessoSuporte) { this.acessoSuporte = acessoSuporte; }
}
