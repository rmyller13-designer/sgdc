export type Permissao =
  | "admin"
  | "coordenacao"
  | "designer"
  | "jornalista"
  | "solicitante";

export type UsuarioComunicacao = {
  id: number;
  nome: string;
  funcao: string | null;
  email?: string | null;
  ativo?: boolean | null;
};

export type UsuarioSessao = {
  id: number;
  nome: string;
  funcao: string | null;
  email?: string | null;
  permissoes: Permissao[];
};

export const usuariosAutorizados = [
  "Terezinha",
  "Junior",
  "Roberto",
  "Josivania",
  "Renata",
];

export const todasPermissoes: Permissao[] = [
  "admin",
  "coordenacao",
  "designer",
  "jornalista",
  "solicitante",
];

export const permissoesLabels: Record<Permissao, string> = {
  admin: "Admin",
  coordenacao: "Coordenação",
  designer: "Designer",
  jornalista: "Jornalista",
  solicitante: "Solicitante",
};

export const cargosPorUsuario: Record<string, string> = {
  roberto: "Designer Grafico",
  josivania: "Jornalista",
  junior: "Jornalista/Designer",
  terezinha: "Jornalista/Coordenadora",
  renata: "Solicitante",
};

export function criarSessaoUsuario(usuario: UsuarioComunicacao): UsuarioSessao {
  const funcao = cargoDoUsuario(usuario.nome) || usuario.funcao;

  return {
    id: usuario.id,
    nome: nomeDoUsuario(usuario.nome),
    funcao,
    email: usuario.email,
    permissoes: permissoesPorFuncao(funcao),
  };
}

export function permissoesPorFuncao(): Permissao[] {
  return todasPermissoes;
}

export function temPermissao(
  usuario: UsuarioSessao | null,
  permitidas: Permissao[]
) {
  if (!usuario) return false;
  if (usuario.permissoes.includes("admin")) return true;
  return permitidas.some((permissao) => usuario.permissoes.includes(permissao));
}

export function podeEditarFluxo(usuario: UsuarioSessao | null) {
  return temPermissao(usuario, ["coordenacao", "designer", "jornalista"]);
}

export function podeAtribuirResponsavel(usuario: UsuarioSessao | null) {
  return temPermissao(usuario, ["coordenacao"]);
}

export function podeEditarDados(usuario: UsuarioSessao | null) {
  return temPermissao(usuario, ["coordenacao", "designer", "jornalista"]);
}

export function formatarPermissoes(permissoes: Permissao[]) {
  return permissoes.map((permissao) => permissoesLabels[permissao]).join(", ");
}

export function cargoDoUsuario(nome: string) {
  return cargosPorUsuario[normalizarUsuarioAutorizado(nome)] || null;
}

export function nomeDoUsuario(nome: string) {
  const usuarioAutorizado = usuariosAutorizados.find(
    (usuario) => normalizarUsuarioAutorizado(nome) === normalizar(usuario)
  );

  return usuarioAutorizado || nome;
}

export function usuarioEstaAutorizado(nome: string) {
  return usuariosAutorizados.some(
    (usuario) => normalizarUsuarioAutorizado(nome) === normalizar(usuario)
  );
}

export function ordenarUsuariosAutorizados<T extends { nome: string }>(
  usuarios: T[]
) {
  return [...usuarios].sort(
    (a, b) =>
      ordemUsuarioAutorizado(a.nome) - ordemUsuarioAutorizado(b.nome) ||
      a.nome.localeCompare(b.nome)
  );
}

function ordemUsuarioAutorizado(nome: string) {
  const indice = usuariosAutorizados.findIndex(
    (usuario) => normalizarUsuarioAutorizado(nome) === normalizar(usuario)
  );

  return indice === -1 ? Number.MAX_SAFE_INTEGER : indice;
}

function normalizarUsuarioAutorizado(nome: string) {
  const texto = normalizar(nome);
  return texto.startsWith("roberto") ? "roberto" : texto;
}

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
