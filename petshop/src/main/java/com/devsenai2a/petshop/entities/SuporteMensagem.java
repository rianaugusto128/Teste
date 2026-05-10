
package com.devsenai2a.petshop.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "suporte_mensagem")
public class SuporteMensagem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_mensagem")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_ticket", nullable = false)
    @JsonIgnore
    private SuporteTicket ticket;

    @Column(name = "autor_tipo", nullable = false, length = 30)
    private String autorTipo;

    @Column(name = "autor_nome", length = 120)
    private String autorNome;

    @Lob
    @Column(name = "autor_foto", columnDefinition = "TEXT")
    private String autorFoto;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String mensagem;

    @Column(name = "discord_message_id", length = 64)
    private String discordMessageId;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    @PrePersist
    public void prePersist() { if (criadoEm == null) criadoEm = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public SuporteTicket getTicket() { return ticket; }
    public void setTicket(SuporteTicket ticket) { this.ticket = ticket; }
    public String getAutorTipo() { return autorTipo; }
    public void setAutorTipo(String autorTipo) { this.autorTipo = autorTipo; }
    public String getAutorNome() { return autorNome; }
    public void setAutorNome(String autorNome) { this.autorNome = autorNome; }
    public String getAutorFoto() { return autorFoto; }
    public void setAutorFoto(String autorFoto) { this.autorFoto = autorFoto; }
    public String getMensagem() { return mensagem; }
    public void setMensagem(String mensagem) { this.mensagem = mensagem; }
    public String getDiscordMessageId() { return discordMessageId; }
    public void setDiscordMessageId(String discordMessageId) { this.discordMessageId = discordMessageId; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDateTime criadoEm) { this.criadoEm = criadoEm; }
}


