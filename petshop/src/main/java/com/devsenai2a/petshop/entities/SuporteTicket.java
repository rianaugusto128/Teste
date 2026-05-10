
package com.devsenai2a.petshop.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "suporte_ticket")
public class SuporteTicket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ticket")
    private Long id;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(length = 160)
    private String email;

    @Column(length = 160)
    private String assunto;

    @Column(name = "discord_channel_id", length = 64)
    private String discordChannelId;

    @Column(nullable = false, length = 30)
    private String status = "ABERTO";

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm = LocalDateTime.now();

    @Column(name = "fechado_em")
    private LocalDateTime fechadoEm;

    @ManyToOne
    @JoinColumn(name = "fechado_por_usuario_id")
    private Usuario fechadoPor;

    @PrePersist
    public void prePersist() {
        if (criadoEm == null) criadoEm = LocalDateTime.now();
        if (atualizadoEm == null) atualizadoEm = LocalDateTime.now();
        if (status == null) status = "ABERTO";
    }

    @PreUpdate
    public void preUpdate() { atualizadoEm = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getAssunto() { return assunto; }
    public void setAssunto(String assunto) { this.assunto = assunto; }
    public String getDiscordChannelId() { return discordChannelId; }
    public void setDiscordChannelId(String discordChannelId) { this.discordChannelId = discordChannelId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
    public void setAtualizadoEm(LocalDateTime atualizadoEm) { this.atualizadoEm = atualizadoEm; }
    public LocalDateTime getFechadoEm() { return fechadoEm; }
    public void setFechadoEm(LocalDateTime fechadoEm) { this.fechadoEm = fechadoEm; }
    public Usuario getFechadoPor() { return fechadoPor; }
    public void setFechadoPor(Usuario fechadoPor) { this.fechadoPor = fechadoPor; }
}
