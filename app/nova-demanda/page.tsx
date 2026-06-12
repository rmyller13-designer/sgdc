"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function NovaDemanda() {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [prioridades, setPrioridades] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [setorId, setSetorId] = useState("");
  const [prioridadeId, setPrioridadeId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [arquivos, setArquivos] = useState<FileList | null>(null);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const { data: produtosData } = await supabase.from("produtos").select("*").order("nome");
    const { data: setoresData } = await supabase.from("setores").select("*").order("nome");
    const { data: prioridadesData } = await supabase.from("prioridades").select("*").order("ordem");
    const { data: usuariosData } = await supabase.from("usuarios_comunicacao").select("*").order("nome");

    setProdutos(produtosData || []);
    setSetores(setoresData || []);
    setPrioridades(prioridadesData || []);
    setUsuarios(usuariosData || []);
  }

  async function salvarDemanda() {
    setMensagem("");

    if (!titulo || !produtoId || !setorId || !prioridadeId || !usuarioId) {
      setMensagem("Preencha os campos obrigatórios.");
      return;
    }

    const { data: statusRecebido } = await supabase
      .from("status_demanda")
      .select("id")
      .eq("nome", "RECEBIDO")
      .single();

    const { data: demandaCriada, error: erroDemanda } = await supabase
      .from("demandas")
      .insert({
        titulo,
        descricao,
        produto_id: Number(produtoId),
        setor_id: Number(setorId),
        prioridade_id: Number(prioridadeId),
        usuario_comunicacao_id: Number(usuarioId),
        status_id: statusRecebido?.id,
        data_entrega: dataEntrega || null,
      })
      .select()
      .single();

    if (erroDemanda) {
      setMensagem("Erro ao salvar demanda: " + erroDemanda.message);
      return;
    }

    if (arquivos && arquivos.length > 0) {
      for (const arquivo of Array.from(arquivos)) {
        const caminhoArquivo = `demanda-${demandaCriada.id}/${Date.now()}-${arquivo.name}`;

        const { error: erroUpload } = await supabase.storage
          .from("demandas")
          .upload(caminhoArquivo, arquivo);

        if (erroUpload) {
          setMensagem("Demanda salva, mas erro ao enviar anexo: " + erroUpload.message);
          return;
        }

        const { data: urlPublica } = supabase.storage
          .from("demandas")
          .getPublicUrl(caminhoArquivo);

        const { error: erroAnexo } = await supabase
          .from("demanda_anexos")
          .insert({
            demanda_id: demandaCriada.id,
            nome_arquivo: arquivo.name,
            tipo_arquivo: arquivo.type,
            tamanho_arquivo: arquivo.size,
            url_arquivo: urlPublica.publicUrl,
            caminho_storage: caminhoArquivo,
          });

        if (erroAnexo) {
          setMensagem("Arquivo enviado, mas erro ao salvar anexo: " + erroAnexo.message);
          return;
        }
      }
    }

    setMensagem("Demanda salva com sucesso!");

    setTitulo("");
    setDescricao("");
    setProdutoId("");
    setSetorId("");
    setPrioridadeId("");
    setUsuarioId("");
    setDataEntrega("");
    setArquivos(null);

    const inputArquivo = document.getElementById("arquivos") as HTMLInputElement;
    if (inputArquivo) inputArquivo.value = "";
  }

  return (
    <div>
      <h1>Nova Demanda</h1>

      <form style={formStyle}>
        <input
          type="text"
          placeholder="Título da Demanda"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          style={campo}
        />

        <textarea
          placeholder="Descrição"
          rows={5}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          style={campo}
        />

        <select value={produtoId} onChange={(e) => setProdutoId(e.target.value)} style={campo}>
          <option value="">Selecione o Produto</option>
          {produtos.map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.nome}
            </option>
          ))}
        </select>

        <select value={setorId} onChange={(e) => setSetorId(e.target.value)} style={campo}>
          <option value="">Setor Solicitante</option>
          {setores.map((setor) => (
            <option key={setor.id} value={setor.id}>
              {setor.nome}
            </option>
          ))}
        </select>

        <select value={prioridadeId} onChange={(e) => setPrioridadeId(e.target.value)} style={campo}>
          <option value="">Prioridade</option>
          {prioridades.map((prioridade) => (
            <option key={prioridade.id} value={prioridade.id}>
              {prioridade.nome}
            </option>
          ))}
        </select>

        <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} style={campo}>
          <option value="">Cadastrado por</option>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome} - {usuario.funcao}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dataEntrega}
          onChange={(e) => setDataEntrega(e.target.value)}
          style={campo}
        />

        <input
          id="arquivos"
          type="file"
          multiple
          onChange={(e) => setArquivos(e.target.files)}
          style={campo}
        />

        {arquivos && arquivos.length > 0 && (
          <div style={{ fontSize: "14px", color: "#cbd5e1" }}>
            <strong>Arquivos selecionados:</strong>
            <ul>
              {Array.from(arquivos).map((arquivo) => (
                <li key={arquivo.name}>
                  {arquivo.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button type="button" onClick={salvarDemanda} style={botao}>
          Salvar Demanda
        </button>

        {mensagem && <p>{mensagem}</p>}
      </form>
    </div>
  );
}

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "15px",
  maxWidth: "600px",
  marginTop: "20px",
};

const campo = {
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #444",
  background: "#111827",
  color: "white",
};

const botao = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};